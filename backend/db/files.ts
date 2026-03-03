import { withTransaction } from "./client";

type RegionPreferenceCandidateGame = {
  platformId: number;
  gameId: number;
  gameTitle: string;
};

type RegionPreferenceFile = {
  md5: string;
  name: string | null;
};

export async function updateFileRequired(platformId: number, gameId: number, md5: string, isRequired: boolean): Promise<boolean> {
  const normalizedMd5 = md5.toLowerCase();

  return withTransaction(async (client) => {
    if (!isRequired) {
      await client.query(
        `
          UPDATE files
          SET
            is_owned = FALSE
          WHERE platform_id = $1
            AND game_id = $2
            AND md5 = $3
        `,
        [platformId, gameId, normalizedMd5],
      );
    }

    const result = await client.query(
      `
        UPDATE files
        SET is_required = $4
        WHERE platform_id = $1 AND game_id = $2 AND md5 = $3
      `,
      [platformId, gameId, normalizedMd5, isRequired],
    );

    if (result.rowCount === 0) {
      return false;
    }

    if (isRequired) {
      await client.query(
        `
          UPDATE files
          SET is_required = FALSE
          WHERE platform_id = $1
            AND game_id = $2
            AND md5 <> $3
            AND is_required IS NULL
        `,
        [platformId, gameId, normalizedMd5],
      );
    }

    await client.query(
      `
        UPDATE games g
        SET is_owned = EXISTS (
          SELECT 1
          FROM files f
          WHERE f.platform_id = g.platform_id
            AND f.game_id = g.id
            AND f.is_owned = TRUE
        )
        WHERE g.platform_id = $1
          AND g.id = $2
      `,
      [platformId, gameId],
    );

    return true;
  });
}

export async function autoSelectSingleFileGames(platformId: number): Promise<number> {
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        WITH single_file_games AS (
          SELECT f.platform_id, f.game_id
          FROM files f
          WHERE f.platform_id = $1
          GROUP BY f.platform_id, f.game_id
          HAVING COUNT(*) = 1
        )
        UPDATE files f
        SET is_required = TRUE
        FROM single_file_games s
        WHERE f.platform_id = s.platform_id
          AND f.game_id = s.game_id
          AND f.is_required IS NULL
      `,
      [platformId],
    );

    return result.rowCount ?? 0;
  });
}

export async function getRegionPreferenceCandidateGames(platformId: number): Promise<RegionPreferenceCandidateGame[]> {
  return withTransaction(async (client) => {
    const result = await client.query<RegionPreferenceCandidateGame>(
      `
        SELECT
          f.platform_id AS "platformId",
          f.game_id AS "gameId",
          g.title AS "gameTitle"
        FROM files f
        INNER JOIN games g
          ON g.platform_id = f.platform_id
          AND g.id = f.game_id
        WHERE f.platform_id = $1
        GROUP BY f.platform_id, f.game_id, g.title
        HAVING COUNT(*) >= 2
           AND BOOL_OR(f.is_required IS TRUE) = FALSE
      `,
      [platformId],
    );

    return result.rows;
  });
}

export async function getFilesForGame(platformId: number, gameId: number): Promise<RegionPreferenceFile[]> {
  return withTransaction(async (client) => {
    const result = await client.query<RegionPreferenceFile>(
      `
        SELECT
          f.md5 AS md5,
          f.name AS name
        FROM files f
        WHERE f.platform_id = $1
          AND f.game_id = $2
        ORDER BY f.name ASC NULLS LAST, f.md5 ASC
      `,
      [platformId, gameId],
    );

    return result.rows;
  });
}

export async function selectRequiredFileForGame(platformId: number, gameId: number, requiredMd5: string): Promise<boolean> {
  const normalizedMd5 = requiredMd5.toLowerCase();

  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE files
        SET is_required = CASE
          WHEN md5 = $3 THEN TRUE
          ELSE FALSE
        END
        WHERE platform_id = $1
          AND game_id = $2
      `,
      [platformId, gameId, normalizedMd5],
    );

    return (result.rowCount ?? 0) > 0;
  });
}
