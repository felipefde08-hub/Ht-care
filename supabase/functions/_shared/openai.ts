export interface OpenAIJsonOptions {
  model: string;
  system?: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  attachments?: Array<{
    kind: "image" | "pdf";
    mimeType: string;
    filename: string;
    base64: string;
  }>;
  maxOutputTokens?: number;
}

export async function createOpenAIJsonResponse<T>(options: OpenAIJsonOptions): Promise<T> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: options.prompt,
    },
  ];

  for (const attachment of options.attachments ?? []) {
    const dataUrl = `data:${attachment.mimeType};base64,${attachment.base64}`;
    if (attachment.kind === "pdf") {
      content.push({
        type: "input_file",
        filename: attachment.filename,
        file_data: dataUrl,
      });
    } else {
      content.push({
        type: "input_image",
        image_url: dataUrl,
      });
    }
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      instructions: options.system,
      input: [
        {
          role: "user",
          content,
        },
      ],
      max_output_tokens: options.maxOutputTokens ?? 1200,
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `OpenAI request failed (${response.status}): ${JSON.stringify(payload ?? {})}`,
    );
  }

  const text = extractOutputText(payload);
  if (!text) {
    throw new Error("OpenAI response did not include output_text");
  }

  return JSON.parse(text) as T;
}

export function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  const chunks: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("").trim() || null;
}

export async function base64FromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch file: ${response.status}`);
  }
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  return {
    base64: base64FromArrayBuffer(arrayBuffer),
    mimeType,
  };
}

function base64FromArrayBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
