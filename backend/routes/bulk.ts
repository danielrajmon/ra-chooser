import express from "express";
import fs from "fs";
import path from "path";
import { autoSelectSingleFileGames, getFilesForGame, getRegionPreferenceCandidateGames, selectRequiredFileForGame } from "../db/files";

const router = express.Router();

type RegionConfig = {
  possibleRegions?: string[];
};

function loadPossibleRegions(): string[] {
  const configPath = path.join(__dirname, "../../platforms.json");
  const rawConfig = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(rawConfig) as RegionConfig;

  return Array.isArray(parsed.possibleRegions)
    ? parsed.possibleRegions.map((region) => String(region).trim()).filter(Boolean)
    : [];
}

function detectRegionFromFileName(fileName: string | null, possibleRegions: string[]): string | null {
  if (!fileName) {
    return null;
  }

  const regionIndexByName = new Map(possibleRegions.map((region, index) => [region, index]));
  const parentheticalMatches = fileName.matchAll(/\(([^)]+)\)/g);

  let bestRegionIndex: number | null = null;

  for (const match of parentheticalMatches) {
    const insideParentheses = (match[1] ?? "").trim();
    if (!insideParentheses) {
      continue;
    }

    const candidateRegions = insideParentheses.split(",").map((value) => value.trim()).filter(Boolean);

    for (const candidate of candidateRegions) {
      const regionIndex = regionIndexByName.get(candidate);
      if (regionIndex === undefined) {
        continue;
      }

      if (bestRegionIndex === null || regionIndex < bestRegionIndex) {
        bestRegionIndex = regionIndex;
      }
    }
  }

  return bestRegionIndex === null ? null : possibleRegions[bestRegionIndex];
}

function findStrongestRegionSelection(
  files: Array<{ md5: string; detectedRegion: string | null }>,
  possibleRegions: string[],
): string | null {
  const regionIndexByName = new Map(possibleRegions.map((region, index) => [region, index]));

  let bestRegionIndex: number | null = null;
  const strongestFiles: Array<{ md5: string; detectedRegion: string | null }> = [];

  for (const file of files) {
    if (!file.detectedRegion) {
      continue;
    }

    const regionIndex = regionIndexByName.get(file.detectedRegion);
    if (regionIndex === undefined) {
      continue;
    }

    if (bestRegionIndex === null || regionIndex < bestRegionIndex) {
      bestRegionIndex = regionIndex;
      strongestFiles.length = 0;
      strongestFiles.push(file);
      continue;
    }

    if (regionIndex === bestRegionIndex) {
      strongestFiles.push(file);
    }
  }

  if (strongestFiles.length !== 1) {
    return null;
  }

  return strongestFiles[0].md5;
}

router.post("/files/auto-select-single-file-games", async (req, res) => {
  const { platformId } = req.body ?? {};
  const parsedPlatformId = Number.parseInt(String(platformId), 10);

  if (Number.isNaN(parsedPlatformId)) {
    res.status(400).json({ error: "Invalid platformId" });
    return;
  }

  try {
    const updatedCount = await autoSelectSingleFileGames(parsedPlatformId);
    res.json({ success: true, updatedCount });
  } catch (error) {
    res.status(500).json({
      error: "Failed to auto-select single-file games",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/files/auto-select-region-preferences", async (req, res) => {
  const { platformId } = req.body ?? {};
  const parsedPlatformId = Number.parseInt(String(platformId), 10);

  if (Number.isNaN(parsedPlatformId)) {
    res.status(400).json({ error: "Invalid platformId" });
    return;
  }

  try {
    const candidateGames = await getRegionPreferenceCandidateGames(parsedPlatformId);
    const possibleRegions = loadPossibleRegions();
    let updatedCount = 0;

    const candidatesWithRegions: Array<{
      platformId: number;
      gameId: number;
      selectedMd5: string | null;
      files: Array<{
        md5: string;
        name: string | null;
        detectedRegion: string | null;
      }>;
    }> = [];

    for (const game of candidateGames) {
      const files = await getFilesForGame(game.platformId, game.gameId);
      const filesWithRegions = files.map((file) => {
        const sourceName = file.name;
        const detectedRegion = detectRegionFromFileName(sourceName, possibleRegions);

        return {
          md5: file.md5,
          name: file.name,
          detectedRegion,
        };
      });

      for (const file of filesWithRegions) {
        const printableName = file.name ?? "<unnamed file>";
        console.log(`[region-preferences] platform=${game.platformId} game=${game.gameId} file="${printableName}" region=${file.detectedRegion ?? "<none>"}`);
      }

      const selectedMd5 = findStrongestRegionSelection(filesWithRegions, possibleRegions);
      candidatesWithRegions.push({
        platformId: game.platformId,
        gameId: game.gameId,
        selectedMd5,
        files: filesWithRegions,
      });
    }

    for (const candidate of candidatesWithRegions) {
      if (!candidate.selectedMd5) {
        continue;
      }

      const wasUpdated = await selectRequiredFileForGame(candidate.platformId, candidate.gameId, candidate.selectedMd5);
      if (wasUpdated) {
        updatedCount += 1;
      }
    }

    res.json({
      success: true,
      updatedCount,
      candidateCount: candidatesWithRegions.length,
      possibleRegions,
      candidates: candidatesWithRegions,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to auto-select region preferences",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
