const isFrontendDevPort = window.location.hostname === "localhost" && window.location.port === "3000";
const API_BASE = isFrontendDevPort
  ? `${window.location.protocol}//${window.location.hostname}:4000/api`
  : `${window.location.origin}/api`;

type PlatformsResponse = Array<{ id: number; name: string; game_count: number; owned_game_count: number }>;

type GamesResponse = {
  games: Array<{
    id: number;
    title: string;
    files: Array<{
      name: string | null;
      md5: string;
      isRequired: boolean | null;
      isOwned: boolean | null;
      patchUrl: string | null;
      labels: string[] | null;
    }>;
  }>;
};

type AutoSelectResponse = {
  success: boolean;
  updatedCount: number;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json() as { error?: string; details?: string };
      if (typeof payload.details === "string" && payload.details.trim()) {
        message = payload.details;
      } else if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error;
      }
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) {
          message = text.trim();
        }
      } catch {
      }
    }

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function fetchPlatforms(): Promise<PlatformsResponse> {
  return fetchJson<PlatformsResponse>(`${API_BASE}/platforms`);
}

export function fetchGamesForPlatform(
  platformId: string,
  hideSelectedGames: boolean,
  hideOwnedGames: boolean,
): Promise<GamesResponse> {
  const url = new URL(`${API_BASE}/platforms/${platformId}/games`);

  if (hideSelectedGames) {
    url.searchParams.set("hideGamesWithSelectedFiles", "true");
  }

  if (hideOwnedGames) {
    url.searchParams.set("hideOwnedGames", "true");
  }

  return fetchJson<GamesResponse>(url.toString());
}

export function updateFileRequired(platformId: number, gameId: number, md5: string, isRequired: boolean): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`${API_BASE}/files/required`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platformId,
      gameId,
      md5,
      isRequired,
    }),
  });
}

export function autoSelectSingleFileGames(platformId: number): Promise<AutoSelectResponse> {
  return fetchJson<AutoSelectResponse>(`${API_BASE}/bulk/files/auto-select-single-file-games`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ platformId }),
  });
}

export function autoSelectRegionPreferences(platformId: number): Promise<AutoSelectResponse> {
  return fetchJson<AutoSelectResponse>(`${API_BASE}/bulk/files/auto-select-region-preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ platformId }),
  });
}
