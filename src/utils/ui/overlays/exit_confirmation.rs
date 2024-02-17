use crate::utils::ui::utils::centered_rect;
use core::str::FromStr;
use crossterm::event::{KeyCode, KeyEvent};
use log::{debug, warn};
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Clear, Paragraph, Row, Table};
use ratatui::Frame;
use std::collections::HashMap;

pub const BLOCK_GLOBALS: bool = true;

pub const SCREEN_NAME: &'static str = "EXIT_OVERLAY";

pub fn render(frame: &mut Frame, state: &mut HashMap<String, String>) {
    // let default_bindings = vec![
    //     ["Q", "q", "Exit Application"],
    //     ["F1", "", "Display Keybindings"],
    // ];

    let viewport = frame.size();

    let min_x: f32 = 20.;
    let percent_x = ((viewport.width as f32 / 100.) * min_x).ceil() as u16;

    let min_y: f32 = 10.;
    let percent_y = ((viewport.height as f32 / 100.) * min_y).ceil() as u16;
    warn!(target: "overlays::exit_confirmation::render", "MinX {min_x} is {percent_x}% of the viewport width");
    warn!(target: "overlays::exit_confirmation::render", "MinY {min_y} is {percent_y}% of the viewport width");

    let popup = centered_rect(viewport, percent_x, percent_y);

    let areas = Layout::new(
        Direction::Vertical,
        [
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Min(0),
        ],
    )
    .split(popup);

    // let widths = [
    //     Constraint::Length(10),
    //     Constraint::Length(10),
    //     Constraint::Min(0),
    // ];
    // let height = inner.height;
    // let mut rows = vec![];
    //
    // for binding in default_bindings {
    //     rows.push(Row::new(binding))
    // }

    frame.render_widget(Clear, frame.size());
    frame.render_widget(
        Block::default()
            .borders(Borders::all())
            .bg(Color::Magenta)
            .fg(Color::Magenta)
            .add_modifier(Modifier::DIM),
        frame.size(),
    );
    frame.render_widget(Clear, popup);
    frame.render_widget(Block::default().borders(Borders::all()), popup);

    frame.render_widget(
        Paragraph::new(Text::from("Are you sure you wish to exit?"))
            .white()
            .on_blue(),
        areas[1],
    );

    let index = match state.get("exit_confirmation_selection_index") {
        Some(existing) => u32::from_str(existing.as_str()).unwrap(),
        None => 0,
    };

    let select_style = Style::new()
        .fg(Color::Black)
        .bg(Color::White)
        .add_modifier(Modifier::BOLD);

    let opt_yes = match index % 2 {
        0 => Span::raw(" Yes "),
        _ => Span::styled(" Yes ", select_style),
    };

    let opt_no = match index % 2 {
        1 => Span::raw(" No  "),
        _ => Span::styled(" No  ", select_style),
    };

    frame.render_widget(Line::from(vec![opt_no, Span::raw(" "), opt_yes]), areas[2]);
}

pub fn key_binding_handler(key: KeyEvent, state: &mut HashMap<String, String>) {
    match key.code {
        // Handle moving the cursor left by one
        // No need to worry about directionality in a 2 option menu (which this is)
        KeyCode::Right | KeyCode::Left | KeyCode::Tab => {
            let index = match state.get("exit_confirmation_selection_index") {
                Some(existing) => u32::from_str(existing.as_str()).unwrap(),
                None => 0,
            };
            debug!("Incrementing index by 1 {index} -> {}", index + 1);
            state.insert(
                "exit_confirmation_selection_index".to_string(),
                (index + 1).to_string(),
            );
        }

        // Handle confirming the selection
        KeyCode::Enter => {
            let index = match state.get("exit_confirmation_selection_index") {
                Some(existing) => u32::from_str(existing.as_str()).unwrap(),
                None => 0,
            };

            // The selection is odd, and is therefore a "yes"
            if index % 2 == 1 {
                warn!("exit overlay detected 'yes' selection");
                state.insert("exiting".to_string(), "true".to_string());
            } else {
                state.insert(
                    "exit_confirmation_selection_index".to_string(),
                    0.to_string(),
                );
                state.insert("overlay".to_string(), "".to_string());
            }
        }

        // Handle escaping the confirmation dialogue
        KeyCode::Esc => {
            state.insert(
                "exit_confirmation_selection_index".to_string(),
                0.to_string(),
            );
            state.insert("overlay".to_string(), "".to_string());
        }
        _ => {}
    }
}

pub fn key_bindings() -> Vec<[String; 2]> {
    return vec![];
}
