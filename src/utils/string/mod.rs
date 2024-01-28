use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use regex::Regex;

pub fn parse_to_date(raw_date: String) -> DateTime<Utc> {
  let cardinal_regex: Regex = Regex::new(r"st|nd|rd|th").unwrap();
  let words: Vec<&str> = raw_date.split(" ").collect();
  let cardinal = cardinal_regex.replace(
    &words[0],
    "",
  ).to_string();

  let year = words[3].split(".txt").next().unwrap();
  let date = format!(
    "{}-{}-{}",
    cardinal,
    &words[2][..3],
    year
  );
  let naive = NaiveDate::parse_from_str(
    date.as_str(),
    "%e-%B-%Y",
  );
  if let Ok(naive) = naive {
    return DateTime::from_naive_utc_and_offset(
      naive.and_time(
        NaiveTime::from_hms_opt(0, 0, 0).unwrap()
      ),
      Utc,
    );
  } else {
    println!("Failed to parse string - '{}'", raw_date);
    println!("{:?}", words);
    println!("{}", year);
    println!("{}", date);
    panic!("{}", naive.unwrap_err())
  }
}