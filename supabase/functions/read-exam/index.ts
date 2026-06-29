import { base64FromUrl, createOpenAIJsonResponse } from "../_shared/openai.ts";
import { handleOptions, jsonResponse, requireAuthHeader } from "../_shared/http.ts";

interface ReadExamRequest {
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
}

interface ReadExamResponse {
  confidence: "high" | "low";
  values: Record<string, string | null>;
  fields: Array<{
    key: string;
    value: string | null;
    unit: string | null;
    confidence: "high" | "medium" | "low";
    evidence: string | null;
  }>;
  missing: string[];
  needsConfirmation: boolean;
}

const MODEL = Deno.env.get("OPENAI_EXAM_READER_MODEL") || "gpt-5.4-mini";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (!requireAuthHeader(request)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await request.json()) as ReadExamRequest;
    if (!body.fileUrl) {
      return jsonResponse({ error: "fileUrl is required" }, 400);
    }

    const fileName = body.fileName || body.filePath?.split("/").at(-1) || "exame";
    const file = await base64FromUrl(body.fileUrl);
    const mimeType = body.fileType || file.mimeType;
    const kind = mimeType.includes("pdf") ? "pdf" : "image";

    const parsed = await createOpenAIJsonResponse<ReadExamResponse>({
      model: MODEL,
      schemaName: "htcare_exam_extraction",
      schema: extractionSchema,
      maxOutputTokens: 1800,
      system:
        "Você é o leitor de exames da HTCare. Extraia somente valores que estejam visíveis no arquivo. Não invente valores. Se houver dúvida, marque confidence low e peça confirmação. Use ponto decimal nos números.",
      prompt:
        "Leia este exame laboratorial brasileiro. Extraia ApoB, LDL, HDL, triglicerídeos, HbA1c, glicemia de jejum, insulina de jejum e PCR-us quando aparecerem. Normalize chaves para: apob, ldl, hdl, triglicerideos, hba1c, glicemiaJejum, insulinaJejum, pcrUs. Retorne apenas JSON no schema solicitado.",
      attachments: [
        {
          kind,
          mimeType,
          filename: fileName,
          base64: file.base64,
        },
      ],
    });

    return jsonResponse({
      ...parsed,
      source: "openai",
      model: MODEL,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error: "read_exam_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
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
