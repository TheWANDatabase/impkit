use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};
use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use dropbox_sdk::default_client::UserAuthDefaultClient;
use dropbox_sdk::files::{DownloadArg, FileMetadata};
use dropbox_sdk::{files, oauth2};
use serde_json::{Map, Value};
use tokio::spawn;
use tokio_postgres::NoTls;
use crate::utils::{string::parse_to_date, tickers::TickerOpcode};

pub async fn download_runtime(
  n: usize,
  tx: Sender<(usize, TickerOpcode)>,
  shared_files: Arc<
    Mutex<
      alloc::vec::IntoIter<
        FileMetadata
      >
    >
  >,
  shared_results: Arc<
    Mutex<
      HashMap<
        String,
        Value
      >
    >
  >,
) -> Result<(), Box<dyn Error>> {
  loop {
    let job = shared_files.lock().unwrap().next();
    let threaded_auth = oauth2::get_auth_from_env_or_prompt();
    let threaded_dropbox_client: UserAuthDefaultClient = UserAuthDefaultClient::new(threaded_auth);
    let (client, connection) = tokio_postgres::connect(
      env::var("DATABASE_URL")?.as_str(),
      NoTls,
    ).await?;

    spawn(async move {
      if let Err(e) = connection.await {
        eprintln!("> Database - connection error: {}", e);
      }
    });

    match job {
      Some(job) => {
        tx.send((n, TickerOpcode::Reset))?;
        if job.name.starts_with("Unknown") { continue; }
        let name = parse_to_date(job.name.clone());
        tx.send((n, TickerOpcode::Increment(1)))?;
        tx.send((n, TickerOpcode::Message(name.to_rfc3339_opts(SecondsFormat::Secs, true), "Resolving Episode".to_string())))?;
        match client.query("SELECT * FROM data.episodes WHERE aired >= $1 ORDER BY aired ASC LIMIT 1", &[&name.naive_utc()]).await {
          Ok(nearby_episodes) => {
            if let Some(closest_episode) = nearby_episodes.first() {
              let title: String = closest_episode.get(2);
              let raw_aired: NaiveDateTime = closest_episode.get(5);
              let aired: DateTime<Utc> = DateTime::<Utc>::from_naive_utc_and_offset(raw_aired, Utc);
              let mut map = Map::new();
              map.insert("episode".to_string(), Value::String(closest_episode.get(0)));
              map.insert("aired".to_string(), Value::String(aired.to_rfc3339_opts(SecondsFormat::Secs, true)));
              map.insert("remote_doc".to_string(), Value::String(job.path_lower.clone().unwrap().to_string()));
              map.insert("original_text".to_string(), Value::Null);
              map.insert("timestamps".to_string(), Value::Array(vec![]));
              let mut notes = Value::Object(map);

              tx.send((n, TickerOpcode::Increment(9)))?;
              tx.send((n, TickerOpcode::Message(title.clone(), "Downloading".to_string())))?;
              match files::download(&threaded_dropbox_client, &DownloadArg::new(job.path_lower.unwrap().to_string()), None, None) {
                Ok(request) => {
                  match request {
                    Ok(response) => {
                      let mut body = String::new();
                      response.body.expect("there must be a response body").read_to_string(&mut body)?;
                      notes["original_text"] = Value::String(body);

                      tx.send((n, TickerOpcode::Increment(40)))?;
                      tx.send((n, TickerOpcode::Message(name.to_rfc3339_opts(SecondsFormat::Secs, true), "Writing".to_string())))?;
                      tx.send((n, TickerOpcode::Finish))?;
                      match std::fs::create_dir_all("./notes") {
                        Ok(_) => {
                          match std::fs::write(format!("./notes/{}.json", title), serde_json::to_string(&notes)?) {
                            Ok(_) => {
                              shared_results.lock().unwrap().insert(closest_episode.get(0), notes);
                              tx.send((n, TickerOpcode::Increment(50)))?;
                              tx.send((n, TickerOpcode::Message(name.to_rfc3339_opts(SecondsFormat::Secs, true), "Finished".to_string())))?;
                              tx.send((n, TickerOpcode::Finish))?;
                            }
                            Err(reason) => {
                              tx.send((n, TickerOpcode::FinishWithError(name.to_rfc3339_opts(SecondsFormat::Secs, true), reason.to_string())))?;
                              tx.send((n, TickerOpcode::Finish))?;
                            }
                          }
                        }
                        Err(reason) => {
                          tx.send((n, TickerOpcode::FinishWithError(name.to_rfc3339_opts(SecondsFormat::Secs, true), reason.to_string())))?;
                          tx.send((n, TickerOpcode::Finish))?;
                        }
                      }
                    }
                    Err(reason) => {
                      tx.send((n, TickerOpcode::FinishWithError(name.to_rfc3339_opts(SecondsFormat::Secs, true), reason.to_string())))?;
                      tx.send((n, TickerOpcode::Finish))?;
                    }
                  }
                }
                Err(reason) => {
                  tx.send((n, TickerOpcode::FinishWithError(name.to_rfc3339_opts(SecondsFormat::Secs, true), reason.to_string())))?;
                  tx.send((n, TickerOpcode::Finish))?;
                }
              }
            } else {
              tx.send((n, TickerOpcode::FinishWithError(name.to_rfc3339_opts(SecondsFormat::Secs, true), "Failed to resolve nearest episode".to_string())))?;
              tx.send((n, TickerOpcode::Finish))?;
            }
          }
          Err(reason) => {
            tx.send((n, TickerOpcode::FinishWithError(name.to_rfc3339_opts(SecondsFormat::Secs, true), reason.to_string())))?;
            tx.send((n, TickerOpcode::Finish))?;
          }
        }
      }
      None => {
        break;
      }
    }
  }

  Ok(())
}