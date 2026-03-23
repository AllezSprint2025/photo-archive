import { pgTable, text, numeric, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  customerEmail: text("customer_email").notNull(),
  albumId: uuid("album_id").notNull(),
  purchaseType: text("purchase_type").notNull(),
  photoId: uuid("photo_id"),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull(),
  promoCode: text("promo_code"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const downloadTokensTable = pgTable("download_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: text("order_id").notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const insertDownloadTokenSchema = createInsertSchema(downloadTokensTable).omit({ id: true, createdAt: true });
export type InsertDownloadToken = z.infer<typeof insertDownloadTokenSchema>;
export type DownloadToken = typeof downloadTokensTable.$inferSelect;
