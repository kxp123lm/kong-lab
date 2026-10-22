-- 增量迁移：不删除现有游戏或改写任何分数。
ALTER TABLE players ADD COLUMN IF NOT EXISTS number bigserial;
CREATE UNIQUE INDEX IF NOT EXISTS players_number_unique ON players(number);
CREATE TABLE IF NOT EXISTS exclusion_rules (
 id uuid PRIMARY KEY,
 kind text NOT NULL CHECK(kind IN ('player','ip')),
 value text NOT NULL,
 label varchar(64) NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 retroactive boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,value)
);
CREATE INDEX IF NOT EXISTS exclusion_match ON exclusion_rules(kind,value) WHERE enabled;
CREATE OR REPLACE VIEW classified_sessions AS
 SELECT s.*, (s.is_test OR EXISTS(
   SELECT 1 FROM exclusion_rules r WHERE r.enabled
    AND ((r.kind='player' AND r.value=s.player_id::text) OR (r.kind='ip' AND r.value=s.ip_hash))
    AND (r.retroactive OR s.started_at>=r.created_at)
 )) AS excluded
 FROM sessions s;
CREATE OR REPLACE VIEW player_profiles AS
 SELECT player_id,min(started_at) AS first_game_at,max(started_at) AS last_game_at,
 count(*)::int AS games,max(score)::int AS best_score,
 (array_agg(score ORDER BY started_at DESC,id DESC))[1] AS last_score,
 (array_agg(country ORDER BY started_at DESC,id DESC))[1] AS country,
 (array_agg(region ORDER BY started_at DESC,id DESC))[1] AS region
 FROM classified_sessions WHERE NOT excluded GROUP BY player_id;
