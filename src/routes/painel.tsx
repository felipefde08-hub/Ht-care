import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  HeartPulse,
  Lock,
  Minus,
  Moon,
  Scale,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CarelitoChat } from "@/components/CarelitoChat";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import {
  challengeMilestones,
  getChallengeStats,
  getWeeklyMissions,
  missionCompletionKey,
} from "@/lib/challenge";
import { recordUserActivity } from "@/lib/user-activity";

export const Route = createFileRoute("/painel")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Meu painel — HTCare" }] }),
  component: PanelPage,
});

interface ScorePoint {
  score: number;
  createdAt: string;
  source: string;
  category?: "baixo" | "moderado" | "alto";
  factors?: string[];
}

interface StoredResult {
  result?: {
    score: number;
    label: string;
    factors: string[];
  };
  knowsBloodPressure?: "sim" | "nao" | "";
  systolic?: string;
  diastolic?: string;
  weight?: string;
  height?: string;
  activityLevel?: "sedentario" | "leve" | "moderado" | "intenso" | "";
  sleepHours?: "menos_5" | "5_6" | "7_8" | "mais_8" | "";
}

interface LastCheckIn {
  checkIn?: {
    measuredBloodPressure?: "sim" | "nao" | "";
    systolic?: string;
    diastolic?: string;
    weight?: string;
  };
}

function PanelPage() {
  const { user } = Route.useRouteContext();
  const [stored, setStored] = useState<StoredResult | null>(null);
  const [history, setHistory] = useState<ScorePoint[]>([]);
  const [displayPoints, setDisplayPoints] = useState(0);

  useEffect(() => {
    async function loadData() {
      const raw = window.localStorage.getItem("htcare:onboarding");
      const rawHistory = window.localStorage.getItem("htcare:score-history");
      const parsed = raw ? (JSON.parse(raw) as StoredResult) : null;
      const parsedHistory = rawHistory ? (JSON.parse(rawHistory) as ScorePoint[]) : [];
      setStored(parsed);
      setHistory(parsedHistory);

      const { data, error } = await supabase
        .from("assessments")
        .select("score,categoria_risco,fatores_que_pesaram,origem,created_at")
        .order("created_at", { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      if (!data?.length) return;

      const remoteHistory = data.map((item) => ({
        score: Number(item.score),
        createdAt: item.created_at,
        source: item.origem,
        category: item.categoria_risco,
        factors: item.fatores_que_pesaram,
      }));
      const latestRemote = remoteHistory.at(-1);
      setHistory(remoteHistory);
      setStored({
        result: latestRemote
          ? {
              score: latestRemote.score,
              label: riskLabel(latestRemote.category),
              factors: latestRemote.factors ?? [],
            }
          : parsed?.result,
      });
    }

    void loadData();
  }, []);

  useEffect(() => {
    void recordUserActivity(user.id, "app_open");
  }, [user.id]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [history],
  );
  const latest = sortedHistory.at(-1);
  const previous = sortedHistory.length >= 2 ? sortedHistory.at(-2) : null;
  const currentScore = latest?.score ?? stored?.result?.score ?? null;
  const trend = getTrend(currentScore, previous?.score ?? null);
  const nextStep = getNextStep(latest?.createdAt ?? null);
  const weeklyMissions = useMemo(
    () => getWeeklyMissions(stored?.result?.factors ?? latest?.factors ?? []),
    [latest?.factors, stored?.result?.factors],
  );
  const challengeStats = getChallengeStats(weeklyMissions);
  const weeklyProgressPercent = weeklyMissions.length
    ? (challengeStats.completedThisWeek / weeklyMissions.length) * 100
    : 0;
  const journeyProgressPercent = challengeStats.points
    ? ((challengeStats.points % 100) / 100) * 100
    : 0;
  const visibleMilestones = buildVisibleMilestones(challengeStats.points);
  const firstName = getFirstName(
    (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email,
  );
  const lastCheckIn = readLastCheckIn();
  const mobileHealthData = buildMobileHealthData(stored, lastCheckIn);
  const journeySteps = buildJourneySteps(
    Boolean(stored?.result),
    Boolean(currentScore),
    challengeStats.points,
  );
  const nextJourneyText =
    challengeStats.pendingThisWeek > 0
      ? `Complete ${challengeStats.pendingThisWeek} missão${challengeStats.pendingThisWeek > 1 ? "ões" : ""} desta semana.`
      : "Faça um check-in rápido para manter seu acompanhamento vivo.";

  useEffect(() => {
    let frame = 0;
    const totalFrames = 42;
    const diff = challengeStats.points;
    if (!diff) {
      setDisplayPoints(0);
      return;
    }
    const tick = () => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setDisplayPoints(Math.round(diff * progress));
      if (frame < totalFrames) window.requestAnimationFrame(tick);
    };
    const id = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(id);
  }, [challengeStats.points]);

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <button
          type="button"
          className="relative grid h-11 w-11 place-items-center rounded-full border border-[#10201f]/8 bg-white text-[#10201f] shadow-soft sm:hidden"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {challengeStats.pendingThisWeek > 0 && (
            <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff9f43] px-1 text-[0.62rem] font-bold leading-none text-white">
              {challengeStats.pendingThisWeek}
            </span>
          )}
        </button>
        <nav className="hidden items-center gap-1 sm:flex sm:gap-2">
          <Button variant="ghost" asChild>
            <Link to="/historico">Histórico</Link>
          </Button>
          <Button variant="ghost" className="hidden sm:inline-flex" asChild>
            <Link to="/perfil">Perfil</Link>
          </Button>
          <Button variant="outline" className="hidden sm:inline-flex" asChild>
            <Link to="/onboarding">Refazer avaliação</Link>
          </Button>
        </nav>
      </div>

      <section className="mx-auto mt-6 max-w-6xl sm:mt-14">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="hidden text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d] sm:block"
        >
          Meu painel
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="hidden mt-4 max-w-4xl font-sans text-5xl font-semibold leading-tight tracking-normal sm:block sm:text-7xl"
        >
          Sua saúde em acompanhamento.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="sm:hidden"
        >
          <div className="rounded-[1.8rem] border border-[#10201f]/8 bg-white p-4 shadow-[0_22px_80px_-60px_rgba(16,32,31,0.55)]">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#10201f]">Olá, {firstName}!</p>
                <h1 className="mt-1 font-sans text-[1.35rem] font-semibold leading-tight">
                  Que bom te ver por aqui.
                </h1>
                <p className="mt-1 text-sm leading-5 text-[#536b68]">
                  Vamos cuidar do seu coração hoje?
                </p>
              </div>
              <Carelito className="h-24 w-24 shrink-0" expression="happy" />
            </div>

            <div className="mt-3 grid grid-cols-[auto_1fr] gap-3 rounded-[1.3rem] bg-[#f7faf9] p-3">
              <CompactScoreRing value={currentScore} />
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#78908d]">
                      Score atual
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#536b68]">
                      {stored?.result?.label ?? "Sem score salvo"}
                    </p>
                  </div>
                  <TrendBadge trend={trend} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MiniMetric
                    icon={<Flame className="h-4 w-4" />}
                    label="Streak"
                    value={
                      challengeStats.streakWeeks ? `${challengeStats.streakWeeks} sem.` : "Começar"
                    }
                  />
                  <MiniMetric
                    icon={<Trophy className="h-4 w-4" />}
                    label="Pontos"
                    value={`${displayPoints}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[1.8rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-lg font-semibold">Sua jornada</h2>
              <span className="rounded-full bg-[#eef6f3] px-2.5 py-1 text-[0.68rem] font-bold text-[#2f6760]">
                {challengeStats.points} pts
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {journeySteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="relative text-center">
                    {index < journeySteps.length - 1 && (
                      <span className="absolute left-1/2 top-5 h-0.5 w-full bg-[#e6eeeb]" />
                    )}
                    <span
                      className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-bold ${
                        step.status === "complete"
                          ? "border-[#7fd7c0] bg-[#e8f5ef] text-[#2f6760]"
                          : step.status === "current"
                            ? "border-[#2f8fc8] bg-[#e9f4fb] text-[#2f8fc8]"
                            : "border-[#e6eeeb] bg-[#f7faf9] text-[#9aa8a5]"
                      }`}
                    >
                      {step.status === "complete" ? (
                        <CheckCircle2 className="h-5 w-5" fill="currentColor" />
                      ) : step.status === "locked" ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <p className="mt-2 text-[0.66rem] font-semibold leading-tight text-[#536b68]">
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
            <Link
              to={challengeStats.pendingThisWeek > 0 ? "/missoes" : "/check-in"}
              className="mt-4 flex min-h-14 items-center justify-between rounded-[1.25rem] bg-[linear-gradient(135deg,#2f8fc8,#49c7ae)] px-4 py-3 text-white shadow-[0_20px_70px_-44px_rgba(47,143,200,0.9)]"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/18">
                  <Trophy className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Continue sua jornada!</span>
                  <span className="block text-xs text-white/78">{nextJourneyText}</span>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>
          </div>

          <div className="mt-4 rounded-[1.8rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-sans text-lg font-semibold">Seus dados</h2>
              <span className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[#78908d]">
                informado por você
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {mobileHealthData.map((item) => (
                <MobileDataCard key={item.label} {...item} />
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[1.8rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-sans text-lg font-semibold">Desafios</h2>
                <p className="mt-0.5 text-xs text-[#78908d]">
                  {challengeStats.completedThisWeek} de {weeklyMissions.length} feitos esta semana
                </p>
              </div>
              <Link to="/missoes" className="text-xs font-bold text-[#2f6760]">
                Ver todos
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {weeklyMissions.slice(0, 3).map((mission) => {
                const done = challengeStats.progress.completedMissionIds.includes(
                  missionCompletionKey(mission.id, challengeStats.currentWeek),
                );
                return (
                  <div
                    key={mission.id}
                    className="flex items-center gap-3 rounded-[1.15rem] bg-[#f7faf9] p-3"
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                        done ? "bg-[#e8f5ef] text-[#2f6760]" : "bg-white text-[#9a5b12]"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{mission.title}</p>
                      <p className="text-xs text-[#78908d]">
                        {done ? "feito" : "pendente"} · +{mission.points} pontos
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <div className="hidden sm:block">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            className="mt-10 hidden gap-4 sm:grid lg:grid-cols-[1fr_0.8fr]"
          >
            <div className="overflow-hidden rounded-[2rem] border border-[#10201f]/8 bg-[linear-gradient(135deg,#fff7dc,#ffe0a3_42%,#ffb86b)] p-6 shadow-[0_28px_100px_-76px_rgba(154,91,18,0.7)]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/75 shadow-soft">
                    <Flame className="h-7 w-7 text-[#d85b1f]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#704312]">
                      {streakCopy(challengeStats.streakWeeks)}
                    </p>
                    <p className="mt-1 text-sm text-[#704312]/72">
                      Complete pelo menos uma missão por semana para manter sua sequência.
                    </p>
                  </div>
                </div>
                <Button className="rounded-full bg-[#10201f] font-semibold text-white" asChild>
                  <Link to="/missoes">
                    Minhas Missões
                    <span className="ml-1 rounded-full bg-white/18 px-2 py-0.5 text-xs">
                      {challengeStats.pendingThisWeek} pendentes
                    </span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#536b68]">Pontos do Coração</p>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.18 }}
                    className="mt-1 font-sans text-5xl font-semibold"
                  >
                    {displayPoints}
                  </motion.p>
                </div>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff3d1] text-[#9a5b12]">
                  <Trophy className="h-7 w-7" />
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-5 rounded-[1.5rem] border border-[#10201f]/8 bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#536b68]">Resumo semanal</p>
                <h2 className="mt-1 font-sans text-xl font-semibold sm:text-3xl">
                  Essa semana: {challengeStats.completedThisWeek} de {weeklyMissions.length} missões
                  completas
                </h2>
              </div>
              <Button variant="outline" className="rounded-full" asChild>
                <Link to="/missoes">Ver missões da semana</Link>
              </Button>
            </div>
            <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#eef3f1]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weeklyProgressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[#7fd7c0] via-[#ffd36a] to-[#ff9f43]"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.12 }}
            className="mt-5 rounded-[1.5rem] border border-[#10201f]/8 bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-7"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#536b68]">Jornada visual</p>
                <h2 className="mt-1 font-sans text-xl font-semibold sm:text-3xl">
                  Trilha do coração
                </h2>
              </div>
              <p className="text-sm font-semibold text-[#9a5b12]">
                {challengeStats.points} / {challengeStats.nextMilestone} pontos
              </p>
            </div>
            <div className="mt-7">
              <div className="relative h-5 rounded-full bg-[#eef3f1]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${journeyProgressPercent}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[#7fd7c0] via-[#ffd36a] to-[#ff9f43]"
                />
                {[0, 25, 50, 75, 100].map((mark) => (
                  <span
                    key={mark}
                    className="absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-4 border-white bg-[#10201f] shadow-soft"
                    style={{ left: `calc(${mark}% - 16px)` }}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {visibleMilestones.map((milestone) => (
                  <div
                    key={milestone.points}
                    className={`rounded-2xl p-3 text-xs leading-5 ${
                      challengeStats.points >= milestone.points
                        ? "bg-[#fff3d1] font-semibold text-[#9a5b12]"
                        : "bg-[#f7faf9] text-[#78908d]"
                    }`}
                  >
                    <p>{milestone.points} pontos</p>
                    <p className="mt-1">{milestone.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="mt-5 grid gap-5 sm:mt-10 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-white p-7 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <HeartPulse className="h-6 w-6 text-[#2f6760]" />
                  <p className="mt-6 text-sm font-medium text-[#536b68]">Score atual</p>
                </div>
                <TrendBadge trend={trend} />
              </div>
              <p className="mt-3 font-sans text-8xl font-semibold text-[#10201f]">
                {currentScore ?? "—"}
              </p>
              <p className="mt-3 font-semibold text-[#536b68]">
                {stored?.result?.label ?? "Sem score salvo"}
              </p>
              <Button className="mt-8 rounded-full bg-[#10201f] font-semibold" asChild>
                <Link to="/relatorio">
                  Ver meu score <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.16 }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-white p-7 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef6f3] text-[#2f6760]">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#536b68]">Próximo passo</p>
                  <h2 className="mt-2 font-sans text-3xl font-semibold">{nextStep.title}</h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-[#536b68]">
                    {nextStep.text}
                  </p>
                </div>
              </div>

              <Button
                size="xl"
                className="mt-8 w-full rounded-full bg-[#10201f] font-semibold"
                asChild
              >
                <Link to="/check-in">
                  Fazer check-in agora <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-white p-7 shadow-soft"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-sans text-2xl font-semibold">Principais fatores</h2>
                <Button variant="ghost" asChild>
                  <Link to="/historico">Ver histórico</Link>
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {(stored?.result?.factors ?? ["Finalize o onboarding para ver seus fatores."]).map(
                  (factor) => (
                    <div key={factor} className="rounded-2xl bg-[#f7faf9] p-4 text-[#536b68]">
                      {factor}
                    </div>
                  ),
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.06 }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-[#10201f] p-7 text-white shadow-soft"
            >
              <p className="text-sm font-medium text-white/58">Tendência</p>
              <p className="mt-4 font-sans text-3xl font-semibold">{trend.label}</p>
              <p className="mt-4 text-base leading-7 text-white/68">
                A tendência compara seu score atual com o último check-in registrado.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      <CarelitoChat
        userId={user.id}
        score={currentScore}
        factors={stored?.result?.factors ?? latest?.factors ?? []}
      />
      <MobileAppNav />
    </main>
  );
}

interface MobileDataCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "attention" | "risk" | "neutral";
  action?: string;
}

function MobileDataCard({ icon, label, value, detail, tone, action }: MobileDataCardProps) {
  const toneClasses = {
    good: "bg-[#e8f5ef] text-[#2f6760]",
    attention: "bg-[#fff7dc] text-[#9a5b12]",
    risk: "bg-[#ffece7] text-[#c14525]",
    neutral: "bg-[#eef3f1] text-[#536b68]",
  };
  return (
    <div className="min-h-[8rem] rounded-[1.25rem] border border-[#10201f]/6 bg-[#fbfcfc] p-3">
      <div className={`grid h-9 w-9 place-items-center rounded-full ${toneClasses[tone]}`}>
        {icon}
      </div>
      <p className="mt-3 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[#78908d]">
        {label}
      </p>
      <p className="mt-1 font-sans text-base font-semibold leading-tight">{value}</p>
      <p className="mt-1 text-xs leading-4 text-[#78908d]">{detail}</p>
      {action && (
        <Link to="/check-in" className="mt-2 inline-flex text-xs font-bold text-[#2f6760]">
          {action}
        </Link>
      )}
    </div>
  );
}

function readLastCheckIn(): LastCheckIn | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("htcare:last-check-in");
    return raw ? (JSON.parse(raw) as LastCheckIn) : null;
  } catch {
    return null;
  }
}

function buildMobileHealthData(stored: StoredResult | null, lastCheckIn: LastCheckIn | null) {
  const pressure = getLatestPressure(stored, lastCheckIn);
  const bmi = getBmiSummary(stored, lastCheckIn);
  return [
    {
      icon: <HeartPulse className="h-4 w-4" />,
      label: "Pressão",
      value: pressure.value,
      detail: pressure.detail,
      tone: pressure.tone,
      action: pressure.action,
    },
    {
      icon: <Scale className="h-4 w-4" />,
      label: "IMC",
      value: bmi.value,
      detail: bmi.detail,
      tone: bmi.tone,
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: "Atividade",
      value: formatActivity(stored?.activityLevel),
      detail: stored?.activityLevel ? "informado no questionário" : "adicione no perfil",
      tone: activityTone(stored?.activityLevel),
    },
    {
      icon: <Moon className="h-4 w-4" />,
      label: "Sono",
      value: formatSleep(stored?.sleepHours),
      detail: stored?.sleepHours ? sleepDetail(stored.sleepHours) : "adicione no perfil",
      tone: sleepTone(stored?.sleepHours),
    },
  ] satisfies MobileDataCardProps[];
}

function getLatestPressure(stored: StoredResult | null, lastCheckIn: LastCheckIn | null) {
  const checkIn = lastCheckIn?.checkIn;
  const hasCheckInPressure =
    checkIn?.measuredBloodPressure === "sim" &&
    Number(checkIn.systolic) > 0 &&
    Number(checkIn.diastolic) > 0;
  const hasOnboardingPressure =
    stored?.knowsBloodPressure === "sim" &&
    Number(stored.systolic) > 0 &&
    Number(stored.diastolic) > 0;

  if (!hasCheckInPressure && !hasOnboardingPressure) {
    return {
      value: "Não informado",
      detail: "atualize no check-in",
      tone: "neutral" as const,
      action: "Atualizar",
    };
  }

  const systolic = Number(hasCheckInPressure ? checkIn?.systolic : stored?.systolic);
  const diastolic = Number(hasCheckInPressure ? checkIn?.diastolic : stored?.diastolic);
  const classification = classifyPressure(systolic, diastolic);
  return {
    value: `${systolic}/${diastolic}`,
    detail: `${classification.label} · informado por você`,
    tone: classification.tone,
  };
}

function classifyPressure(systolic: number, diastolic: number) {
  if (systolic >= 140 || diastolic >= 90) return { label: "Alta", tone: "risk" as const };
  if (systolic >= 120 || diastolic >= 80) return { label: "Elevada", tone: "attention" as const };
  return { label: "Normal", tone: "good" as const };
}

function getBmiSummary(stored: StoredResult | null, lastCheckIn: LastCheckIn | null) {
  const weight = Number(lastCheckIn?.checkIn?.weight || stored?.weight);
  const height = Number(stored?.height) / 100;
  if (!weight || !height) {
    return { value: "Não informado", detail: "peso e altura pendentes", tone: "neutral" as const };
  }
  const bmi = weight / (height * height);
  const rounded = bmi.toFixed(1).replace(".", ",");
  if (bmi >= 30) return { value: `IMC ${rounded}`, detail: "Obesidade", tone: "risk" as const };
  if (bmi >= 25)
    return { value: `IMC ${rounded}`, detail: "Sobrepeso", tone: "attention" as const };
  if (bmi < 18.5)
    return { value: `IMC ${rounded}`, detail: "Abaixo do peso", tone: "attention" as const };
  return { value: `IMC ${rounded}`, detail: "Normal", tone: "good" as const };
}

function formatActivity(value?: StoredResult["activityLevel"]) {
  if (value === "sedentario") return "Sedentário";
  if (value === "leve") return "Leve 1-2x/sem.";
  if (value === "moderado") return "Ativo 3-4x/sem.";
  if (value === "intenso") return "Intenso";
  return "Não informado";
}

function activityTone(value?: StoredResult["activityLevel"]): MobileDataCardProps["tone"] {
  if (value === "intenso" || value === "moderado") return "good";
  if (value === "leve") return "attention";
  if (value === "sedentario") return "risk";
  return "neutral";
}

function formatSleep(value?: StoredResult["sleepHours"]) {
  if (value === "menos_5") return "Menos de 5h";
  if (value === "5_6") return "5-6h";
  if (value === "7_8") return "7-8h";
  if (value === "mais_8") return "Mais de 8h";
  return "Não informado";
}

function sleepDetail(value?: StoredResult["sleepHours"]) {
  if (value === "7_8") return "dentro do ideal";
  if (value === "menos_5" || value === "5_6") return "atenção ao descanso";
  if (value === "mais_8") return "acompanhar padrão";
  return "adicione no perfil";
}

function sleepTone(value?: StoredResult["sleepHours"]): MobileDataCardProps["tone"] {
  if (value === "7_8") return "good";
  if (value === "menos_5") return "risk";
  if (value === "5_6" || value === "mais_8") return "attention";
  return "neutral";
}

function buildJourneySteps(hasQuestionnaire: boolean, hasScore: boolean, points: number) {
  const hasPlan = points > 0;
  return [
    {
      label: "Questionário",
      status: hasQuestionnaire ? "complete" : "current",
      icon: ShieldCheck,
    },
    {
      label: "Seu Risco",
      status: hasScore ? "complete" : hasQuestionnaire ? "current" : "locked",
      icon: Gauge,
    },
    {
      label: "Plano",
      status: hasPlan ? "complete" : hasScore ? "current" : "locked",
      icon: Trophy,
    },
    {
      label: "Acompanhar",
      status: hasPlan ? "current" : "locked",
      icon: Activity,
    },
  ] as Array<{
    label: string;
    status: "complete" | "current" | "locked";
    icon: LucideIcon;
  }>;
}

function riskLabel(category?: "baixo" | "moderado" | "alto") {
  if (category === "baixo") return "Risco baixo";
  if (category === "moderado") return "Risco moderado";
  if (category === "alto") return "Risco alto";
  return "Sem score salvo";
}

function getFirstName(name?: string | null) {
  if (!name) return "vamos lá";
  return name.split("@")[0]?.split(" ")[0] || "vamos lá";
}

function CompactScoreRing({ value }: { value: number | null }) {
  const score = value ?? 0;
  return (
    <div
      className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[conic-gradient(#2f6760_var(--score),#e5ecea_var(--score)_100%)] p-2 [--score:0%]"
      style={{ "--score": `${score}%` } as CSSProperties}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white text-center shadow-inner">
        <div>
          <p className="font-sans text-3xl font-semibold leading-none">{value ?? "—"}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78908d]">
            score
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7faf9] p-2">
      <div className="flex items-center gap-1.5 text-[#9a5b12]">{icon}</div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78908d]">
        {label}
      </p>
      <p className="font-sans text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function streakCopy(weeks: number) {
  if (weeks <= 0) return "Comece sua primeira semana cuidando do seu coração";
  if (weeks === 1) return "1 semana seguida cuidando do seu coração";
  return `${weeks} semanas seguidas cuidando do seu coração`;
}

function buildVisibleMilestones(points: number) {
  const currentBase = Math.floor(points / 100) * 100;
  const start = points < 100 ? 0 : currentBase;
  return [0, 100, 200, 300].map((mark) => {
    const absolute = start + mark;
    const known = challengeMilestones.find((milestone) => milestone.points === absolute);
    return {
      points: absolute,
      title: known?.title ?? (absolute === 0 ? "Começo da jornada" : "Novo marco da trilha"),
    };
  });
}

function getTrend(current: number | null, previous: number | null) {
  if (current == null || previous == null) {
    return { label: "Estável", icon: Minus, tone: "bg-[#eef3f1] text-[#536b68]" };
  }
  const delta = current - previous;
  if (delta >= 3)
    return { label: `Subiu ${delta} pts`, icon: ArrowUp, tone: "bg-[#e8f5ef] text-[#2f6760]" };
  if (delta <= -3)
    return {
      label: `Desceu ${Math.abs(delta)} pts`,
      icon: ArrowDown,
      tone: "bg-[#fff3e8] text-[#9a5b12]",
    };
  return { label: "Estável", icon: Minus, tone: "bg-[#eef3f1] text-[#536b68]" };
}

function TrendBadge({ trend }: { trend: ReturnType<typeof getTrend> }) {
  const Icon = trend.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${trend.tone}`}
    >
      <Icon className="h-4 w-4" />
      {trend.label}
    </span>
  );
}

function getNextStep(lastCheckIn: string | null) {
  if (!lastCheckIn) {
    return {
      title: "Faça seu check-in semanal",
      text: "Atualize alguns dados rápidos para começar a acompanhar sua evolução ao longo do tempo.",
    };
  }
  const days = Math.floor((Date.now() - new Date(lastCheckIn).getTime()) / 86_400_000);
  if (days >= 30) {
    return {
      title: "Há 30 dias sem check-in",
      text: "Atualize seus dados para manter seu score mais próximo da sua realidade atual.",
    };
  }
  if (days >= 7) {
    return {
      title: "Faça seu check-in semanal",
      text: "Já passou uma semana desde sua última atualização. Leva menos de um minuto.",
    };
  }
  return {
    title: "Seu acompanhamento está em dia",
    text: "Volte quando houver mudanças relevantes ou faça um novo check-in na próxima semana.",
  };
}
