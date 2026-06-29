import {
  buildBiomarkerCards,
  buildDeterministicExamScore,
  calculateHomaIr,
  parseExamNumber,
  type BiomarkerInterpretation,
  type ExamBiomarkers,
  type RiskLevel,
} from "../_shared/exam.ts";
import { createOpenAIJsonResponse } from "../_shared/openai.ts";
import { handleOptions, jsonResponse, requireAuthHeader } from "../_shared/http.ts";

interface InterpretExamRequest {
  biomarkers?: Record<string, unknown>;
  estimatedScore?: number | null;
  firstName?: string;
}

interface OpenAIInterpretation {
  summary: string;
  next90Days: string[];
}

const MODEL = Deno.env.get("OPENAI_EXAM_INTERPRETER_MODEL") || "gpt-5.4";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (!requireAuthHeader(request)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await request.json()) as InterpretExamRequest;
    const biomarkers = normalizeBiomarkers(body.biomarkers ?? {});
    const score = buildDeterministicExamScore(biomarkers, body.estimatedScore ?? null);
    const cards = buildBiomarkerCards({ ...biomarkers, homaIr: score.homaIr });
    const firstName = body.firstName?.trim() || "você";

    let ai: OpenAIInterpretation | null = null;
    try {
      ai = await createOpenAIJsonResponse<OpenAIInterpretation>({
        model: MODEL,
        schemaName: "htcare_exam_interpretation",
        schema: interpretationSchema,
        maxOutputTokens: 1800,
        system:
          "Você é o Carelito, assistente de saúde cardiovascular da HTCare. Explique exames em português do Brasil com linguagem simples, cuidadosa e não alarmista. Não dê diagnóstico, não prescreva medicamentos e não substitua consulta médica. Recomende discutir alterações relevantes com médico.",
        prompt: [
          `Nome do usuário: ${firstName}.`,
          `Score estimado anterior: ${body.estimatedScore ?? "não informado"}.`,
          `Score recalculado determinístico: ${score.score}/100 (${score.category}).`,
          `Fatores calculados: ${score.factors.join(", ")}.`,
          `Interpretações clínicas oficiais da base HTCare: ${JSON.stringify(cards.map((card) => ({ key: card.key, title: card.title, classification: card.classification, explanation: card.explanation })))}.`,
          "Gere somente um resumo integrado e 3 próximos passos. Não altere, corrija nem invente explicações de biomarcadores.",
        ].join("\n"),
      });
    } catch (error) {
      console.error("OpenAI interpretation fallback", error);
    }

    const enrichedCards = cards;
    const summary =
      ai?.summary ||
      buildFallbackSummary(firstName, enrichedCards, score.score, score.factors);

    return jsonResponse({
      score: score.score,
      category: score.category,
      factors: score.factors,
      cards: enrichedCards,
      summary,
      next90Days: ai?.next90Days ?? buildFallbackNextSteps(score.factors),
      model: ai ? MODEL : "fallback",
      source: ai ? "openai" : "fallback",
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error: "interpret_exam_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

function normalizeBiomarkers(values: Record<string, unknown>): ExamBiomarkers {
  const glicemiaJejum = parseExamNumber(values.glicemiaJejum ?? values.glicemia_jejum);
  const insulinaJejum = parseExamNumber(values.insulinaJejum ?? values.insulina_jejum);
  return {
    apob: parseExamNumber(values.apob),
    ldl: parseExamNumber(values.ldl),
    hdl: parseExamNumber(values.hdl),
    triglicerideos: parseExamNumber(values.triglicerideos),
    hba1c: parseExamNumber(values.hba1c),
    glicemiaJejum,
    insulinaJejum,
    homaIr: parseExamNumber(values.homaIr ?? values.homa_ir) ?? calculateHomaIr(glicemiaJejum, insulinaJejum),
    pcrUs: parseExamNumber(values.pcrUs ?? values.pcr_us),
  };
}

function buildFallbackSummary(
  firstName: string,
  cards: BiomarkerInterpretation[],
  score: number,
  factors: string[],
) {
  const main = cards.find((card) => card.tone === "risk") ?? cards.find((card) => card.tone === "attention");
  if (!main) {
    return `${firstName}, seus exames não mostram um biomarcador crítico nesta leitura. Continue acompanhando seus indicadores e repita o exame para comparar evolução. Score atualizado: ${score}/100.`;
  }
  return `${firstName}, o principal ponto de atenção nesta leitura é ${main.title}. Isso conversa com ${factors.slice(0, 2).join(" e ") || "seu risco cardiovascular"}. O ideal é acompanhar a evolução e discutir o resultado com seu médico. Score atualizado: ${score}/100.`;
}

function buildFallbackNextSteps(factors: string[]) {
  if (factors.some((factor) => /insulina|glicemia|HbA1c/i.test(factor))) {
    return [
      "Caminhar 30 minutos após refeições principais quando possível.",
      "Reduzir bebidas açucaradas e carboidratos refinados.",
      "Repetir glicemia, insulina e HbA1c em 90 dias se o médico orientar.",
    ];
  }
  if (factors.some((factor) => /ApoB|LDL|triglicer/i.test(factor))) {
    return [
      "Revisar gordura saturada e ultraprocessados na rotina alimentar.",
      "Registrar pressão e peso semanalmente.",
      "Repetir perfil lipídico e ApoB em 90 dias se indicado.",
    ];
  }
  return [
    "Registrar pressão e peso com regularidade.",
    "Manter rotina de sono e movimento.",
    "Repetir avaliação para acompanhar tendência.",
  ];
}

const interpretationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "next90Days"],
  properties: {
    summary: { type: "string" },
    next90Days: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
  },
};
