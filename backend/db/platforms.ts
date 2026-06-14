import { query } from "./client";

type PlatformRow = {
  id: number;
  name: string;
  game_count: string;
  owned_game_count: string;
};

type GlobalGameSummaryRow = {
  all_game_count: string;
  owned_game_count: string;
  unfinished_game_count: string;
};

export async function getPlatforms(): Promise<Array<{ id: number; name: string; game_count: number; owned_game_count: number }>> {
  const result = await query<PlatformRow>(
    `
      SELECT
        p.id AS id,
        p.name AS name,
        COUNT(g.id) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM files f
            WHERE f.platform_id = g.platform_id
              AND f.game_id = g.id
          )
        ) AS game_count,
        COUNT(g.id) FILTER (
          WHERE g.is_owned = TRUE
            AND EXISTS (
              SELECT 1
              FROM files f
              WHERE f.platform_id = g.platform_id
                AND f.game_id = g.id
            )
        ) AS owned_game_count
      FROM platforms p
      LEFT JOIN games g ON g.platform_id = p.id
      GROUP BY p.id, p.name
      ORDER BY p.name ASC
    `,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    game_count: Number.parseInt(row.game_count, 10),
    owned_game_count: Number.parseInt(row.owned_game_count, 10),
  }));
}

export async function getGlobalGameSummary(): Promise<{ all_game_count: number; owned_game_count: number; unfinished_game_count: number }> {
  const result = await query<GlobalGameSummaryRow>(
    `
      SELECT
        COUNT(g.id) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM files f
            WHERE f.platform_id = g.platform_id
              AND f.game_id = g.id
          )
        ) AS all_game_count,
        COUNT(g.id) FILTER (
          WHERE g.is_owned = TRUE
            AND EXISTS (
              SELECT 1
              FROM files f
              WHERE f.platform_id = g.platform_id
                AND f.game_id = g.id
            )
        ) AS owned_game_count,
        COUNT(g.id) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM files f
            WHERE f.platform_id = g.platform_id
              AND f.game_id = g.id
          )
            AND NOT EXISTS (
              SELECT 1
              FROM files f2
              WHERE f2.platform_id = g.platform_id
                AND f2.game_id = g.id
                AND f2.is_required = TRUE
            )
        ) AS unfinished_game_count
      FROM games g
    `,
  );

  const row = result.rows[0];
  return {
    all_game_count: Number.parseInt(row?.all_game_count ?? "0", 10),
    owned_game_count: Number.parseInt(row?.owned_game_count ?? "0", 10),
    unfinished_game_count: Number.parseInt(row?.unfinished_game_count ?? "0", 10),
  };
}
