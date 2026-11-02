CREATE TABLE drawings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL
);
CREATE INDEX drawings_workspace ON drawings(workspace_id);
PRAGMA user_version=3;
