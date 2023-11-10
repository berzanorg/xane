use anyhow::{anyhow, Ok, Result};

use crate::{mina::Field, pair::Pair};
use std::collections::HashMap;

/// Represents the exchange itself.
///
/// Contains pairs in the exchange.
pub struct Exchange {
    /// Pairs in the exchange.
    pairs: HashMap<Field, Pair>,
}

impl Exchange {
    /// Creates a new instance of `Exchange`.
    ///
    /// # Usage
    ///
    /// ```rs
    /// let exchange = Exchange::new();
    /// ```
    pub fn new() -> Exchange {
        Exchange {
            pairs: HashMap::new(),
        }
    }

    /// Adds a new pair to the exchange.
    ///
    /// # Usage
    ///
    /// ```rs
    /// exchange.add_pair(name, hash_of_token_ids);
    /// ```
    pub fn add_pair(&mut self, name: String, hash_of_token_ids: Field) -> Result<()> {
        if self.pairs.contains_key(&hash_of_token_ids) {
            return Err(anyhow!("Pair already exists: {}", name));
        }

        let pair = Pair::new(name);

        self.pairs.insert(hash_of_token_ids, pair);

        Ok(())
    }
}
