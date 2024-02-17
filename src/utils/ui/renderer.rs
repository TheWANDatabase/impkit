use crate::setup_logger;
use crate::utils::ui::{overlays, pages};
use log::{debug, error, info, warn};
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
use std::collections::HashMap;
use std::io::stdout;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::sleep;

// This method is blocking, and should be called !!LAST!!
// after all other methods are called, as this will lock
// the main thread. Additional threads are spawned to handle
// rendering and task management
pub fn spawn(
    mutable_state: Arc<Mutex<HashMap<String, String>>>,
    use_file: bool,
    dir: String,
    file: String,
) {
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout())).unwrap();
    tokio::spawn(async move {
        if use_file {
            _ = setup_logger(Some(dir), Some(file));
        }
        debug!(target: "renderer", "Warming up");
        info!(target: "renderer", "Targeting frequency: 60Hz");
        loop {
            let mut state = mutable_state.lock().await;
            if state.get("exiting").unwrap() == &"true" {
                warn!(target: "renderer", "State authorized exit detected. Finishing up...");
                break;
            }

            terminal
                .draw(|frame| {
                    // No matter the page, always render it before the overlay, such that
                    // the overlay is always visible to the user until it is removed
                    match state["page"].as_str() {
                        pages::landing::SCREEN_NAME => pages::landing::render(frame, &mut state),

                        // If the page does not exist, we cannot render it
                        // This should either throw an error, or exit (I chose
                        // to make the application exit if the page is missing)
                        _ => {
                            error!(target: "renderer", "Page requested does not exist");
                            error!(target: "renderer", "Requested Page {}", state["page"]);
                            let message = format!(
                                "Page '{}' does not exist, exiting...",
                                state.get("page").unwrap()
                            );
                            state.insert("exiting".to_string(), "true".to_string());
                            state.insert("with_message".to_string(), message);
                        }
                    }

                    // Render overlays last, this way they are always visible to the
                    // user until irrelevant
                    match state["overlay"].as_str() {
                        overlays::help::SCREEN_NAME => overlays::help::render(frame, &mut state),
                        overlays::exit_confirmation::SCREEN_NAME => {
                            overlays::exit_confirmation::render(frame, &mut state)
                        }
                        "" => {}

                        // Catch all in case specified overlay does not currently exist
                        _ => {
                            error!(target: "renderer", "Overlay requested does not exist");
                            error!(target: "renderer", "Requested Overlay {}", state["overlay"]);

                            let message = format!(
                                "Overlay '{}' does not exist, exiting...",
                                state.get("overlay").unwrap()
                            );

                            state.insert("exiting".to_string(), "true".to_string());
                            state.insert("with_message".to_string(), message);
                        }
                    }
                })
                .unwrap();

            sleep(Duration::from_millis(16)).await;
        }
    });
}
