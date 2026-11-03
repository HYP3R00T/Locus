ALTER TABLE folders ADD COLUMN parent_id TEXT REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX folders_parent ON folders(parent_id);
CREATE TRIGGER folders_parent_insert BEFORE INSERT ON folders
WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM folders WHERE id=NEW.parent_id AND workspace_id=NEW.workspace_id AND parent_id IS NULL
  ) THEN RAISE(ABORT, 'A subfolder requires a top-level folder in the same workspace.') END;
END;
CREATE TRIGGER folders_parent_update BEFORE UPDATE OF parent_id,workspace_id ON folders
WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NEW.parent_id=NEW.id OR NOT EXISTS (
    SELECT 1 FROM folders WHERE id=NEW.parent_id AND workspace_id=NEW.workspace_id AND parent_id IS NULL
  ) OR EXISTS (SELECT 1 FROM folders WHERE parent_id=NEW.id)
  THEN RAISE(ABORT, 'Folders support only one subfolder level within the same workspace.') END;
END;
PRAGMA user_version=4;
