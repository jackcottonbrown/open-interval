import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // This will be the Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),  // Remove .unique() to allow nulls
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 