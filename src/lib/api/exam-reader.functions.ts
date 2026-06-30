import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const readExamInputSchema = z.object({
  fileUrl: z.string().url().nullable().optional(),
  filePath: z.string().optional(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileBase64: z.string().optional(),
});

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["confidence", "values", "fields", "missing", "needsConfirmation"],
  properties: {
    confidence: { type: "string", enum: ["high", "low"] },
    values: {
      type: "object",
      additionalProperties: false,
      required: [
        "apob",
        "ldl",
        "hdl",
        "triglicerideos",
        "hba1c",
        "glicemiaJejum",
        "insulinaJejum",
        "pcrUs",
      ],
      properties: {
        apob: { type: ["string", "null"] },
        ldl: { type: ["string", "null"] },
        hdl: { type: ["string", "null"] },
        triglicerideos: { type: ["string", "null"] },
        hba1c: { type: ["string", "null"] },
        glicemiaJejum: { type: ["string", "null"] },
        insulinaJejum: { type: ["string", "null"] },
        pcrUs: { type: ["string", "null"] },
      },
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value", "unit", "confidence", "evidence"],
        properties: {
          key: { type: "string" },
          value: { type: ["string", "null"] },
          unit: { type: ["string", "null"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          evidence: { type: ["string", "null"] },
        },
      },
    },
    missing: {
      type: "array",
      items: { type: "string" },
    },
    needsConfirmation: { type: "boolean" },
  },
};

export const readExamWithOpenAI = createServerFn({ method: "POST" })
  .inputValidator(readExamInputSchema)
  .handler(async ({ data }) => {
    const file = data.fileBase64
      ? { base64: data.fileBase64, mimeType: data.fileType }
      : data.fileUrl
        ? await base64FromUrl(data.fileUrl)
        : null;
    if (!file) {
      throw new Error("Arquivo não foi enviado para leitura.");
    }
    const mimeType = data.fileType || file.mimeType;
    const isPdf = mimeType.includes("pdf");
    const dataUrl = `data:${mimeType};base64,${file.base64}`;

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && !isPdf) {
      return readImageWithGroq({
        apiKey: groqKey,
        dataUrl,
        mimeType,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        isPdf
          ? "GROQ_API_KEY está configurada, mas PDF ainda precisa de OpenAI ou digitação manual. Configure OPENAI_API_KEY ou envie uma foto/imagem do exame."
          : "Nenhuma chave de IA configurada. Configure GROQ_API_KEY ou OPENAI_API_KEY na Vercel.",
      );
    }

    const model = process.env.OPENAI_EXAM_READER_MODEL || "gpt-4o-mini";

    const content: Array<Record<string, unknown>> = [
      {
        type: "input_text",
        text: [
          "Você é um extrator de dados laboratoriais da HTCare.",
          "Extraia APENAS valores numéricos visíveis no exame.",
          "Procure: ApoB, LDL, HDL, Triglicerídeos, HbA1c, Glicemia de jejum, Insulina de jejum e PCR-us.",
          "Normalize chaves para: apob, ldl, hdl, triglicerideos, hba1c, glicemiaJejum, insulinaJejum, pcrUs.",
          "Se um valor não aparecer: null.",
          "Nunca invente, estime, diagnostique ou interprete.",
          "Use ponto decimal nos números.",
        ].join("\n"),
      },
    ];

    content.push(
      isPdf
        ? {
            type: "input_file",
            filename: data.fileName,
            file_data: dataUrl,
          }
        : {
            type: "input_image",
            image_url: dataUrl,
          },
    );

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions:
          "Responda em JSON válido no schema solicitado. Se houver dúvida visual, marque confidence low.",
        input: [{ role: "user", content }],
        max_output_tokens: 1800,
        text: {
          format: {
            type: "json_schema",
            name: "htcare_exam_extraction",
            strict: true,
            schema: extractionSchema,
          },
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`OpenAI falhou (${response.status}): ${JSON.stringify(payload ?? {})}`);
    }

    const text = extractOutputText(payload);
    if (!text) {
      throw new Error("OpenAI não retornou output_text.");
    }

    return {
      ...JSON.parse(text),
      source: "vercel_openai",
      model,
    };
  });

async function readImageWithGroq(input: { apiKey: string; dataUrl: string; mimeType: string }) {
  const model = process.env.GROQ_EXAM_READER_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você é um extrator de dados laboratoriais da HTCare. Extraia somente valores visíveis. Nunca invente, estime, diagnostique ou interprete. Responda apenas JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Leia esta imagem de exame laboratorial brasileiro.",
                "Extraia ApoB, LDL, HDL, triglicerídeos, HbA1c, glicemia de jejum, insulina de jejum e PCR-us quando aparecerem.",
                "Use exatamente este formato JSON:",
                JSON.stringify(emptyExtraction()),
                "Use string numérica ou null. Se houver dúvida, confidence deve ser low.",
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: {
                url: input.dataUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Groq falhou (${response.status}): ${JSON.stringify(payload ?? {})}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Groq não retornou conteúdo legível.");
  }

  const parsed = JSON.parse(content) as unknown;
  return normalizeExtraction(parsed, "vercel_groq", model);
}

function emptyExtraction() {
  return {
    confidence: "low",
    values: {
      apob: null,
      ldl: null,
      hdl: null,
      triglicerideos: null,
      hba1c: null,
      glicemiaJejum: null,
      insulinaJejum: null,
      pcrUs: null,
    },
    fields: [],
    missing: [],
    needsConfirmation: true,
  };
}

function normalizeExtraction(value: unknown, source: string, model: string) {
  const fallback = emptyExtraction();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const values = record.values && typeof record.values === "object"
    ? (record.values as Record<string, unknown>)
    : record;
  const normalized = {
    ...fallback,
    ...record,
    confidence: record.confidence === "high" ? "high" : "low",
    values: {
      apob: stringifyOrNull(values.apob),
      ldl: stringifyOrNull(values.ldl),
      hdl: stringifyOrNull(values.hdl),
      triglicerideos: stringifyOrNull(values.triglicerideos),
      hba1c: stringifyOrNull(values.hba1c),
      glicemiaJejum: stringifyOrNull(values.glicemiaJejum ?? values.glicemia_jejum),
      insulinaJejum: stringifyOrNull(values.insulinaJejum ?? values.insulina_jejum),
      pcrUs: stringifyOrNull(values.pcrUs ?? values.pcr_us),
    },
    fields: Array.isArray(record.fields) ? record.fields : [],
    missing: Array.isArray(record.missing) ? record.missing : [],
    needsConfirmation: true,
    source,
    model,
  };
  return normalized;
}

function stringifyOrNull(value: unknown) {
  if (value == null || value === "") return null;
  return String(value);
}

async function base64FromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível baixar o arquivo enviado (${response.status}).`);
  }
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  return {
    base64: Buffer.from(arrayBuffer).toString("base64"),
    mimeType,
  };
}

function extractOutputText(payload: unknown) {
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
