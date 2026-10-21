-- 可重复运行；只在新建的 KONG LAB 数据库执行。
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id),
  start_key uuid NOT NULL,
  nickname varchar(24) NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 10000000),
  score_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  finished boolean NOT NULL DEFAULT false,
  finished_at timestamptz,
  country varchar(8),
  region varchar(40),
  ip_hash char(64) NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  UNIQUE (player_id, start_key)
);
CREATE INDEX IF NOT EXISTS sessions_public_score ON sessions (score DESC, score_at ASC, id) WHERE NOT is_test;
CREATE INDEX IF NOT EXISTS sessions_public_time ON sessions (started_at DESC, player_id) WHERE NOT is_test;
CREATE INDEX IF NOT EXISTS sessions_player ON sessions (player_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_region ON sessions (country, region, started_at DESC);
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);
-- 聚合视图是数据库内的实时玩家档案；排除测试局，无冗余累计值或并发覆盖。
CREATE OR REPLACE VIEW player_profiles AS
SELECT player_id, min(started_at) AS first_game_at, max(started_at) AS last_game_at,
 count(*)::int AS games, max(score)::int AS best_score,
 (array_agg(score ORDER BY started_at DESC, id DESC))[1] AS last_score,
 (array_agg(country ORDER BY started_at DESC, id DESC))[1] AS country,
 (array_agg(region ORDER BY started_at DESC, id DESC))[1] AS region
FROM sessions WHERE NOT is_test GROUP BY player_id;
