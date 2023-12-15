use crate::mina::Field;

/// Represents an order in the order book.
///
/// # Usage
///
/// ```rs
/// let buy_order = Order::new(price, amount, creator_hash);
/// let sell_order = Order::new(price, amount, creator_hash);
/// ```
pub struct Order {
    /// Price of the main asset in the other asset.
    price: u64,
    /// Price of the main asset.
    amount: u64,
    /// Hash of the public key that created this order.
    creator_hash: Field,
}

impl Order {
    /// Creates a new instance of `Order`.
    ///
    /// # Usage
    ///
    /// ```rs
    /// let order = Order::new(price, amount, creator_hash);
    /// ```
    pub fn new(price: u64, amount: u64, creator_hash: Field) -> Order {
        Order {
            price,
            amount,
            creator_hash,
        }
    }
}

impl PartialEq for Order {
    fn eq(&self, other: &Self) -> bool {
        self.price == other.price
    }
}

impl Eq for Order {}

impl PartialOrd for Order {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.price.cmp(&other.price))
    }
}

impl Ord for Order {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.price.cmp(&other.price)
    }
}
