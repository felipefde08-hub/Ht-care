import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    score: z.number().nullable(),
    factors: z.array(z.string()),
  }),
});

export const askCarelito = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        answer: fallbackAnswer(data.context.factors),
        source: "fallback",
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        max_tokens: 420,
        system:
          "Você é o Carelito, assistente acolhedor de saúde preventiva da HTCare. Responda em português do Brasil, linguagem simples, sem jargão. Nunca diagnostique, nunca prescreva medicamento e nunca substitua consulta médica. Em sintomas preocupantes como dor no peito, falta de ar importante, desmaio, fraqueza súbita, confusão ou piora intensa, oriente procurar atendimento médico imediatamente. Seja amigável, cuidadoso, motivador e breve.",
        messages: [
          {
            role: "user",
            content: `Dados do usuário: score=${data.context.score ?? "não informado"}; fatores=${data.context.factors.join(", ") || "não informados"}.\n\nPergunta: ${data.message}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        answer: fallbackAnswer(data.context.factors),
        source: "fallback",
      };
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return {
      answer:
        json.content?.find((item) => item.type === "text")?.text?.trim() ??
        fallbackAnswer(data.context.factors),
      source: "anthropic",
    };
  });

function fallbackAnswer(factors: string[]) {
  const factorText = factors.length
    ? `Vi que alguns fatores importantes no seu score são: ${factors.slice(0, 3).join(", ")}.`
    : "Ainda não encontrei fatores suficientes no seu perfil.";
  return `${factorText} Posso te ajudar a entender seus dados em linguagem simples, mas não substituo consulta médica. Se você estiver com dor no peito, falta de ar importante ou mal-estar intenso, procure atendimento médico.`;
}
