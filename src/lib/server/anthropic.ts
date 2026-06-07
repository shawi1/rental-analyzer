// Server-side Anthropic Messages API helper.
// Key resolution order: request header `x-anthropic-key` → env ANTHROPIC_API_KEY.

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface AnthropicCallOpts {
  apiKey: string;
  system?: string;
  messages: { role: "user" | "assistant"; content: unknown }[];
  maxTokens?: number;
  webSearch?: boolean;
  model?: string;
}

export class AnthropicError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function resolveAnthropicKey(req: Request): string | undefined {
  return req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY || undefined;
}

export async function callAnthropic(opts: AnthropicCallOpts): Promise<{ text: string; raw: unknown }> {
  const body: Record<string, unknown> = {
    model: opts.model || DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 1500,
    messages: opts.messages,
  };
  if (opts.system) body.system = opts.system;
  if (opts.webSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new AnthropicError(`Anthropic API error (${res.status}): ${detail}`, res.status);
  }

  const data = await res.json();
  const text: string = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
  return { text, raw: data };
}

/** Robustly pull the first JSON object/array out of a model response. */
export function extractJson<T = unknown>(text: string): T | null {
  // Prefer fenced ```json blocks
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];
  if (fence) candidates.push(fence[1]);
  candidates.push(text);

  for (const c of candidates) {
    const start = c.search(/[[{]/);
    if (start === -1) continue;
    // balance scan
    const open = c[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < c.length; i++) {
      const ch = c[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          const slice = c.slice(start, i + 1);
          try {
            return JSON.parse(slice) as T;
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}
