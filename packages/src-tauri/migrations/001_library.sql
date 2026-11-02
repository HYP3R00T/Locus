CREATE TABLE workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120)
);
CREATE TABLE folders (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
    UNIQUE(workspace_id,id)
);
CREATE TABLE documents (
    id TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    modified TEXT NOT NULL
);
CREATE TABLE workspace_documents (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    folder_id TEXT,
    PRIMARY KEY(workspace_id,document_id),
    FOREIGN KEY(workspace_id,folder_id) REFERENCES folders(workspace_id,id)
);
CREATE TABLE reading_positions (
    workspace_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    page_index INTEGER NOT NULL CHECK(page_index>=0),
    y REAL NOT NULL CHECK(y BETWEEN 0 AND 1),
    PRIMARY KEY(workspace_id,document_id),
    FOREIGN KEY(workspace_id,document_id) REFERENCES workspace_documents(workspace_id,document_id) ON DELETE CASCADE
);
CREATE INDEX folders_workspace ON folders(workspace_id);
CREATE INDEX workspace_documents_document ON workspace_documents(document_id);
CREATE INDEX workspace_documents_folder ON workspace_documents(workspace_id,folder_id);
PRAGMA user_version=1;
