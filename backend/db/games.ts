import { query } from "./client";

type GameFileRow = {
  game_id: number;
  game_title: string;
  file_name: string | null;
  file_md5: string | null;
  file_is_required: boolean | null;
  file_is_owned: boolean | null;
  file_patch_url: string | null;
  file_labels: string[] | null;
};

type GameFile = {
  name: string | null;
  md5: string;
  isRequired: boolean | null;
  isOwned: boolean | null;
  patchUrl: string | null;
  labels: string[] | null;
};

type Game = {
  id: number;
  title: string;
  files: GameFile[];
};

export async function getGamesForPlatform(
  platformId: number,
  hideGamesWithSelectedFiles: boolean,
  hideOwnedGames: boolean = false,
): Promise<{ games: Game[] }> {
  const queryParams: Array<number | boolean> = [platformId, hideGamesWithSelectedFiles, hideOwnedGames];

  const result = await query<GameFileRow>(
    `
      SELECT
        g.id AS game_id,
        g.title AS game_title,
        f.name AS file_name,
        f.md5 AS file_md5,
        f.is_required AS file_is_required,
        f.is_owned AS file_is_owned,
        f.patch_url AS file_patch_url,
        f.labels AS file_labels
      FROM games g
      LEFT JOIN files f
        ON f.platform_id = g.platform_id
        AND f.game_id = g.id
      WHERE g.platform_id = $1
        AND (
          $2::boolean = FALSE
          OR NOT EXISTS (
            SELECT 1
            FROM files f2
            WHERE f2.platform_id = g.platform_id
              AND f2.game_id = g.id
              AND f2.is_required = TRUE
          )
        )
        AND (
          $3::boolean = FALSE
          OR g.is_owned = FALSE
        )
      ORDER BY g.title ASC, g.id ASC, f.name ASC NULLS LAST, f.md5 ASC
    `,
    queryParams,
  );

  const gamesById = new Map<number, Game>();

  for (const row of result.rows) {
    if (!gamesById.has(row.game_id)) {
      gamesById.set(row.game_id, {
        id: row.game_id,
        title: row.game_title,
        files: [],
      });
    }

    if (row.file_md5) {
      gamesById.get(row.game_id)?.files.push({
        name: row.file_name,
        md5: row.file_md5,
        isRequired: row.file_is_required,
        isOwned: row.file_is_owned,
        patchUrl: row.file_patch_url,
        labels: row.file_labels,
      });
    }
  }

  return {
    games: Array.from(gamesById.values()),
  };
}
