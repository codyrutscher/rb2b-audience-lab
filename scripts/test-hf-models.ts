#!/usr/bin/env npx tsx
/**
 * Test which Hugging Face chat models work with your token.
 * Run: cd rb2b-audience-lab && npx tsx scripts/test-hf-models.ts
 * Or:  npm run test:hf-models
 */
import path from "node:path";
import fs from "node:fs";
import { config } from "dotenv";

const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) config({ path: envFile });

const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const token = process.env.HUGGINGFACE_TOKEN?.trim();

const MODELS_TO_TRY = [
  "meta-llama/Llama-3.2-1B-Instruct",
  "meta-llama/Llama-3.1-8B-Instruct",
  "Qwen/Qwen2.5-7B-Instruct",
  "microsoft/Phi-3-mini-4k-instruct",
  "HuggingFaceH4/zephyr-7b-beta",
  "mistralai/Mistral-7B-Instruct-v0.2",
  "google/gemma-2-2b-it",
  "openai/gpt-oss-120b:fastest",
];

async function testModel(model: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(ROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Say OK in one word." }],
      max_tokens: 10,
      temperature: 0,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    let err = text;
    try {
      const j = JSON.parse(text);
      err = j?.error?.message || text;
    } catch {}
    return { ok: false, error: err };
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content?.trim();
  return { ok: !!content, error: content ? undefined : "Empty response" };
}

async function main() {
  if (!token) {
    console.error("HUGGINGFACE_TOKEN not set. Add it to .env");
    process.exit(1);
  }
  console.log("Testing Hugging Face chat models (token: " + token.slice(0, 8) + "...)\n");

  for (const model of MODELS_TO_TRY) {
    process.stdout.write(`  ${model} ... `);
    try {
      const { ok, error } = await testModel(model);
      if (ok) {
        console.log("✓ WORKS");
      } else {
        console.log("✗", (error || "failed").slice(0, 80));
      }
    } catch (e) {
      console.log("✗", (e instanceof Error ? e.message : String(e)).slice(0, 80));
    }
  }

  console.log("\nAdd a working model to .env: COPY_GENERATION_MODEL=<model-id>");
}

main().catch(console.error);
