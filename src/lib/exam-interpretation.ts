import { buildRiskResult, type RiskLevel } from "@/lib/risk-score";

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

export interface BiomarkerInterpretation {
  key: keyof ExamBiomarkers | "homaIr";
  title: string;
  subtitle: string;
  valueLabel: string;
  classification: string;
  tone: BiomarkerTone;
  explanation: string;
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
    if (biomarkers.apob >= 130) penalize(18, "ApoB elevado");
    else if (biomarkers.apob >= 90) penalize(9, "ApoB em faixa de atenção");
  }
  if (biomarkers.ldl != null) {
    if (biomarkers.ldl >= 160) penalize(12, "LDL alto");
    else if (biomarkers.ldl >= 130) penalize(6, "LDL em faixa de atenção");
  }
  if (biomarkers.hdl != null) {
    if (biomarkers.hdl < 40) penalize(8, "HDL baixo");
    else if (biomarkers.hdl < 50) penalize(4, "HDL abaixo do ideal");
  }
  if (biomarkers.triglicerideos != null) {
    if (biomarkers.triglicerideos >= 200) penalize(10, "triglicerídeos elevados");
    else if (biomarkers.triglicerideos >= 150) penalize(5, "triglicerídeos em faixa de atenção");
  }
  if (biomarkers.hba1c != null) {
    if (biomarkers.hba1c >= 6.5) penalize(14, "HbA1c em faixa de diabetes");
    else if (biomarkers.hba1c >= 5.7) penalize(8, "HbA1c em faixa de pré-diabetes");
  }
  if (biomarkers.glicemiaJejum != null) {
    if (biomarkers.glicemiaJejum >= 126) penalize(10, "glicemia de jejum elevada");
    else if (biomarkers.glicemiaJejum >= 100) penalize(5, "glicemia de jejum alterada");
  }
  if (homaIr != null) {
    if (homaIr >= 3) penalize(14, "resistência à insulina elevada");
    else if (homaIr >= 2) penalize(7, "resistência à insulina em atenção");
  }
  if (biomarkers.pcrUs != null) {
    if (biomarkers.pcrUs > 3) penalize(10, "inflamação elevada");
    else if (biomarkers.pcrUs >= 1) penalize(5, "inflamação em faixa intermediária");
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
    apobCard(input.apob),
    homaCard(homaIr),
    pcrCard(input.pcrUs),
    ldlCard(input.ldl),
    hdlCard(input.hdl),
    triglyceridesCard(input.triglicerideos),
    hba1cCard(input.hba1c),
  ];
}

function apobCard(value?: number | null): BiomarkerInterpretation {
  const tone =
    value == null ? "attention" : value >= 130 ? "risk" : value >= 90 ? "attention" : "good";
  const classification =
    value == null
      ? "Não informado"
      : value >= 130
        ? "Elevado"
        : value >= 90
          ? "Atenção"
          : "Dentro do alvo";
  return {
    key: "apob",
    title: "ApoB",
    subtitle: "Partículas reais de gordura no sangue",
    valueLabel: formatValue(value, "mg/dL"),
    classification,
    tone,
    explanation:
      value == null
        ? "Esse marcador ajuda a enxergar o número real de partículas de gordura circulando. Quando você tiver esse valor, o risco fica mais preciso."
        : `Esse é o número real de partículas de gordura circulando no seu sangue. É mais preciso que o colesterol tradicional para prever risco de infarto. O seu está em ${value} mg/dL, ${classification.toLowerCase()}.`,
  };
}

function homaCard(value?: number | null): BiomarkerInterpretation {
  const tone =
    value == null ? "attention" : value >= 3 ? "risk" : value >= 2 ? "attention" : "good";
  const classification =
    value == null
      ? "Não calculado"
      : value >= 3
        ? "Resistência elevada"
        : value >= 2
          ? "Atenção"
          : "Sensibilidade preservada";
  return {
    key: "homaIr",
    title: "HOMA-IR",
    subtitle: "Resistência à insulina",
    valueLabel: value == null ? "—" : value.toFixed(2),
    classification,
    tone,
    explanation:
      value == null
        ? "Calculamos esse índice combinando glicemia e insulina de jejum. Ele mostra sinais de resistência à insulina antes mesmo do diabetes aparecer."
        : `Mostra se seu corpo está tendo dificuldade de processar açúcar, antes mesmo do diabetes aparecer. O seu está em ${value.toFixed(2)}, ${classification.toLowerCase()}.`,
  };
}

function pcrCard(value?: number | null): BiomarkerInterpretation {
  const tone = value == null ? "attention" : value > 3 ? "risk" : value >= 1 ? "attention" : "good";
  const classification =
    value == null
      ? "Não informado"
      : value > 3
        ? "Elevada"
        : value >= 1
          ? "Intermediária"
          : "Baixa";
  return {
    key: "pcrUs",
    title: "PCR-us",
    subtitle: "Inflamação crônica",
    valueLabel: formatValue(value, "mg/L"),
    classification,
    tone,
    explanation:
      value == null
        ? "Esse marcador mede inflamação crônica no corpo. Quando informado, ajuda a entender desgaste silencioso das artérias."
        : `Mede inflamação crônica no corpo, que desgasta as artérias silenciosamente ao longo do tempo. O seu está em ${value} mg/L, ${classification.toLowerCase()}.`,
  };
}

function ldlCard(value?: number | null): BiomarkerInterpretation {
  const tone =
    value == null ? "attention" : value >= 160 ? "risk" : value >= 130 ? "attention" : "good";
  const classification =
    value == null ? "Não informado" : value >= 160 ? "Alto" : value >= 130 ? "Atenção" : "Adequado";
  return {
    key: "ldl",
    title: "LDL",
    subtitle: "Colesterol ruim",
    valueLabel: formatValue(value, "mg/dL"),
    classification,
    tone,
    explanation:
      value == null
        ? "O LDL ajuda a estimar gordura circulante, mas não conta tudo sozinho. Por isso analisamos junto com ApoB."
        : `O colesterol ruim. Mas o número isolado não conta tudo, por isso também analisamos o ApoB. O seu está em ${value} mg/dL.`,
  };
}

function hdlCard(value?: number | null): BiomarkerInterpretation {
  const tone =
    value == null ? "attention" : value < 40 ? "risk" : value < 50 ? "attention" : "good";
  const classification =
    value == null ? "Não informado" : value < 40 ? "Baixo" : value < 50 ? "Atenção" : "Protetor";
  return {
    key: "hdl",
    title: "HDL",
    subtitle: "Colesterol bom",
    valueLabel: formatValue(value, "mg/dL"),
    classification,
    tone,
    explanation:
      value == null
        ? "O HDL ajuda na proteção das artérias. Valores mais altos costumam ser melhores para o perfil cardiovascular."
        : `O colesterol bom, que protege as artérias. Quanto mais alto, melhor. O seu está em ${value} mg/dL.`,
  };
}

function triglyceridesCard(value?: number | null): BiomarkerInterpretation {
  const tone =
    value == null ? "attention" : value >= 200 ? "risk" : value >= 150 ? "attention" : "good";
  const classification =
    value == null
      ? "Não informado"
      : value >= 200
        ? "Elevados"
        : value >= 150
          ? "Atenção"
          : "Adequados";
  return {
    key: "triglicerideos",
    title: "Triglicerídeos",
    subtitle: "Gordura no sangue",
    valueLabel: formatValue(value, "mg/dL"),
    classification,
    tone,
    explanation:
      value == null
        ? "Esse marcador conversa muito com açúcar, álcool e metabolismo. Quando informado, ajuda a orientar ações práticas."
        : `Gordura no sangue relacionada a açúcar e álcool. O seu está em ${value} mg/dL, ${classification.toLowerCase()}.`,
  };
}

function hba1cCard(value?: number | null): BiomarkerInterpretation {
  const tone =
    value == null ? "attention" : value >= 6.5 ? "risk" : value >= 5.7 ? "attention" : "good";
  const classification =
    value == null
      ? "Não informado"
      : value >= 6.5
        ? "Diabetes"
        : value >= 5.7
          ? "Pré-diabetes"
          : "Normal";
  return {
    key: "hba1c",
    title: "HbA1c",
    subtitle: "Média do açúcar em 3 meses",
    valueLabel: formatValue(value, "%"),
    classification,
    tone,
    explanation:
      value == null
        ? "A hemoglobina glicada mostra a média do açúcar no sangue nos últimos 3 meses. Ela ajuda a enxergar risco metabólico acumulado."
        : `A média do seu açúcar no sangue nos últimos 3 meses. O seu está em ${value}%, classificação: ${classification.toLowerCase()}.`,
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

function formatValue(value: number | null | undefined, unit: string) {
  if (value == null) return "—";
  return `${value}${unit === "%" ? "%" : ` ${unit}`}`;
}
