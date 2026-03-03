import type Anthropic from "@anthropic-ai/sdk"

export const readOnlyTools: Anthropic.Messages.Tool[] = [
  {
    name: "lookup_character",
    description: "Find a character by name in the current book. Returns character details including role, description, motivation, traits, and backstory.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Character name (partial match, case-insensitive)" },
      },
      required: ["name"],
    },
  },
  {
    name: "lookup_location",
    description: "Find a location by name in the current book. Returns location details including description, sensory details, and emotional tone.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Location name (partial match, case-insensitive)" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_chapter_content",
    description: "Get the full text content of a chapter by its chapter number within the book.",
    input_schema: {
      type: "object" as const,
      properties: {
        chapterNumber: { type: "number", description: "The chapter number (1-based)" },
      },
      required: ["chapterNumber"],
    },
  },
  {
    name: "list_chapters",
    description: "List all chapters for the current book with their titles, synopses, word counts, and statuses.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_character_relationships",
    description: "Get all relationships for a character found by name. Returns relationship types and descriptions with other characters.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Character name (partial match, case-insensitive)" },
      },
      required: ["name"],
    },
  },
]

export const writeTools: Anthropic.Messages.Tool[] = [
  {
    name: "insert_text",
    description: "Append text/prose to the end of a chapter. The text will be added as new paragraphs.",
    input_schema: {
      type: "object" as const,
      properties: {
        chapterNumber: { type: "number", description: "The chapter number (1-based)" },
        text: { type: "string", description: "The prose text to append. Each paragraph should be separated by newlines." },
      },
      required: ["chapterNumber", "text"],
    },
  },
  {
    name: "replace_text",
    description: "Find an exact text string in a chapter and replace it with new text.",
    input_schema: {
      type: "object" as const,
      properties: {
        chapterNumber: { type: "number", description: "The chapter number (1-based)" },
        oldText: { type: "string", description: "The exact text to find and replace" },
        newText: { type: "string", description: "The replacement text" },
      },
      required: ["chapterNumber", "oldText", "newText"],
    },
  },
  {
    name: "update_character",
    description: "Update a character's details by name. Only specified fields will be updated.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Character name to find (case-insensitive)" },
        updates: {
          type: "object",
          description: "Fields to update",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            age: { type: "string" },
            archetype: { type: "string" },
            description: { type: "string" },
            motivation: { type: "string" },
            fear: { type: "string" },
            contradiction: { type: "string" },
            voiceNotes: { type: "string" },
            traits: { type: "string" },
            backstory: { type: "string" },
          },
        },
      },
      required: ["name", "updates"],
    },
  },
  {
    name: "create_scene",
    description: "Create a new scene in a chapter. Optionally link to a POV character and location by name.",
    input_schema: {
      type: "object" as const,
      properties: {
        chapterNumber: { type: "number", description: "The chapter number (1-based)" },
        title: { type: "string", description: "Scene title" },
        synopsis: { type: "string", description: "Brief synopsis of the scene" },
        povCharacterName: { type: "string", description: "Name of the POV character (optional)" },
        locationName: { type: "string", description: "Name of the location (optional)" },
        moodStart: { type: "string", description: "Mood at the start of the scene (optional)" },
        moodEnd: { type: "string", description: "Mood at the end of the scene (optional)" },
      },
      required: ["chapterNumber", "title"],
    },
  },
]

export const allTools: Anthropic.Messages.Tool[] = [...readOnlyTools, ...writeTools]
