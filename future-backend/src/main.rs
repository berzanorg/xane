use anyhow::Result;
use server::start_server;

mod new;
mod exchange;
mod mina;
mod order;
mod order_book;
mod pair;
mod persistent;
mod server;

#[tokio::main]
async fn main() -> Result<()> {
    let port = 7777;

    start_server(port).await?;

    Ok(())
}
