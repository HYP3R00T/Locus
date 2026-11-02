ALTER TABLE workspace_documents ADD COLUMN title TEXT;
-- Preserve v1 offsets; new saves use a fraction of the complete page height.
ALTER TABLE reading_positions ADD COLUMN position_version INTEGER NOT NULL DEFAULT 1;
PRAGMA user_version=2;
