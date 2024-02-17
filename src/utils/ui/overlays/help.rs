use crate::utils::ui::utils::centered_rect;
use crossterm::event::KeyEvent;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Clear, Row, Table};
use ratatui::Frame;
use std::collections::HashMap;
pub const BLOCK_GLOBALS: bool = true;

pub const SCREEN_NAME: &'static str = "HELP";

pub fn render(frame: &mut Frame, state: &mut HashMap<String, String>) {
    let default_bindings = vec![
        ["Q", "q", "Exit Application"],
        ["F1", "", "Display Keybindings"],
    ];

    let viewport = frame.size();
    let popup = centered_rect(viewport, 80, 80);
    let inner = popup.inner(&Margin::new(2, 1));

    let widths = [
        Constraint::Length(10),
        Constraint::Length(10),
        Constraint::Min(0),
    ];
    let height = inner.height;
    let mut rows = vec![];

    for binding in default_bindings {
        rows.push(Row::new(binding))
    }

    frame.render_widget(Clear, popup);
    frame.render_widget(
        Table::new(rows, widths).block(Block::default().borders(Borders::all()).title("Help")),
        popup,
    );
}

pub fn key_binding_handler(_key: KeyEvent) {}

pub fn key_bindings() -> Vec<[String; 2]> {
    return vec![];
}
