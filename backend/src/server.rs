/// # Server
/// This struct represents the web server for the exchange.
pub struct Server {}

impl Server {
    /// Creates a new instance of the exchange's web server.
    ///
    /// # Usage
    /// ```rs
    /// let mut server = Server::new();
    /// ```
    pub fn new() -> Server {
        Server {}
    }

    /// Starts the server.
    ///
    /// # Usage
    /// ```rs
    /// let mut server = Server::new();
    ///
    /// server.start().await;
    /// ```
    pub async fn start(&mut self) {
        unimplemented!()
    }
}
