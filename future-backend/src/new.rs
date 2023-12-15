use crate::mina::Field;
use std::collections::BTreeMap;

pub struct Exchange {
    pairs: BTreeMap<Field, Pair>,
}

pub struct Pair {
    buy_orders: Vec<Order>,
    sell_orders: Vec<Order>,
}

pub struct Order {
    /// Poseidon hash of the public key of the order maker.
    maker: Field,
    amount: u64,
    price: u64,
}


