export type CategoryKey = "pressure" | "adherence" | "metabolic" | "habits" | "symptoms";

export interface CategoryMeta {
  key: CategoryKey;
  scoreField: keyof CardiovascularScores;
  label: string;
  short: string;
  description: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "pressure",
    scoreField: "score_pressure",
    label: "Pressão arterial",
    short: "Pressão",
    description: "Leituras recentes e distância da meta acordada.",
  },
  {
    key: "adherence",
    scoreField: "score_adherence",
    label: "Adesão",
    short: "Adesão",
    description: "Consistência de medicação e plano combinado.",
  },
  {
    key: "metabolic",
    scoreField: "score_metabolic",
    label: "Metabólico",
    short: "Metabólico",
    description: "Peso, colesterol, diabetes e fatores associados.",
  },
  {
    key: "habits",
    scoreField: "score_habits",
    label: "Hábitos",
    short: "Hábitos",
    description: "Atividade física, tabagismo e rotina semanal.",
  },
  {
    key: "symptoms",
    scoreField: "score_symptoms",
    label: "Sintomas",
    short: "Sintomas",
    description: "Sinais relevantes registrados entre consultas.",
  },
];

export interface ScoreLevel {
  label: string;
  tone: "success" | "warning" | "destructive";
}

export function classifyRisk(score: number): ScoreLevel {
  if (score >= 78) return { label: "Baixo risco", tone: "success" };
  if (score >= 58) return { label: "Risco moderado", tone: "warning" };
  return { label: "Alto risco", tone: "destructive" };
}

export function toneClasses(tone: ScoreLevel["tone"]): string {
  switch (tone) {
    case "success":
      return "bg-success/12 text-success border-success/25";
    case "warning":
      return "bg-warning/15 text-warning-foreground border-warning/30";
    case "destructive":
      return "bg-destructive/12 text-destructive border-destructive/25";
  }
}

export interface CardiovascularInput {
  systolic: number;
  diastolic: number;
  heartRate: number;
  medicationAdherence: number;
  activity: number;
  weight?: number | null;
  symptoms: number;
  examsPending?: number;
  smoking?: boolean;
  diabetes?: boolean;
  cholesterol?: boolean;
  hypertension?: boolean;
  familyHistory?: boolean;
  clinicalNotes?: string | null;
}

export interface CardiovascularScores {
  score_pressure: number;
  score_adherence: number;
  score_metabolic: number;
  score_habits: number;
  score_symptoms: number;
  heart_score: number;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function pressureScore(systolic: number, diastolic: number) {
  const systolicPenalty = Math.max(0, systolic - 120) * 1.35 + Math.max(0, 105 - systolic) * 0.8;
  const diastolicPenalty = Math.max(0, diastolic - 80) * 1.6 + Math.max(0, 65 - diastolic) * 0.8;
  return clamp(100 - systolicPenalty - diastolicPenalty);
}

function habitScore(activity: number, smoking?: boolean) {
  const base = (Math.max(0, Math.min(7, activity)) / 7) * 100;
  return clamp(base - (smoking ? 22 : 0));
}

export function computeCardiovascularScores(input: CardiovascularInput): CardiovascularScores {
  const score_pressure = pressureScore(input.systolic, input.diastolic);
  const score_adherence = clamp(input.medicationAdherence * 10);
  const riskFactorPenalty =
    (input.diabetes ? 12 : 0) +
    (input.cholesterol ? 10 : 0) +
    (input.hypertension ? 8 : 0) +
    (input.familyHistory ? 6 : 0) +
    (input.examsPending ?? 0) * 4;
  const score_metabolic = clamp(88 - riskFactorPenalty);
  const score_habits = habitScore(input.activity, input.smoking);
  const score_symptoms = clamp(100 - input.symptoms * 10);
  const heart_score = clamp(
    score_pressure * 0.3 +
      score_adherence * 0.22 +
      score_metabolic * 0.18 +
      score_habits * 0.17 +
      score_symptoms * 0.13,
  );

  return {
    score_pressure,
    score_adherence,
    score_metabolic,
    score_habits,
    score_symptoms,
    heart_score,
  };
}

export function getTrendLabel(delta: number | null) {
  if (delta == null) return "Linha de base";
  if (delta >= 6) return "Melhora sustentada";
  if (delta <= -6) return "Sinal de atenção";
  return "Estável";
}

export function recommendationFor(score: number) {
  if (score >= 78) return "Mantenha a rotina e continue registrando pressão e adesão semanalmente.";
  if (score >= 58) return "Revise pressão, adesão e exames pendentes antes da próxima consulta.";
  return "Priorize contato com a equipe para reavaliar metas e sinais recentes.";
}
