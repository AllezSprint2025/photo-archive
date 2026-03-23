import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { db, albumsTable, photosTable, ordersTable } from "@workspace/db";
import {
  AdminCreateAlbumBody,
  AdminUpdateAlbumBody,
  AdminUpdateAlbumParams,
  AdminDeleteAlbumParams,
  AdminPublishAlbumParams,
  AdminPublishAlbumBody,
  AdminSetCoverPhotoParams,
  AdminSetCoverPhotoBody,
  AdminDeletePhotoParams,
  AdminGetAlbumsResponse,
  AdminGetAlbumParams,
  AdminGetAlbumResponse,
  AdminUpdateAlbumResponse,
  AdminDeleteAlbumResponse,
  AdminPublishAlbumResponse,
  AdminSetCoverPhotoResponse,
  AdminDeletePhotoResponse,
  AdminUploadPhotosResponse,
  AdminGetOrdersResponse,
} from "@workspace/api-zod";
import { applyWatermark } from "../lib/watermark";
import { saveFile, deleteFile, getPublicUrl } from "../lib/storage";
import type { Request } from "express";

const router: IRouter = Router();

function isAdminAuthorized(req: Request): boolean {
  const secret = req.headers["x-admin-secret"];
  return secret === process.env.ADMIN_SECRET;
}

function requireAdmin(req: Request, res: any): boolean {
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function albumToAdminResponse(a: any, photoCount: number, coverWatermarkedPath: string | null) {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    description: a.description,
    priceSingle: Number(a.priceSingle),
    priceAlbum: Number(a.priceAlbum),
    isPublished: a.isPublished,
    photoCount,
    coverPhotoId: a.coverPhotoId,
    coverPhotoUrl: coverWatermarkedPath ? getPublicUrl(coverWatermarkedPath) : null,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

router.get("/admin/albums", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

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
    .orderBy(sql`albums.created_at DESC`);

  res.json(
    AdminGetAlbumsResponse.parse(
      albums.map((a) => albumToAdminResponse(a, Number(a.photoCount), a.coverWatermarkedPath)),
    ),
  );
});

router.post("/admin/albums", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const parsed = AdminCreateAlbumBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, slug, description, priceSingle, priceAlbum, isPublished } = parsed.data;

  const [album] = await db
    .insert(albumsTable)
    .values({
      title,
      slug,
      description: description ?? null,
      priceSingle: priceSingle.toString(),
      priceAlbum: priceAlbum.toString(),
      isPublished: isPublished ?? false,
    })
    .returning();

  res.status(201).json(albumToAdminResponse(album, 0, null));
});

router.get("/admin/albums/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = AdminGetAlbumParams.safeParse(req.params);
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
    .where(eq(albumsTable.id, params.data.id));

  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.albumId, album.id))
    .orderBy(photosTable.sortOrder);

  res.json(
    AdminGetAlbumResponse.parse({
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

router.patch("/admin/albums/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = AdminUpdateAlbumParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminUpdateAlbumBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.slug !== undefined) updateData.slug = parsed.data.slug;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.priceSingle !== undefined) updateData.priceSingle = parsed.data.priceSingle.toString();
  if (parsed.data.priceAlbum !== undefined) updateData.priceAlbum = parsed.data.priceAlbum.toString();

  const [album] = await db
    .update(albumsTable)
    .set(updateData)
    .where(eq(albumsTable.id, params.data.id))
    .returning({
      id: albumsTable.id,
      title: albumsTable.title,
      slug: albumsTable.slug,
      description: albumsTable.description,
      priceSingle: albumsTable.priceSingle,
      priceAlbum: albumsTable.priceAlbum,
      isPublished: albumsTable.isPublished,
      coverPhotoId: albumsTable.coverPhotoId,
      createdAt: albumsTable.createdAt,
    });

  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(photosTable)
    .where(eq(photosTable.albumId, album.id));

  let coverWatermarkedPath: string | null = null;
  if (album.coverPhotoId) {
    const [coverPhoto] = await db
      .select({ watermarkedPath: photosTable.watermarkedPath })
      .from(photosTable)
      .where(eq(photosTable.id, album.coverPhotoId));
    coverWatermarkedPath = coverPhoto?.watermarkedPath ?? null;
  }

  res.json(
    AdminUpdateAlbumResponse.parse(
      albumToAdminResponse(album, Number(countResult?.count ?? 0), coverWatermarkedPath),
    ),
  );
});

router.delete("/admin/albums/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = AdminDeleteAlbumParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.albumId, params.data.id));

  for (const photo of photos) {
    await deleteFile(photo.originalPath).catch(() => {});
    await deleteFile(photo.watermarkedPath).catch(() => {});
  }

  await db.delete(albumsTable).where(eq(albumsTable.id, params.data.id));

  res.json(AdminDeleteAlbumResponse.parse({ success: true }));
});

router.patch("/admin/albums/:id/publish", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = AdminPublishAlbumParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminPublishAlbumBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [album] = await db
    .update(albumsTable)
    .set({ isPublished: parsed.data.isPublished })
    .where(eq(albumsTable.id, params.data.id))
    .returning({
      id: albumsTable.id,
      title: albumsTable.title,
      slug: albumsTable.slug,
      description: albumsTable.description,
      priceSingle: albumsTable.priceSingle,
      priceAlbum: albumsTable.priceAlbum,
      isPublished: albumsTable.isPublished,
      coverPhotoId: albumsTable.coverPhotoId,
      createdAt: albumsTable.createdAt,
    });

  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(photosTable)
    .where(eq(photosTable.albumId, album.id));

  let coverWatermarkedPath: string | null = null;
  if (album.coverPhotoId) {
    const [coverPhoto] = await db
      .select({ watermarkedPath: photosTable.watermarkedPath })
      .from(photosTable)
      .where(eq(photosTable.id, album.coverPhotoId));
    coverWatermarkedPath = coverPhoto?.watermarkedPath ?? null;
  }

  res.json(
    AdminPublishAlbumResponse.parse(
      albumToAdminResponse(album, Number(countResult?.count ?? 0), coverWatermarkedPath),
    ),
  );
});

router.patch("/admin/albums/:id/cover", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = AdminSetCoverPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminSetCoverPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [album] = await db
    .update(albumsTable)
    .set({ coverPhotoId: parsed.data.photoId })
    .where(eq(albumsTable.id, params.data.id))
    .returning({
      id: albumsTable.id,
      title: albumsTable.title,
      slug: albumsTable.slug,
      description: albumsTable.description,
      priceSingle: albumsTable.priceSingle,
      priceAlbum: albumsTable.priceAlbum,
      isPublished: albumsTable.isPublished,
      coverPhotoId: albumsTable.coverPhotoId,
      createdAt: albumsTable.createdAt,
    });

  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(photosTable)
    .where(eq(photosTable.albumId, album.id));

  const [coverPhoto] = await db
    .select({ watermarkedPath: photosTable.watermarkedPath })
    .from(photosTable)
    .where(eq(photosTable.id, parsed.data.photoId));

  res.json(
    AdminSetCoverPhotoResponse.parse(
      albumToAdminResponse(album, Number(countResult?.count ?? 0), coverPhoto?.watermarkedPath ?? null),
    ),
  );
});

router.delete("/admin/photos/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = AdminDeletePhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [photo] = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.id, params.data.id));

  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }

  await deleteFile(photo.originalPath).catch(() => {});
  await deleteFile(photo.watermarkedPath).catch(() => {});

  await db.delete(photosTable).where(eq(photosTable.id, params.data.id));

  const [album] = await db
    .select()
    .from(albumsTable)
    .where(eq(albumsTable.id, photo.albumId));

  if (album?.coverPhotoId === photo.id) {
    await db
      .update(albumsTable)
      .set({ coverPhotoId: null })
      .where(eq(albumsTable.id, photo.albumId));
  }

  res.json(AdminDeletePhotoResponse.parse({ success: true }));
});

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/admin/upload",
  upload.array("files"),
  async (req, res): Promise<void> => {
    if (!requireAdmin(req, res)) return;

    const albumId = req.body?.albumId as string;
    const files = req.files as Express.Multer.File[];

    if (!albumId || !files || files.length === 0) {
      res.status(400).json({ error: "albumId and files are required" });
      return;
    }

    const uploaded: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const fileId = uuidv4();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const originalKey = `originals/${albumId}/${fileId}-${safeName}`;
        const watermarkedKey = `watermarked/${albumId}/${fileId}-wm.jpg`;

        await saveFile(originalKey, file.buffer);

        const watermarked = await applyWatermark(file.buffer);
        await saveFile(watermarkedKey, watermarked);

        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(photosTable)
          .where(eq(photosTable.albumId, albumId));

        await db.insert(photosTable).values({
          albumId,
          filename: safeName,
          originalPath: originalKey,
          watermarkedPath: watermarkedKey,
          sortOrder: Number(countResult?.count ?? 0),
        });

        uploaded.push(file.originalname);
      } catch (err) {
        req.log.error({ err, filename: file.originalname }, "Upload error");
        errors.push(file.originalname);
      }
    }

    res.json(AdminUploadPhotosResponse.parse({ uploaded, errors }));
  },
);

router.get("/admin/orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const orders = await db
    .select({
      id: ordersTable.id,
      customerEmail: ordersTable.customerEmail,
      albumId: ordersTable.albumId,
      albumTitle: sql<string>`(SELECT title FROM albums WHERE albums.id = orders.album_id)`,
      purchaseType: ordersTable.purchaseType,
      photoId: ordersTable.photoId,
      amountPaid: ordersTable.amountPaid,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .orderBy(sql`orders.created_at DESC`);

  res.json(
    AdminGetOrdersResponse.parse(
      orders.map((o) => ({
        id: o.id,
        customerEmail: o.customerEmail,
        albumId: o.albumId,
        albumTitle: o.albumTitle ?? "",
        purchaseType: o.purchaseType,
        photoId: o.photoId,
        amountPaid: Number(o.amountPaid),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    ),
  );
});

export default router;
