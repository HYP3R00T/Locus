CREATE TABLE workspace_sessions (
    workspace_id TEXT PRIMARY KEY NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    state TEXT NOT NULL
);
PRAGMA user_version=7;
