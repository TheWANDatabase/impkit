use crate::utils::dropbox::thread_tasks::download_runtime;
use crate::utils::tickers::TickerOpcode;
use core::str::FromStr;
use dropbox_sdk::default_client::UserAuthDefaultClient;
use dropbox_sdk::files::ListFolderArg;
use dropbox_sdk::{files, oauth2};
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use tokio::spawn;

pub mod thread_tasks;

pub async fn list_folder(path: String) -> Result<Vec<files::FileMetadata>, Box<dyn Error>> {
    let auth = oauth2::get_auth_from_env_or_prompt();
    let dropbox_client: UserAuthDefaultClient = UserAuthDefaultClient::new(auth);
    let timestamps_folder = files::list_folder(
        &dropbox_client,
        &ListFolderArg::new(path).with_include_media_info(true),
    )??;
    let mut directory_list: Vec<files::FileMetadata> = vec![];
    for file in timestamps_folder.entries {
        match file {
            files::Metadata::File(entry) => {
                directory_list.push(entry);
            }
            _ => {}
        }
    }

    return Ok(directory_list);
}

pub async fn download_folder(path: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
    let results: HashMap<String, Value> = HashMap::new();
    let directory_list = list_folder(path).await?;

    let error_style = ProgressStyle::with_template(
        "[{elapsed_precise}] {bar:80.red/red} {pos:>7}/{len:7} {eta} | {msg}",
    )?;
    let download_style = ProgressStyle::with_template(
        "[{elapsed_precise}] {bar:80.cyan/blue} {pos:>7}/{len:7} {eta} | {msg}",
    )?;
    let multi_bar = MultiProgress::new();
    let global_download_progress = multi_bar.add(
        ProgressBar::new(directory_list.len() as u64).with_style(ProgressStyle::with_template(
            "[{elapsed_precise}] {bar:80.green/magenta} {pos:>7}/{len:7} {eta} | {msg}",
        )?),
    );
    let shared_files = Arc::new(Mutex::new(directory_list.into_iter()));
    let multi_results = Arc::new(Mutex::new(results));

    let (tx, rx) = mpsc::channel();
    let mut bars = vec![];
    let max_threads = usize::from_str(&env::var("IKIT_MAX_THREADS")?).unwrap_or(1);
    // Send the actual file downloads to the different
    for n in 0..max_threads {
        bars.push(multi_bar.add(ProgressBar::new(100).with_style(download_style.clone())));
        let tx = tx.clone();
        let shared_files = shared_files.clone();
        let shared_results = multi_results.clone();

        spawn(async move {
            let _ = download_runtime(n, tx, shared_files, shared_results).await;
        });
    }
    drop(tx);
    global_download_progress.tick();
    global_download_progress.set_message("Downloading...");
    global_download_progress.enable_steady_tick(Duration::from_secs(1));

    while let Ok((n, opcode)) = rx.recv() {
        match opcode {
            TickerOpcode::Reset => {
                bars[n].finish_and_clear();
                bars[n] = multi_bar.add(ProgressBar::new(100).with_style(download_style.clone()));
                bars[n].enable_steady_tick(Duration::from_secs(1));
            }
            TickerOpcode::Increment(amount) => {
                bars[n].inc(amount);
            }
            TickerOpcode::Tick => bars[n].tick(),
            TickerOpcode::Message(job, stage) => {
                bars[n].set_message(format!("{} - {}", stage, job));
            }
            TickerOpcode::Finish => {
                bars[n].set_position(100);
                global_download_progress.inc(1)
            }
            TickerOpcode::FinishWithError(job, error) => {
                bars[n].set_style(error_style.clone());
                bars[n].tick();
                bars[n].set_position(100);
                bars[n].set_message(format!("ERROR - {} - {}", error, job));
                bars[n].disable_steady_tick();
            }
        }
    }
    let outcome = multi_results.lock().unwrap().clone();
    Ok(outcome)
}
