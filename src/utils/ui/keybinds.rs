use crate::setup_logger;
use crate::utils::ui::{overlays, pages};
use crossterm::event;
use crossterm::event::{KeyCode, KeyEventKind};
use log::{debug, info};
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::Arc;
use tokio::sync::Mutex;

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
    tokio::spawn(async move {
        if use_file {
            _ = setup_logger(Some(dir), Some(file));
        }
        debug!(target: "binding_manager", "Warming up");
        info!(target: "binding_manager", "Targeting frequency: 60Hz");
        loop {
            let mut state = mutable_state.lock().await;

            if event::poll(std::time::Duration::from_millis(100)).unwrap() {
                if let event::Event::Key(key) = event::read().unwrap() {
                    let page_blocks_globals = match state["page"].as_str() {
                        pages::landing::SCREEN_NAME => pages::landing::BLOCK_GLOBALS,
                        _ => false,
                    };
                    let overlay_blocks_globals = match state["overlay"].as_str() {
                        overlays::help::SCREEN_NAME => overlays::help::BLOCK_GLOBALS,
                        overlays::exit_confirmation::SCREEN_NAME => {
                            overlays::exit_confirmation::BLOCK_GLOBALS
                        }
                        _ => false,
                    };

                    // Handle all keybindings (global and page-defined)
                    if key.kind == KeyEventKind::Press {
                        if overlay_blocks_globals {
                            match state["overlay"].as_str() {
                                overlays::exit_confirmation::SCREEN_NAME => {
                                    overlays::exit_confirmation::key_binding_handler(
                                        key, &mut state,
                                    );
                                }
                                _ => {}
                            };
                        } else if page_blocks_globals {
                            match state["page"].as_str() {
                                _ => {}
                            };
                        } else {
                            match key.code {
                                // Allow the application to exit when being rendered,
                                // even if it is already performing a task
                                KeyCode::Char('q') | KeyCode::Char('Q') => {
                                    _ = state.insert(
                                        "overlay".to_string(),
                                        overlays::exit_confirmation::SCREEN_NAME.to_string(),
                                    )
                                }

                                // Display help overlay
                                KeyCode::F(1) => {
                                    match state["overlay"].as_str() {
                                        overlays::help::SCREEN_NAME => {
                                            state.insert("overlay".to_string(), "".to_string())
                                        }
                                        _ => state.insert(
                                            "overlay".to_string(),
                                            overlays::help::SCREEN_NAME.to_string(),
                                        ),
                                    };
                                }

                                KeyCode::Esc => {
                                    state.insert("overlay".to_string(), "".to_string());
                                }

                                // Overlays take keybinding priority, so
                                // process their inputs first
                                _ => match state["overlay"].as_str() {
                                    // Match page-specific keybindings
                                    "" => match state["page"].as_str() {
                                        // Use when a page does not have any page-specific
                                        // keybindings, this will effectively ignore the bind
                                        _ => {}
                                    },

                                    // Match bindings for "help" overlay
                                    overlays::help::SCREEN_NAME => {
                                        overlays::help::key_binding_handler(key)
                                    }
                                    _ => {}
                                },
                            }
                        }
                    }
                }
            }

            if state.get("exiting").unwrap() == &"true" {
                break;
            }
        }
    });
}
