import {
  autoSelectRegionPreferences,
  autoSelectSingleFileGames,
  fetchGamesForPlatform,
  fetchPlatforms,
  updateFileRequired,
} from "./api.js";
import { clearGames, renderGames, setDisplayedGamesCount } from "./render.js";
import { getPageStateFromUrl, setPageStateInUrl } from "./urlState.js";

const platformSelect = document.getElementById("platform-select") as HTMLSelectElement;
const hideSelectedGamesCheckbox = document.getElementById("hide-selected-games") as HTMLInputElement;
const hideOwnedGamesCheckbox = document.getElementById("hide-owned-games") as HTMLInputElement;
const displayedGamesCount = document.getElementById("displayed-games-count") as HTMLElement;
const autoSelectSingleFileButton = document.getElementById("auto-select-single-file-btn") as HTMLButtonElement;
const autoSelectRegionPreferencesButton = document.getElementById("auto-select-region-preferences-btn") as HTMLButtonElement;
const statusText = document.getElementById("status") as HTMLElement;
const gamesContainer = document.getElementById("games-container") as HTMLElement;

function optionExists(selectElement: HTMLSelectElement, value: string): boolean {
  return Array.from(selectElement.options).some((option) => option.value === value);
}

function formatOwnedPercentage(ownedGameCount: number, totalGameCount: number): string {
  if (totalGameCount <= 0) {
    return "100";
  }

  return String(Math.round((ownedGameCount / totalGameCount) * 100));
}

async function persistCheckboxChange(checkbox: HTMLInputElement, nextValue: boolean): Promise<void> {
  const previousChecked = checkbox.checked;
  const previousState = checkbox.dataset.requiredState || "null";

  checkbox.checked = nextValue;

  await updateFileRequired(
    Number.parseInt(checkbox.dataset.platformId || "", 10),
    Number.parseInt(checkbox.dataset.gameId || "", 10),
    (checkbox.dataset.md5 || "").toLowerCase(),
    nextValue,
  ).then(() => {
    checkbox.dataset.requiredState = nextValue ? "true" : "false";
  }).catch((error) => {
    checkbox.checked = previousChecked;
    checkbox.dataset.requiredState = previousState;
    statusText.textContent = error instanceof Error ? error.message : String(error);
    throw error;
  });
}

async function selectPlatformAndLoad(platformId: string): Promise<void> {
  const selectedOption = platformSelect.options[platformSelect.selectedIndex];

  if (!selectedOption || !platformId) {
    statusText.textContent = "";
    clearGames(gamesContainer);
    setPageStateInUrl("", hideSelectedGamesCheckbox.checked, hideOwnedGamesCheckbox.checked);
    return;
  }

  setPageStateInUrl(platformId, hideSelectedGamesCheckbox.checked, hideOwnedGamesCheckbox.checked);

  try {
    const payload = await fetchGamesForPlatform(
      platformId,
      hideSelectedGamesCheckbox.checked,
      hideOwnedGamesCheckbox.checked,
    );
    const games = Array.isArray(payload?.games) ? payload.games : [];

    renderGames(gamesContainer, games, platformId);
    setDisplayedGamesCount(displayedGamesCount, games.length);
    statusText.textContent = "";
  } catch (error) {
    clearGames(gamesContainer);
    statusText.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function loadPlatforms(): Promise<void> {
  try {
    const platforms = await fetchPlatforms();
    const pageState = getPageStateFromUrl();

    hideSelectedGamesCheckbox.checked = pageState.hideSelectedGames;
    hideOwnedGamesCheckbox.checked = pageState.hideOwnedGames;

    platformSelect.innerHTML = "";

    for (const platform of platforms) {
      const option = document.createElement("option");
      option.value = String(platform.id);
      const ownedPercentage = formatOwnedPercentage(platform.owned_game_count, platform.game_count);
      option.textContent = `${platform.name} (${ownedPercentage}% owned)`;
      platformSelect.appendChild(option);
    }

    if (pageState.platformId && optionExists(platformSelect, pageState.platformId)) {
      platformSelect.value = pageState.platformId;
      await selectPlatformAndLoad(pageState.platformId);
      return;
    }

    if (platforms.length > 0) {
      const firstPlatformId = String(platforms[0].id);
      platformSelect.value = firstPlatformId;
      await selectPlatformAndLoad(firstPlatformId);
      return;
    }

    statusText.textContent = "";
    clearGames(gamesContainer);
    setDisplayedGamesCount(displayedGamesCount, 0);
  } catch (error) {
    platformSelect.innerHTML = "<option value=''>Unable to load platforms</option>";
    statusText.textContent = error instanceof Error ? error.message : String(error);
  }
}

platformSelect.addEventListener("change", () => {
  const selectedOption = platformSelect.options[platformSelect.selectedIndex];

  if (!selectedOption) {
    statusText.textContent = "";
    clearGames(gamesContainer);
    setPageStateInUrl("", hideSelectedGamesCheckbox.checked, hideOwnedGamesCheckbox.checked);
    return;
  }

  void selectPlatformAndLoad(selectedOption.value);
});

hideSelectedGamesCheckbox.addEventListener("change", () => {
  const selectedOption = platformSelect.options[platformSelect.selectedIndex];

  if (selectedOption) {
    setPageStateInUrl(selectedOption.value, hideSelectedGamesCheckbox.checked, hideOwnedGamesCheckbox.checked);
  } else {
    setPageStateInUrl("", hideSelectedGamesCheckbox.checked, hideOwnedGamesCheckbox.checked);
  }

  if (!selectedOption) {
    clearGames(gamesContainer);
    return;
  }

  void selectPlatformAndLoad(selectedOption.value);
});

hideOwnedGamesCheckbox.addEventListener("change", () => {
  const selectedOption = platformSelect.options[platformSelect.selectedIndex];

  if (selectedOption) {
    setPageStateInUrl(selectedOption.value, hideSelectedGamesCheckbox.checked, hideOwnedGamesCheckbox.checked);
  } else {
    setPageStateInUrl("", hideSelectedGamesCheckbox.checked, hideOwnedGamesCheckbox.checked);
  }

  if (!selectedOption) {
    clearGames(gamesContainer);
    return;
  }

  void selectPlatformAndLoad(selectedOption.value);
});

autoSelectSingleFileButton.addEventListener("click", () => {
  const selectedOption = platformSelect.options[platformSelect.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    statusText.textContent = "Select a platform first.";
    return;
  }

  autoSelectSingleFileButton.disabled = true;

  void autoSelectSingleFileGames(Number.parseInt(selectedOption.value, 10)).then((payload) => {
    return selectPlatformAndLoad(selectedOption.value);
  }).catch((error) => {
    statusText.textContent = error instanceof Error ? error.message : String(error);
  }).finally(() => {
    autoSelectSingleFileButton.disabled = false;
  });
});

autoSelectRegionPreferencesButton.addEventListener("click", () => {
  const selectedOption = platformSelect.options[platformSelect.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    statusText.textContent = "Select a platform first.";
    return;
  }

  autoSelectRegionPreferencesButton.disabled = true;

  void autoSelectRegionPreferences(Number.parseInt(selectedOption.value, 10)).then((payload) => {
    return selectPlatformAndLoad(selectedOption.value);
  }).catch((error) => {
    statusText.textContent = error instanceof Error ? error.message : String(error);
  }).finally(() => {
    autoSelectRegionPreferencesButton.disabled = false;
  });
});

gamesContainer.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest(".file-checkbox")) {
    return;
  }

  const fileItem = event.target.closest(".file-item");
  if (!fileItem) {
    return;
  }

  const checkbox = fileItem.querySelector(".file-checkbox");
  if (!(checkbox instanceof HTMLInputElement)) {
    return;
  }

  void persistCheckboxChange(checkbox, !checkbox.checked).catch(() => {
  });
});

gamesContainer.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  if (!event.target.classList.contains("file-checkbox")) {
    return;
  }

  void persistCheckboxChange(event.target, event.target.checked).catch(() => {
  });
});

void loadPlatforms();
