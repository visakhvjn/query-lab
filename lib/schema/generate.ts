import OpenAI from "openai";
import {
  assertGeneratedSchema,
  type GeneratedSchema,
} from "@/lib/schema/types";

const SYSTEM_PROMPT = `You design small, realistic Postgres schemas for SQL practice challenges.
Return ONLY JSON matching the required schema.
Rules:
- schemaName: lowercase snake_case, unique-ish domain name (e.g. indie_bookstore, clinic_ops)
- 3 to 5 tables that clearly relate to each other via foreign keys
- Every table needs a primary key column
- Prefer simple types: integer, bigint, serial, bigserial, text, varchar(n), boolean, numeric, numeric(p,s), date, timestamptz, uuid
- Use serial/bigserial for integer PKs when appropriate
- At least one foreign key relationship overall; prefer a connected graph (not isolated tables)
- Each table must include 4 to 8 realistic seed rows in "rows"
- Each row is an array of values in the SAME ORDER as that table's columns
- Always include primary key values explicitly (even for serial/bigserial), starting at 1
- Foreign key values must reference primary keys that exist in parent table rows
- Dates as YYYY-MM-DD; timestamptz as ISO-8601 strings; booleans as true/false; numbers as JSON numbers
- No SQL, no markdown, JSON only`;

export async function generateSchemaWithAI(): Promise<GeneratedSchema> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in .env.local");
  }

  const client = new OpenAI({ apiKey });

  const domains = [
    "retail / ecommerce",
    "healthcare clinic",
    "university courses",
    "fleet logistics",
    "music streaming",
    "restaurant reservations",
    "project management SaaS",
    "library lending",
    "sports league",
    "HR / payroll",
  ];
  const domain = domains[Math.floor(Math.random() * domains.length)];

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.9,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sql_challenge_schema",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["schemaName", "description", "tables"],
          properties: {
            schemaName: { type: "string" },
            description: { type: "string" },
            tables: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "columns", "foreignKeys", "rows"],
                properties: {
                  name: { type: "string" },
                  columns: {
                    type: "array",
                    minItems: 2,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["name", "type", "nullable", "primaryKey"],
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                        nullable: { type: "boolean" },
                        primaryKey: { type: "boolean" },
                      },
                    },
                  },
                  foreignKeys: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "columns",
                        "referencesTable",
                        "referencesColumns",
                      ],
                      properties: {
                        columns: {
                          type: "array",
                          items: { type: "string" },
                        },
                        referencesTable: { type: "string" },
                        referencesColumns: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                    },
                  },
                  rows: {
                    type: "array",
                    minItems: 4,
                    maxItems: 8,
                    items: {
                      type: "array",
                      items: {
                        anyOf: [
                          { type: "string" },
                          { type: "number" },
                          { type: "boolean" },
                          { type: "null" },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Invent a fresh schema for this domain: ${domain}. Make table/column names specific to that domain, and include coherent related seed data.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned non-JSON content");
  }

  return assertGeneratedSchema(parsed);
}
