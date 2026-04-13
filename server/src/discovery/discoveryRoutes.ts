import { Router } from "express";
import { listPublicRooms, getRoom } from "./discoveryService.js";

export const discoveryRouter = Router();

discoveryRouter.get("/public", async (req, res) => {
  try {
    const page = Math.min(10_000, Math.max(1, parseInt(req.query.page as string) || 1));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allRooms = await listPublicRooms();
    const paged = allRooms.slice(offset, offset + limit);

    res.json({
      rooms: paged,
      total: allRooms.length,
      page,
      limit,
    });
  } catch (err) {
    console.error("[discovery] Error listing rooms:", err);
    res.status(500).json({ error: "Failed to list rooms" });
  }
});

discoveryRouter.get("/:id", async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.json(room);
  } catch (err) {
    console.error("[discovery] Error getting room:", err);
    res.status(500).json({ error: "Failed to get room" });
  }
});
