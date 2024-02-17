use crossterm::event::KeyEvent;
use ratatui::layout::Margin;
use ratatui::prelude::Stylize;
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;
use std::collections::HashMap;

pub const SCREEN_NAME: &'static str = "LANDING";
pub const BLOCK_GLOBALS: bool = false;

pub fn render(frame: &mut Frame, state: &mut HashMap<String, String>) {
    let area = frame.size();
    let inner = area.inner(&Margin::new(1, 1));
    // let left = inner.

    // dbg!("Area: {}x{}", area.width, area.height);

    frame.render_widget(
        Block::default().borders(Borders::all()).title(format!(
            " Import Kit - Vault Status: {} ",
            state["vault_status"]
        )),
        area,
    );
    frame.render_widget(
        Paragraph::new("Hello Ratatui! (press 'q' to quit)")
            .white()
            .on_blue(),
        inner,
    );

    state.insert("selector_x_max".to_string(), 2.to_string());
    state.insert("selector_x_loop".to_string(), "false".to_string());
    state.insert("selector_y_max".to_string(), 2.to_string());
    state.insert("selector_y_loop".to_string(), "true".to_string());
}

pub fn key_binding_handler(key: KeyEvent) {}

pub fn key_bindings() -> Vec<[String; 2]> {
    return vec![];
}
