use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Session {
    pub workspace_id: String,
    pub version: u32,
    pub layout: Layout,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Layout {
    pub columns: Vec<Column>,
    pub active_id: String,
    pub expanded_folders: Option<BTreeMap<String, Option<String>>>,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Column {
    pub id: String,
    pub panes: Vec<Pane>,
    pub size: Option<f64>,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Pane {
    pub id: String,
    pub content: Option<Content>,
    pub position: Option<Position>,
    pub size: Option<f64>,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Content {
    pub kind: String,
    pub id: String,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Position {
    pub page_index: u32,
    pub y: f64,
    pub position_version: u32,
}
impl Session {
    pub fn validate(&self) -> Result<(), String> {
        let mut column_ids = HashSet::new();
        let mut pane_ids = HashSet::new();
        let mut drawings = HashSet::new();
        let mut active = false;
        if self.version != 1 || !(1..=2).contains(&self.layout.columns.len()) {
            return Err("Unsupported workspace session.".into());
        }
        if self
            .layout
            .expanded_folders
            .as_ref()
            .is_some_and(|folders| {
                folders.len() > 1000
                    || folders.iter().any(|(group, folder)| {
                        !identifier(group) || folder.as_ref().is_some_and(|id| !identifier(id))
                    })
            })
        {
            return Err("Invalid session folder state.".into());
        }
        for column in &self.layout.columns {
            if !identifier(&column.id)
                || !column_ids.insert(&column.id)
                || !size(column.size)
                || !(1..=2).contains(&column.panes.len())
            {
                return Err("Invalid session columns.".into());
            }
            for pane in &column.panes {
                if !identifier(&pane.id) || !pane_ids.insert(&pane.id) || !size(pane.size) {
                    return Err("Invalid session pane.".into());
                }
                active |= pane.id == self.layout.active_id;
                if let Some(content) = &pane.content
                    && (!identifier(&content.id)
                        || !matches!(content.kind.as_str(), "pdf" | "drawing")
                        || (content.kind == "drawing" && !drawings.insert(&content.id)))
                {
                    return Err("Invalid session material.".into());
                }
                if let Some(position) = &pane.position
                    && (!position.y.is_finite()
                        || !(0.0..=1.0).contains(&position.y)
                        || !matches!(position.position_version, 1 | 2))
                {
                    return Err("Invalid session reading position.".into());
                }
            }
        }
        if !active {
            return Err("Session has no active pane.".into());
        }
        Ok(())
    }
}
fn identifier(value: &str) -> bool {
    !value.is_empty() && value.len() <= 120
}
fn size(value: Option<f64>) -> bool {
    value.is_none_or(|value| value.is_finite() && (1.0..=100.0).contains(&value))
}
