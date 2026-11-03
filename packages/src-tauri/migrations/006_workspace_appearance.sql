ALTER TABLE workspaces ADD COLUMN icon TEXT;
ALTER TABLE workspaces ADD COLUMN icon_color TEXT;
PRAGMA user_version=6;
