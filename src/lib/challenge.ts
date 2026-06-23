import {
  Activity,
  Apple,
  Bed,
  CigaretteOff,
  Droplets,
  Dumbbell,
  HeartPulse,
  Moon,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { HEART_POINTS } from "@/lib/points";
import { getStoredNonMissionPointTotal } from "@/lib/user-activity";

export interface ChallengeMission {
  id: string;
  title: string;
  text: string;
  category: "hydration" | "movement" | "sleep" | "food" | "clinical" | "habits" | "calm" | "epic";
  points: number;
  icon: LucideIcon;
}

export interface ChallengeProgress {
  acceptedAt?: string;
  completedMissionIds: string[];
  completions: Array<{ missionId: string; points: number; completedAt: string; weekKey?: string }>;
}

const DEFAULT_PROGRESS: ChallengeProgress = {
  completedMissionIds: [],
  completions: [],
};

type MissionCategory = ChallengeMission["category"];

const missionTextByCategory: Record<MissionCategory, string> = {
  hydration: "Complete essa ação hoje e marque como feita para somar Pontos do Coração.",
  movement: "Faça no seu ritmo, com segurança, e registre quando concluir.",
  sleep: "Escolha uma noite desta semana para praticar essa meta de descanso.",
  food: "Use uma refeição ou momento do dia para fazer uma escolha melhor.",
  clinical: "Atualize essa informação para manter seu acompanhamento vivo.",
  habits: "Pratique uma troca simples que ajuda seu coração ao longo do tempo.",
  calm: "Reserve um momento curto para reduzir tensão e cuidar do corpo.",
  epic: "Conquista de consistência: desbloqueie conforme avança na jornada.",
};

function createMissions(
  prefix: string,
  titles: string[],
  category: MissionCategory,
  icon: LucideIcon,
) {
  return titles.map((title, index): ChallengeMission => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `${prefix}-${number}`,
      title,
      text: missionTextByCategory[category],
      category,
      points: HEART_POINTS.mission,
      icon,
    };
  });
}

const hydrationMissions = createMissions(
  "hydration",
  [
    "Beber 2L de água hoje",
    "Beber um copo ao acordar",
    "Trocar um refrigerante por água",
    "Levar uma garrafa para o trabalho",
    "Beber água antes das refeições",
    "Completar 8 copos no dia",
    "Ficar uma manhã inteira hidratado",
    "Não esquecer nenhuma meta de água",
    "Beber 500ml antes do almoço",
    "Beber 500ml antes do jantar",
    "Completar 2,5L de água",
    "Passar um dia sem refrigerante",
    "Tomar água durante atividade física",
    "Beber água ao invés de suco industrializado",
    "Completar 3 dias seguidos hidratado",
    "Completar 5 dias seguidos hidratado",
    "Beber água em todos os intervalos do dia",
    "Trocar bebida açucarada por água",
    "Manter a hidratação por 7 dias",
    "Desafio mestre da hidratação",
  ],
  "hydration",
  Droplets,
);

const movementMissions = createMissions(
  "movement",
  [
    "Caminhar 2.000 passos",
    "Caminhar 4.000 passos",
    "Caminhar 6.000 passos",
    "Caminhar 8.000 passos",
    "Caminhar 10.000 passos",
    "Fazer alongamento por 5 minutos",
    "Subir escadas hoje",
    "Fazer uma caminhada após o almoço",
    "Caminhar 15 minutos seguidos",
    "Caminhar 30 minutos seguidos",
    "Fazer 20 agachamentos",
    "Fazer 10 minutos de exercício",
    "Fazer 20 minutos de exercício",
    "Fazer atividade física por 3 dias seguidos",
    "Fazer atividade física por 5 dias seguidos",
    "Completar uma semana ativa",
    "Fazer exercício antes das 10h",
    "Fazer uma caminhada em família",
    "Dar uma volta no quarteirão",
    "Completar seu primeiro desafio fitness",
  ],
  "movement",
  Dumbbell,
);

const sleepMissions = createMissions(
  "sleep",
  [
    "Dormir 7 horas",
    "Dormir 8 horas",
    "Dormir antes das 23h",
    "Evitar celular 30 min antes de dormir",
    "Dormir no mesmo horário",
    "Acordar sem soneca",
    "Ter uma noite completa de sono",
    "Dormir 7h por 3 dias seguidos",
    "Dormir 8h por 3 dias seguidos",
    "Dormir 8h por 5 dias seguidos",
    "Reduzir cafeína à noite",
    "Fazer uma rotina de sono",
    "Desligar telas cedo",
    "Ler antes de dormir",
    "Evitar refeições pesadas à noite",
    "Dormir antes da meia-noite",
    "Melhorar seu horário de descanso",
    "Fazer uma semana saudável de sono",
    "Atingir meta de descanso",
    "Mestre do sono",
  ],
  "sleep",
  Moon,
);

const foodMissions = createMissions(
  "food",
  [
    "Comer uma fruta hoje",
    "Comer duas frutas hoje",
    "Comer uma salada",
    "Evitar fast food hoje",
    "Fazer uma refeição equilibrada",
    "Comer verduras no almoço",
    "Comer verduras no jantar",
    "Reduzir açúcar por um dia",
    "Reduzir frituras por um dia",
    "Fazer café da manhã saudável",
    "Comer proteína em todas as refeições",
    "Comer frutas por 3 dias seguidos",
    "Comer frutas por 5 dias seguidos",
    "Evitar refrigerante hoje",
    "Fazer um lanche saudável",
    "Comer menos ultraprocessados",
    "Não pular refeições",
    "Comer devagar",
    "Controlar porções",
    "Fazer uma semana saudável",
    "Comer legumes hoje",
    "Experimentar um alimento saudável novo",
    "Reduzir doces por um dia",
    "Comer peixe na semana",
    "Fazer um prato colorido",
    "Trocar fritura por grelhado",
    "Comer mais fibras",
    "Completar 7 dias equilibrados",
    "Manter alimentação saudável por 10 dias",
    "Mestre da alimentação",
  ],
  "food",
  Apple,
);

const clinicalMissions = createMissions(
  "clinical",
  [
    "Registrar sua pressão",
    "Registrar seu peso",
    "Atualizar altura",
    "Completar o questionário inicial",
    "Atualizar seu score",
    "Revisar seus fatores de risco",
    "Ler uma dica de saúde",
    "Registrar frequência cardíaca",
    "Registrar pressão por 3 dias",
    "Registrar pressão por 5 dias",
    "Registrar peso semanalmente",
    "Ver sua evolução",
    "Melhorar seu score",
    "Completar check-in diário",
    "Registrar sintomas",
    "Fazer avaliação mensal",
    "Consultar histórico",
    "Atualizar metas",
    "Revisar hábitos",
    "Protetor do coração",
  ],
  "clinical",
  HeartPulse,
);

const calmMissions = createMissions(
  "calm",
  [
    "Respirar profundamente por 2 min",
    "Fazer pausa de 5 min",
    "Meditar por 5 min",
    "Fazer uma caminhada relaxante",
    "Escutar música calma",
    "Escrever algo positivo",
    "Praticar gratidão",
    "Reduzir estresse hoje",
    "Fazer uma pausa das redes sociais",
    "Ler por 10 minutos",
    "Fazer algo que gosta",
    "Conversar com alguém querido",
    "Sorrir mais hoje",
    "Fazer um elogio",
    "Relaxar antes de dormir",
    "Respirar por 5 minutos",
    "Fazer uma atividade ao ar livre",
    "Registrar seu humor",
    "Completar semana positiva",
    "Mestre do equilíbrio",
  ],
  "calm",
  Sparkles,
);

const epicMissions = createMissions(
  "epic",
  [
    "Completar 3 missões",
    "Completar 5 missões",
    "Completar 10 missões",
    "Completar 20 missões",
    "Completar 50 missões",
    "Completar 100 missões",
    "Atingir 1.000 XP",
    "Atingir 2.500 XP",
    "Atingir 5.000 XP",
    "Manter sequência por 3 dias",
    "Manter sequência por 7 dias",
    "Manter sequência por 14 dias",
    "Manter sequência por 30 dias",
    "Concluir primeira jornada",
    "Concluir nível 5",
    "Concluir nível 10",
    "Concluir plano de ação",
    "Melhorar score cardiovascular",
    "Tornar-se Guardião do Coração",
    "Tornar-se Mestre HTCARE",
  ],
  "epic",
  Trophy,
);

const targetedMissions: ChallengeMission[] = [
  {
    id: "smoke-free-day",
    title: "Um dia sem cigarro",
    text: "Escolha um dia da semana para reduzir ou evitar cigarro e observe como se sente.",
    category: "habits",
    points: HEART_POINTS.mission,
    icon: CigaretteOff,
  },
  {
    id: "trigger-list",
    title: "Mapeie seus gatilhos",
    text: "Anote três momentos em que a vontade de fumar aparece com mais força.",
    category: "calm",
    points: HEART_POINTS.mission,
    icon: Sparkles,
  },
  {
    id: "delay-first-cigarette",
    title: "Adie o primeiro cigarro",
    text: "Tente atrasar o primeiro cigarro do dia em 30 minutos.",
    category: "habits",
    points: HEART_POINTS.mission,
    icon: CigaretteOff,
  },
  {
    id: "alcohol-free-day",
    title: "Um dia sem álcool",
    text: "Escolha um dia da semana para ficar sem bebida alcoólica.",
    category: "habits",
    points: HEART_POINTS.mission,
    icon: Wine,
  },
  {
    id: "pressure-rest-note",
    title: "Anote pressão em repouso",
    text: "Meça a pressão sentado, após 5 minutos de descanso, e guarde o valor.",
    category: "clinical",
    points: HEART_POINTS.mission,
    icon: ShieldCheck,
  },
  {
    id: "weigh-once",
    title: "Atualize seu peso",
    text: "Pese-se uma vez nesta semana e use apenas como dado de acompanhamento.",
    category: "clinical",
    points: HEART_POINTS.mission,
    icon: Scale,
  },
  {
    id: "sleep-routine",
    title: "Ritual de sono",
    text: "Prepare uma rotina curta de 20 minutos antes de dormir, sem telas.",
    category: "sleep",
    points: HEART_POINTS.mission,
    icon: Bed,
  },
  {
    id: "move-after-meal",
    title: "10 minutos após uma refeição",
    text: "Faça uma caminhada curta depois de uma refeição principal.",
    category: "movement",
    points: HEART_POINTS.mission,
    icon: Activity,
  },
];

const defaultMissions: ChallengeMission[] = [
  ...hydrationMissions,
  ...movementMissions,
  ...sleepMissions,
  ...foodMissions,
  ...clinicalMissions.slice(0, 14),
  ...calmMissions,
  ...targetedMissions,
];

const missionBank: Array<{ match: string[]; missions: ChallengeMission[] }> = [
  {
    match: ["tabagismo", "fumante"],
    missions: [
      ...targetedMissions.slice(0, 3),
      ...calmMissions.slice(0, 8),
      ...hydrationMissions.slice(1, 6),
    ],
  },
  {
    match: ["pressão", "hipertensão"],
    missions: [
      ...clinicalMissions,
      ...hydrationMissions.slice(0, 12),
      ...movementMissions.slice(5, 13),
      ...calmMissions.slice(0, 4),
      targetedMissions[4],
    ],
  },
  {
    match: ["imc", "obesidade", "sobrepeso"],
    missions: [
      ...movementMissions,
      ...foodMissions,
      ...hydrationMissions.slice(0, 12),
      targetedMissions[5],
      targetedMissions[7],
    ],
  },
  {
    match: ["diabetes", "glicemia"],
    missions: [
      ...foodMissions,
      ...hydrationMissions,
      ...clinicalMissions.slice(4, 16),
      ...movementMissions.slice(7, 14),
    ],
  },
  {
    match: ["sedentarismo", "atividade física", "atividade"],
    missions: [...movementMissions, targetedMissions[7]],
  },
  {
    match: ["sono", "estresse", "apneia"],
    missions: [...sleepMissions, ...calmMissions, targetedMissions[6]],
  },
  {
    match: ["álcool", "alcool", "consumo diário", "consumo frequente"],
    missions: [
      targetedMissions[3],
      ...hydrationMissions.slice(0, 14),
      ...calmMissions.slice(0, 8),
      ...foodMissions.slice(0, 10),
    ],
  },
  {
    match: ["histórico", "familiar", "diagnóstico cardíaco", "infarto", "arritmia"],
    missions: [
      ...clinicalMissions,
      ...movementMissions.slice(0, 12),
      ...hydrationMissions.slice(0, 10),
      ...calmMissions.slice(0, 6),
    ],
  },
];

export const challengeMilestones = [
  { points: HEART_POINTS.mission, title: "Primeira Semana Completa!" },
  { points: 200, title: "Ritmo ganhando força" },
  { points: 300, title: "Um Mês de Jornada" },
  { points: 500, title: "Consistência de verdade" },
];

export function getStoredChallengeProgress(): ChallengeProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem("htcare:challenge-progress");
    return raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveChallengeProgress(progress: ChallengeProgress) {
  window.localStorage.setItem("htcare:challenge-progress", JSON.stringify(progress));
}

export function acceptChallenge() {
  const current = getStoredChallengeProgress();
  const next = { ...current, acceptedAt: current.acceptedAt ?? new Date().toISOString() };
  saveChallengeProgress(next);
  return next;
}

export function getWeeklyMissions(factors: string[] = []) {
  const normalized = factors.map((factor) => factor.toLowerCase());
  const missions: ChallengeMission[] = [];

  for (const group of missionBank) {
    if (group.match.some((match) => normalized.some((factor) => factor.includes(match)))) {
      missions.push(...group.missions);
    }
  }

  const unique = [...missions, ...defaultMissions].filter(
    (mission, index, list) => list.findIndex((item) => item.id === mission.id) === index,
  );

  return deterministicShuffle(
    unique,
    `${weekKey(new Date().toISOString())}:${normalized.join("|")}`,
  ).slice(0, 3);
}

export function completeMission(mission: ChallengeMission) {
  const progress = getStoredChallengeProgress();
  const currentWeek = weekKey(new Date().toISOString());
  const missionKey = missionCompletionKey(mission.id, currentWeek);
  if (progress.completedMissionIds.includes(missionKey)) return progress;
  const next = {
    ...progress,
    completedMissionIds: [...progress.completedMissionIds, missionKey],
    completions: [
      ...progress.completions,
      {
        missionId: mission.id,
        points: mission.points,
        completedAt: new Date().toISOString(),
        weekKey: currentWeek,
      },
    ],
  };
  saveChallengeProgress(next);
  return next;
}

export function getChallengeStats(missions: ChallengeMission[] = []) {
  const progress = getStoredChallengeProgress();
  const currentWeek = weekKey(new Date().toISOString());
  const missionPoints = progress.completions.reduce((total, item) => total + item.points, 0);
  const points = missionPoints + getStoredNonMissionPointTotal();
  const completedThisWeek = missions.filter((mission) =>
    progress.completedMissionIds.includes(missionCompletionKey(mission.id, currentWeek)),
  ).length;
  const pendingThisWeek = Math.max(0, missions.length - completedThisWeek);
  const currentMilestone = Math.floor(points / 100) * 100;
  const nextMilestone = currentMilestone + 100;
  return {
    progress,
    points,
    completedThisWeek,
    pendingThisWeek,
    currentWeek,
    currentMilestone,
    nextMilestone,
    streakWeeks: calculateWeeklyStreak(progress.completions.map((item) => item.completedAt)),
  };
}

export function missionTone(category: ChallengeMission["category"]) {
  if (category === "hydration") return "from-[#dff7ff] to-[#58c7e8] text-[#073846]";
  if (category === "movement") return "from-[#fff1c7] to-[#ffb25f] text-[#4b2a00]";
  if (category === "sleep") return "from-[#dceeff] to-[#8db8ff] text-[#102446]";
  if (category === "food") return "from-[#e4ffd9] to-[#94df6d] text-[#17380d]";
  if (category === "clinical") return "from-[#dffaf4] to-[#69d8bf] text-[#103a33]";
  if (category === "habits") return "from-[#ffe3da] to-[#ff997d] text-[#4d190d]";
  if (category === "epic") return "from-[#fff0cf] to-[#ffc857] text-[#4b3200]";
  return "from-[#f0e7ff] to-[#c4a0ff] text-[#281449]";
}

function calculateWeeklyStreak(dates: string[]) {
  const weeks = new Set(dates.map(weekKey));
  if (!weeks.size) return 0;
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = weekKey(cursor.toISOString());
    if (!weeks.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export function missionCompletionKey(missionId: string, key = weekKey(new Date().toISOString())) {
  return `${key}:${missionId}`;
}

function deterministicShuffle<T>(items: T[], seed: string) {
  return [...items]
    .map((item, index) => ({ item, sort: seededValue(`${seed}:${index}`) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function seededValue(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function weekKey(value: string) {
  const date = new Date(value);
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}
