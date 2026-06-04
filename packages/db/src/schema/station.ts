import { pgTable, text } from "drizzle-orm/pg-core";

export const hosts = pgTable("host", {
  name: text("name").primaryKey(),
  colorId: text("color_id").notNull(),
});

export const programs = pgTable("program", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  host: text("host").notNull(),
});
