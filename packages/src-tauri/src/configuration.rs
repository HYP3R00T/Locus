use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};

const LIMIT: u64 = 256 * 1024;
const BUILTINS: [&str; 6] = [
    include_str!("../../src-nextjs/lib/themes/default-light.json"),
    include_str!("../../src-nextjs/lib/themes/default-dark.json"),
    include_str!("../../src-nextjs/lib/themes/catppuccin-mocha.json"),
    include_str!("../../src-nextjs/lib/themes/nord.json"),
    include_str!("../../src-nextjs/lib/themes/dracula.json"),
    include_str!("../../src-nextjs/lib/themes/tokyo-night.json"),
];
const COLOR_ROLES: [&str; 8] = [
    "background",
    "foreground",
    "surface",
    "muted",
    "mutedForeground",
    "accent",
    "accentForeground",
    "border",
];
fn builtin_themes() -> Result<Vec<Theme>, String> {
    BUILTINS
        .iter()
        .map(|source| serde_json::from_str(source).map_err(error))
        .collect()
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Preferences {
    pub version: u32,
    pub theme: String,
    pub light_theme: String,
    pub dark_theme: String,
    pub whiteboard_controls_visible: bool,
}
impl Default for Preferences {
    fn default() -> Self {
        Self {
            version: 1,
            theme: "system".into(),
            light_theme: "default-light".into(),
            dark_theme: "default-dark".into(),
            whiteboard_controls_visible: true,
        }
    }
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Keybindings {
    pub version: u32,
    pub bindings: BTreeMap<String, String>,
}
impl Default for Keybindings {
    fn default() -> Self {
        Self {
            version: 1,
            bindings: BTreeMap::new(),
        }
    }
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub mode: String,
    pub colors: BTreeMap<String, String>,
}
#[derive(Deserialize)]
pub struct LegacyConfiguration {
    pub preferences: Preferences,
    pub keybindings: Keybindings,
}
#[derive(Serialize)]
pub struct ConfigurationSnapshot {
    pub directory: String,
    pub preferences: Preferences,
    pub keybindings: Keybindings,
    pub themes: Vec<Theme>,
    pub warnings: Vec<String>,
}
#[derive(Serialize)]
pub struct ThemeSnapshot {
    pub themes: Vec<Theme>,
    pub warnings: Vec<String>,
}
pub struct Configuration {
    directory: PathBuf,
    lock: Mutex<()>,
}

fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn identifier(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && value
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}
fn validate_preferences(value: &Preferences) -> Result<(), String> {
    if value.version != 1
        || !identifier(&value.theme)
        || !identifier(&value.light_theme)
        || !identifier(&value.dark_theme)
    {
        return Err(
            "Unsupported or invalid preferences.json. Existing settings were preserved.".into(),
        );
    }
    Ok(())
}
fn validate_bindings(value: &Keybindings) -> Result<(), String> {
    if value.version != 1
        || value.bindings.len() > 256
        || value.bindings.iter().any(|(key, binding)| {
            key.len() > 80
                || !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '.')
                || binding.len() > 80
        })
    {
        return Err(
            "Unsupported or invalid keybindings.json. Existing settings were preserved.".into(),
        );
    }
    Ok(())
}
fn validate_theme(theme: &Theme) -> Result<(), String> {
    if !identifier(&theme.id)
        || theme.id == "system"
        || theme.name.trim().is_empty()
        || theme.name.len() > 100
        || !matches!(theme.mode.as_str(), "light" | "dark")
    {
        return Err("A theme needs an ID (lowercase letters, digits, hyphens), a name, and mode light or dark.".into());
    }
    let defaults: Theme = serde_json::from_str(BUILTINS[0]).map_err(error)?;
    if theme
        .colors
        .keys()
        .any(|role| !defaults.colors.contains_key(role) && !COLOR_ROLES.contains(&role.as_str()))
    {
        return Err("Unknown theme color token. Copy a bundled theme for supported tokens.".into());
    }
    if theme.colors.values().any(|color| {
        !matches!(color.len(), 7 | 9)
            || !color.starts_with('#')
            || !color[1..].bytes().all(|b| b.is_ascii_hexdigit())
    }) {
        return Err("Theme colors must use #RRGGBB or #RRGGBBAA notation.".into());
    }
    Ok(())
}
fn read_json(path: &Path) -> Result<Value, String> {
    let mut file = fs::File::open(path).map_err(error)?;
    let mut bytes = Vec::new();
    std::io::Read::read_to_end(&mut std::io::Read::take(&mut file, LIMIT + 1), &mut bytes)
        .map_err(error)?;
    if bytes.len() as u64 > LIMIT {
        return Err("Configuration files must not exceed 256 KiB.".into());
    }
    serde_json::from_slice(&bytes).map_err(error)
}
fn write_json(path: &Path, value: &impl Serialize, create: bool) -> Result<(), String> {
    let mut bytes = serde_json::to_vec_pretty(value).map_err(error)?;
    bytes.push(b'\n');
    if bytes.len() as u64 > LIMIT {
        return Err("Configuration files must not exceed 256 KiB.".into());
    }
    if create {
        match fs::File::create_new(path) {
            Ok(mut file) => {
                file.write_all(&bytes).map_err(error)?;
                file.sync_all().map_err(error)
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => Ok(()),
            Err(e) => Err(error(e)),
        }
    } else {
        let temporary = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
        let result = (|| {
            let mut file = fs::File::create_new(&temporary).map_err(error)?;
            file.write_all(&bytes).map_err(error)?;
            file.sync_all().map_err(error)?;
            fs::rename(&temporary, path).map_err(error)
        })();
        if result.is_err() {
            let _ = fs::remove_file(temporary);
        }
        result
    }
}
impl Configuration {
    pub fn new(directory: PathBuf) -> Self {
        Self {
            directory,
            lock: Mutex::new(()),
        }
    }
    pub fn directory(&self) -> &Path {
        &self.directory
    }
    pub fn exists(&self) -> bool {
        self.directory.join("preferences.json").is_file()
            && self.directory.join("keybindings.json").is_file()
    }
    pub fn load(
        &self,
        legacy: Option<LegacyConfiguration>,
    ) -> Result<ConfigurationSnapshot, String> {
        let _guard = self.lock.lock().map_err(error)?;
        fs::create_dir_all(self.directory.join("themes")).map_err(error)?;
        let (preferences, bindings) = legacy
            .map(|value| (value.preferences, value.keybindings))
            .unwrap_or_default();
        validate_preferences(&preferences)?;
        validate_bindings(&bindings)?;
        write_json(&self.directory.join("preferences.json"), &preferences, true)?;
        write_json(&self.directory.join("keybindings.json"), &bindings, true)?;
        for theme in builtin_themes()? {
            validate_theme(&theme)?;
            let path = self
                .directory
                .join("themes")
                .join(format!("{}.json", theme.id));
            // Expand only unchanged templates from earlier bundled palette formats.
            // Custom edits and partial palettes remain untouched.
            let legacy_template = read_json(&path)
                .ok()
                .and_then(|value| serde_json::from_value::<Theme>(value).ok())
                .is_some_and(|existing| {
                    existing.id == theme.id
                        && existing.name == theme.name
                        && existing.mode == theme.mode
                        && ((existing.colors.is_empty() && theme.id.starts_with("default-"))
                            || (existing.colors.len() == 33
                                && existing
                                    .colors
                                    .iter()
                                    .all(|(key, color)| theme.colors.get(key) == Some(color))
                                && [
                                    "titlebar-background",
                                    "titlebar-foreground",
                                    "toolbar-background",
                                    "toolbar-foreground",
                                    "pane-background",
                                    "pane-foreground",
                                    "pane-border",
                                ]
                                .iter()
                                .all(|key| !existing.colors.contains_key(*key)))
                            || (existing.colors.len() == 8
                                && [
                                    ("background", "background"),
                                    ("foreground", "foreground"),
                                    ("surface", "context-surface"),
                                    ("muted", "muted"),
                                    ("mutedForeground", "muted-foreground"),
                                    ("accent", "primary"),
                                    ("accentForeground", "primary-foreground"),
                                    ("border", "border"),
                                ]
                                .iter()
                                .all(|(old, new)| {
                                    existing.colors.get(*old) == theme.colors.get(*new)
                                })))
                });
            write_json(&path, &theme, !legacy_template)?;
        }
        let preferences: Preferences =
            serde_json::from_value(read_json(&self.directory.join("preferences.json"))?)
                .map_err(error)?;
        let keybindings: Keybindings =
            serde_json::from_value(read_json(&self.directory.join("keybindings.json"))?)
                .map_err(error)?;
        validate_preferences(&preferences)?;
        validate_bindings(&keybindings)?;
        let palette = self.read_themes()?;
        let themes = palette.themes;
        let warnings = palette.warnings;
        Ok(ConfigurationSnapshot {
            directory: self.directory.to_string_lossy().into_owned(),
            preferences,
            keybindings,
            themes,
            warnings,
        })
    }
    // Theme refresh never reads or replaces preference files.
    pub fn read_themes(&self) -> Result<ThemeSnapshot, String> {
        let mut themes = Vec::new();
        let mut warnings = Vec::new();
        for entry in fs::read_dir(self.directory.join("themes")).map_err(error)? {
            let entry = entry.map_err(error)?;
            if entry
                .path()
                .extension()
                .is_none_or(|extension| extension != "json")
            {
                continue;
            }
            let parsed: Result<Theme, String> = (|| {
                if !entry.file_type().map_err(error)?.is_file() {
                    return Err("Theme must be a regular file.".into());
                }
                let theme: Theme =
                    serde_json::from_value(read_json(&entry.path())?).map_err(error)?;
                validate_theme(&theme)?;
                if entry.path().file_stem().and_then(|stem| stem.to_str())
                    != Some(theme.id.as_str())
                {
                    return Err("Theme filename must match its ID.".into());
                }
                if themes.iter().any(|other: &Theme| other.id == theme.id) {
                    return Err("Duplicate theme ID.".into());
                }
                Ok(theme)
            })();
            match parsed {
                Ok(theme) => themes.push(theme),
                Err(reason) => {
                    warnings.push(format!("{}: {reason}", entry.file_name().to_string_lossy()))
                }
            }
        }
        themes.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(ThemeSnapshot { themes, warnings })
    }
    pub fn save(&self, file: &str, expected: Value, value: Value) -> Result<(), String> {
        let _guard = self.lock.lock().map_err(error)?;
        match file {
            "preferences" => {
                validate_preferences(&serde_json::from_value(value.clone()).map_err(error)?)?
            }
            "keybindings" => {
                validate_bindings(&serde_json::from_value(value.clone()).map_err(error)?)?
            }
            _ => return Err("Unknown configuration file.".into()),
        }
        let path = self.directory.join(format!("{file}.json"));
        if read_json(&path)? != expected {
            return Err("Settings changed on disk. Reload configuration before saving.".into());
        }
        write_json(&path, &value, false)
    }
    pub fn import_theme(&self, path: &Path) -> Result<(), String> {
        let _guard = self.lock.lock().map_err(error)?;
        let theme: Theme = serde_json::from_value(read_json(path)?).map_err(error)?;
        validate_theme(&theme)?;
        let destination = self
            .directory
            .join("themes")
            .join(format!("{}.json", theme.id));
        if destination.exists() {
            return Err(
                "A theme with this ID already exists. Give the imported theme a unique ID.".into(),
            );
        }
        write_json(&destination, &theme, true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            Self(std::env::temp_dir().join(format!("locus-config-{}", uuid::Uuid::new_v4())))
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    #[test]
    fn defaults_are_created_and_legacy_is_imported_only_for_missing_files() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.join("nested/locus"));
        let prefs = Preferences {
            theme: "default-dark".into(),
            whiteboard_controls_visible: false,
            ..Preferences::default()
        };
        let loaded = config
            .load(Some(LegacyConfiguration {
                preferences: prefs,
                keybindings: Keybindings {
                    version: 1,
                    bindings: BTreeMap::from([("palette".into(), "Mod+Shift+Y".into())]),
                },
            }))
            .unwrap();
        assert_eq!(loaded.preferences.theme, "default-dark");
        assert!(!loaded.preferences.whiteboard_controls_visible);
        assert_eq!(
            loaded.keybindings.bindings.get("palette").unwrap(),
            "Mod+Shift+Y"
        );
        assert_eq!(loaded.themes.len(), 6);
        assert_eq!(config.load(None).unwrap().preferences.theme, "default-dark");
    }
    #[test]
    fn malformed_and_future_settings_are_not_overwritten() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.clone());
        config.load(None).unwrap();
        let path = fixture.0.join("preferences.json");
        let mut future = serde_json::to_value(Preferences::default()).unwrap();
        future["version"] = json!(99);
        for content in ["broken json".to_string(), future.to_string()] {
            fs::write(&path, &content).unwrap();
            assert!(config.load(None).is_err());
            assert_eq!(fs::read_to_string(&path).unwrap(), content);
        }
    }
    #[test]
    fn saves_reject_stale_edits_and_unknown_paths() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.clone());
        let original = config.load(None).unwrap().preferences;
        let mut updated = original.clone();
        updated.theme = "default-dark".into();
        config
            .save(
                "preferences",
                serde_json::to_value(&original).unwrap(),
                serde_json::to_value(&updated).unwrap(),
            )
            .unwrap();
        assert!(
            config
                .save(
                    "preferences",
                    serde_json::to_value(&original).unwrap(),
                    serde_json::to_value(&original).unwrap()
                )
                .is_err()
        );
        assert!(config.save("../escape", json!({}), json!({})).is_err());
        assert_eq!(config.load(None).unwrap().preferences.theme, "default-dark");
    }
    #[test]
    fn imports_are_validated_and_duplicate_ids_do_not_replace_files() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.clone());
        config.load(None).unwrap();
        let source = fixture.0.join("import.json");
        fs::write(
            &source,
            r##"{"id":"custom","name":"Custom","mode":"light","colors":{}}"##,
        )
        .unwrap();
        config.import_theme(&source).unwrap();
        assert!(config.import_theme(&source).is_err());
        assert_eq!(config.load(None).unwrap().themes.len(), 7);
        fs::write(
            &source,
            r##"{"id":"../escape","name":"Invalid","mode":"dark","colors":{}}"##,
        )
        .unwrap();
        assert!(config.import_theme(&source).is_err());
        fs::write(fixture.0.join("themes/invalid.json"), "invalid").unwrap();
        assert_eq!(config.load(None).unwrap().warnings.len(), 1);
    }

    #[test]
    fn themes_reject_css_unknown_roles_reserved_ids_and_oversized_files() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.clone());
        config.load(None).unwrap();
        let mut theme = Theme {
            id: "custom".into(),
            name: "Custom".into(),
            mode: "dark".into(),
            colors: COLOR_ROLES
                .into_iter()
                .map(|role| (role.into(), "#aabbcc".into()))
                .collect(),
        };
        assert!(validate_theme(&theme).is_ok());
        theme
            .colors
            .insert("accent".into(), "url(https://example.com)".into());
        assert!(validate_theme(&theme).is_err());
        theme.colors.insert("accent".into(), "#aabbcc".into());
        theme.colors.remove("border");
        theme.colors.insert("unknown".into(), "#aabbcc".into());
        assert!(validate_theme(&theme).is_err());
        theme.colors.clear();
        theme.id = "system".into();
        assert!(validate_theme(&theme).is_err());
        theme.id = "custom".into();
        theme.mode = "unknown".into();
        assert!(validate_theme(&theme).is_err());
        let oversized = fixture.0.join("large.json");
        fs::write(&oversized, vec![b' '; LIMIT as usize + 1]).unwrap();
        assert!(config.import_theme(&oversized).is_err());
    }
    #[test]
    fn partial_tokens_and_alpha_colors_are_validated() {
        let mut theme = Theme {
            id: "partial".into(),
            name: "Partial".into(),
            mode: "dark".into(),
            colors: BTreeMap::from([("titlebar-background".into(), "#aabbcc80".into())]),
        };
        assert!(validate_theme(&theme).is_ok());
        theme.colors.insert("primary".into(), "#123456".into());
        assert!(validate_theme(&theme).is_ok());
        for invalid in ["#abc", "#12345", "#123456789", "red", "var(--background)"] {
            theme.colors.insert("primary".into(), invalid.into());
            assert!(validate_theme(&theme).is_err());
        }
    }

    #[test]
    fn theme_refresh_discovers_changes_without_reading_or_writing_preferences() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.clone());
        config.load(None).unwrap();
        let path = fixture.0.join("themes/custom.json");
        fs::write(
            &path,
            r##"{"id":"custom","name":"Custom","mode":"dark","colors":{"popover":"#123456"}}"##,
        )
        .unwrap();
        // A malformed preferences file must not prevent theme-only refresh.
        fs::write(fixture.0.join("preferences.json"), "unchanged-invalid").unwrap();
        assert_eq!(config.read_themes().unwrap().themes.len(), 7);
        fs::write(&path, "incomplete edit").unwrap();
        let snapshot = config.read_themes().unwrap();
        assert_eq!(snapshot.themes.len(), 6);
        assert_eq!(snapshot.warnings.len(), 1);
        fs::remove_file(path).unwrap();
        assert!(config.read_themes().unwrap().warnings.is_empty());
        assert_eq!(
            fs::read_to_string(fixture.0.join("preferences.json")).unwrap(),
            "unchanged-invalid"
        );
    }

    #[test]
    fn expands_unchanged_default_templates_but_preserves_custom_edits() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.clone());
        config.load(None).unwrap();
        let path = fixture.0.join("themes/default-dark.json");
        fs::write(
            &path,
            r##"{"id":"default-dark","name":"Default Dark","mode":"dark","colors":{}}"##,
        )
        .unwrap();
        config.load(None).unwrap();
        let expanded: Theme = serde_json::from_value(read_json(&path).unwrap()).unwrap();
        assert!(expanded.colors.len() > 30);
        let custom = r##"{"id":"default-dark","name":"Default Dark","mode":"dark","colors":{"background":"#123456"}}"##;
        fs::write(&path, custom).unwrap();
        config.load(None).unwrap();
        assert_eq!(fs::read_to_string(path).unwrap(), custom);
    }

    #[test]
    fn bundled_themes_share_complete_token_sets() {
        let themes = builtin_themes().unwrap();
        let expected: Vec<_> = themes[0].colors.keys().cloned().collect();
        for theme in themes {
            validate_theme(&theme).unwrap();
            assert_eq!(theme.colors.keys().cloned().collect::<Vec<_>>(), expected);
        }
    }
    #[test]
    fn expands_previous_component_palette_without_overwriting_custom_edits() {
        let fixture = Fixture::new();
        let config = Configuration::new(fixture.0.clone());
        config.load(None).unwrap();
        let mut nord = builtin_themes()
            .unwrap()
            .into_iter()
            .find(|theme| theme.id == "nord")
            .unwrap();
        let added = [
            "titlebar-background",
            "titlebar-foreground",
            "toolbar-background",
            "toolbar-foreground",
            "pane-background",
            "pane-foreground",
            "pane-border",
        ];
        for key in added {
            nord.colors.remove(key);
        }
        assert_eq!(nord.colors.len(), 33);
        let path = fixture.0.join("themes/nord.json");
        write_json(&path, &nord, false).unwrap();
        let loaded = config.load(None).unwrap();
        let upgraded = loaded
            .themes
            .iter()
            .find(|theme| theme.id == "nord")
            .unwrap();
        assert_eq!(upgraded.colors["titlebar-background"], "#3b4252");
        assert_eq!(upgraded.colors["pane-background"], "#2e3440");
        nord.colors.insert("background".into(), "#123456".into());
        write_json(&path, &nord, false).unwrap();
        config.load(None).unwrap();
        let preserved: Theme = serde_json::from_value(read_json(&path).unwrap()).unwrap();
        assert_eq!(preserved.colors, nord.colors);
    }
}
