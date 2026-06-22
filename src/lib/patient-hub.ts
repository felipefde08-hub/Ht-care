import type { RiskLevel } from "@/lib/risk-score";

export interface HubScorePoint {
  score: number;
  createdAt: string;
  source?: string;
  category?: RiskLevel;
  factors?: string[];
}

export interface StoredHubData {
  result?: {
    score: number;
    label?: string;
    factors?: string[];
  };
  age?: string;
  biologicalSex?: "feminino" | "masculino" | "";
}

export function readStoredHubData() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("htcare:onboarding");
    return raw ? (JSON.parse(raw) as StoredHubData) : null;
  } catch {
    return null;
  }
}

export function readStoredScoreHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("htcare:score-history");
    return raw ? (JSON.parse(raw) as HubScorePoint[]) : [];
  } catch {
    return [];
  }
}

export function riskLevelFromScore(score: number | null): RiskLevel {
  if (score == null) return "moderado";
  if (score >= 80) return "baixo";
  if (score >= 50) return "moderado";
  return "alto";
}

export function riskLabelFromScore(score: number | null) {
  const level = riskLevelFromScore(score);
  if (level === "baixo") return "Baixo";
  if (level === "moderado") return "Moderado";
  return "Alto";
}

export function riskToneFromScore(score: number | null) {
  const level = riskLevelFromScore(score);
  if (level === "baixo") return "text-[#2f6760] bg-[#e8f5ef]";
  if (level === "moderado") return "text-[#9a5b12] bg-[#fff7dc]";
  return "text-[#b53d34] bg-[#fff0ee]";
}

export function recommendationsForFactors(factors: string[] = []) {
  const normalized = factors.join(" ").toLowerCase();
  const recommendations: string[] = [];
  if (normalized.includes("tabagismo")) {
    recommendations.push(
      "Mapear gatilhos do cigarro e combinar um plano de redução com apoio profissional.",
    );
  }
  if (normalized.includes("hipertensão") || normalized.includes("pressão")) {
    recommendations.push(
      "Medir a pressão em repouso e levar os registros para uma avaliação médica.",
    );
  }
  if (
    normalized.includes("imc") ||
    normalized.includes("obesidade") ||
    normalized.includes("sobrepeso")
  ) {
    recommendations.push("Começar com caminhadas curtas e revisar alimentação sem metas radicais.");
  }
  if (normalized.includes("diabetes") || normalized.includes("glicemia")) {
    recommendations.push("Acompanhar glicemia quando indicado e discutir metas com seu médico.");
  }
  if (normalized.includes("sono") || normalized.includes("estresse")) {
    recommendations.push("Criar uma rotina curta de sono e pausas de respiração durante a semana.");
  }

  return recommendations.length
    ? recommendations.slice(0, 3)
    : [
        "Manter check-ins semanais para acompanhar mudanças do seu risco.",
        "Atualizar pressão, peso e hábitos sempre que tiver novos dados.",
        "Usar as missões como pequenos passos de prevenção contínua.",
      ];
}

export function populationReference(age?: string, sex?: string) {
  const ageNumber = Number(age);
  const ageBand = ageNumber >= 60 ? "60+" : ageNumber >= 45 ? "45-59" : "18-44";
  const sexLabel = sex === "feminino" ? "mulheres" : sex === "masculino" ? "homens" : "adultos";
  const hypertension =
    ageBand === "60+"
      ? "mais frequente"
      : ageBand === "45-59"
        ? "em crescimento"
        : "menos frequente";
  return `Referência populacional nacional para ${sexLabel} na faixa ${ageBand}: hipertensão e fatores metabólicos tendem a ser ${hypertension}. Esta comparação usa dados públicos agregados como VIGITEL/IBGE, não dados de usuários HTCare.`;
}

export const achievementCatalog = [
  {
    id: "healthy-week",
    title: "Uma semana saudável",
    criterion: "Complete pelo menos 1 missão na semana.",
    requiredPoints: 10,
  },
  {
    id: "mind-body",
    title: "Mente e corpo",
    criterion: "Chegue a 50 Pontos do Coração.",
    requiredPoints: 50,
  },
  {
    id: "sleep-well",
    title: "Dormiu bem",
    criterion: "Chegue a 100 Pontos do Coração.",
    requiredPoints: 100,
  },
  {
    id: "conscious-food",
    title: "Alimentação consciente",
    criterion: "Chegue a 200 Pontos do Coração.",
    requiredPoints: 200,
  },
  {
    id: "heart-day",
    title: "Coração em dia",
    criterion: "Chegue a 300 Pontos do Coração.",
    requiredPoints: 300,
  },
];
