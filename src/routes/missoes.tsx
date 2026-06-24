import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bell, CheckCircle2, Flame, HeartPulse, Sparkles } from "lucide-react";
import { useMemo, useState, type PointerEvent } from "react";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  completeMission,
  getChallengeStats,
  getWeeklyMissions,
  missionCompletionKey,
  missionTone,
  type ChallengeMission,
} from "@/lib/challenge";
import { recordUserActivity } from "@/lib/user-activity";

export const Route = createFileRoute("/missoes")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Missões da semana — HTCare" }] }),
  component: MissionsPage,
});

function MissionsPage() {
  const { user } = Route.useRouteContext();
  const onboarding = useMemo(() => readOnboardingState(), []);
  const factors = onboarding.factors;
  const missions = useMemo(() => getWeeklyMissions(factors), [factors]);
  const [stats, setStats] = useState(() => getChallengeStats(missions));
  const [celebrating, setCelebrating] = useState<string | null>(null);

  function markDone(mission: ChallengeMission) {
    if (stats.progress.completedMissionIds.includes(missionCompletionKey(mission.id))) return;
    completeMission(mission);
    void recordUserActivity(user.id, "mission", {
      missionId: mission.id,
      title: mission.title,
      category: mission.category,
      weekKey: stats.currentWeek,
    });
    setStats(getChallengeStats(missions));
    setCelebrating(null);
  }

  return (
    <main className="min-h-screen bg-[#f5fbff] px-4 pb-28 pt-4 text-[#10201f] sm:bg-[#fffaf2] sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:hidden">
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-[#d85b1f] shadow-soft">
            <Flame className="h-4 w-4" fill="currentColor" />
            {stats.streakWeeks}
          </span>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-[#2f6760] shadow-soft">
            <HeartPulse className="h-4 w-4" fill="currentColor" />
            {stats.points}
          </span>
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-[#10201f] shadow-soft"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {stats.pendingThisWeek > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff9f43] px-1 text-[0.62rem] font-bold leading-none text-white">
                {stats.pendingThisWeek}
              </span>
            )}
          </button>
        </div>
        <nav className="hidden items-center gap-2 sm:flex">
          <Button variant="ghost" asChild>
            <Link to="/painel">Painel</Link>
          </Button>
        </nav>
      </div>

      <section className="mx-auto mt-6 max-w-md sm:hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f8fc8]">Missões</p>
          <h1 className="mt-2 font-sans text-3xl font-semibold leading-tight">
            Pequenas ações para esta semana.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#536b68]">
            Escolha uma ação simples por vez. Sem pressa, sem jogo exagerado.
          </p>
        </motion.div>

        <div className="mt-5 rounded-[1.7rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#536b68]">Progresso semanal</p>
            <p className="text-sm font-bold text-[#10201f]">
              {stats.completedThisWeek} de {missions.length} completas
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#eef3f1]">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${missions.length ? (stats.completedThisWeek / missions.length) * 100 : 0}%`,
              }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="h-full rounded-full bg-[#2f8fc8]"
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-[#78908d]">
            Sequência {stats.streakWeeks} · {stats.points} pontos
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {missions.map((mission, index) => {
            const done = stats.progress.completedMissionIds.includes(
              missionCompletionKey(mission.id),
            );
            return (
              <MissionCard
                key={mission.id}
                mission={mission}
                index={index}
                done={done}
                celebrating={celebrating === mission.id}
                onDone={() => markDone(mission)}
              />
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[1.7rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
          <Carelito className="h-14 w-14 shrink-0" expression="confident" />
          <p className="text-sm leading-5 text-[#536b68]">
            {stats.pendingThisWeek > 0
              ? "Uma ação pequena hoje já ajuda seu histórico."
              : "Registrado. Seu plano da semana está em dia."}
          </p>
        </div>
      </section>

      <section className="mx-auto mt-6 hidden max-w-6xl sm:mt-14 sm:block">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#9a5b12] sm:text-xs sm:tracking-[0.22em]"
        >
          Desafio HTCare
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
          className="mt-3 flex flex-col gap-4 sm:mt-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <h1 className="max-w-3xl font-sans text-3xl font-semibold leading-tight sm:text-5xl lg:text-7xl">
              Suas missões dessa semana
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b5840] sm:mt-5 sm:text-lg sm:leading-8">
              Pequenas ações baseadas nos fatores que mais pesaram no seu score.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-[#10201f]/8 bg-white p-4 shadow-[0_24px_90px_-72px_rgba(16,32,31,0.55)] sm:rounded-[1.5rem] sm:p-5">
            <p className="text-sm font-medium text-[#6b5840]">Pontos do coração</p>
            <p className="mt-1 font-sans text-3xl font-semibold text-[#10201f] sm:text-4xl">
              {stats.points}
            </p>
          </div>
        </motion.div>

        <div className="-mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {missions.map((mission, index) => {
            const done = stats.progress.completedMissionIds.includes(
              missionCompletionKey(mission.id),
            );
            return (
              <MissionCard
                key={mission.id}
                mission={mission}
                index={index}
                done={done}
                celebrating={celebrating === mission.id}
                onDone={() => markDone(mission)}
              />
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button size="xl" className="rounded-full bg-[#10201f] px-8 font-semibold" asChild>
            <Link to="/painel">
              Ir para meu painel <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
      <MobileAppNav />
    </main>
  );
}

function MissionCard({
  mission,
  index,
  done,
  celebrating,
  onDone,
}: {
  mission: ChallengeMission;
  index: number;
  done: boolean;
  celebrating: boolean;
  onDone: () => void;
}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const Icon = mission.icon;

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (done) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (0.5 - y) * 10,
      rotateY: (x - 0.5) * 12,
      glareX: x * 100,
      glareY: y * 100,
    });
  }

  function resetTilt() {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: "easeOut", delay: index * 0.08 }}
      className="relative min-h-[355px] w-[82vw] shrink-0 snap-center [perspective:1200px] sm:min-h-[430px] sm:w-auto sm:shrink"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20"
          >
            {[...Array(16)].map((_, confettiIndex) => (
              <motion.span
                key={confettiIndex}
                initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.7 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos(confettiIndex * 0.75) * (52 + confettiIndex * 5),
                  y: Math.sin(confettiIndex * 1.45) * 76 - 42,
                  rotate: confettiIndex * 46,
                  scale: [0.7, 1, 0.8],
                }}
                transition={{ duration: 0.95, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-white/95 shadow-soft"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: -30, scale: 1 }}
            exit={{ opacity: 0, y: -70 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="absolute right-5 top-20 z-30 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#10201f] shadow-soft"
          >
            +{mission.points} pontos
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          rotateY: done ? 0 : tilt.rotateY,
          rotateX: done ? 0 : tilt.rotateX,
          y: done ? 0 : 0,
        }}
        whileHover={done ? undefined : { y: -6 }}
        transition={{ type: "spring", stiffness: 170, damping: 20 }}
        className="absolute inset-0 [transform-style:preserve-3d]"
      >
        <div
          className={`absolute inset-0 overflow-hidden rounded-[2rem] bg-gradient-to-br ${missionTone(
            mission.category,
          )} p-4 shadow-[0_30px_100px_-76px_rgba(16,32,31,0.62)] [backface-visibility:hidden] sm:p-6`}
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.62), transparent 34%)`,
            }}
          />
          <div className="relative z-10 flex items-start justify-between gap-5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/82 shadow-soft sm:h-14 sm:w-14">
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-bold">
              ação semanal
            </span>
          </div>
          <h2 className="relative z-10 mt-6 font-sans text-2xl font-semibold leading-tight sm:mt-8 sm:text-3xl">
            {mission.title}
          </h2>
          <p className="relative z-10 mt-3 min-h-16 text-sm leading-6 opacity-78 sm:mt-4 sm:min-h-20 sm:text-base sm:leading-7">
            {mission.text}
          </p>
          <button
            type="button"
            disabled={done}
            onClick={onDone}
            className="relative z-10 mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#10201f] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1f3b38] disabled:bg-[#2f6760] sm:mt-7"
          >
            {done ? "Registrado com sucesso" : "Marcar como feita"} <Sparkles className="h-4 w-4" />
          </button>
          <p className="relative z-10 mt-4 hidden text-center text-xs font-semibold opacity-70 sm:block">
            Dica: mova o cursor pelo card para sentir a missão.
          </p>
        </div>

        <div className="absolute inset-0 grid place-items-center overflow-hidden rounded-[2rem] bg-[#10201f] p-5 text-center text-white shadow-[0_30px_100px_-76px_rgba(16,32,31,0.62)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-7">
          <div>
            <motion.div
              animate={done ? { scale: [0.92, 1.08, 1] } : undefined}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#7fd7c0] text-[#10201f] shadow-[0_26px_90px_-50px_rgba(127,215,192,0.95)] sm:h-24 sm:w-24"
            >
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12" />
            </motion.div>
            <h2 className="mt-6 font-sans text-3xl font-semibold sm:mt-8 sm:text-4xl">
              Mandou bem!
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/72 sm:mt-4 sm:text-base sm:leading-7">
              Você completou essa missão e somou{" "}
              <span className="font-bold text-[#ffd36a]">+{mission.points} Pontos do Coração</span>.
            </p>
            <div className="mt-7 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white">
              Missão feita nesta semana
            </div>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}

function readOnboardingState() {
  try {
    const raw = window.localStorage.getItem("htcare:onboarding");
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      hasQuestionnaire: Boolean(parsed),
      hasScore: Boolean(parsed?.result),
      factors: (parsed?.result?.factors ?? []) as string[],
    };
  } catch {
    return { hasQuestionnaire: false, hasScore: false, factors: [] };
  }
}
