import { query } from "./client";

type PlatformRow = {
  id: number;
  name: string;
  game_count: string;
  owned_game_count: string;
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
