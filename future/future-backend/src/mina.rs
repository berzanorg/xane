use std::hash::Hash;

///  Represents the field type which is basically 32 bytes.
///
/// # Usage
///
/// ```rs
/// let field = Field::new(bytes);
/// // or
/// let field = Field::default();
/// ```
///
/// Reference: https://docs.minaprotocol.com/zkapps/o1js/basic-concepts#field
pub struct Field([u8; 32]);

impl Field {
    /// Creates a new `Field` using given bytes.
    ///
    /// # Usage
    /// ```rs
    /// let field = Field::new([0, 0, ..., 0, 0])
    /// ```
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
}

impl Default for Field {
    fn default() -> Self {
        Self([0_u8; 32])
    }
}

impl PartialEq for Field {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}

impl Eq for Field {}

impl PartialOrd for Field {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.0.cmp(&other.0))
    }
}

impl Ord for Field {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0.cmp(&other.0)
    }
}

impl Hash for Field {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.0.hash(state)
    }
}
