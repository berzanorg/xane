use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4};

use anyhow::{anyhow, Result};
use axum::{routing::get, Router};

/// Starts the web server of the exchange.
///
/// # Usage
/// ```rs
/// let port = 7777;
/// start_server(port).await?;
/// ```
pub async fn start_server(port: u16) -> Result<()> {
    let socket_addr = SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, port));

    let router = Router::new().route("/", get(home));

    axum::Server::bind(&socket_addr)
        .serve(router.into_make_service())
        .await
        .map_err(|msg| anyhow!("Server error: {}", msg))
}

async fn home() -> &'static str {
    "home"
}
