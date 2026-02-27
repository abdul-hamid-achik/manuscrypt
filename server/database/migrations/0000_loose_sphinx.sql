CREATE TABLE `ai_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`chapter_id` text,
	`character_id` text,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`command` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`genre` text,
	`premise` text,
	`target_word_count` integer DEFAULT 80000,
	`status` text DEFAULT 'planning',
	`style_guide` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`synopsis` text,
	`content` text,
	`word_count` integer DEFAULT 0,
	`status` text DEFAULT 'planned',
	`act` integer,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`from_character_id` text NOT NULL,
	`to_character_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`description` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`age` text,
	`archetype` text,
	`description` text,
	`motivation` text,
	`fear` text,
	`contradiction` text,
	`voice_notes` text,
	`traits` text,
	`backstory` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sensory_details` text,
	`emotional_tone` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`title` text NOT NULL,
	`synopsis` text,
	`pov_character_id` text,
	`location_id` text,
	`mood_start` text,
	`mood_end` text,
	`target_word_count` integer,
	`status` text DEFAULT 'planned',
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `writing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`chapter_id` text,
	`words_written` integer DEFAULT 0,
	`duration` integer,
	`started_at` text DEFAULT (datetime('now')),
	`ended_at` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
