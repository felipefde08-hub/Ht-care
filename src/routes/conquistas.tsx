import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Lock, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getChallengeStats, getWeeklyMissions } from "@/lib/challenge";
import { achievementCatalog, readStoredHubData } from "@/lib/patient-hub";

export const Route = createFileRoute("/conquistas")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Conquistas — HTCare" }] }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const stored = readStoredHubData();
  const missions = useMemo(() => getWeeklyMissions(stored?.result?.factors ?? []), [stored]);
  const stats = getChallengeStats(missions);
  const unlocked = achievementCatalog.filter((item) => stats.points >= item.requiredPoints);

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <Header />
      <section className="mx-auto mt-5 max-w-3xl space-y-4">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#78908d]">
                Conquistas
              </p>
              <h1 className="mt-1 font-sans text-3xl font-semibold">
                {unlocked.length} de {achievementCatalog.length} desbloqueadas
              </h1>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#fff7dc] text-[#9a5b12]">
              <Trophy className="h-7 w-7" />
            </span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {achievementCatalog.map((achievement) => {
            const isUnlocked = stats.points >= achievement.requiredPoints;
            const missing = Math.max(0, achievement.requiredPoints - stats.points);
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[1.65rem] border p-4 shadow-soft ${
                  isUnlocked
                    ? "border-[#f0d998] bg-[linear-gradient(135deg,#fff7dc,#e8f5ef)]"
                    : "border-[#10201f]/8 bg-white grayscale"
                }`}
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full ${
                    isUnlocked ? "bg-[#10201f] text-white" : "bg-[#eef3f1] text-[#9aa8a5]"
                  }`}
                >
                  {isUnlocked ? <Trophy className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
                </span>
                <p className="mt-4 font-sans text-lg font-semibold leading-tight">
                  {achievement.title}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#536b68]">
                  {isUnlocked ? "Conquista desbloqueada na sua jornada." : achievement.criterion}
                </p>
                {!isUnlocked && (
                  <p className="mt-3 rounded-full bg-[#f7faf9] px-3 py-1 text-xs font-bold text-[#78908d]">
                    Faltam {missing} pontos
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
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
      <div className="h-10 w-10" />
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
