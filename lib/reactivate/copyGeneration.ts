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
  // Replace extra variables (e.g. {{company_name}}, {{job_title}})
  if (input.extraVariables && typeof input.extraVariables === "object") {
    for (const [key, val] of Object.entries(input.extraVariables)) {
      const re = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      prompt = prompt.replace(re, val || "");
    }
  }
  return prompt;
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
  return stripInternalThoughts(text);
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
