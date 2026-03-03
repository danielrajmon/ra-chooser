CREATE TABLE IF NOT EXISTS files (
  platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(512),
  md5 VARCHAR(32) NOT NULL CHECK (md5 ~ '^[0-9a-f]{32}$'),
  is_required BOOLEAN DEFAULT NULL,
  is_owned BOOLEAN NOT NULL DEFAULT FALSE,
  patch_url TEXT,
  labels TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (platform_id, game_id, md5),
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);


CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_files_set_updated_at
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE INDEX IF NOT EXISTS idx_files_platform_id ON files(platform_id);
CREATE INDEX IF NOT EXISTS idx_files_game_id ON files(game_id);
CREATE INDEX IF NOT EXISTS idx_files_md5 ON files(md5);