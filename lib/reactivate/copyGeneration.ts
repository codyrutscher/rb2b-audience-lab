const ROUTER_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

function getModel(): string {
  const env = process.env.COPY_GENERATION_MODEL?.trim();
  const model = env || "openai/gpt-oss-120b:fastest";
  return model === "gpt2" ? "openai/gpt-oss-120b:fastest" : model;
}

const DEFAULT_PROMPT = `You are writing a short retargeting/re-engagement email (someone browsed but didn't buy—nudge them back). Use ONLY the context below. Write 2 to 4 short sentences. Address the reader as {{first_name}}.
{{query_hint}}
{{cta_label}}
Tone: Warm and helpful, NOT customer support. Do NOT say "sorry to hear", "let me know if I can help", or anything that sounds like a support agent. Highlight value from the context, gentle nudge.
Do not use headings or bullet points. Output only the paragraph, no quotes or labels.

Context:
{{context}}`;

export interface CopyGenerationInput {
  retrievedText: string;
  firstName?: string | null;
  ctaLabel?: string | null;
  queryHint?: string | null;
  maxNewTokens?: number;
  customPrompt?: string | null;
}

function buildPrompt(input: CopyGenerationInput): string {
  const template = (input.customPrompt?.trim() || DEFAULT_PROMPT);
  const context = input.retrievedText.slice(0, 3000);
  const name = input.firstName || "there";
  const hint = input.queryHint?.trim()
    ? ` Focus on: ${input.queryHint}.`
    : "";
  const cta = input.ctaLabel?.trim()
    ? ` End with a single clear call-to-action: ${input.ctaLabel}.`
    : "";
  return template
    .replace(/\{\{context\}\}/gi, context)
    .replace(/\{\{first_name\}\}/gi, name)
    .replace(/\{\{query_hint\}\}/gi, hint)
    .replace(/\{\{cta_label\}\}/gi, cta);
}

export async function generateCopy(input: CopyGenerationInput): Promise<string> {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token?.trim()) {
    throw new Error("HUGGINGFACE_TOKEN is required for copy generation");
  }

  const prompt = buildPrompt(input);

  const res = await fetch(ROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [{ role: "user" as const, content: prompt }],
      max_tokens: input.maxNewTokens ?? 350,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hugging Face text generation error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning?: string } }>;
  };
  const msg = data.choices?.[0]?.message;
  let text = (msg?.content ?? "").trim();
  if (!text && msg?.reasoning) {
    text = extractDraftFromReasoning(msg.reasoning);
  }
  if (!text) {
    throw new Error("Copy generation returned empty text");
  }
  return text;
}

function extractDraftFromReasoning(reasoning: string): string {
  const closed = [...reasoning.matchAll(/"([^"]{30,})"/g)]
    .map((m) => m[1].trim())
    .filter((s) => /^[Hh]i\s|[Dd]ear\s|^[A-Z]/.test(s) || s.includes(","));
  if (closed.length > 0) return closed.reduce((a, b) => (a.length >= b.length ? a : b));
  const open = reasoning.match(/"([^"]{30,})/);
  if (open?.[1]) {
    const s = open[1].trim();
    if (/^[Hh]i\s|[Dd]ear\s|^[A-Z]/.test(s) || s.includes(",")) return s;
  }
  const afterMaybe = reasoning.match(/(?:so maybe|e\.g\.|for example)[:\s]*["']?([^"'\n]{30,})/i);
  if (afterMaybe?.[1]) return afterMaybe[1].trim();
  return "";
}
