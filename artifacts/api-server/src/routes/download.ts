import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { db, downloadTokensTable, ordersTable, photosTable, albumsTable } from "@workspace/db";
import { readFile } from "../lib/storage";

const router: IRouter = Router();

router.get("/download/:token", async (req, res): Promise<void> => {
  const rawToken = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  const [dlToken] = await db
    .select()
    .from(downloadTokensTable)
    .where(eq(downloadTokensTable.token, rawToken));

  if (!dlToken) {
    res.status(404).send("Download link not found.");
    return;
  }

  if (new Date(dlToken.expiresAt) < new Date()) {
    res.status(410).send("This download link has expired.");
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, dlToken.orderId));

  if (!order || order.status === "pending") {
    res.status(402).send("Order not yet confirmed.");
    return;
  }

  const { albumId, purchaseType, photoId } = order;

  let photos: { originalPath: string; filename: string }[] = [];

  if (purchaseType === "single" && photoId) {
    const [photo] = await db
      .select({ originalPath: photosTable.originalPath, filename: photosTable.filename })
      .from(photosTable)
      .where(eq(photosTable.id, photoId));
    if (photo) photos = [photo];
  } else {
    photos = await db
      .select({ originalPath: photosTable.originalPath, filename: photosTable.filename })
      .from(photosTable)
      .where(eq(photosTable.albumId, albumId))
      .orderBy(photosTable.sortOrder);
  }

  if (photos.length === 0) {
    res.status(404).send("No photos found for this order.");
    return;
  }

  if (photos.length === 1) {
    const buffer = await readFile(photos[0].originalPath);
    res.set({
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${photos[0].filename}"`,
    });
    res.send(buffer);
    return;
  }

  const zip = new JSZip();
  for (const photo of photos) {
    try {
      const buffer = await readFile(photo.originalPath);
      zip.file(photo.filename, buffer);
    } catch {
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  const [album] = await db
    .select({ title: albumsTable.title })
    .from(albumsTable)
    .where(eq(albumsTable.id, albumId));
  const albumTitle = album?.title?.replace(/[^a-zA-Z0-9_-]/g, "_") ?? "album";

  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${albumTitle}.zip"`,
  });
  res.send(zipBuffer);
});

export default router;
