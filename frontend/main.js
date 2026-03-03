// api.ts
var API_BASE = "http://localhost:4000/api";
var ApiError = class extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
};
async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
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
  return response.json();
}
function fetchPlatforms() {
  return fetchJson(`${API_BASE}/platforms`);
}
function fetchGamesForPlatform(platformId, hideSelectedGames, hideOwnedGames) {
  const url = new URL(`${API_BASE}/platforms/${platformId}/games`);
  if (hideSelectedGames) {
    url.searchParams.set("hideGamesWithSelectedFiles", "true");
  }
  if (hideOwnedGames) {
    url.searchParams.set("hideOwnedGames", "true");
  }
  return fetchJson(url.toString());
}
function updateFileRequired(platformId, gameId, md5, isRequired) {
  return fetchJson(`${API_BASE}/files/required`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      platformId,
      gameId,
      md5,
      isRequired
    })
  });
}
function autoSelectSingleFileGames(platformId) {
  return fetchJson(`${API_BASE}/bulk/files/auto-select-single-file-games`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ platformId })
  });
}
function autoSelectRegionPreferences(platformId) {
  return fetchJson(`${API_BASE}/bulk/files/auto-select-region-preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ platformId })
  });
}

// render.ts
function setDisplayedGamesCount(labelElement, displayedCount) {
  labelElement.textContent = `Games shown: ${displayedCount}`;
}
function clearGames(containerElement) {
  containerElement.innerHTML = "";
}
function renderGames(containerElement, games, platformId) {
  clearGames(containerElement);
  if (!games.length) {
    const emptyText = document.createElement("p");
    emptyText.textContent = "No games found for this platform.";
    containerElement.appendChild(emptyText);
    return;
  }
  for (const game of games) {
    const gameSection = document.createElement("section");
    gameSection.className = "game-card";
    const gameHeader = document.createElement("div");
    gameHeader.className = "game-header";
    const gameTitle = document.createElement("h2");
    gameTitle.textContent = game.title;
    gameHeader.appendChild(gameTitle);
    const gameId = document.createElement("span");
    gameId.className = "game-id";
    gameId.textContent = `#${game.id}`;
    gameHeader.appendChild(gameId);
    gameSection.appendChild(gameHeader);
    if (!game.files.length) {
      const noFilesText = document.createElement("p");
      noFilesText.textContent = "No files for this game.";
      gameSection.appendChild(noFilesText);
      containerElement.appendChild(gameSection);
      continue;
    }
    const filesList = document.createElement("ul");
    filesList.className = "files-list";
    for (const file of game.files) {
      const fileItem = document.createElement("li");
      fileItem.className = "file-item";
      const fileName = file.name || "(unnamed file)";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "file-checkbox";
      checkbox.value = file.md5;
      checkbox.checked = file.isRequired === true;
      checkbox.dataset.platformId = String(platformId);
      checkbox.dataset.gameId = String(game.id);
      checkbox.dataset.md5 = file.md5;
      checkbox.dataset.requiredState = file.isRequired === null ? "null" : String(file.isRequired);
      checkbox.setAttribute("aria-label", `${fileName} ${file.md5}`);
      const fileInfo = document.createElement("div");
      fileInfo.className = "file-info";
      const fileNameText = document.createElement("span");
      fileNameText.className = "file-name";
      fileNameText.textContent = fileName;
      const fileHashText = document.createElement("code");
      fileHashText.className = "file-hash";
      fileHashText.textContent = file.md5;
      fileInfo.appendChild(fileNameText);
      fileInfo.appendChild(fileHashText);
      fileItem.appendChild(checkbox);
      fileItem.appendChild(fileInfo);
      filesList.appendChild(fileItem);
    }
    gameSection.appendChild(filesList);
    containerElement.appendChild(gameSection);
  }
}

// urlState.ts
function getPageStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const platformId = params.get("platform");
  const hideSelectedGames = params.get("hideFinished") === "1" || params.get("hide_finished") === "1" || params.get("hide") === "1";
  return {
    platformId: platformId && platformId.trim() ? platformId.trim() : "",
    hideSelectedGames,
    hideOwnedGames: params.get("hideOwned") === "1" || params.get("owned") === "1"
  };
}
function setPageStateInUrl(platformId, hideSelectedGames, hideOwnedGames) {
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

// main.ts
var platformSelect = document.getElementById("platform-select");
var hideSelectedGamesCheckbox = document.getElementById("hide-selected-games");
var hideOwnedGamesCheckbox = document.getElementById("hide-owned-games");
var displayedGamesCount = document.getElementById("displayed-games-count");
var autoSelectSingleFileButton = document.getElementById("auto-select-single-file-btn");
var autoSelectRegionPreferencesButton = document.getElementById("auto-select-region-preferences-btn");
var statusText = document.getElementById("status");
var gamesContainer = document.getElementById("games-container");
function optionExists(selectElement, value) {
  return Array.from(selectElement.options).some((option) => option.value === value);
}
function formatOwnedPercentage(ownedGameCount, totalGameCount) {
  if (totalGameCount <= 0) {
    return "100";
  }
  return String(Math.round(ownedGameCount / totalGameCount * 100));
}
async function persistCheckboxChange(checkbox, nextValue) {
  const previousChecked = checkbox.checked;
  const previousState = checkbox.dataset.requiredState || "null";
  checkbox.checked = nextValue;
  await updateFileRequired(
    Number.parseInt(checkbox.dataset.platformId || "", 10),
    Number.parseInt(checkbox.dataset.gameId || "", 10),
    (checkbox.dataset.md5 || "").toLowerCase(),
    nextValue
  ).then(() => {
    checkbox.dataset.requiredState = nextValue ? "true" : "false";
  }).catch((error) => {
    checkbox.checked = previousChecked;
    checkbox.dataset.requiredState = previousState;
    statusText.textContent = error instanceof Error ? error.message : String(error);
    throw error;
  });
}
async function selectPlatformAndLoad(platformId) {
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
      hideOwnedGamesCheckbox.checked
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
async function loadPlatforms() {
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
//# sourceMappingURL=main.js.map
