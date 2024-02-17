use crate::types::{EventMetadata, MetadataFile, TimestampType, TimestampedEvent};
use crate::utils::string::to_seconds;
use chrono::Utc;
use std::fs::read;
use std::path::Path;
use uuid::Uuid;

#[cfg(test)]
mod tests;

pub mod types;
pub mod utils;

pub fn parse_from_file<T: AsRef<Path>>(file_name: T) -> Vec<TimestampedEvent> {
    let mut events = vec![];

    let read_result = read(file_name.as_ref());
    if let Ok(buffer) = read_result {
        let can_process = String::from_utf8(buffer);

        if let Ok(contents) = can_process {
            let parse_result = serde_json::from_str::<MetadataFile>(&contents);
            if let Ok(metadata) = parse_result {
                events = parse(metadata.original_text);
            } else {
                eprintln!("Failed to read file details below");
                eprintln!("{:?}", parse_result.unwrap_err());
            }
        } else {
            eprintln!("Failed to read file details below");
            eprintln!("{:?}", can_process.unwrap_err());
        }
    } else {
        eprintln!("Failed to read file details below");
        eprintln!("{:?}", read_result.unwrap_err());
    }

    return events;
}

pub fn parse<T: Into<String>>(text: T) -> Vec<TimestampedEvent> {
    let mut events: Vec<TimestampedEvent> = vec![];
    let content = text.into();
    let lines: Vec<&str> = content.split("\r\n").collect();

    let mut timestamps_started = false;
    let mut depth = 0;

    for mut line in lines {
        line = line.trim_start();
        if timestamps_started {
            match &line[0..1] {
                "[" => {
                    depth = 0;
                    let mut parts: Vec<&str> = line.split(' ').collect();
                    let raw_timestamp = parts.remove(0);
                    let remainder = parts.join(" ");
                    let timestamp = to_seconds(raw_timestamp);
                    let for_decoding = remainder[1..remainder.len() - 1].to_lowercase();

                    if events.len() > 0 {
                        let index = events.len() - 1;
                        events[index].end = timestamp - 1;
                    }

                    match for_decoding.as_str() {
                        "chapters." | "chapters" => {} // Ignore the chapters control, as it is functionally useless
                        "intro." | "intro" => events.push(TimestampedEvent {
                            id: Uuid::new_v4(),
                            event_type: TimestampType::Control,
                            metadata: EventMetadata {
                                control_type: Some("PRE_ROLL".into()),
                                links: None,
                                relevant_products: None,
                                link: None,
                                brand: None,
                            },
                            title: None,
                            start: timestamp,
                            end: 0,
                            depth,
                            created: Utc::now(),
                            modified: Utc::now(),
                        }),
                        "outro." | "outro" => events.push(TimestampedEvent {
                            id: Uuid::new_v4(),
                            event_type: TimestampType::Control,
                            metadata: EventMetadata {
                                control_type: Some("POST_ROLL".into()),
                                links: None,
                                relevant_products: None,
                                link: None,
                                brand: None,
                            },
                            title: None,
                            start: timestamp,
                            end: 0,
                            depth,
                            created: Utc::now(),
                            modified: Utc::now(),
                        }),
                        _ => println!("{} - {}", timestamp, for_decoding),
                    }
                }
                ">" => {
                    // println!("{}", line)
                }
                _ => {}
            }
        } else {
            if line.to_lowercase().contains("timestamps") {
                timestamps_started = true;
            }
        }
    }

    dbg!(&events);

    return events;
}
