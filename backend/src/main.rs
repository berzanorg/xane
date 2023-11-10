use anyhow::{Ok, Result};
use server::start_server;

mod database;
mod exchange;
mod order_book;
mod server;

#[tokio::main]
async fn main() -> Result<()> {
    let port = 7777;

    start_server(port).await?;

    Ok(())
}
