import { supabase } from "@/integrations/supabase/client";

export interface ExtractedExamField {
  key: string;
  value: string | null;
  unit: string | null;
  confidence: "high" | "medium" | "low";
  evidence: string | null;
}

export interface ExtractedExamValues {
  confidence: "high" | "low";
  values: Record<string, string | null>;
  fields: ExtractedExamField[];
  missing: string[];
  needsConfirmation: boolean;
  source?: string;
  model?: string;
}

export async function readExamValues(input: {
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileType: string;
}) {
  const { data, error } = await supabase.functions.invoke("read-exam", {
    body: input,
  });
  if (error) throw new Error(await formatFunctionError(error));
  if (!isExtractedExamValues(data)) {
    throw new Error("A Edge Function read-exam respondeu em um formato inesperado.");
  }
  return data;
}

async function formatFunctionError(error: unknown) {
  const response = (error as { context?: unknown })?.context;
  if (response instanceof Response) {
    const body = await response
      .clone()
      .json()
      .catch(async () => response.clone().text().catch(() => null));
    if (body && typeof body === "object") {
      const record = body as { message?: unknown; error?: unknown };
      const message = typeof record.message === "string" ? record.message : null;
      const code = typeof record.error === "string" ? record.error : null;
      return [code, message].filter(Boolean).join(": ");
    }
    if (typeof body === "string" && body.trim()) return body.trim();
  }
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "Erro desconhecido ao chamar a Edge Function read-exam.";
}

function isExtractedExamValues(value: unknown): value is ExtractedExamValues {
  if (!value || typeof value !== "object") return false;
  const record = value as { confidence?: unknown; values?: unknown; fields?: unknown };
  return (
    (record.confidence === "high" || record.confidence === "low") &&
    typeof record.values === "object" &&
    Array.isArray(record.fields)
  );
}
