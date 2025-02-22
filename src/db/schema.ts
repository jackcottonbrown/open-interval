import { pgTable, text, timestamp, serial, integer, boolean, jsonb, PgTable } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // This will be the Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),  // Remove .unique() to allow nulls
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ChannelType = 'base' | 'tutorial' | 'encouragement' | 'custom';

export type IntervalStyle = {
  color: string;        // CSS color value
  audioFile?: string;   // optional path to audio file
  volume?: number;      // 0-1 scale, defaults to 1
};

export type IntervalMedia = {
  imageUrl?: string;    // URL to supporting image
  imageAlt?: string;    // Alt text for accessibility
  caption?: string;     // Optional caption for the image
};

export type BaseInterval = {
  id: string;
  duration: number;     // milliseconds
  label: string;        // display text
  style: IntervalStyle;
  metadata?: Record<string, any>;
};

export type OverlayInterval = {
  id: string;
  startTime: number;    // milliseconds from sequence start
  duration: number;     // milliseconds
  label: string;        // display text
  spokenLabel?: string; // optional override for TTS
  notes?: string;       // user-written notes/instructions/reminders
  media?: IntervalMedia;
  style: IntervalStyle;
  metadata?: Record<string, any>;
};

export type BaseChannel = {
  type: 'base';
  name: string;
  isEnabled: boolean;
  volume: number;
  intervals: BaseInterval[];  // These define the sequence timeline
};

export type OverlayChannel = {
  type: 'tutorial' | 'encouragement' | 'custom';
  name: string;
  isEnabled: boolean;
  volume: number;
  intervals: OverlayInterval[];  // These trigger at specific times
};

export type Channel = BaseChannel | OverlayChannel;

export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  config: jsonb("config").default({}).notNull(),
  tags: text("tags").array(),
  channels: jsonb("channels").$type<Channel[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Remove unused tables
// ... remove sequenceItems and audioChannelTemplates tables ... 