import { pgTable, text, timestamp, serial, integer, boolean, jsonb, PgTable, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // This will be the Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),  // Remove .unique() to allow nulls
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: index("email_idx").on(table.email),
    usernameIdx: index("username_idx").on(table.username),
  };
});

export type ChannelType = 'base' | 'tutorial' | 'encouragement' | 'custom';

// Core interval properties that all intervals share
export type IntervalCore = {
  id: string;
  label: string;        // display text
  spokenLabel?: string; // optional override for TTS
  color: string;        // CSS color value
  audioFile?: string;   // optional path to audio file
  volume?: number;      // 0-1 scale, defaults to 1
  notes?: string;       // user-written notes/instructions/reminders
  imageUrl?: string;    // optional image URL
  imageAlt?: string;    // optional image alt text
  imageCaption?: string; // optional image caption
};

// Base intervals are used for the main sequence and have countdown functionality
export type BaseInterval = IntervalCore & {
  type: 'base';
  duration: number;     // milliseconds
};

// Overlay intervals trigger at specific times during the sequence
export type OverlayInterval = IntervalCore & {
  type: 'overlay';
  startTime: number;    // milliseconds from sequence start
  duration: number;     // milliseconds
};

// Union type for any interval
export type Interval = BaseInterval | OverlayInterval;

// Channel types
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
}, (table) => {
  return {
    userIdIdx: index("user_id_idx").on(table.userId),
    nameIdx: index("name_idx").on(table.name),
    tagsIdx: index("tags_idx").on(table.tags),
    isPublicIdx: index("is_public_idx").on(table.isPublic),
  };
});

// Remove unused tables
// ... remove sequenceItems and audioChannelTemplates tables ... 