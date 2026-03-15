import express from "express";
import { getPlatforms } from "../db/platforms";
import { getGamesForPlatform } from "../db/games";

const router = express.Router();

router.get("/platforms", async (_req, res) => {
  try {
    const platforms = await getPlatforms();
    res.json(platforms);
  } catch (error) {
    console.error("[api] Failed to load platforms", error);
    res.status(500).json({
      error: "Failed to load platforms",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/platforms/:platformId/games", async (req, res) => {
  const platformId = Number.parseInt(req.params.platformId, 10);
  const hideGamesWithSelectedFiles = req.query.hideGamesWithSelectedFiles === "true";
  const hideOwnedGames = req.query.hideOwnedGames === "true";

  if (Number.isNaN(platformId)) {
    res.status(400).json({ error: "Invalid platformId" });
    return;
  }

  try {
    const payload = await getGamesForPlatform(platformId, hideGamesWithSelectedFiles, hideOwnedGames);
    res.json(payload);
  } catch (error) {
    console.error(`[api] Failed to load games for platform ${platformId}`, error);
    res.status(500).json({
      error: "Failed to load games for platform",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
