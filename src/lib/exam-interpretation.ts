import {
  classifyBiomarker,
  formatBiomarkerValue,
  HTCARE_BIOMARKERS,
  type BiomarkerId,
  type BiomarkerTone,
} from "@/lib/htcare-knowledge";
import { buildRiskResult, RISK_WEIGHTS, type RiskLevel } from "@/lib/risk-score";

export type { BiomarkerTone };

export interface ExamBiomarkers {
  apob?: number | null;
  ldl?: number | null;
  hdl?: number | null;
  triglicerideos?: number | null;
  hba1c?: number | null;
  glicemiaJejum?: number | null;
  insulinaJejum?: number | null;
  homaIr?: number | null;
  pcrUs?: number | null;
}

export interface BiomarkerInterpretation {
  key: keyof ExamBiomarkers | "homaIr";
  title: string;
  subtitle: string;
  valueLabel: string;
  classification: string;
  tone: BiomarkerTone;
  explanation: string;
  recommendation?: string;
  source?: string;
}

export interface ExamInterpretationResult {
  score: number;
  category: RiskLevel;
  summary: string;
  cards: BiomarkerInterpretation[];
  factors: string[];
}

function cleanNumber(value: unknown) {
  if (value == null || value === "") return null;
  const normalized = String(value).replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function parseExamNumber(value: unknown) {
  return cleanNumber(value);
}

export function calculateHomaIr(glicemiaJejum?: number | null, insulinaJejum?: number | null) {
  if (!glicemiaJejum || !insulinaJejum) return null;
  return Number(((glicemiaJejum * insulinaJejum) / 405).toFixed(2));
}

export function buildExamInterpretation(
  input: ExamBiomarkers,
  estimatedScore: number | null,
  firstName = "você",
): ExamInterpretationResult {
  const homaIr = input.homaIr ?? calculateHomaIr(input.glicemiaJejum, input.insulinaJejum);
  const biomarkers = { ...input, homaIr };
  let score = estimatedScore ?? 100;
  const factors: string[] = [];

  function penalize(points: number, factor: string) {
    score -= points;
    if (!factors.includes(factor)) factors.push(factor);
  }

  if (biomarkers.apob != null) {
    if (biomarkers.apob >= 130) penalize(Math.abs(RISK_WEIGHTS.apob_high), "ApoB elevado");
    else if (biomarkers.apob >= 110)
      penalize(Math.abs(RISK_WEIGHTS.apob_borderline), "ApoB em faixa de atenção");
  }
  if (biomarkers.ldl != null) {
    if (biomarkers.ldl >= 160) penalize(Math.abs(RISK_WEIGHTS.ldl_high), "LDL alto");
    else if (biomarkers.ldl >= 100)
      penalize(Math.abs(RISK_WEIGHTS.ldl_borderline), "LDL em faixa de atenção");
  }
  if (biomarkers.hdl != null) {
    if (biomarkers.hdl < 40) penalize(Math.abs(RISK_WEIGHTS.hdl_low), "HDL baixo");
  }
  if (biomarkers.triglicerideos != null) {
    if (biomarkers.triglicerideos >= 200)
      penalize(Math.abs(RISK_WEIGHTS.trig_high), "triglicerídeos elevados");
  }
  if (biomarkers.hba1c != null) {
    if (biomarkers.hba1c >= 6.5)
      penalize(Math.abs(RISK_WEIGHTS.hbA1c_diabetes), "HbA1c em faixa de diabetes");
    else if (biomarkers.hba1c >= 5.7)
      penalize(Math.abs(RISK_WEIGHTS.hbA1c_prediabetes), "HbA1c em faixa de pré-diabetes");
  }
  if (biomarkers.glicemiaJejum != null) {
    if (biomarkers.glicemiaJejum >= 126) penalize(10, "glicemia de jejum elevada");
    else if (biomarkers.glicemiaJejum >= 100) penalize(5, "glicemia de jejum alterada");
  }
  if (homaIr != null) {
    if (homaIr > 2.5)
      penalize(Math.abs(RISK_WEIGHTS.homa_ir_high), "resistência à insulina elevada");
    else if (homaIr >= 1.5)
      penalize(Math.abs(RISK_WEIGHTS.homa_ir_borderline), "resistência à insulina em atenção");
  }
  if (biomarkers.pcrUs != null) {
    if (biomarkers.pcrUs > 3) penalize(Math.abs(RISK_WEIGHTS.pcr_us_high), "inflamação elevada");
    else if (biomarkers.pcrUs >= 1)
      penalize(Math.abs(RISK_WEIGHTS.pcr_us_moderate), "inflamação em faixa intermediária");
  }

  const riskResult = buildRiskResult(score, factors);
  const cards = buildBiomarkerCards(biomarkers);
  const summary = buildCarelitoSummary(firstName, cards, riskResult.score);

  return {
    score: riskResult.score,
    category: riskResult.level,
    summary,
    cards,
    factors,
  };
}

export function buildBiomarkerCards(input: ExamBiomarkers): BiomarkerInterpretation[] {
  const homaIr = input.homaIr ?? calculateHomaIr(input.glicemiaJejum, input.insulinaJejum);

  return [
    knowledgeCard("apob", input.apob),
    knowledgeCard("homaIr", homaIr),
    knowledgeCard("pcrUs", input.pcrUs),
    knowledgeCard("ldl", input.ldl),
    knowledgeCard("hdl", input.hdl),
    knowledgeCard("triglicerideos", input.triglicerideos),
    knowledgeCard("hba1c", input.hba1c),
  ];
}

function knowledgeCard(id: BiomarkerId, value?: number | null): BiomarkerInterpretation {
  const item = HTCARE_BIOMARKERS[id];
  const classification = classifyBiomarker(id, value);
  return {
    key: id,
    title: item.nome_simples,
    subtitle: item.o_que_e,
    valueLabel: formatBiomarkerValue(id, value),
    classification: classification.label,
    tone: classification.tone,
    explanation: classification.explanation,
    recommendation: classification.recommendation,
    source: classification.source,
  };
}

function buildCarelitoSummary(firstName: string, cards: BiomarkerInterpretation[], score: number) {
  const risks = cards.filter((card) => card.tone === "risk");
  const attentions = cards.filter(
    (card) => card.tone === "attention" && !card.valueLabel.includes("—"),
  );
  const positives = cards.filter((card) => card.tone === "good");
  const mainAttention = risks[0] ?? attentions[0];
  const positive = positives[0];
  const focus =
    mainAttention?.title === "HOMA-IR" || mainAttention?.title === "HbA1c"
      ? "rotina alimentar, peso, atividade física e acompanhamento metabólico"
      : mainAttention?.title === "ApoB" || mainAttention?.title === "LDL"
        ? "controle de colesterol e revisão dos fatores de risco com seu médico"
        : mainAttention?.title === "PCR-us"
          ? "investigar fontes de inflamação e repetir o exame conforme orientação médica"
          : "registrar seus indicadores e repetir a avaliação nos próximos meses";

  if (!mainAttention) {
    return `${firstName}, seus exames não mostram um biomarcador crítico nesta leitura. O ponto positivo é que ${positive?.title ?? "seus dados principais"} está dentro do esperado. Continue acompanhando pressão, peso e rotina, e repita o exame para comparar a evolução. Score atualizado: ${score}/100.`;
  }

  return `${firstName}, seus exames mostram que o maior ponto de atenção é ${mainAttention.title}. O positivo é que ${positive?.title ?? "alguns marcadores"} está dentro do esperado. Recomendamos focar em ${focus} nos próximos 3 meses e repetir o exame para ver a evolução. Score atualizado: ${score}/100.`;
}
