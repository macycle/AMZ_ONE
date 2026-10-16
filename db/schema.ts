import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  priority: text("priority", { enum: ["高", "中", "低"] }).notNull().default("中"),
  note: text("note").notNull().default(""),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const listingDrafts = sqliteTable("listing_drafts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceUrl: text("source_url").notNull(),
  marketplace: text("marketplace", { enum: ["US", "CA", "AU"] }).notNull().default("US"),
  title: text("title").notNull().default(""),
  bullets: text("bullets").notNull().default("[]"),
  description: text("description").notNull().default(""),
  images: text("images").notNull().default("[]"),
  imageAssets: text("image_assets").notNull().default("[]"),
  attributes: text("attributes").notNull().default("{}"),
  selectedVariant: text("selected_variant").notNull().default(""),
  status: text("status", { enum: ["draft", "ready", "synced"] }).notNull().default("draft"),
  confirmedAt: text("confirmed_at"),
  lingxingExternalId: text("lingxing_external_id"),
  syncMessage: text("sync_message").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
