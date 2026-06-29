import { createOpenAIJsonResponse } from "../_shared/openai.ts";
import { handleOptions, jsonResponse, requireAuthHeader } from "../_shared/http.ts";

interface ChatRequest {
  message?: string;
  context?: {
    score?: number | null;
    factors?: string[];
  };
}

interface ChatResponse {
  answer: string;
  urgency: "normal" | "seek_care";
}

const MODEL = Deno.env.get("OPENAI_CARELITO_CHAT_MODEL") || "gpt-5.4-mini";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (!requireAuthHeader(request)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();
    if (!message) {
      return jsonResponse({ error: "message is required" }, 400);
    }

    const response = await createOpenAIJsonResponse<ChatResponse>({
      model: MODEL,
      schemaName: "htcare_carelito_chat",
      schema: chatSchema,
      maxOutputTokens: 520,
      system:
        "Você é o Carelito, assistente acolhedor de saúde preventiva cardiovascular da HTCare. Responda em português do Brasil, com linguagem simples, direta e cuidadosa. Não diagnostique, não prescreva medicamentos e não substitua consulta médica. Se o usuário relatar dor no peito, falta de ar importante, desmaio, fraqueza súbita, confusão, piora intensa ou sintomas agudos, oriente procurar atendimento médico imediatamente.",
      prompt: [
        `Score atual: ${body.context?.score ?? "não informado"}.`,
        `Fatores do usuário: ${(body.context?.factors ?? []).join(", ") || "não informados"}.`,
        `Pergunta do usuário: ${message}`,
        "Responda em até 900 caracteres. Seja útil, sem alarmismo.",
      ].join("\n"),
    });

    return jsonResponse({
      ...response,
      source: "openai",
      model: MODEL,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({
      answer: fallbackAnswer(),
      urgency: "normal",
      source: "fallback",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function fallbackAnswer() {
  return "Posso te ajudar a entender seus dados em linguagem simples, mas não substituo uma consulta médica. Se você estiver com dor no peito, falta de ar importante ou mal-estar intenso, procure atendimento médico imediatamente.";
}

const chatSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "urgency"],
  properties: {
    answer: { type: "string" },
    urgency: { type: "string", enum: ["normal", "seek_care"] },
  },
};
