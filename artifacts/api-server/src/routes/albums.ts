import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, albumsTable, photosTable } from "@workspace/db";
import {
  GetAlbumBySlugParams,
  GetAlbumsResponse,
  GetAlbumsResponseItem,
  GetAlbumBySlugResponse,
} from "@workspace/api-zod";
import { getPublicUrl } from "../lib/storage";

const router: IRouter = Router();

router.get("/albums", async (req, res): Promise<void> => {
  const albums = await db
    .select({
      id: albumsTable.id,
      title: albumsTable.title,
      slug: albumsTable.slug,
      description: albumsTable.description,
      priceSingle: albumsTable.priceSingle,
      priceAlbum: albumsTable.priceAlbum,
      isPublished: albumsTable.isPublished,
      coverPhotoId: albumsTable.coverPhotoId,
      createdAt: albumsTable.createdAt,
      photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos.album_id = albums.id)`,
      coverWatermarkedPath: sql<string | null>`(SELECT watermarked_path FROM photos WHERE photos.id = albums.cover_photo_id)`,
    })
    .from(albumsTable)
    .where(eq(albumsTable.isPublished, true))
    .orderBy(sql`albums.created_at DESC`);

  const result = GetAlbumsResponse.parse(
    albums.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      description: a.description,
      priceSingle: Number(a.priceSingle),
      priceAlbum: Number(a.priceAlbum),
      isPublished: a.isPublished,
      photoCount: Number(a.photoCount),
      coverPhotoUrl: a.coverWatermarkedPath ? getPublicUrl(a.coverWatermarkedPath) : null,
      createdAt: a.createdAt.toISOString(),
    })),
  );

  res.json(result);
});

router.get("/albums/:slug", async (req, res): Promise<void> => {
  const params = GetAlbumBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [album] = await db
    .select({
      id: albumsTable.id,
      title: albumsTable.title,
      slug: albumsTable.slug,
      description: albumsTable.description,
      priceSingle: albumsTable.priceSingle,
      priceAlbum: albumsTable.priceAlbum,
      isPublished: albumsTable.isPublished,
      coverPhotoId: albumsTable.coverPhotoId,
      createdAt: albumsTable.createdAt,
      coverWatermarkedPath: sql<string | null>`(SELECT watermarked_path FROM photos WHERE photos.id = albums.cover_photo_id)`,
    })
    .from(albumsTable)
    .where(eq(albumsTable.slug, params.data.slug));

  if (!album || !album.isPublished) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.albumId, album.id))
    .orderBy(photosTable.sortOrder);

  res.json(
    GetAlbumBySlugResponse.parse({
      id: album.id,
      title: album.title,
      slug: album.slug,
      description: album.description,
      priceSingle: Number(album.priceSingle),
      priceAlbum: Number(album.priceAlbum),
      isPublished: album.isPublished,
      coverPhotoId: album.coverPhotoId,
      coverPhotoUrl: album.coverWatermarkedPath ? getPublicUrl(album.coverWatermarkedPath) : null,
      createdAt: album.createdAt.toISOString(),
      photos: photos.map((p) => ({
        id: p.id,
        albumId: p.albumId,
        filename: p.filename,
        watermarkedUrl: getPublicUrl(p.watermarkedPath),
        sortOrder: p.sortOrder,
        createdAt: p.createdAt.toISOString(),
      })),
    }),
  );
});

export default router;
