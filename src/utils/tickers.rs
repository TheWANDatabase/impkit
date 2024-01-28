
pub enum TickerOpcode {
  Tick,
  Message(String, String),
  Increment(u64),
  Reset,
  Finish,
  FinishWithError(String, String),
}