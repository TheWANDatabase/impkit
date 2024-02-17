use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use crossterm::ExecutableCommand;
use log::{debug, warn};
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
use std::collections::HashMap;
use std::error::Error;
use std::io::stdout;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, MutexGuard};
use tokio::time::sleep;

pub async fn spawn_ui(use_file: bool, dir: String, file: String) -> Result<(), Box<dyn Error>> {
    debug!(target:"main_thread", "Spawning UI processes");

    let mut state: HashMap<String, String> = HashMap::new();
    state.insert("exiting".to_string(), "false".to_string());
    state.insert("page".to_string(), pages::landing::SCREEN_NAME.to_string());
    state.insert("overlay".to_string(), "".to_string());
    state.insert("vault_status".to_string(), "unknown".to_string());
    state.insert("cursor_horizontal".to_string(), "0".to_string());
    state.insert("cursor_vertical".to_string(), "0".to_string());
    state.insert("selection_hash".to_string(), "".to_string());
    debug!(target:"main_thread", "initialising state");
    let mutable_state = Arc::new(Mutex::new(state));
    let internal_state = mutable_state.clone();

    let mut terminal = Terminal::new(CrosstermBackend::new(stdout())).unwrap();

    debug!(target:"main_thread", "entering alternate buffer");
    stdout().execute(EnterAlternateScreen)?;
    enable_raw_mode()?;

    debug!(target:"main_thread", "spawning renderer thread");
    renderer::spawn(mutable_state.clone(), use_file, dir.clone(), file.clone());

    debug!(target:"main_thread", "spawning key bind handler");
    keybinds::spawn(mutable_state.clone(), use_file, dir.clone(), file.clone());

    loop {
        if internal_state.lock().await["exiting"] == "true" {
            break;
        }

        sleep(Duration::from_millis(100)).await;
    }
    warn!(target:"main_thread", "State manager declared exit permitted, cleaning up");

    terminal.clear()?;
    debug!(target:"main_thread", "Leaving alternate buffer");
    stdout().execute(LeaveAlternateScreen)?;
    disable_raw_mode()?;
    debug!(target:"main_thread", "Exiting...");

    // #[cfg(debug_assertions)]
    dump_state(internal_state.lock().await);

    if internal_state.lock().await.contains_key("with_message") {
        warn!(target:"main_thread",
            "A parting message: '{}'",
            internal_state.lock().await["with_message"]
        );
    }
    debug!(target:"main_thread", "Goodbye...");

    Ok(())
}

fn dump_state(state: MutexGuard<HashMap<String, String>>) {
    debug!(target:"state_manager", "STATE MANAGER DUMPING:");

    for (key, value) in state.iter() {
        debug!(target:"state_manager", "KEY {key} - VALUE '{value}'")
    }
}

pub mod overlays;
pub mod pages;
pub mod utils;

pub mod keybinds;

pub mod renderer;
