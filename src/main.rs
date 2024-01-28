extern crate alloc;
extern crate core;

pub mod utils;

use core::str::FromStr;
use std::env;
use std::error::Error;
use chrono::{DateTime, Utc};
use tokio::spawn;
use tokio_postgres::NoTls;
use uuid::Uuid;

use crate::utils::dropbox::download_folder;
use crate::utils::env::initialise;
use crate::utils::types::{CDNEntity, Company, Episode, Host, HostJob, TimestampedEvent};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
  println!(
    "==== {} V{} ===",
    env::var("CARGO_PKG_NAME")?,
    env::var("CARGO_PKG_VERSION")?
  );

  let loaded: Episode = serde_json::from_str(tokio::fs::read_to_string("./test.json").await?.as_str())?;
  dbg!(loaded);

  let lmg = Company {
    id: Uuid::new_v4(),
    name: "Linus Media Group".to_string(),
    links: vec![],
    logo: Some(CDNEntity::URL("https://media.licdn.com/dms/image/D560BAQHyJqyjWYOZUg/company-logo_200_200/0/1704317802843/linus_media_group_logo?e=2147483647&v=beta&t=rrDHSeIHEM7kd84rBYKcfYf6Yd7OssHXMiPqJ1G8mVQ".to_string())),
    founded: Some(2013),
  };

  let episode = Episode {
    id: "KDIXNRgnDWQ".to_string(),
    floatplane: Some("vFIYuxFhrm".to_string()),
    title: "Apphole".to_string(),
    description: "<p>Start your day on the right foot with AG1 at <a href=\"http://drinkAG1.com/WANshow\" rel=\"noopener noreferrer\" target=\"_blank\">http://drinkAG1.com/WANshow</a></p><p><br></p><p>Visit <a href=\"https://www.squarespace.com/WAN\" rel=\"noopener noreferrer\" target=\"_blank\">https://www.squarespace.com/WAN</a> and use offer code WAN for 10% off</p><p><br></p><p>Treat your feet with Vessi! Save 15% with our offer code WANSHOW at <a href=\"https://vessi.com/WANSHOW\" rel=\"noopener noreferrer\" target=\"_blank\">https://vessi.com/WANSHOW</a></p><p><br></p><p>Podcast Download: TBD</p>".to_string(),
    thumbnail: CDNEntity::URL("https://pbs.floatplane.com/stream_thumbnails/5c13f3c006f1be15e08e05c0/873100211224047_1706322471714.jpeg".to_string()),
    aired: DateTime::parse_from_rfc3339("2024-01-27T02:59:52Z")?.to_utc(),
    duration: 10993,
    hosts: vec![
      Host {
        id: Uuid::new_v4(),
        forename: Some("Linus".to_string()),
        surname: Some("Sebastian".to_string()),
        preferred_name: "Linus".to_string(),
        alias: Some("Tech Tips".to_string()),
        job: HostJob {
          id: Uuid::new_v4(),
          role: "Chief Vision Officer".to_string(),
          is_primary: true,
          from: None,
          to: None,
          company: lmg,
        },
        avatar: Some(CDNEntity::Asset(Uuid::from_str("00823a0f-3286-477d-b857-c3b497e5c6be")?)),
      }
    ],
    timestamps: vec![
      TimestampedEvent {
        id: Uuid::new_v4(),
        kind: (),
        title: "".to_string(),
        parent: "".to_string(),
        start: 0,
        end: 0,
        created: Default::default(),
        modified: Default::default(),
        references: "".to_string(),
      }
    ],
  };

  tokio::fs::write("./test.json", serde_json::to_string_pretty(&episode)?).await?;

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

  Ok(())
}