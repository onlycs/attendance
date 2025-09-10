mod editor;
mod message;
mod pool;
mod session;
mod student_data;
mod subscription;

use std::{backtrace::Backtrace, panic::Location};

use actix_web::{rt, web, Error, HttpRequest, HttpResponse};
use actix_ws::AggregatedMessage;
use futures_util::StreamExt;
use message::ClientMessage;
use pool::SubPools;
use session::Session;
use thiserror::Error;

use crate::{http::auth, prelude::*, ws::message::ServerMessage, AppState};

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
        "Websocket connection opened (assigned id {:#x})",
        session.id
    );
    rt::spawn(async move {
        while let Some(msg) = stream.next().await {
            let result = async {
                match msg {
                    Ok(AggregatedMessage::Text(msg)) => {
                        let message = serde_json::from_slice::<ClientMessage>(msg.as_bytes())?;
                        debug!(
                            "Got message from client (id {:#x}): {message:?}",
                            session.id
                        );

                        match message {
                            ClientMessage::Subscribe { sub, token } => {
                                auth::check_throw(token, &state.pg)
                                    .await
                                    .map_err(|_| WsError::Auth)?;

                                SubPools::instance()
                                    .get(sub, &state.pg)
                                    .await
                                    .add
                                    .send(session.clone())
                                    .map_err(|_| WsError::Send)?;
                            }
                            ClientMessage::Update { sub, value } => SubPools::instance()
                                .get(sub, &state.pg)
                                .await
                                .update
                                .send(serde_json::to_string(&value)?)
                                .map_err(|_| WsError::Send)?,
                        }
                    }
                    Ok(AggregatedMessage::Close(reason)) => {
                        SubPools::instance().remove_all(session.id).await?;

                        if let Some(reason) = reason {
                            info!(
                                "Websocket (id {:#x}) closed due to reason: {reason:?}",
                                session.id
                            );
                        } else {
                            info!("Websocket (id {:#x}) closed", session.id);
                        }
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
                    warn!("Failed to serialize error message.");
                    continue;
                };

                if session.text(res).await.is_err() {
                    warn!("Websocket closed while sending error, ignoring.");
                }
            }
        }
    });

    Ok(res)
}
