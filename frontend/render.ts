type FileItemModel = {
  name: string | null;
  md5: string;
  isRequired: boolean | null;
  isOwned: boolean | null;
};

type GameModel = {
  id: number;
  title: string;
  files: FileItemModel[];
};

export function setDisplayedGamesCount(labelElement: HTMLElement, displayedCount: number): void {
  labelElement.textContent = `Games shown: ${displayedCount}`;
}

export function clearGames(containerElement: HTMLElement): void {
  containerElement.innerHTML = "";
}

export function renderGames(containerElement: HTMLElement, games: GameModel[], platformId: string): void {
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

    const isOwnedGame = game.files.some((file) => file.isOwned === true);
    if (isOwnedGame) {
      gameSection.classList.add("owned-game");
    }

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
