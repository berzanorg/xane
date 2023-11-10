use crate::order_book::OrderBook;

/// Represents a specific pair in the exchange.
///
/// # Usage
///
/// ```rs
/// let pair = Pair::new(name);
/// ```
pub struct Pair {
    /// Name of this pair.
    name: String,
    /// Order book of this pair.
    order_book: OrderBook,
}

impl Pair {
    /// Creates a new instance of `Pair`.
    ///
    /// # Usage
    ///
    /// ```rs
    /// let pair = Pair::new(name);
    /// ```
    pub fn new(name: String) -> Pair {
        Pair {
            name,
            order_book: OrderBook::new(),
        }
    }
}
