import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, albumsTable } from "@workspace/db";
import { CreateCheckoutBody, CreateCheckoutResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

router.post("/checkout", async (req, res): Promise<void> => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { albumId, purchaseType, photoId } = parsed.data;

  const [album] = await db
    .select()
    .from(albumsTable)
    .where(eq(albumsTable.id, albumId));

  if (!album || !album.isPublished) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  const unitAmount =
    purchaseType === "album"
      ? Math.round(Number(album.priceAlbum) * 100)
      : Math.round(Number(album.priceSingle) * 100);

  const productName =
    purchaseType === "album"
      ? `${album.title} — Full Album`
      : `${album.title} — Single Photo`;

  const origin =
    (req.headers.origin as string) ??
    process.env.SITE_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: { name: productName },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/album/${album.slug}`,
    metadata: {
      albumId,
      purchaseType,
      photoId: photoId ?? "",
    },
    allow_promotion_codes: true,
  });

  res.json(CreateCheckoutResponse.parse({ url: session.url }));
});

export default router;
