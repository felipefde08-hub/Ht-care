export type RiskLevel = "baixo" | "moderado" | "alto";
export type BiomarkerTone = "good" | "attention" | "risk";

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

const RISK_WEIGHTS = {
  apob_high: -25,
  apob_borderline: -12,
  ldl_high: -15,
  ldl_borderline: -8,
  hdl_low: -12,
  trig_high: -10,
  homa_ir_high: -20,
  homa_ir_borderline: -10,
  hbA1c_diabetes: -25,
  hbA1c_prediabetes: -15,
  pcr_us_high: -15,
  pcr_us_moderate: -8,
} as const;

export interface BiomarkerInterpretation {
  key: keyof ExamBiomarkers | "homaIr";
  title: string;
  subtitle: string;
  valueLabel: string;
  classification: string;
  tone: BiomarkerTone;
  explanation: string;
}

export function parseExamNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function calculateHomaIr(glicemiaJejum?: number | null, insulinaJejum?: number | null) {
  if (!glicemiaJejum || !insulinaJejum) return null;
  return Number(((glicemiaJejum * insulinaJejum) / 405).toFixed(2));
}

export function buildDeterministicExamScore(input: ExamBiomarkers, estimatedScore: number | null) {
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

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: finalScore,
    category: riskCategoryFromScore(finalScore),
    factors: factors.length ? factors : ["exame sem biomarcadores críticos identificados"],
    homaIr,
  };
}

export function riskCategoryFromScore(score: number): RiskLevel {
  if (score >= 80) return "baixo";
  if (score >= 50) return "moderado";
  return "alto";
}

export function buildBiomarkerCards(input: ExamBiomarkers): BiomarkerInterpretation[] {
  const homaIr = input.homaIr ?? calculateHomaIr(input.glicemiaJejum, input.insulinaJejum);
  return [
    card("apob", "ApoB", "Partículas reais de gordura no sangue", input.apob, "mg/dL", [
      [130, "Elevado", "risk"],
      [90, "Atenção", "attention"],
      [0, "Dentro do alvo", "good"],
    ]),
    card("homaIr", "HOMA-IR", "Resistência à insulina", homaIr, "", [
      [2.51, "Resistência elevada", "risk"],
      [1.5, "Atenção", "attention"],
      [0, "Sensibilidade preservada", "good"],
    ]),
    card("pcrUs", "PCR-us", "Inflamação crônica", input.pcrUs, "mg/L", [
      [3.01, "Elevada", "risk"],
      [1, "Intermediária", "attention"],
      [0, "Baixa", "good"],
    ]),
    card("ldl", "LDL", "Colesterol ruim", input.ldl, "mg/dL", [
      [160, "Alto", "risk"],
      [130, "Atenção", "attention"],
      [0, "Adequado", "good"],
    ]),
    card("hdl", "HDL", "Colesterol bom", input.hdl, "mg/dL", [
      [50, "Protetor", "good"],
      [40, "Atenção", "attention"],
      [0, "Baixo", "risk"],
    ], true),
    card("triglicerideos", "Triglicerídeos", "Gordura no sangue", input.triglicerideos, "mg/dL", [
      [200, "Elevados", "risk"],
      [150, "Atenção", "attention"],
      [0, "Adequados", "good"],
    ]),
    card("hba1c", "HbA1c", "Média do açúcar em 3 meses", input.hba1c, "%", [
      [6.5, "Diabetes", "risk"],
      [5.7, "Pré-diabetes", "attention"],
      [0, "Normal", "good"],
    ]),
  ];
}

function card(
  key: keyof ExamBiomarkers | "homaIr",
  title: string,
  subtitle: string,
  value: number | null | undefined,
  unit: string,
  thresholds: Array<[number, string, BiomarkerTone]>,
  reverse = false,
): BiomarkerInterpretation {
  if (value == null) {
    return {
      key,
      title,
      subtitle,
      valueLabel: "—",
      classification: key === "homaIr" ? "Não calculado" : "Não informado",
      tone: "attention",
      explanation: `${title} não foi identificado neste exame. Quando esse valor aparecer, o relatório fica mais preciso.`,
    };
  }
  const selected = reverse
    ? thresholds.find(([limit]) => value >= limit) ?? thresholds[thresholds.length - 1]
    : thresholds.find(([limit]) => value >= limit) ?? thresholds[thresholds.length - 1];
  const [, classification, tone] = selected;
  return {
    key,
    title,
    subtitle,
    valueLabel: unit ? `${value}${unit === "%" ? "%" : ` ${unit}`}` : `${value}`,
    classification,
    tone,
    explanation: `${title}: ${value}${unit ? ` ${unit}` : ""}. Classificação: ${classification.toLowerCase()}.`,
  };
}
