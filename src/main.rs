extern crate alloc;
extern crate core;

pub mod utils;

use chrono::{Local, SecondsFormat, Utc};
use core::str::FromStr;
use fern::{log_file, Dispatch};
use log::{debug, info};
use std::env;
use std::error::Error;
use std::fs::create_dir_all;
use std::ops::Add;
use std::path::PathBuf;
// use std::io::stdin;
// use std::ptr::read;
// use chrono::{DateTime, Utc};
// use dropbox_sdk::files::MetadataV2::Metadata;
// use tokio::spawn;
// use tokio_postgres::NoTls;
// use uuid::Uuid;
// use gutenberg::{parse_from_file};
//
// use crate::utils::dropbox::download_folder;
// use crate::utils::env::initialise;
use crate::utils::ui::spawn_ui;

pub fn setup_logger(
    b_path: Option<String>,
    l_path: Option<String>,
) -> Result<(bool, String, String), Box<dyn Error>> {
    let mut fern = Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{}|{}|{}|{}",
                Local::now().to_rfc3339_opts(SecondsFormat::Secs, false),
                record.level(),
                record.target(),
                message
            ))
        })
        .level(log::LevelFilter::Debug);

    let mut base_path = "./logs".to_string();
    let mut log_file_path = "./logs/file.log".to_string();

    match (b_path, l_path) {
        (Some(bp), Some(fp)) => {
            (base_path, log_file_path) = (bp, fp);

            create_dir_all(&base_path)?;

            fern = fern.chain(log_file(log_file_path.clone())?);
        }
        _ => {
            let base_dir = dirs::data_local_dir();
            if let Some(local_config) = base_dir {
                (base_path, log_file_path) = find_log_dir(local_config);

                create_dir_all(&base_path)?;

                fern = fern.chain(log_file(log_file_path.clone())?);
            }
        }
    }

    fern.apply()?;
    debug!("Log files can be found at {base_path}");

    Ok((
        // Whether the log file is being used
        log_file_path == "./logs/file.log".to_string(),
        base_path,
        log_file_path,
    ))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let (use_file, dir, file) = setup_logger(None, None)?;
    info!(target: "main_thread", "Import Kit Version {}", env::var("CARGO_PKG_VERSION")?);

    // Ok(())
    spawn_ui(use_file, dir, file).await

    // parse_from_file("/home/arthur/Documents/code/twdb/impkit/notes/I'm Comfortable Not Owning Ubisoft Games.json");

    // let loaded: Episode = serde_json::from_str(tokio::fs::read_to_string("./test.json").await?.as_str())?;
    // dbg!(loaded);

    // let lmg = Company {
    //   id: Uuid::new_v4(),
    //   name: "Linus Media Group".to_string(),
    //   links: vec![],
    //   logo: Some(CDNEntity::URL("https://media.licdn.com/dms/image/D560BAQHyJqyjWYOZUg/company-logo_200_200/0/1704317802843/linus_media_group_logo?e=2147483647&v=beta&t=rrDHSeIHEM7kd84rBYKcfYf6Yd7OssHXMiPqJ1G8mVQ".to_string())),
    //   founded: Some(2013),
    // };

    // let episode = vec![
    //   TimestampedEvent {
    //     id: Uuid::new_v4(),
    //     event_type: Control,
    //     metadata: EventMetadata {
    //       control_type: Some("PRE_ROLL".to_string()),
    //       links: None,
    //       relevant_products: None,
    //       link: None,
    //       brand: None,
    //     },
    //     title: "INTRO".to_string(),
    //     parent: "".to_string(),
    //     start: 0,
    //     end: 0,
    //     created: Default::default(),
    //     modified: Default::default(),
    //   }
    // ];
    //
    // tokio::fs::write("./test.json", serde_json::to_string_pretty(&episode)?).await?;

    // let _ = initialise();
    //
    // println!("> Connecting to database...");
    // println!("  > using environment variable - \x1b[34m'DATABASE_URL'\x1b[0m");
    // let (client, connection) = tokio_postgres::connect(
    //   env::var("DATABASE_URL")?.as_str(),
    //   NoTls,
    // ).await?;
    //
    // spawn(async move {
    //   if let Err(e) = connection.await {
    //     eprintln!("> Database - connection error: {}", e);
    //   }
    // });
    //
    // let rows = client.query_one("SELECT $1::TEXT", &[&"Database - Connected"]).await?;
    //
    // let connected_message: &str = rows.get(0);
    //
    // println!("> {}", connected_message);
    // println!("> Downloading timestamp files from Dropbox");
    // let results = download_folder("/wan show timestamps".to_string()).await?;
    //
    // dbg!(results);
}

#[cfg(not(debug_assertions))]
fn find_log_dir(local_config: PathBuf) -> (String, String) {
    let base_path = format!(
        "{}/import-kit/logs",
        local_config.as_os_str().to_str().unwrap()
    );
    let log_path = format!(
        "{base_path}/{}.log",
        Local::now().format("%Y-%m-%d_%H:%M:%S")
    );

    return (base_path, log_path);
}

#[cfg(debug_assertions)]
fn find_log_dir(_local_config: PathBuf) -> (String, String) {
    let base_path = String::from("./logs");
    let log_path = format!(
        "{base_path}/{}.log",
        Local::now().format("%Y-%m-%d_%H:%M:%S")
    );

    return (base_path, log_path);
}
