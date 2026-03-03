export function getPageStateFromUrl(): { platformId: string; hideSelectedGames: boolean; hideOwnedGames: boolean } {
  const params = new URLSearchParams(window.location.search);
  const platformId = params.get("platform");
  const hideSelectedGames = params.get("hideFinished") === "1"
    || params.get("hide_finished") === "1"
    || params.get("hide") === "1";

  return {
    platformId: platformId && platformId.trim() ? platformId.trim() : "",
    hideSelectedGames,
    hideOwnedGames: params.get("hideOwned") === "1" || params.get("owned") === "1",
  };
}

export function setPageStateInUrl(platformId: string, hideSelectedGames: boolean, hideOwnedGames: boolean): void {
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams();

  if (platformId) {
    searchParams.set("platform", platformId);
  }

  if (hideSelectedGames) {
    searchParams.set("hideFinished", "1");
  }

  if (hideOwnedGames) {
    searchParams.set("hideOwned", "1");
  }

  url.search = searchParams.toString();

  window.history.replaceState({}, "", url.toString());
}
