use server::Server;

mod database;
mod exchange;
mod order_book;
mod server;

#[tokio::main]
async fn main() {
    // The program starts here.

    let mut server = Server::new();

    server.start().await;
}
