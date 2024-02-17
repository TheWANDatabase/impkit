use regex::Regex;
use std::str::FromStr;

pub fn to_seconds<T: ToString>(timestamp: T) -> u32 {
    let text = timestamp.to_string();
    let pieces: Vec<&str> = text.split(':').collect();
    let mut time_pieces: Vec<u32> = vec![];

    for part in pieces.iter() {
        let digits = Regex::from_str(r"[0-9]{1,2}").unwrap();

        let string_only = digits.captures(part).unwrap();
        let digit_string = string_only.get(0).unwrap().as_str();
        let as_time = u32::from_str(digit_string).unwrap();
        time_pieces.push(as_time);
    }

    let mut component_idx = 0;
    let mut seconds = 0;
    time_pieces.reverse();

    for component in time_pieces.iter() {
        match component_idx {
            0 => seconds += component,                    // Add seconds to counter
            1 => seconds += component * 60,               // Add minutes to counter
            2 => seconds += (component * 60) * 60,        // Add hours to counter
            3 => seconds += ((component * 60) * 60) * 24, // add days to counter
            4 => seconds += (((component * 60) * 60) * 24) * 365, // add years to counter
            _ => break,
        }

        component_idx += 1;
    }

    return seconds;
}

// pub fn into_timestamp(seconds: u32) -> String {}
