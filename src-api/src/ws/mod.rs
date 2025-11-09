mod connection;
mod schema;
mod sql;

use actix_web::{Error, HttpRequest, HttpResponse, rt, web};
use actix_ws::AggregatedMessage;
use futures_util::StreamExt;
use tracing::{debug, info, instrument, warn};

use crate::{
    AppState,
    http::auth,
    ws::{
        connection::Connection,
        schema::{
            AuthenticatePayload, ErrorPayload, IncomingPayload, OutgoingPayload, Replication,
            WsError,
        },
    },
};

#[instrument(name = "ws_handler", skip(req, stream, state))]
pub(crate) async fn ws(
    req: HttpRequest,
    stream: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let (res, session, stream) = actix_ws::handle(&req, stream)?;

    let mut stream = stream
        .aggregate_continuations()
        .max_continuation_size(2usize.pow(20));

    let mut session = Connection::new(session).await;

    rt::spawn(async move {
        let mut auth_token = None;

        while let Some(msg) = stream.next().await {
            let result = async {
                match msg {
                    Ok(AggregatedMessage::Text(msg)) => {
                        let message = serde_json::from_slice::<IncomingPayload>(msg.as_bytes())?;

                        debug!(
                            session_id = %format!("{:#x}", session.id()),
                            message_type = %message.as_ref(),
                            "Message received"
                        );

                        match message {
                            IncomingPayload::Authenticate(AuthenticatePayload {token}) => {
                                auth::check_throw(&token, &state.pg)
                                    .await
                                    .map_err(|_| WsError::Auth)?;

                                auth_token = Some(token);

                                info!(session_id = %format!("{:#x}", session.id()), "Session authenticated");

                                session.send(OutgoingPayload::Replicate(Replication::Full(sql::full(&state.pg).await?))).await;
                            }

                            IncomingPayload::Replicate(replication) => {
                                if auth_token.is_none() {
                                    warn!(
                                        session_id = %format!("{:#x}", session.id()),
                                        "Unauthenticated session attempted to replicate"
                                    );

                                    return Err(WsError::Auth);
                                }

                                sql::replicate(replication, &state.pg).await?;
                            }
                        }
                    }

                    Ok(AggregatedMessage::Close(_)) => {}
                    _ => {}
                }

                Ok::<_, WsError>(())
            }
            .await;

            if let Err(error) = result {
                warn!(
                    session_id = %format!("{:#x}", session.id()),
                    error = %format!("{error}"),
                    dbg = ?error,
                    "Websocket error occurred, sending error response"
                );

                session
                    .send(schema::OutgoingPayload::Error(ErrorPayload {
                        message: format!("{error}"),
                        meta: error,
                    }))
                    .await;
            }
        }
    });

    Ok(res)
}

pub use sql::spawn as init;
