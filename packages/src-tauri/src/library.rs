use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::Mutex,
};
use uuid::Uuid;

type Result<T> = std::result::Result<T, String>;
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn id() -> String {
    Uuid::new_v4().to_string()
}
fn title(value: &str) -> Result<&str> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > 120 {
        return Err("Use a title between 1 and 120 characters.".into());
    }
    Ok(value)
}

pub struct Library {
    db: Mutex<Connection>,
    drawings_root: PathBuf,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    id: String,
    title: String,
    icon: Option<String>,
    icon_color: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    parent_id: Option<String>,
    id: String,
    workspace_id: String,
    title: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    id: String,
    workspace_id: String,
    folder_id: Option<String>,
    title: String,
    path: String,
    page_index: u32,
    y: f64,
    position_version: u32,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Navigation {
    workspace_id: String,
    folder_id: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    workspaces: Vec<Workspace>,
    folders: Vec<Folder>,
    documents: Vec<Document>,
    drawings: Vec<Drawing>,
    navigation: Vec<Navigation>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Drawing {
    id: String,
    workspace_id: String,
    title: String,
}
#[derive(Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum Action {
    List,
    CreateDrawing {
        workspace_id: String,
        title: String,
    },
    RenameDrawing {
        drawing_id: String,
        title: String,
    },
    RemoveDrawing {
        drawing_id: String,
    },
    CreateWorkspace {
        title: String,
    },
    UpdateWorkspace {
        title: String,
        workspace_id: String,
        icon: Option<String>,
        icon_color: Option<String>,
    },
    RemoveWorkspace {
        workspace_id: String,
    },
    CreateFolder {
        parent_id: Option<String>,
        workspace_id: String,
        title: String,
    },
    SelectFolder {
        workspace_id: String,
        folder_id: Option<String>,
    },
    RemoveFolder {
        folder_id: String,
    },
    RemoveDocument {
        workspace_id: String,
        document_id: String,
    },
    RenameDocument {
        workspace_id: String,
        document_id: String,
        title: String,
    },
    MoveDocument {
        workspace_id: String,
        document_id: String,
        folder_id: Option<String>,
    },
    RenameFolder {
        folder_id: String,
        title: String,
    },
    RenameWorkspace {
        workspace_id: String,
        title: String,
    },
    SavePosition {
        workspace_id: String,
        document_id: String,
        page_index: u32,
        y: f64,
    },
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfInfo {
    pub length: u64,
}

impl Library {
    pub fn open(path: &Path) -> Result<Self> {
        let db = Connection::open(path).map_err(err)?;
        db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;")
            .map_err(err)?;
        let version: u32 = db
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(err)?;
        match version {
            0 => {
                let tx = db.unchecked_transaction().map_err(err)?;
                tx.execute_batch(include_str!("../migrations/001_library.sql"))
                    .map_err(err)?;
                tx.commit().map_err(err)?;
            }
            1..=6 => {}
            _ => return Err("This library was created by a newer Locus version.".into()),
        }
        if version < 2 {
            let tx = db.unchecked_transaction().map_err(err)?;
            tx.execute_batch(include_str!("../migrations/002_navigation.sql"))
                .map_err(err)?;
            tx.commit().map_err(err)?;
        }
        if version < 3 {
            let tx = db.unchecked_transaction().map_err(err)?;
            tx.execute_batch(include_str!("../migrations/003_drawings.sql"))
                .map_err(err)?;
            tx.commit().map_err(err)?;
        }
        if version < 4 {
            let tx = db.unchecked_transaction().map_err(err)?;
            tx.execute_batch(include_str!("../migrations/004_subfolders.sql"))
                .map_err(err)?;
            tx.commit().map_err(err)?;
        }
        if version < 5 {
            let tx = db.unchecked_transaction().map_err(err)?;
            tx.execute_batch(include_str!("../migrations/005_navigation_selection.sql"))
                .map_err(err)?;
            tx.commit().map_err(err)?;
        }
        if version < 6 {
            let tx = db.unchecked_transaction().map_err(err)?;
            tx.execute_batch(include_str!("../migrations/006_workspace_appearance.sql"))
                .map_err(err)?;
            tx.commit().map_err(err)?;
        }
        Ok(Self {
            db: Mutex::new(db),
            drawings_root: path
                .parent()
                .ok_or("Library has no parent directory.")?
                .join("drawings"),
        })
    }
    pub fn apply(&self, action: Action) -> Result<Snapshot> {
        let mut db = self.db.lock().map_err(err)?;
        let tx = db.transaction().map_err(err)?;
        match action {
            Action::List => {}
            Action::CreateDrawing { workspace_id, title: value } => {
                let drawing_id = id();
                tx.execute("INSERT INTO drawings VALUES(?1,?2,?3)", params![drawing_id, workspace_id, title(&value)?]).map_err(err)?;
                let directory = self.drawings_root.join(&workspace_id);
                std::fs::create_dir_all(&directory).map_err(err)?;
                std::fs::write(directory.join(format!("{drawing_id}.excalidraw")), r#"{"type":"excalidraw","version":2,"source":"locus","elements":[],"appState":{},"files":{}}"#).map_err(err)?;
            }
            Action::RenameDrawing { drawing_id, title: value } => {
                tx.execute("UPDATE drawings SET title=?1 WHERE id=?2", params![title(&value)?, drawing_id]).map_err(err)?;
            }
            Action::RemoveDrawing { drawing_id } => {
                // Removing a reference never deletes user-authored drawing files.
                tx.execute("DELETE FROM drawings WHERE id=?1", [drawing_id]).map_err(err)?;
            }
            Action::CreateWorkspace { title: value } => {
                tx.execute(
                    "INSERT INTO workspaces(id,title) VALUES(?1,?2)",
                    params![id(), title(&value)?],
                )
                .map_err(err)?;
            }
            Action::CreateFolder {
                parent_id,
                workspace_id,
                title: value,
            } => {
                tx.execute(
                    "INSERT INTO folders(id,workspace_id,title,parent_id) VALUES(?1,?2,?3,?4)",
                    params![id(), workspace_id, title(&value)?, parent_id],
                )
                .map_err(err)?;
            }
            Action::UpdateWorkspace { workspace_id, title: value, icon, icon_color } => {
                if icon.as_deref().is_some_and(|value| ![
                    "atom", "orbit", "sigma", "flask", "telescope", "microscope",
                    "dna", "calculator", "magnet", "globe",
                    "book", "notebook", "pen", "feather", "graduation", "library", "school", "scroll",
                    "ruler", "compass", "triangle", "pi", "infinity", "binary", "code", "brain",
                    "lightbulb", "puzzle", "languages", "history", "network", "leaf",
                    "laptop", "desktop", "terminal", "cpu", "database", "circuit", "keyboard", "braces",
                ].contains(&value)) {
                    return Err("Choose a supported workspace icon.".into());
                }
                if icon_color.as_deref().is_some_and(|value| {
                    !["theme:icon-red", "theme:icon-orange", "theme:icon-yellow", "theme:icon-green",
                      "theme:icon-cyan", "theme:icon-blue", "theme:icon-purple", "theme:icon-pink"].contains(&value)
                      && (value.len() != 7 || !value.starts_with('#')
                        || !value.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit))
                }) {
                    return Err("Choose a theme color or use a six-digit hex icon color.".into());
                }
                if tx.execute("UPDATE workspaces SET title=?1,icon=?2,icon_color=?3 WHERE id=?4",
                    params![title(&value)?, icon, icon_color, workspace_id]).map_err(err)? != 1 {
                    return Err("This workspace no longer exists.".into());
                }
            }
            Action::RemoveWorkspace { workspace_id } => {
                tx.execute(
                    "DELETE FROM reading_positions WHERE workspace_id=?1",
                    [&workspace_id],
                )
                .map_err(err)?;
                tx.execute(
                    "DELETE FROM workspace_documents WHERE workspace_id=?1",
                    [&workspace_id],
                )
                .map_err(err)?;
                tx.execute("DELETE FROM workspaces WHERE id=?1", [&workspace_id])
                    .map_err(err)?;
            }
            Action::SelectFolder { workspace_id, folder_id } => {
                tx.execute("INSERT INTO workspace_navigation(workspace_id,folder_id) VALUES(?1,?2) ON CONFLICT(workspace_id) DO UPDATE SET folder_id=excluded.folder_id", params![workspace_id, folder_id]).map_err(err)?;
            }
            Action::RemoveFolder { folder_id } => {
                tx.execute(
                    "UPDATE workspace_documents SET folder_id=NULL WHERE folder_id=?1",
                    [&folder_id],
                )
                .map_err(err)?;
                tx.execute("DELETE FROM folders WHERE id=?1", [&folder_id])
                    .map_err(err)?;
            }
            Action::RemoveDocument {
                workspace_id,
                document_id,
            } => {
                tx.execute(
                    "DELETE FROM workspace_documents WHERE workspace_id=?1 AND document_id=?2",
                    params![workspace_id, document_id],
                )
                .map_err(err)?;
            }
            Action::RenameDocument {workspace_id,document_id,title:value} => {
                if tx.execute("UPDATE workspace_documents SET title=?1 WHERE workspace_id=?2 AND document_id=?3",params![title(&value)?,workspace_id,document_id]).map_err(err)? != 1 { return Err("This PDF is no longer attached.".into()); }
            }
            Action::MoveDocument {workspace_id,document_id,folder_id} => {
                if tx.execute("UPDATE workspace_documents SET folder_id=?1 WHERE workspace_id=?2 AND document_id=?3",params![folder_id,workspace_id,document_id]).map_err(err)? != 1 { return Err("This PDF is no longer attached.".into()); }
            }
            Action::RenameFolder {folder_id,title:value} => {tx.execute("UPDATE folders SET title=?1 WHERE id=?2",params![title(&value)?,folder_id]).map_err(err)?;}
            Action::RenameWorkspace {workspace_id,title:value} => {tx.execute("UPDATE workspaces SET title=?1 WHERE id=?2",params![title(&value)?,workspace_id]).map_err(err)?;}
            Action::SavePosition {
                workspace_id,
                document_id,
                page_index,
                y,
            } => {
                if !y.is_finite() || !(0.0..=1.0).contains(&y) {
                    return Err("Invalid reading position.".into());
                }
                tx.execute("INSERT INTO reading_positions(workspace_id,document_id,page_index,y,position_version) VALUES(?1,?2,?3,?4,2) ON CONFLICT(workspace_id,document_id) DO UPDATE SET page_index=excluded.page_index,y=excluded.y,position_version=2", params![workspace_id,document_id,page_index,y]).map_err(err)?;
            }
        }
        tx.execute("DELETE FROM documents WHERE NOT EXISTS(SELECT 1 FROM workspace_documents WHERE document_id=documents.id)", []).map_err(err)?;
        tx.commit().map_err(err)?;
        snapshot(&db)
    }
    pub fn attach(
        &self,
        workspace: &str,
        folder: Option<&str>,
        path: &Path,
        relink: Option<&str>,
    ) -> Result<Snapshot> {
        let path = path.canonicalize().map_err(|_| {
            "Cannot open this PDF. It may have moved or be unavailable.".to_string()
        })?;
        let (fingerprint, size, modified) = inspect_pdf(&path)?;
        let path = path.to_str().ok_or("The file path is not valid UTF-8.")?;
        let mut db = self.db.lock().map_err(err)?;
        let tx = db.transaction().map_err(err)?;
        if let Some(document_id) = relink {
            let expected: String = tx.query_row("SELECT fingerprint FROM documents JOIN workspace_documents ON documents.id=document_id WHERE documents.id=?1 AND workspace_id=?2", params![document_id,workspace], |r|r.get(0)).map_err(err)?;
            if fingerprint != expected {
                return Err("This is a different PDF. Choose the original file, or attach this as a new document.".into());
            }
            tx.execute(
                "UPDATE documents SET path=?1,file_size=?2,modified=?3 WHERE id=?4",
                params![path, size, modified, document_id],
            )
            .map_err(err)?;
        } else {
            let existing: Option<(String, String)> = tx
                .query_row(
                    "SELECT id,fingerprint FROM documents WHERE path=?1",
                    [path],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .optional()
                .map_err(err)?;
            let document_id = if let Some((document_id, old_hash)) = existing {
                if old_hash != fingerprint {
                    return Err("This file has changed. Remove its old references before attaching the replacement.".into());
                }
                tx.execute(
                    "UPDATE documents SET file_size=?1,modified=?2 WHERE id=?3",
                    params![size, modified, document_id],
                )
                .map_err(err)?;
                document_id
            } else {
                let document_id = id();
                let name = Path::new(path)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled PDF");
                tx.execute(
                    "INSERT INTO documents VALUES(?1,?2,?3,?4,?5,?6)",
                    params![document_id, path, name, fingerprint, size, modified],
                )
                .map_err(err)?;
                document_id
            };
            tx.execute("INSERT INTO workspace_documents(workspace_id,document_id,folder_id) VALUES(?1,?2,?3) ON CONFLICT(workspace_id,document_id) DO UPDATE SET folder_id=excluded.folder_id",params![workspace,document_id,folder]).map_err(err)?;
        }
        tx.commit().map_err(err)?;
        snapshot(&db)
    }
    fn file(&self, document_id: &str) -> Result<File> {
        let db = self.db.lock().map_err(err)?;
        let (path, size, modified): (String, i64, String) = db
            .query_row(
                "SELECT path,file_size,modified FROM documents WHERE id=?1",
                [document_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|_| "This PDF is no longer attached.".to_string())?;
        let file = File::open(path).map_err(|_| {
            "PDF unavailable. Use Locate PDF to reconnect the original file.".to_string()
        })?;
        let metadata = file.metadata().map_err(err)?;
        if metadata.len() != size as u64
            || format!("{:?}", metadata.modified().map_err(err)?) != modified
        {
            return Err("PDF changed outside Locus. Use Locate PDF to verify its identity.".into());
        }
        Ok(file)
    }
    pub fn info(&self, document_id: &str) -> Result<PdfInfo> {
        Ok(PdfInfo {
            length: self.file(document_id)?.metadata().map_err(err)?.len(),
        })
    }
    fn drawing_path(&self, db: &Connection, drawing_id: &str) -> Result<PathBuf> {
        Uuid::parse_str(drawing_id).map_err(err)?;
        let workspace_id: String = db
            .query_row(
                "SELECT workspace_id FROM drawings WHERE id=?1",
                [drawing_id],
                |r| r.get(0),
            )
            .map_err(err)?;
        Uuid::parse_str(&workspace_id).map_err(err)?;
        Ok(self
            .drawings_root
            .join(workspace_id)
            .join(format!("{drawing_id}.excalidraw")))
    }
    pub fn read_drawing(&self, drawing_id: &str) -> Result<String> {
        let db = self.db.lock().map_err(err)?;
        let path = self.drawing_path(&db, drawing_id)?;
        if path.metadata().map_err(err)?.len() > 64 * 1024 * 1024 {
            return Err("This whiteboard exceeds 64 MiB.".into());
        }
        std::fs::read_to_string(path).map_err(err)
    }
    pub fn save_drawing(&self, drawing_id: &str, scene: &str) -> Result<()> {
        if scene.len() > 64 * 1024 * 1024 {
            return Err("This whiteboard exceeds 64 MiB.".into());
        }
        let value: serde_json::Value = serde_json::from_str(scene).map_err(err)?;
        if value.get("type").and_then(|v| v.as_str()) != Some("excalidraw")
            || !value.get("elements").is_some_and(|v| v.is_array())
        {
            return Err("Invalid Excalidraw scene.".into());
        }
        let db = self.db.lock().map_err(err)?;
        let path = self.drawing_path(&db, drawing_id)?;
        let temporary = path.with_extension(format!("{}.tmp", id()));
        let result = (|| {
            use std::io::Write;
            let mut file = File::create_new(&temporary).map_err(err)?;
            file.write_all(scene.as_bytes()).map_err(err)?;
            file.sync_all().map_err(err)?;
            std::fs::rename(&temporary, &path).map_err(err)
        })();
        if result.is_err() {
            let _ = std::fs::remove_file(temporary);
        }
        result
    }
    pub fn read_range(&self, document_id: &str, begin: u64, end: u64) -> Result<Vec<u8>> {
        if end <= begin || end - begin > 1024 * 1024 {
            return Err("Invalid PDF byte range.".into());
        }
        let mut file = self.file(document_id)?;
        if end > file.metadata().map_err(err)?.len() {
            return Err("PDF byte range exceeds the file.".into());
        }
        file.seek(SeekFrom::Start(begin)).map_err(err)?;
        let mut bytes = vec![0; (end - begin) as usize];
        file.read_exact(&mut bytes).map_err(err)?;
        Ok(bytes)
    }
}
fn inspect_pdf(path: &Path) -> Result<(String, i64, String)> {
    let mut file = File::open(path).map_err(err)?;
    let metadata = file.metadata().map_err(err)?;
    if !metadata.is_file() {
        return Err("Choose a PDF file.".into());
    }
    let mut header = [0; 1024];
    let count = file.read(&mut header).map_err(err)?;
    if !header[..count].windows(5).any(|s| s == b"%PDF-") {
        return Err("This file does not contain a PDF header.".into());
    }
    file.seek(SeekFrom::Start(0)).map_err(err)?;
    let mut hash = Sha256::new();
    let mut buffer = [0; 65536];
    loop {
        let count = file.read(&mut buffer).map_err(err)?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    Ok((
        hash.finalize()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect(),
        i64::try_from(metadata.len()).map_err(err)?,
        format!("{:?}", metadata.modified().map_err(err)?),
    ))
}
fn snapshot(db: &Connection) -> Result<Snapshot> {
    let workspaces = db
        .prepare("SELECT id,title,icon,icon_color FROM workspaces ORDER BY title COLLATE NOCASE,id")
        .map_err(err)?
        .query_map([], |r| {
            Ok(Workspace {
                id: r.get(0)?,
                title: r.get(1)?,
                icon: r.get(2)?,
                icon_color: r.get(3)?,
            })
        })
        .map_err(err)?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(err)?;
    let folders = db
        .prepare(
            "SELECT id,workspace_id,title,parent_id FROM folders ORDER BY title COLLATE NOCASE,id",
        )
        .map_err(err)?
        .query_map([], |r| {
            Ok(Folder {
                parent_id: r.get(3)?,
                id: r.get(0)?,
                workspace_id: r.get(1)?,
                title: r.get(2)?,
            })
        })
        .map_err(err)?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(err)?;
    let documents=db.prepare("SELECT d.id,w.workspace_id,w.folder_id,coalesce(w.title,d.title),d.path,coalesce(p.page_index,0),coalesce(p.y,0),coalesce(p.position_version,2) FROM workspace_documents w JOIN documents d ON d.id=w.document_id LEFT JOIN reading_positions p ON p.workspace_id=w.workspace_id AND p.document_id=d.id ORDER BY coalesce(w.title,d.title) COLLATE NOCASE,d.id").map_err(err)?.query_map([],|r|Ok(Document{id:r.get(0)?,workspace_id:r.get(1)?,folder_id:r.get(2)?,title:r.get(3)?,path:r.get(4)?,page_index:r.get(5)?,y:r.get(6)?,position_version:r.get(7)?})).map_err(err)?.collect::<std::result::Result<Vec<_>,_>>().map_err(err)?;
    let navigation = db
        .prepare("SELECT workspace_id,folder_id FROM workspace_navigation ORDER BY workspace_id")
        .map_err(err)?
        .query_map([], |r| {
            Ok(Navigation {
                workspace_id: r.get(0)?,
                folder_id: r.get(1)?,
            })
        })
        .map_err(err)?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(Snapshot {
        navigation,
        workspaces,
        folders,
        documents,
        drawings: db
            .prepare("SELECT id,workspace_id,title FROM drawings ORDER BY title COLLATE NOCASE,id")
            .map_err(err)?
            .query_map([], |r| {
                Ok(Drawing {
                    id: r.get(0)?,
                    workspace_id: r.get(1)?,
                    title: r.get(2)?,
                })
            })
            .map_err(err)?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(err)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(std::path::PathBuf);
    impl Fixture {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("locus-test-{}", id()));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }
        fn pdf(&self, name: &str, content: &[u8]) -> std::path::PathBuf {
            let path = self.0.join(name);
            std::fs::write(&path, content).unwrap();
            path
        }
        fn store(&self) -> Library {
            Library::open(&self.0.join("test.sqlite")).unwrap()
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
    fn workspace(store: &Library) -> String {
        store
            .apply(Action::CreateWorkspace {
                title: "Physics".into(),
            })
            .unwrap()
            .workspaces
            .last()
            .unwrap()
            .id
            .clone()
    }
    #[test]
    fn references_positions_and_identity_survive_reopening() {
        let fixture = Fixture::new();
        let file = fixture.pdf("book.pdf", b"%PDF-1.7\nfixture");
        let store = fixture.store();
        let w = workspace(&store);
        let a = store.attach(&w, None, &file, None).unwrap();
        let document = a.documents[0].id.clone();
        store
            .apply(Action::SavePosition {
                workspace_id: w.clone(),
                document_id: document.clone(),
                page_index: 41,
                y: 0.7,
            })
            .unwrap();
        drop(store);
        let store = fixture.store();
        let data = store.apply(Action::List).unwrap();
        assert_eq!(data.documents[0].id, document);
        assert_eq!(data.documents[0].page_index, 41);
        assert_eq!(data.documents[0].y, 0.7);
        assert_eq!(store.read_range(&document, 0, 5).unwrap(), b"%PDF-");
        assert!(store.read_range(&document, 0, 1024 * 1024 + 1).is_err());
        assert!(store.read_range(&document, 0, 999).is_err());
        assert!(store.read_range("unregistered", 0, 5).is_err());
        store
            .apply(Action::RemoveDocument {
                workspace_id: w,
                document_id: document,
            })
            .unwrap();
        assert!(file.exists());
        assert!(store.apply(Action::List).unwrap().documents.is_empty());
    }
    #[test]
    fn folder_removal_preserves_books_and_cross_workspace_folder_is_rejected() {
        let f = Fixture::new();
        let store = f.store();
        let w = workspace(&store);
        let folder = store
            .apply(Action::CreateFolder {
                parent_id: None,
                workspace_id: w.clone(),
                title: "Books".into(),
            })
            .unwrap()
            .folders[0]
            .id
            .clone();
        let pdf = f.pdf("book.pdf", b"%PDF-1.7\nfixture");
        store.attach(&w, Some(&folder), &pdf, None).unwrap();
        let other = workspace(&store);
        // Identify the other workspace independently of the alphabetical/UUID order.
        let other = store
            .apply(Action::List)
            .unwrap()
            .workspaces
            .into_iter()
            .find(|v| v.id != w)
            .map(|v| v.id)
            .unwrap_or(other);
        assert!(store.attach(&other, Some(&folder), &pdf, None).is_err());
        let data = store
            .apply(Action::RemoveFolder { folder_id: folder })
            .unwrap();
        assert!(data.documents[0].folder_id.is_none());
        store.attach(&other, None, &pdf, None).unwrap();
        store
            .apply(Action::RemoveWorkspace { workspace_id: w })
            .unwrap();
        assert_eq!(store.apply(Action::List).unwrap().documents.len(), 1);
        store
            .apply(Action::RemoveWorkspace {
                workspace_id: other,
            })
            .unwrap();
        assert!(pdf.exists());
    }
    #[test]
    fn missing_changed_and_relinked_files_are_explicit() {
        let f = Fixture::new();
        let store = f.store();
        let w = workspace(&store);
        let old = f.pdf("book.pdf", b"%PDF-1.7\noriginal");
        let document = store.attach(&w, None, &old, None).unwrap().documents[0]
            .id
            .clone();
        let moved = f.0.join("moved.pdf");
        std::fs::rename(&old, &moved).unwrap();
        assert!(store.info(&document).is_err());
        let wrong = f.pdf("different.pdf", b"%PDF-1.7\nother");
        assert!(store.attach(&w, None, &wrong, Some(&document)).is_err());
        store.attach(&w, None, &moved, Some(&document)).unwrap();
        assert!(store.info(&document).is_ok());
        std::fs::write(&moved, b"%PDF-1.7\nreplacement that is longer").unwrap();
        assert!(store.info(&document).is_err());
        let invalid = f.pdf("invalid.pdf", b"not a PDF");
        assert!(store.attach(&w, None, &invalid, None).is_err());
    }
    #[test]
    fn display_names_and_folder_moves_do_not_change_files_or_other_workspaces() {
        let f = Fixture::new();
        let store = f.store();
        let w = workspace(&store);
        let file = f.pdf("original.pdf", b"%PDF-1.7\nfixture");
        let doc = store.attach(&w, None, &file, None).unwrap().documents[0]
            .id
            .clone();
        store
            .apply(Action::CreateWorkspace {
                title: "Math".into(),
            })
            .unwrap();
        let other = store
            .apply(Action::List)
            .unwrap()
            .workspaces
            .into_iter()
            .find(|v| v.id != w)
            .unwrap()
            .id;
        store.attach(&other, None, &file, None).unwrap();
        let folder = store
            .apply(Action::CreateFolder {
                parent_id: None,
                workspace_id: w.clone(),
                title: "Books".into(),
            })
            .unwrap()
            .folders[0]
            .id
            .clone();
        store
            .apply(Action::SavePosition {
                workspace_id: w.clone(),
                document_id: doc.clone(),
                page_index: 17,
                y: 0.4,
            })
            .unwrap();
        store
            .apply(Action::RenameDocument {
                workspace_id: w.clone(),
                document_id: doc.clone(),
                title: "My mechanics book".into(),
            })
            .unwrap();
        let data = store
            .apply(Action::MoveDocument {
                workspace_id: w.clone(),
                document_id: doc.clone(),
                folder_id: Some(folder.clone()),
            })
            .unwrap();
        let moved = data.documents.iter().find(|d| d.workspace_id == w).unwrap();
        assert_eq!(moved.folder_id, Some(folder.clone()));
        assert_eq!(moved.title, "My mechanics book");
        assert_eq!(moved.page_index, 17);
        assert_eq!(
            data.documents
                .iter()
                .find(|d| d.workspace_id == other)
                .unwrap()
                .title,
            "original"
        );
        assert!(
            store
                .apply(Action::MoveDocument {
                    workspace_id: other,
                    document_id: doc.clone(),
                    folder_id: Some(folder)
                })
                .is_err()
        );
        let data = store
            .apply(Action::MoveDocument {
                workspace_id: w,
                document_id: doc,
                folder_id: None,
            })
            .unwrap();
        assert!(data.documents.iter().all(|d| d.folder_id.is_none()));
        assert_eq!(std::fs::read(file).unwrap(), b"%PDF-1.7\nfixture");
    }
    #[test]
    fn v1_reading_positions_migrate_without_losing_page_or_legacy_offset() {
        let f = Fixture::new();
        let db = Connection::open(f.0.join("test.sqlite")).unwrap();
        db.execute_batch(include_str!("../migrations/001_library.sql"))
            .unwrap();
        db.execute_batch("INSERT INTO workspaces VALUES('w','Physics'); INSERT INTO documents VALUES('d','/old/book.pdf','Book','hash',20,'time'); INSERT INTO workspace_documents VALUES('w','d',NULL); INSERT INTO reading_positions VALUES('w','d',11,0.65);").unwrap();
        drop(db);
        let store = f.store();
        let data = store.apply(Action::List).unwrap();
        assert_eq!(data.documents[0].page_index, 11);
        assert_eq!(data.documents[0].y, 0.65);
        assert_eq!(data.documents[0].position_version, 1);
        let data = store
            .apply(Action::SavePosition {
                workspace_id: "w".into(),
                document_id: "d".into(),
                page_index: 12,
                y: 0.25,
            })
            .unwrap();
        assert_eq!(data.documents[0].position_version, 2);
        drop(store);
        assert_eq!(
            f.store().apply(Action::List).unwrap().documents[0].page_index,
            12
        );
    }
    #[test]
    fn invalid_state_and_future_schema_are_rejected() {
        let f = Fixture::new();
        let store = f.store();
        assert!(
            store
                .apply(Action::CreateWorkspace { title: " ".into() })
                .is_err()
        );
        assert!(
            store
                .apply(Action::SavePosition {
                    workspace_id: "unknown".into(),
                    document_id: "unknown".into(),
                    page_index: 0,
                    y: f64::NAN
                })
                .is_err()
        );
        assert!(
            store
                .apply(Action::SavePosition {
                    workspace_id: "unknown".into(),
                    document_id: "unknown".into(),
                    page_index: 0,
                    y: 0.0
                })
                .is_err()
        );
        drop(store);
        Connection::open(f.0.join("test.sqlite"))
            .unwrap()
            .execute_batch("PRAGMA user_version=99")
            .unwrap();
        assert!(Library::open(&f.0.join("test.sqlite")).is_err());
    }
    #[test]
    fn drawings_are_portable_atomic_and_keep_files_when_references_are_removed() {
        let f = Fixture::new();
        let store = f.store();
        let workspace = store
            .apply(Action::CreateWorkspace {
                title: "Physics".into(),
            })
            .unwrap()
            .workspaces
            .remove(0)
            .id;
        let data = store
            .apply(Action::CreateDrawing {
                workspace_id: workspace.clone(),
                title: "Exercise 1".into(),
            })
            .unwrap();
        let drawing = &data.drawings[0];
        let drawing_id = drawing.id.clone();
        let original = store.read_drawing(&drawing_id).unwrap();
        let scene = r#"{"type":"excalidraw","version":2,"elements":[{"id":"stroke"}],"appState":{},"files":{}}"#;
        store.save_drawing(&drawing_id, scene).unwrap();
        assert!(store.save_drawing(&drawing_id, "broken JSON").is_err());
        assert!(
            store
                .save_drawing(&drawing_id, r#"{"type":"other","elements":[]}"#)
                .is_err()
        );
        assert!(store.read_drawing("../../anything").is_err());
        assert_ne!(original, scene);
        drop(store);
        let store = f.store();
        assert_eq!(store.read_drawing(&drawing_id).unwrap(), scene);
        let data = store
            .apply(Action::RenameDrawing {
                drawing_id: drawing_id.clone(),
                title: "Solution".into(),
            })
            .unwrap();
        assert_eq!(data.drawings[0].title, "Solution");
        let path =
            f.0.join("drawings")
                .join(&workspace)
                .join(format!("{drawing_id}.excalidraw"));
        assert!(path.exists());
        store
            .apply(Action::RemoveDrawing {
                drawing_id: drawing_id.clone(),
            })
            .unwrap();
        assert!(store.read_drawing(&drawing_id).is_err());
        assert_eq!(std::fs::read_to_string(path).unwrap(), scene);
        assert!(
            store
                .apply(Action::CreateDrawing {
                    workspace_id: "missing".into(),
                    title: "No workspace".into()
                })
                .is_err()
        );
    }
    #[test]
    fn subfolders_and_active_selection_persist_without_losing_materials() {
        let fixture = Fixture::new();
        let store = fixture.store();
        let w = workspace(&store);
        let root = store
            .apply(Action::CreateFolder {
                workspace_id: w.clone(),
                parent_id: None,
                title: "Mechanics".into(),
            })
            .unwrap()
            .folders[0]
            .id
            .clone();
        let child = store
            .apply(Action::CreateFolder {
                workspace_id: w.clone(),
                parent_id: Some(root.clone()),
                title: "Exercises".into(),
            })
            .unwrap()
            .folders
            .into_iter()
            .find(|folder| folder.parent_id.is_some())
            .unwrap()
            .id;
        let pdf = fixture.pdf("book.pdf", b"%PDF-1.7 test");
        store.attach(&w, Some(&child), &pdf, None).unwrap();
        store
            .apply(Action::SelectFolder {
                workspace_id: w.clone(),
                folder_id: Some(child.clone()),
            })
            .unwrap();
        drop(store);
        let store = fixture.store();
        let loaded = store.apply(Action::List).unwrap();
        assert_eq!(
            loaded.navigation[0].folder_id.as_deref(),
            Some(child.as_str())
        );
        let promoted = store
            .apply(Action::RemoveFolder { folder_id: root })
            .unwrap();
        assert_eq!(promoted.folders.len(), 1);
        assert!(promoted.folders[0].parent_id.is_none());
        assert_eq!(
            promoted.documents[0].folder_id.as_deref(),
            Some(child.as_str())
        );
        let removed = store
            .apply(Action::RemoveFolder { folder_id: child })
            .unwrap();
        assert!(removed.documents[0].folder_id.is_none());
        assert!(removed.navigation[0].folder_id.is_none());
        assert!(pdf.exists());
    }

    #[test]
    fn folder_depth_and_cross_workspace_navigation_are_rejected() {
        let fixture = Fixture::new();
        let store = fixture.store();
        let w = workspace(&store);
        let root = store
            .apply(Action::CreateFolder {
                workspace_id: w.clone(),
                parent_id: None,
                title: "Mechanics".into(),
            })
            .unwrap()
            .folders[0]
            .id
            .clone();
        let child = store
            .apply(Action::CreateFolder {
                workspace_id: w.clone(),
                parent_id: Some(root.clone()),
                title: "Exercises".into(),
            })
            .unwrap()
            .folders
            .into_iter()
            .find(|folder| folder.parent_id.is_some())
            .unwrap()
            .id;
        assert!(
            store
                .apply(Action::CreateFolder {
                    workspace_id: w.clone(),
                    parent_id: Some(child),
                    title: "Too deep".into()
                })
                .is_err()
        );
        let other = store
            .apply(Action::CreateWorkspace {
                title: "Chemistry".into(),
            })
            .unwrap()
            .workspaces
            .into_iter()
            .find(|item| item.title == "Chemistry")
            .unwrap()
            .id;
        assert!(
            store
                .apply(Action::CreateFolder {
                    workspace_id: other.clone(),
                    parent_id: Some(root.clone()),
                    title: "Wrong workspace".into()
                })
                .is_err()
        );
        assert!(
            store
                .apply(Action::SelectFolder {
                    workspace_id: other,
                    folder_id: Some(root)
                })
                .is_err()
        );
        assert_eq!(store.apply(Action::List).unwrap().folders.len(), 2);
    }

    #[test]
    fn v3_libraries_upgrade_with_existing_folders_intact() {
        let fixture = Fixture::new();
        let path = fixture.0.join("test.sqlite");
        let db = Connection::open(&path).unwrap();
        db.execute_batch(include_str!("../migrations/001_library.sql"))
            .unwrap();
        db.execute_batch(include_str!("../migrations/002_navigation.sql"))
            .unwrap();
        db.execute_batch(include_str!("../migrations/003_drawings.sql"))
            .unwrap();
        db.execute("INSERT INTO workspaces VALUES('workspace','Physics')", [])
            .unwrap();
        db.execute(
            "INSERT INTO folders VALUES('folder','workspace','Mechanics')",
            [],
        )
        .unwrap();
        drop(db);
        let store = Library::open(&path).unwrap();
        let data = store.apply(Action::List).unwrap();
        assert_eq!(data.folders[0].id, "folder");
        assert!(data.folders[0].parent_id.is_none());
        assert!(data.navigation.is_empty());
        assert_eq!(
            store
                .db
                .lock()
                .unwrap()
                .query_row("PRAGMA user_version", [], |r| r.get::<_, u32>(0))
                .unwrap(),
            6
        );
    }
    #[test]
    fn workspace_appearance_survives_reopening_and_rejects_invalid_values() {
        let dir = Fixture::new();
        let path = dir.0.join("library.sqlite3");
        let store = Library::open(&path).unwrap();
        let data = store
            .apply(Action::CreateWorkspace {
                title: "Physics".into(),
            })
            .unwrap();
        let workspace_id = data.workspaces[0].id.clone();
        assert!(data.workspaces[0].icon.is_none());
        assert!(data.workspaces[0].icon_color.is_none());
        store
            .apply(Action::UpdateWorkspace {
                title: "Renamed Physics".into(),
                workspace_id: workspace_id.clone(),
                icon: Some("atom".into()),
                icon_color: Some("#60a5fa".into()),
            })
            .unwrap();
        drop(store);
        let store = Library::open(&path).unwrap();
        let data = store.apply(Action::List).unwrap();
        assert_eq!(data.workspaces[0].title, "Renamed Physics");
        assert_eq!(data.workspaces[0].icon.as_deref(), Some("atom"));
        assert_eq!(data.workspaces[0].icon_color.as_deref(), Some("#60a5fa"));
        for (icon, color) in [
            ("unknown", "#ffffff"),
            ("atom", "red"),
            ("atom", "#12345g"),
            ("atom", "theme:icon-unknown"),
        ] {
            assert!(
                store
                    .apply(Action::UpdateWorkspace {
                        title: "Renamed Physics".into(),
                        workspace_id: workspace_id.clone(),
                        icon: Some(icon.into()),
                        icon_color: Some(color.into())
                    })
                    .is_err()
            );
        }
        assert!(
            store
                .apply(Action::UpdateWorkspace {
                    title: "Renamed Physics".into(),
                    workspace_id: "missing".into(),
                    icon: None,
                    icon_color: None
                })
                .is_err()
        );
        let data = store.apply(Action::List).unwrap();
        assert_eq!(data.workspaces[0].title, "Renamed Physics");
        assert_eq!(data.workspaces[0].icon.as_deref(), Some("atom"));
        store
            .apply(Action::UpdateWorkspace {
                title: "Renamed Physics".into(),
                workspace_id: workspace_id.clone(),
                icon: Some("laptop".into()),
                icon_color: Some("theme:icon-blue".into()),
            })
            .unwrap();
        drop(store);
        let store = Library::open(&path).unwrap();
        let data = store.apply(Action::List).unwrap();
        assert_eq!(
            data.workspaces[0].icon_color.as_deref(),
            Some("theme:icon-blue")
        );
        assert_eq!(data.workspaces[0].icon.as_deref(), Some("laptop"));
        assert!(
            store
                .apply(Action::UpdateWorkspace {
                    title: "  ".into(),
                    workspace_id: workspace_id.clone(),
                    icon: None,
                    icon_color: None
                })
                .is_err()
        );
        let unchanged = store.apply(Action::List).unwrap();
        assert_eq!(unchanged.workspaces[0].title, "Renamed Physics");
        assert_eq!(unchanged.workspaces[0].icon.as_deref(), Some("laptop"));
        let data = store
            .apply(Action::UpdateWorkspace {
                title: "Renamed Physics".into(),
                workspace_id,
                icon: None,
                icon_color: None,
            })
            .unwrap();
        assert!(data.workspaces[0].icon.is_none());
        assert!(data.workspaces[0].icon_color.is_none());
    }
}
