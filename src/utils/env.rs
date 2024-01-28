use core::str::FromStr;
use std::env;
use std::error::Error;
use std::thread::available_parallelism;

pub fn initialise() -> Result<(), Box<dyn Error>> {
  println!("> Initialising...");
  dotenvy::dotenv()?;
  let default_parallelism_approx = available_parallelism()?.get();

  let raw_num_threads: i64 = i64::from_str(
    env::var("NUM_THREADS")
        .unwrap_or("4".to_string())
        .as_str()
  ).unwrap_or(-1);

  let num_threads: usize;

  match raw_num_threads {
    -1 => num_threads = default_parallelism_approx,
    0 => num_threads = 1,
    _ => num_threads = raw_num_threads.abs() as usize,
  }

  env::set_var("IKIT_MAX_THREADS", num_threads.to_string());

  println!(
    "> Determined that the system has {} logical cores",
    default_parallelism_approx
  );
  if raw_num_threads == 0 {
    eprintln!("> \x1b[33mNote: Configured value cannot be configured to 0, automatically processed as 1\x1b[0m");
  }
  println!(
    "> Configured value specifies acceptable use of {} logical cores",
    num_threads
  );

  Ok(())
}