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
  Wine,
  type LucideIcon,
} from "lucide-react";
import { HEART_POINTS } from "@/lib/points";
import { getStoredNonMissionPointTotal } from "@/lib/user-activity";

export interface ChallengeMission {
  id: string;
  title: string;
  text: string;
  category: "movement" | "sleep" | "food" | "clinical" | "habits" | "calm";
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

const defaultMissions: ChallengeMission[] = [
  {
    id: "walk-20-min",
    title: "Caminhe 20 minutos",
    text: "Faça uma caminhada leve em qualquer horário do dia.",
    category: "movement",
    points: HEART_POINTS.mission,
    icon: Dumbbell,
  },
  {
    id: "measure-pressure",
    title: "Meça sua pressão",
    text: "Registre uma medida de pressão em repouso ainda esta semana.",
    category: "clinical",
    points: HEART_POINTS.mission,
    icon: HeartPulse,
  },
  {
    id: "sleep-window",
    title: "Proteja seu sono",
    text: "Escolha uma noite para dormir 7 a 8 horas sem telas nos últimos 30 minutos.",
    category: "sleep",
    points: HEART_POINTS.mission,
    icon: Moon,
  },
  {
    id: "water-two-glasses",
    title: "2 copos de água a mais",
    text: "Inclua dois copos de água extras ao longo do dia.",
    category: "food",
    points: HEART_POINTS.mission,
    icon: Droplets,
  },
  {
    id: "calm-checkpoint",
    title: "Pausa de calma",
    text: "Reserve 3 minutos para respirar devagar e perceber seu corpo.",
    category: "calm",
    points: HEART_POINTS.mission,
    icon: Sparkles,
  },
];

const missionBank: Array<{ match: string[]; missions: ChallengeMission[] }> = [
  {
    match: ["tabagismo", "fumante"],
    missions: [
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
    ],
  },
  {
    match: ["pressão", "hipertensão"],
    missions: [
      {
        id: "pressure-two-measures",
        title: "Meça a pressão 2 vezes",
        text: "Faça duas medidas em dias diferentes e guarde os números para acompanhar.",
        category: "clinical",
        points: HEART_POINTS.mission,
        icon: HeartPulse,
      },
      {
        id: "salt-swap",
        title: "Troque um alimento salgado",
        text: "Substitua um ultraprocessado por uma opção mais simples em uma refeição.",
        category: "food",
        points: HEART_POINTS.mission,
        icon: Apple,
      },
      {
        id: "pressure-rest-note",
        title: "Anote pressão em repouso",
        text: "Meça a pressão sentado, após 5 minutos de descanso, e guarde o valor.",
        category: "clinical",
        points: HEART_POINTS.mission,
        icon: ShieldCheck,
      },
    ],
  },
  {
    match: ["imc", "obesidade", "sobrepeso"],
    missions: [
      {
        id: "move-after-meal",
        title: "10 minutos após uma refeição",
        text: "Faça uma caminhada curta depois de uma refeição principal.",
        category: "movement",
        points: HEART_POINTS.mission,
        icon: Activity,
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
        id: "plate-half-plants",
        title: "Metade do prato colorido",
        text: "Em uma refeição, monte metade do prato com verduras, legumes ou salada.",
        category: "food",
        points: HEART_POINTS.mission,
        icon: Apple,
      },
    ],
  },
  {
    match: ["diabetes", "glicemia"],
    missions: [
      {
        id: "water-before-sweet",
        title: "Água antes do doce",
        text: "Beba água e espere 10 minutos antes de consumir algo muito doce.",
        category: "food",
        points: HEART_POINTS.mission,
        icon: Droplets,
      },
      {
        id: "glucose-check",
        title: "Registre sua glicemia",
        text: "Se você mede glicemia, registre uma medida no próximo check-in.",
        category: "clinical",
        points: HEART_POINTS.mission,
        icon: ShieldCheck,
      },
      {
        id: "protein-breakfast",
        title: "Café da manhã com proteína",
        text: "Inclua uma fonte de proteína no café da manhã em pelo menos um dia.",
        category: "food",
        points: HEART_POINTS.mission,
        icon: Apple,
      },
    ],
  },
  {
    match: ["sedentarismo", "atividade física", "atividade"],
    missions: [
      {
        id: "three-move-breaks",
        title: "3 pausas de movimento",
        text: "Faça três pausas de 5 minutos para se movimentar durante o dia.",
        category: "movement",
        points: HEART_POINTS.mission,
        icon: Dumbbell,
      },
      {
        id: "stairs-or-walk",
        title: "Escolha o caminho ativo",
        text: "Use escada ou caminhe um pouco mais em um deslocamento simples.",
        category: "movement",
        points: HEART_POINTS.mission,
        icon: Activity,
      },
      {
        id: "schedule-movement",
        title: "Agende movimento",
        text: "Bloqueie 20 minutos na agenda para caminhar ou se movimentar.",
        category: "movement",
        points: HEART_POINTS.mission,
        icon: Dumbbell,
      },
    ],
  },
  {
    match: ["sono", "estresse", "apneia"],
    missions: [
      {
        id: "sleep-routine",
        title: "Ritual de sono",
        text: "Prepare uma rotina curta de 20 minutos antes de dormir, sem telas.",
        category: "sleep",
        points: HEART_POINTS.mission,
        icon: Bed,
      },
      {
        id: "breathing-two-min",
        title: "Respire por 2 minutos",
        text: "Faça uma pausa de respiração lenta em um momento de estresse.",
        category: "calm",
        points: HEART_POINTS.mission,
        icon: Sparkles,
      },
      {
        id: "caffeine-cutoff",
        title: "Corte cafeína mais cedo",
        text: "Evite cafeína depois das 16h em um dia desta semana.",
        category: "sleep",
        points: HEART_POINTS.mission,
        icon: Moon,
      },
      {
        id: "worry-list",
        title: "Lista de preocupações",
        text: "Antes de dormir, escreva três pendências para tirar da cabeça.",
        category: "calm",
        points: HEART_POINTS.mission,
        icon: Sparkles,
      },
    ],
  },
  {
    match: ["álcool", "alcool", "consumo diário", "consumo frequente"],
    missions: [
      {
        id: "alcohol-free-day",
        title: "Um dia sem álcool",
        text: "Escolha um dia da semana para ficar sem bebida alcoólica.",
        category: "habits",
        points: HEART_POINTS.mission,
        icon: Wine,
      },
      {
        id: "water-between-drinks",
        title: "Água entre bebidas",
        text: "Se beber socialmente, alterne uma bebida com um copo de água.",
        category: "food",
        points: HEART_POINTS.mission,
        icon: Droplets,
      },
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
  if (category === "movement") return "from-[#fff1c7] to-[#ffb25f] text-[#4b2a00]";
  if (category === "sleep") return "from-[#dceeff] to-[#8db8ff] text-[#102446]";
  if (category === "food") return "from-[#e4ffd9] to-[#94df6d] text-[#17380d]";
  if (category === "clinical") return "from-[#dffaf4] to-[#69d8bf] text-[#103a33]";
  if (category === "habits") return "from-[#ffe3da] to-[#ff997d] text-[#4d190d]";
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
