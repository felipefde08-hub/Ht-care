import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Clock3,
  Download,
  HeartPulse,
  Minus,
  Moon,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CarelitoChat } from "@/components/CarelitoChat";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getChallengeStats, getWeeklyMissions } from "@/lib/challenge";
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface DynamicSupabaseTable {
  insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

function PanelPage() {
  const { user } = Route.useRouteContext();
  const [stored, setStored] = useState<StoredResult | null>(null);
  const [history, setHistory] = useState<ScorePoint[]>([]);

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
  const firstName = getFirstName(
    (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email,
  );
  const scoreComparison = getScoreComparison(currentScore);
  const dailyCarelitoMessage = getClinicalCarelitoMessage(currentScore, trend);
  const mobileHealthData = buildMobileHealthData(stored, readLastCheckIn());

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

      <PwaInstallBanner />

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
          className="mx-auto max-w-md sm:hidden"
        >
          <p className="text-[1.7rem] font-semibold leading-tight">Bom dia, {firstName}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#536b68]">
            Seu relatório cardiovascular vivo está atualizado.
          </p>

          <section className="mt-4 overflow-hidden rounded-[2rem] border border-[#10201f]/8 bg-white p-4 shadow-[0_26px_90px_-62px_rgba(16,32,31,0.62)]">
            <div className="text-center">
              <p className="text-sm font-bold text-[#536b68]">Score cardiovascular atual</p>
              <div className="mt-3 flex items-end justify-center gap-2">
                <span className="font-sans text-6xl font-semibold leading-none">
                  {currentScore ?? "—"}
                </span>
                <span className="pb-1 text-lg font-semibold text-[#78908d]">/100</span>
              </div>
              <p className="mt-2 font-sans text-xl font-semibold">
                {scoreQualityLabel(currentScore)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[1.2rem] bg-[#f7faf9] px-3 py-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#78908d]">
                  Semana passada
                </p>
                <p className="mt-1 text-sm font-bold text-[#10201f]">{trend.label}</p>
              </div>
              <div className="rounded-[1.2rem] bg-[#e8f5ef] px-3 py-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#2f6760]">
                  Desde o início
                </p>
                <p className="mt-1 text-sm font-bold text-[#10201f]">
                  {sortedHistory.length > 1
                    ? `${Math.max(0, Math.round((currentScore ?? 0) - sortedHistory[0].score))} pts`
                    : "começando"}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-[1.2rem] bg-[#f7faf9] px-4 py-3 text-sm font-semibold leading-5 text-[#536b68]">
              {scoreComparison}
            </p>
            {sortedHistory.length >= 2 && <MiniScoreTrend history={sortedHistory} />}
          </section>

          <section className="mt-3 rounded-[1.7rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#78908d]">
                  Próxima ação recomendada
                </p>
                <h2 className="mt-1 font-sans text-xl font-semibold leading-tight">
                  {nextStep.title}
                </h2>
              </div>
              <TrendBadge trend={trend} />
            </div>
            <p className="mt-3 text-sm leading-5 text-[#536b68]">{nextStep.text}</p>
          </section>

          <Button
            size="xl"
            className="mt-3 min-h-14 w-full rounded-[1.25rem] bg-[#10201f] text-base font-semibold text-white shadow-[0_20px_60px_-36px_rgba(16,32,31,0.75)]"
            asChild
          >
            <Link to="/check-in">
              Registrar agora <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>

          <section className="mt-3 grid grid-cols-4 gap-2">
            {mobileHealthData.map((item) => (
              <CompactClinicalShortcut key={item.label} {...item} />
            ))}
          </section>

          <LabInterestCard userId={user.id} defaultName={firstName} />

          <section className="mt-3 flex items-center gap-3 rounded-[1.7rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
            <Carelito className="h-20 w-20 shrink-0" expression="thoughtful" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2f8fc8]">
                Insight do Carelito
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[#536b68]">
                {dailyCarelitoMessage}
              </p>
            </div>
          </section>
        </motion.div>

        <div className="hidden sm:block">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            className="mt-10 hidden gap-4 sm:grid lg:grid-cols-[1fr_0.8fr]"
          >
            <div className="overflow-hidden rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f5ef] shadow-soft">
                    <HeartPulse className="h-7 w-7 text-[#2f6760]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#10201f]">
                      Relatório vivo de saúde cardiovascular
                    </p>
                    <p className="mt-1 text-sm text-[#536b68]">
                      Acompanhe score, pressão, peso e glicemia ao longo do tempo.
                    </p>
                  </div>
                </div>
                <Button className="rounded-full bg-[#10201f] font-semibold text-white" asChild>
                  <Link to="/relatorio">Ver relatório</Link>
                </Button>
              </div>
            </div>

            <LabInterestCard userId={user.id} defaultName={firstName} compact />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-5 rounded-[1.5rem] border border-[#10201f]/8 bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#536b68]">Acompanhamento semanal</p>
                <h2 className="mt-1 font-sans text-xl font-semibold sm:text-3xl">
                  {challengeStats.completedThisWeek} de {weeklyMissions.length} ações leves
                  registradas
                </h2>
              </div>
              <Button variant="outline" className="rounded-full" asChild>
                <Link to="/missoes">Ver Jornada</Link>
              </Button>
            </div>
            <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#eef3f1]">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${weeklyMissions.length ? (challengeStats.completedThisWeek / weeklyMissions.length) * 100 : 0}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[#2f8fc8] to-[#49c7ae]"
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
                <p className="text-sm font-medium text-[#536b68]">Indicadores informados</p>
                <h2 className="mt-1 font-sans text-xl font-semibold sm:text-3xl">
                  Dados que alimentam seu relatório
                </h2>
              </div>
              <Button variant="outline" className="rounded-full" asChild>
                <Link to="/check-in">Atualizar indicadores</Link>
              </Button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {mobileHealthData.map((item) => (
                <MobileDataCard key={item.label} {...item} />
              ))}
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

function CompactClinicalShortcut({ icon, label, value, tone }: MobileDataCardProps) {
  const toneClasses = {
    good: "bg-[#e8f5ef] text-[#2f6760]",
    attention: "bg-[#fff7dc] text-[#9a5b12]",
    risk: "bg-[#ffece7] text-[#c14525]",
    neutral: "bg-[#eef3f1] text-[#536b68]",
  };
  return (
    <Link
      to="/check-in"
      className="min-h-20 rounded-[1.15rem] border border-[#10201f]/6 bg-white p-2.5 shadow-soft"
    >
      <div className={`grid h-8 w-8 place-items-center rounded-full ${toneClasses[tone]}`}>
        {icon}
      </div>
      <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#78908d]">
        {label}
      </p>
      <p className="mt-1 truncate font-sans text-sm font-semibold">{value}</p>
    </Link>
  );
}

function MiniScoreTrend({ history }: { history: ScorePoint[] }) {
  const lastFour = history.slice(-4);
  const min = Math.min(...lastFour.map((item) => item.score));
  const max = Math.max(...lastFour.map((item) => item.score));
  const range = Math.max(1, max - min);
  return (
    <div className="mt-3 rounded-[1.2rem] bg-[#f7faf9] px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">
          Evolução recente
        </p>
        <Link to="/historico" className="text-xs font-bold text-[#2f8fc8]">
          Ver histórico
        </Link>
      </div>
      <div className="flex h-16 items-end gap-2">
        {lastFour.map((point) => (
          <div key={point.createdAt} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-lg bg-[#2f8fc8]"
              style={{ height: `${28 + ((point.score - min) / range) * 36}px` }}
            />
            <span className="text-[0.65rem] font-semibold text-[#78908d]">{point.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabInterestCard({
  userId,
  defaultName,
  compact = false,
}: {
  userId: string;
  defaultName: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: defaultName, phone: "", city: "", healthPlan: "" });

  async function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim() || !form.healthPlan.trim()) {
      toast.error("Preencha nome, telefone, cidade e plano de saúde.");
      return;
    }
    setSaving(true);
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } = await dynamicSupabase.from("lab_exam_interests").insert({
      user_id: userId,
      nome: form.name.trim(),
      telefone: form.phone.trim(),
      cidade: form.city.trim(),
      plano_saude: form.healthPlan.trim(),
      source: "home",
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível registrar o interesse. Verifique a tabela no Supabase.");
      console.error(error);
      return;
    }
    toast.success("Interesse registrado. Entraremos em contato.");
    setOpen(false);
    setForm({ name: defaultName, phone: "", city: "", healthPlan: "" });
  }

  return (
    <section
      className={`mt-3 rounded-[1.7rem] border border-[#10201f]/8 bg-white shadow-soft ${
        compact ? "p-5" : "p-4"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e9f4fb] text-[#2f8fc8]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#78908d]">
            Aprofunde sua avaliação
          </p>
          <h2 className="mt-1 font-sans text-xl font-semibold leading-tight">
            Marcar exame com laboratório parceiro
          </h2>
          <p className="mt-2 text-sm leading-5 text-[#536b68]">
            Com um exame de sangue, conseguimos analisar biomarcadores reais como ApoB, resistência
            à insulina e inflamação para uma visão mais precisa do seu risco.
          </p>
        </div>
      </div>
      {!open ? (
        <Button
          className="mt-4 w-full rounded-full bg-[#10201f] font-semibold text-white"
          onClick={() => setOpen(true)}
        >
          Marcar exame com laboratório parceiro
        </Button>
      ) : (
        <div className="mt-4 space-y-3 rounded-[1.25rem] bg-[#f7faf9] p-3">
          <FormField
            label="Nome"
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
            placeholder="Seu nome"
          />
          <FormField
            label="Telefone"
            value={form.phone}
            onChange={(phone) => setForm((current) => ({ ...current, phone }))}
            placeholder="(11) 99999-9999"
          />
          <FormField
            label="Cidade"
            value={form.city}
            onChange={(city) => setForm((current) => ({ ...current, city }))}
            placeholder="São Paulo"
          />
          <FormField
            label="Plano de saúde"
            value={form.healthPlan}
            onChange={(healthPlan) => setForm((current) => ({ ...current, healthPlan }))}
            placeholder="Ex: Unimed, Bradesco, SulAmérica ou Particular"
          />
          <div className="flex gap-2">
            <Button
              className="min-h-12 flex-1 rounded-full bg-[#10201f] font-semibold text-white"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? "Salvando..." : "Enviar interesse"}
            </Button>
            <Button
              variant="outline"
              className="min-h-12 rounded-full"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 rounded-2xl bg-white"
      />
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

function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("htcare:pwa-install-dismissed") === "true") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      window.localStorage.setItem("htcare:pwa-install-dismissed", "true");
      setVisible(false);
      setInstallPrompt(null);
    }
  }

  function dismiss() {
    window.localStorage.setItem("htcare:pwa-install-dismissed", "true");
    setVisible(false);
  }

  if (!visible || !installPrompt) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="mx-auto mt-4 flex max-w-md items-center gap-3 rounded-[1.35rem] border border-[#10201f]/8 bg-white p-3 shadow-soft sm:hidden"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8f5ef] text-[#2f6760]">
        <Download className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5 text-[#10201f]">
          Instale o HTCare na sua tela inicial para acesso rápido.
        </p>
        <button type="button" onClick={install} className="mt-1 text-sm font-bold text-[#2f8fc8]">
          Instalar
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Agora não"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f7faf9] text-[#78908d]"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.aside>
  );
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

function scoreQualityLabel(score: number | null) {
  if (score == null) return "Comece sua jornada";
  if (score >= 80) return "Muito bom";
  if (score >= 50) return "Atenção necessária";
  return "Risco identificado";
}

function getScoreComparison(score: number | null) {
  if (score == null) return "Complete sua avaliação para desbloquear seu primeiro score.";
  if (score >= 80) return "Seu risco está melhor que 73% das pessoas da sua idade.";
  if (score >= 50) return "Seu risco está em uma faixa que merece acompanhamento semanal.";
  return "Seu resultado pede atenção e acompanhamento mais próximo dos seus indicadores.";
}

function getClinicalCarelitoMessage(score: number | null, trend: ReturnType<typeof getTrend>) {
  if (score == null) return "Complete a avaliação inicial para gerar seu primeiro relatório.";
  if (trend.label.startsWith("Subiu")) {
    return `Seu score melhorou desde a última avaliação (${trend.label.toLowerCase()}). Continue acompanhando pressão e peso.`;
  }
  if (trend.label.startsWith("Desceu")) {
    return `Seu score reduziu desde a última avaliação (${trend.label.toLowerCase()}). Vale atualizar pressão e considerar exame complementar.`;
  }
  if (score >= 80)
    return "Seus últimos dados sugerem baixo risco no momento. Mantenha o acompanhamento.";
  if (score >= 50)
    return "Seu risco está em faixa de atenção. Registrar pressão ajuda a interpretar melhor a tendência.";
  return "Seu score indica risco elevado. Recomendamos procurar avaliação médica e aprofundar com exames.";
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
