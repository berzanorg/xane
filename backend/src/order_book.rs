use crate::order::Order;

/// Represents the order book of a single pair such as BTC/USDT.
///
/// An `Exchange` contains an `OrderBook` for each pair.
///
/// # Usage
/// ```rs
/// let mut order_book = OrderBook::new();
/// let buy_order = Order::new(price, amount, creator_hash);
/// order_book.insert_buy_order(buy_order);
/// ```
pub struct OrderBook {
    /// Last executed order's price.
    last_price: Option<u64>,
    /// Orders on the buyers side.
    buy_orders: Vec<Order>,
    /// Orders on the sellers side.
    sell_orders: Vec<Order>,
}

impl OrderBook {
    /// Creates a new instance of `OrderBook`.
    ///
    /// # Usage
    ///
    /// ```rs
    /// let order_book = OrderBook::new();
    /// ```
    pub fn new() -> OrderBook {
        OrderBook {
            last_price: None,
            buy_orders: vec![],
            sell_orders: vec![],
        }
    }

    /// Inserts a buy order into the order book.
    ///
    /// # Usage
    ///
    /// ```rs
    /// let buy_order = Order::new(price, amount, creator_hash);
    /// order_book.insert_buy_order(buy_order);
    /// ```
    fn insert_buy_order(&mut self, buy_order: Order) {
        self.buy_orders.push(buy_order);
        self.buy_orders.sort();
    }

    /// Inserts a sell order into the order book.
    ///
    /// # Usage
    ///
    /// ```rs
    /// let sell_order = Order::new(price, amount, creator_hash);
    /// order_book.insert_sell_order(sell_order);
    /// ```
    fn insert_sell_order(&mut self, sell_order: Order) {
        self.sell_orders.push(sell_order);
        self.sell_orders.sort();
    }
}
