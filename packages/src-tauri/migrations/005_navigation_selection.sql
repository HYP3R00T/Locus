CREATE TABLE IF NOT EXISTS workspace_navigation (
    workspace_id TEXT PRIMARY KEY NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL
);
CREATE TRIGGER IF NOT EXISTS navigation_folder_insert BEFORE INSERT ON workspace_navigation
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM folders WHERE id=NEW.folder_id AND workspace_id=NEW.workspace_id)
  THEN RAISE(ABORT, 'The active folder must belong to the workspace.') END;
END;
CREATE TRIGGER IF NOT EXISTS navigation_folder_update BEFORE UPDATE ON workspace_navigation
WHEN NEW.folder_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM folders WHERE id=NEW.folder_id AND workspace_id=NEW.workspace_id)
  THEN RAISE(ABORT, 'The active folder must belong to the workspace.') END;
END;
PRAGMA user_version=5;
