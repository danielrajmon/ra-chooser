import express from "express";
import { updateFileRequired } from "../db/files";

const router = express.Router();

router.patch("/files/required", async (req, res) => {
  const { platformId, gameId, md5, isRequired } = req.body ?? {};

  const parsedPlatformId = Number.parseInt(String(platformId), 10);
  const parsedGameId = Number.parseInt(String(gameId), 10);

  if (Number.isNaN(parsedPlatformId) || Number.isNaN(parsedGameId) || typeof md5 !== "string" || typeof isRequired !== "boolean") {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const updated = await updateFileRequired(parsedPlatformId, parsedGameId, md5, isRequired);

    if (!updated) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update file required flag",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
