const ROUTER_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
/** Serverless Inference API (no provider setup; works with HF token only). Use COPY_USE_INFERENCE_API=true in .env */
const INFERENCE_API_BASE = "https://api-inference.huggingface.co/models";

function getModel(): string {
  const env = process.env.COPY_GENERATION_MODEL?.trim();
  const model = env || "openai/gpt-oss-120b:fastest";
  return model === "gpt2" ? "openai/gpt-oss-120b:fastest" : model;
}

function useInferenceApi(): boolean {
  return process.env.COPY_USE_INFERENCE_API === "true" || process.env.COPY_USE_INFERENCE_API === "1";
}

const DEFAULT_PROMPT = `You are writing a short retargeting/re-engagement email (someone browsed but didn't buy—nudge them back). Use ONLY the context below. Write 2 to 4 short sentences. Address the reader as {{first_name}}.
{{query_hint}}
{{cta_label}}
Tone: Warm and helpful, NOT customer support. Do NOT say "sorry to hear", "let me know if I can help", or anything that sounds like a support agent. Highlight value from the context, gentle nudge.
Do not use headings or bullet points. Output only the paragraph, no quotes or labels.
CRITICAL: Output ONLY the email body. Do NOT add any preamble (e.g. "Here's a...", "Below is..."), and do NOT add any meta summary at the end (e.g. "This email aims to:", bullet points describing what the email does). Just the email.

Context:
{{context}}`;

export interface CopyGenerationInput {
  retrievedText: string;
  firstName?: string | null;
  ctaLabel?: string | null;
  queryHint?: string | null;
  maxNewTokens?: number;
  customPrompt?: string | null;
  /** Extra variables from pixel fields (e.g. company_name, job_title) for {{variable}} in custom prompt */
  extraVariables?: Record<string, string>;
}

/** Reserved template variables that trigger structured output (Headline, Sub_Heading, Bullet_Point, CTA). */
const STRUCTURE_VARS = ["Headline", "Sub_Heading", "Bullet_Point", "CTA"] as const;

function promptUsesStructuredOutput(template: string): boolean {
  const upper = template.toUpperCase();
  return STRUCTURE_VARS.some((v) => upper.includes(`{{${v.toUpperCase().replace(/_/g, "_")}}}`));
}

const STRUCTURED_JSON_SCHEMA = `{
  "headline": "one line headline",
  "subheading": "one line subheading",
  "bullets": ["first bullet", "second bullet"],
  "cta": "one line button text",
  "body": "short intro only, 1-3 sentences, do not repeat headline/bullets/cta"
}`;

/** Instructional/framework labels that must never appear in final email copy. */
const FORBIDDEN_LABELS = [
  "Common Beliefs:",
  "Common Beliefs :",
  "Hidden Angst:",
  "Hidden Angst Truths:",
  "Hidden Truths:",
  "Desires:",
  "Pain Points:",
  "Objections:",
  "Beliefs:",
  "Angst:",
  "Fears:",
  "Framework:",
  "PAS:",
  "AIDA:",
];

/** Build the list of allowed {{variable}} names from template + extraVariables (for model guidelines). */
function getAllowedVariableNames(template: string, extraVariables?: Record<string, string> | null): string[] {
  const allowed = new Set<string>(["First_Name", "first_name"]);
  if (extraVariables && typeof extraVariables === "object") {
    for (const k of Object.keys(extraVariables)) {
      if (k && !STRUCTURE_VARS.some((v) => v.toLowerCase() === k.toLowerCase())) allowed.add(k);
    }
  }
  const varMatches = template.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g);
  for (const m of varMatches) {
    const name = m[1];
    if (name && !STRUCTURE_VARS.some((v) => v.toLowerCase() === name.toLowerCase())) allowed.add(name);
  }
  return [...allowed];
}

/** Guidelines appended to the prompt so the model only uses allowed variables and no instruction labels. */
function buildCopyGuidelines(input: CopyGenerationInput): string {
  const template = input.customPrompt?.trim() || DEFAULT_PROMPT;
  const allowed = getAllowedVariableNames(template, input.extraVariables);
  const varList = allowed.length ? allowed.map((v) => `{{${v}}}`).join(", ") : "{{First_Name}}";
  return `

COPY GUIDELINES (you must follow these):
1) Variables: You may ONLY use these exact placeholders for personalisation (they will be replaced when the email is sent): ${varList}. Never use [name], {{Name}}, {{name}}, or any other placeholder not in this list. If you need to address the reader, use {{First_Name}}.
2) No framework labels: Do NOT include any instructional or framework labels in the email copy. The reader must never see labels such as "Common Beliefs:", "Hidden Angst Truths:", "Desires:", "Pain Points:", "Objections:", or similar. Write only the actual message; do not prefix bullets or sentences with these categories.`;
}

function buildStructuredOutputInstructions(): string {
  return `

You MUST respond with ONLY a valid JSON object. No other text, no markdown, no code fence.

Rules:
- headline: one line, appears at the top.
- subheading: one line, under the headline.
- bullets: array of strings; each becomes one bullet. Do NOT start bullets with framework labels (e.g. "Common Beliefs:", "Desires:"). Write only the actual copy.
- cta: one line, appears on the button only.
- body: 1–3 sentences for the main message area. Use {{First_Name}} for the reader's name if you need it. Do NOT repeat headline, subheading, bullets, or cta here. Do NOT include labels like "Hi [name]," — use {{First_Name}}.

Omit any key you don't use. Use this exact shape:

${STRUCTURED_JSON_SCHEMA}`;
}

/**
 * Try to parse structured output as JSON. Returns null if no valid JSON or no usable fields.
 */
function parseStructuredCopyFromJson(text: string): {
  copy: string;
  headline?: string;
  subheading?: string;
  bullets?: string[];
  cta?: string;
  body?: string;
} | null {
  let raw = text.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  const headline = typeof o.headline === "string" ? o.headline.trim() : undefined;
  const subheading = typeof o.subheading === "string" ? o.subheading.trim() : undefined;
  const cta = typeof o.cta === "string" ? o.cta.trim() : undefined;
  const body = typeof o.body === "string" ? o.body.trim() : undefined;
  let bullets: string[] | undefined;
  if (Array.isArray(o.bullets)) {
    bullets = o.bullets.map((b) => (typeof b === "string" ? b.trim() : String(b).trim())).filter(Boolean);
    if (bullets.length === 0) bullets = undefined;
  }
  const hasAny = [headline, subheading, bullets?.length, cta, body].some((v) => v != null && (Array.isArray(v) ? v.length > 0 : v !== ""));
  if (!hasAny) return null;
  return {
    copy: raw,
    headline: headline || undefined,
    subheading: subheading || undefined,
    bullets,
    cta: cta || undefined,
    body: body || undefined,
  };
}

/**
 * Parse LLM output that used plain-text format (HEADLINE:, SUB_HEADING:, BULLETS:, CTA:, BODY:).
 * Used as fallback when JSON parsing fails.
 */
export function parseStructuredCopy(text: string): {
  copy: string;
  headline?: string;
  subheading?: string;
  bullets?: string[];
  cta?: string;
  body?: string;
} {
  const result: { copy: string; headline?: string; subheading?: string; bullets?: string[]; cta?: string; body?: string } = { copy: text.trim() };
  const raw = text.trim();
  const headlineM = raw.match(/\bHEADLINE:\s*([\s\S]+?)(?=\n\w+:|$)/i);
  if (headlineM) result.headline = headlineM[1].trim();
  const subM = raw.match(/\bSUB_HEADING:\s*([\s\S]+?)(?=\n\w+:|$)/i);
  if (subM) result.subheading = subM[1].trim();
  const bulletsM = raw.match(/\bBULLETS:\s*([\s\S]+?)(?=\n(?:CTA|BODY):|$)/i);
  if (bulletsM) {
    const lines = bulletsM[1].split(/\n/).map((l) => l.replace(/^[\s\-*]*/, "").trim()).filter(Boolean);
    if (lines.length) result.bullets = lines;
  }
  const ctaM = raw.match(/\bCTA:\s*([\s\S]+?)(?=\n\w+:|$)/i);
  if (ctaM) result.cta = ctaM[1].trim();
  const bodyM = raw.match(/\bBODY:\s*([\s\S]+?)$/i);
  if (bodyM) result.body = bodyM[1].trim();
  return result;
}

export type CopyGenerationResult = {
  copy: string;
  headline?: string;
  subheading?: string;
  bullets?: string[];
  cta?: string;
  body?: string;
};

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
  let prompt = template
    .replace(/\{\{context\}\}/gi, context)
    .replace(/\{\{first_name\}\}/gi, name)
    .replace(/\{\{query_hint\}\}/gi, hint)
    .replace(/\{\{cta_label\}\}/gi, cta);
  // If custom prompt omits {{context}}, append it so the LLM always gets retrieved content
  if (!/\{\{context\}\}/i.test(template)) {
    prompt += `\n\nContext (use ONLY this—do not invent features):\n${context}`;
  }
  if (!/output only|do not add|no preamble|no meta|just the email/i.test(prompt)) {
    prompt += "\n\nOutput ONLY the email. No preamble (e.g. \"Here's a...\") and no meta summary at the end (e.g. \"This email aims to:\").";
  }
  // Replace extra variables (e.g. {{company_name}}, {{job_title}}). Do NOT replace reserved structure vars (Headline, Sub_Heading, Bullet_Point, CTA).
  if (input.extraVariables && typeof input.extraVariables === "object") {
    for (const [key, val] of Object.entries(input.extraVariables)) {
      if (STRUCTURE_VARS.some((v) => v.toLowerCase() === key.toLowerCase())) continue;
      const re = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "gi");
      prompt = prompt.replace(re, val || "");
    }
  }
  prompt += buildCopyGuidelines(input);
  if (promptUsesStructuredOutput(template)) {
    prompt += buildStructuredOutputInstructions();
  }
  return prompt;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove framework/instruction labels from copy (e.g. "Common Beliefs: " at start of bullet or sentence). */
function stripInstructionLabels(text: string): string {
  let out = text.trim();
  for (const label of FORBIDDEN_LABELS) {
    const re = new RegExp(`^\\s*${escapeRegex(label)}\\s*`, "i");
    out = out.replace(re, "").trim();
  }
  return out;
}

export async function generateCopy(input: CopyGenerationInput): Promise<CopyGenerationResult> {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token?.trim()) {
    throw new Error("HUGGINGFACE_TOKEN is required for copy generation");
  }

  const template = input.customPrompt?.trim() || DEFAULT_PROMPT;
  const prompt = buildPrompt(input);
  const useStructured = promptUsesStructuredOutput(template);
  const maxTokens = useStructured ? (input.maxNewTokens ?? 500) : (input.maxNewTokens ?? 350);

  const res = await fetch(ROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [{ role: "user" as const, content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 400 && /model_not_supported|not supported by any provider/i.test(err)) {
      const model = getModel();
      throw new Error(
        `Copy generation model "${model}" is not supported by any Hugging Face provider you have enabled. ` +
          "Set COPY_GENERATION_MODEL in .env to a supported model (e.g. mistralai/Mistral-7B-Instruct-v0.2 or Qwen/Qwen2.5-7B-Instruct) or enable a provider at https://huggingface.co/settings."
      );
    }
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
  text = stripInternalThoughts(text);

  if (useStructured) {
    const fromJson = parseStructuredCopyFromJson(text);
    const parsed = fromJson ?? parseStructuredCopy(text);
    const body = parsed.body != null ? stripInstructionLabels(parsed.body) : undefined;
    const bullets = parsed.bullets?.length
      ? parsed.bullets.map((b) => stripInstructionLabels(b))
      : undefined;
    return {
      copy: parsed.copy,
      headline: parsed.headline != null ? stripInstructionLabels(parsed.headline) : undefined,
      subheading: parsed.subheading != null ? stripInstructionLabels(parsed.subheading) : undefined,
      bullets,
      cta: parsed.cta != null ? stripInstructionLabels(parsed.cta) : undefined,
      body,
    };
  }
  return { copy: text };
}

/**
 * Remove common LLM preamble and meta commentary so only the email body is shown.
 */
function stripInternalThoughts(text: string): string {
  let out = text.trim();

  // Strip leading preamble: "Here's a 100-word...", "Below is the email:", "Draft:", etc.
  const preambleStarts = [
    /^(?:Here'?s? (?:a |an |the )?(?:\d+[- ]?word\s+)?(?:high-converting\s+)?(?:email|draft|response)[^.\n]*[.:]\s*)/im,
    /^(?:Here is (?:a |an |the )?[^.\n]+[.:]\s*)/im,
    /^(?:Below is (?:the )?[^.\n]+[.:]\s*)/im,
    /^(?:Draft:?\s*)/im,
    /^(?:Email:?\s*)/im,
    /^(?:Email body:?\s*)/im,
    /^(?:The following (?:is the )?email[^.\n]*[.:]\s*)/im,
  ];
  for (const start of preambleStarts) {
    const m = out.match(start);
    if (m) {
      out = out.slice(m[0].length).trim();
      break;
    }
  }
  // If "Subject:" appears with content before it, take from Subject: (drop preamble)
  const subjectIdx = out.search(/\bSubject:\s/im);
  if (subjectIdx > 0) {
    out = out.slice(subjectIdx).trim();
  }

  // Strip trailing meta: "This email aims to:", "Summary:", bullet list describing the email, etc.
  const metaPatterns = [
    /\n\s*This email aims to\s*:?\s*[\s\S]*$/im,
    /\n\s*This (?:email|draft) (?:aims to|is designed to|will)\s*[:\s][\s\S]*$/im,
    /\n\s*Summary\s*:?\s*[\s\S]*$/im,
    /\n\s*Key points?\s*:?\s*[\s\S]*$/im,
    /\n\s*The above (?:email|draft)[\s\S]*$/im,
    /\n\s*Note\s*:?\s*This (?:email|draft)[\s\S]*$/im,
    /\n\s*(?:Acknowledge|Highlight|Encourage|Address)[\s\S]*$/im,
  ];
  for (const re of metaPatterns) {
    out = out.replace(re, "");
  }
  // Also strip block that starts with "This email aims to" or "Acknowledge." / "Highlight." (meta bullet list)
  const trailingMeta = out.match(
    /\n\s*(This email aims to|Summary|Key points?|This draft|The above|Acknowledge(?: the|\.)|Highlight(?: the|s)?|Encourage(?: the)?)[\s\S]*$/im
  );
  if (trailingMeta) {
    out = out.slice(0, out.length - trailingMeta[0].length).trim();
  }

  return out.trim();
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
