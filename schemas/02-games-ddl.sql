CREATE TABLE IF NOT EXISTS games (
  id INTEGER NOT NULL,
  platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  is_required BOOLEAN DEFAULT NULL,
  is_owned BOOLEAN NOT NULL DEFAULT FALSE,
  num_achievements INTEGER NOT NULL DEFAULT 0 CHECK (num_achievements >= 0),
  num_leaderboards INTEGER NOT NULL DEFAULT 0 CHECK (num_leaderboards >= 0),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_games_set_updated_at
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE INDEX IF NOT EXISTS idx_games_platform_id ON games(platform_id);
CREATE INDEX IF NOT EXISTS idx_games_game_id ON games(id);