import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { readStoredHubData } from "@/lib/patient-hub";
import { recordUserActivity } from "@/lib/user-activity";

export const Route = createFileRoute("/plano-acao")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Plano de Ação — HTCare" }] }),
  component: PlanoAcaoPage,
});

function PlanoAcaoPage() {
  const { user } = Route.useRouteContext();
  const [version, setVersion] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [factors, setFactors] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const stored = readStoredHubData();
      setScore(stored?.result?.score ?? null);
      setFactors(stored?.result?.factors ?? []);
      const { data } = await supabase
        .from("assessments")
        .select("score,fatores_que_pesaram")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setScore(Number(data.score));
        setFactors(data.fatores_que_pesaram ?? []);
      }
    }
    void load();
  }, []);

  const missions = useMemo(() => getWeeklyMissions(factors), [factors]);
  const stats = getChallengeStats(missions);
  const targetScore = score == null ? null : Math.max(0, score - 10);
  const progress = missions.length ? (stats.completedThisWeek / missions.length) * 100 : 0;

  async function markDone(mission: ChallengeMission) {
    completeMission(mission);
    await recordUserActivity(user.id, "mission", {
      missionId: mission.id,
      title: mission.title,
      weekKey: stats.currentWeek,
    });
    setVersion((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <Header />
      <section className="mx-auto mt-5 max-w-3xl space-y-4" key={version}>
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e9f4fb] text-[#2f8fc8]">
              <Target className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#78908d]">
                Seu objetivo
              </p>
              <h1 className="mt-1 font-sans text-2xl font-semibold">
                {score == null
                  ? "Reduzir seu risco com pequenos passos"
                  : `Reduzir risco de ${score}% para ${targetScore}%`}
              </h1>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans text-xl font-semibold">Semana atual</p>
              <p className="mt-1 text-sm text-[#78908d]">
                {stats.completedThisWeek} de {missions.length} missões completas
              </p>
            </div>
            <span className="rounded-full bg-[#e8f5ef] px-3 py-1 text-sm font-bold text-[#2f6760]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e6eeec]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2f8fc8,#49c7ae)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>

        <div className="space-y-3">
          {missions.map((mission) => {
            const done = stats.progress.completedMissionIds.includes(
              missionCompletionKey(mission.id, stats.currentWeek),
            );
            const Icon = mission.icon;
            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[1.65rem] bg-gradient-to-br p-4 shadow-soft ${missionTone(
                  mission.category,
                )}`}
              >
                <div className="flex gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/60">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-lg font-semibold">{mission.title}</p>
                    <p className="mt-1 text-sm leading-5 opacity-75">{mission.text}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white/55 px-3 py-1 text-xs font-bold">
                        +{mission.points} pontos
                      </span>
                      <Button
                        size="sm"
                        disabled={done}
                        className="rounded-full bg-[#10201f] text-white disabled:bg-white/45 disabled:text-current"
                        onClick={() => void markDone(mission)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {done ? "Feita" : "Concluir"}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <Button className="w-full rounded-full bg-[#10201f]" asChild>
          <Link to="/missoes">Ver todas as missões</Link>
        </Button>
      </section>
      <MobileAppNav />
    </main>
  );
}

function Header() {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between">
      <Button variant="ghost" size="icon" className="rounded-full" asChild>
        <Link to="/painel">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <Logo />
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e9f4fb] text-[#2f8fc8]">
        <ClipboardCheck className="h-5 w-5" />
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft"
    >
      {children}
    </motion.div>
  );
}
