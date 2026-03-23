import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { db, ordersTable, downloadTokensTable, albumsTable, photosTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendDownloadEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

router.post(
  "/webhooks/stripe",
  async (req, res): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

    if (!webhookSecret) {
      req.log.warn("STRIPE_WEBHOOK_SECRET not set — skipping verification");
      res.json({ received: true });
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err) {
      req.log.error({ err }, "Stripe webhook signature error");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCompletedCheckout(session);
    }

    res.json({ received: true });
  },
);

async function handleCompletedCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const meta = session.metadata ?? {};
  const albumId = meta.albumId;
  const purchaseType = meta.purchaseType as "single" | "album";
  const photoId = meta.photoId || null;
  const customerEmail =
    session.customer_email ?? session.customer_details?.email ?? "";
  const amountPaid = (session.amount_total ?? 0) / 100;

  if (!albumId || !purchaseType || !customerEmail) {
    logger.error({ meta }, "Webhook: missing metadata");
    return;
  }

  try {
    await db.insert(ordersTable).values({
      id: session.id,
      customerEmail,
      albumId,
      purchaseType,
      photoId: photoId || null,
      amountPaid: amountPaid.toString(),
      status: "paid",
    });
  } catch (err: any) {
    if (err?.code === "23505") return;
    logger.error({ err }, "Webhook: order insert error");
    return;
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await db.insert(downloadTokensTable).values({
    orderId: session.id,
    token,
    expiresAt,
  });

  const [album] = await db
    .select({ title: albumsTable.title })
    .from(albumsTable)
    .where(eq(albumsTable.id, albumId));

  let photoCount: number | undefined;
  if (purchaseType === "album") {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(photosTable)
      .where(eq(photosTable.albumId, albumId));
    photoCount = Number(result?.count ?? 0);
  }

  const siteUrl = process.env.SITE_URL ?? "";
  const downloadUrl = `${siteUrl}/api/download/${token}`;

  await sendDownloadEmail({
    to: customerEmail,
    albumTitle: album?.title ?? "Your Album",
    purchaseType,
    downloadUrl,
    expiresAt,
    photoCount,
  });

  await db.update(ordersTable).set({ status: "fulfilled" }).where(eq(ordersTable.id, session.id));
}

export default router;
