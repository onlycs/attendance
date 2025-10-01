mod editor;
mod message;
mod pool;
mod session;
mod student_data;
mod subscription;

use std::{backtrace::Backtrace, panic::Location};

use actix_web::{Error, HttpRequest, HttpResponse, rt, web};
use actix_ws::AggregatedMessage;
use futures_util::StreamExt;
use message::ClientMessage;
use pool::SubPools;
use session::Session;
use thiserror::Error;

use crate::{AppState, http::auth, prelude::*, ws::message::ServerMessage};

#[serde_as]
#[derive(Error, Debug, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum WsError {
    #[error("At {location}: Serde error: {source}")]
    Serde {
        #[from]
        #[serde_as(as = "DisplayFromStr")]
        source: serde_json::Error,
        #[serde_as(as = "DisplayFromStr")]
        location: &'static Location<'static>,
        #[serde(skip)]
        backtrace: Backtrace,
    },

    #[error("At {location}: Sqlx error: {source}")]
    Sqlx {
        #[from]
        #[serde_as(as = "DisplayFromStr")]
        source: sqlx::Error,
        #[serde_as(as = "DisplayFromStr")]
        location: &'static Location<'static>,
        #[serde(skip)]
        backtrace: Backtrace,
    },

    #[error("At {location}: Websocket connection closed")]
    Closed {
        #[from]
        #[serde_as(as = "DisplayFromStr")]
        source: actix_ws::Closed,
        #[serde_as(as = "DisplayFromStr")]
        location: &'static Location<'static>,
        #[serde(skip)]
        backtrace: Backtrace,
    },

    #[error("Sign in time must be after the sign out time. The database was not updated.")]
    Time,

    #[error("Invalid update. The database was not updated.")]
    Data,

    #[error("Unknown error. The database was not updated.")]
    Unknown,

    #[error("Failed to send a message to subscription pool")]
    Send,

    #[error("Failed to authenticate")]
    Auth,
}

pub(crate) async fn ws(
    req: HttpRequest,
    stream: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    // setup stream
    let (res, session, stream) = actix_ws::handle(&req, stream)?;

    let mut stream = stream
        .aggregate_continuations()
        .max_continuation_size(2usize.pow(20));

    // setup session
    let mut session = Session::new(session).await;

    info!(
        event_type = "websocket_connection_opened",
        session_id = %format!("{:#x}", session.id),
        "WebSocket connection established"
    );
    rt::spawn(async move {
        let mut auth_token = None;

        while let Some(msg) = stream.next().await {
            let result = async {
                match msg {
                    Ok(AggregatedMessage::Text(msg)) => {
                        let message = serde_json::from_slice::<ClientMessage>(msg.as_bytes())?;
                        debug!(
                            event_type = "websocket_message_received",
                            session_id = %format!("{:#x}", session.id),
                            message_type = ?std::mem::discriminant(&message),
                            "WebSocket message received"
                        );

                        match message {
                            ClientMessage::Authenticate { token } => {
                                auth::check_throw(&token, &state.pg)
                                    .await
                                    .map_err(|_| WsError::Auth)?;

                                auth_token = Some(token);

                                info!(
                                    event_type = "websocket_authenticated",
                                    session_id = %format!("{:#x}", session.id),
                                    "WebSocket session authenticated"
                                );

                                let res = serde_json::to_string(&ServerMessage::AuthenticateOk)?;

                                if session.text(res).await.is_err() {
                                    warn!(
                                        event_type = "websocket_send_failed",
                                        session_id = %format!("{:#x}", session.id),
                                        message_type = "AuthenticateOk",
                                        "WebSocket closed while sending response"
                                    );
                                }
                            }

                            ClientMessage::Subscribe { sub } => {
                                let Some(token) = &auth_token else {
                                    return Err(WsError::Auth);
                                };

                                auth::check_throw(token, &state.pg)
                                    .await
                                    .map_err(|_| WsError::Auth)?;

                                let pool = SubPools::instance().get(sub, &state.pg).await;

                                if pool.sessions.read().await.contains_key(&session.id) {
                                    warn!(
                                        event_type = "websocket_duplicate_subscription",
                                        session_id = %format!("{:#x}", session.id),
                                        subscription = ?sub,
                                        "WebSocket attempted duplicate subscription"
                                    );
                                    return Ok(());
                                }

                                pool.add.send(session.clone()).map_err(|_| WsError::Send)?;

                                info!(
                                    event_type = "websocket_subscribed",
                                    session_id = %format!("{:#x}", session.id),
                                    subscription = ?sub,
                                    "WebSocket subscribed to service"
                                );
                            }

                            ClientMessage::Update { sub, value } => {
                                let Some(token) = &auth_token else {
                                    return Err(WsError::Auth);
                                };

                                auth::check_throw(token, &state.pg)
                                    .await
                                    .map_err(|_| WsError::Auth)?;

                                SubPools::instance()
                                    .get(sub, &state.pg)
                                    .await
                                    .update
                                    .send((serde_json::to_string(&value)?, session.id))
                                    .map_err(|_| WsError::Send)?;
                            }
                        }
                    }
                    Ok(AggregatedMessage::Close(_)) => {
                        SubPools::instance().remove_all(session.id).await?;

                        info!(
                            event_type = "websocket_connection_closed",
                            session_id = %format!("{:#x}", session.id),
                            "WebSocket connection closed"
                        );
                    }
                    _ => {}
                }

                Ok::<_, WsError>(())
            }
            .await;

            if let Err(error) = result {
                let Ok(res) = serde_json::to_string(&ServerMessage::Error {
                    message: format!("{error}"),
                    meta: error,
                }) else {
                    error!(
                        event_type = "websocket_error_serialization_failed",
                        session_id = %format!("{:#x}", session.id),
                        "Failed to serialize WebSocket error message"
                    );
                    continue;
                };

                if session.text(res).await.is_err() {
                    warn!(
                        event_type = "websocket_error_send_failed",
                        session_id = %format!("{:#x}", session.id),
                        "WebSocket closed while sending error response"
                    );
                }
            }
        }
    });

    Ok(res)
}
