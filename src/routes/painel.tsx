import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Bot,
  CalendarDays,
  ChartLine,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  Download,
  FileText,
  FlaskConical,
  HeartPulse,
  Minus,
  Moon,
  Pill,
  Scale,
  Syringe,
  Target,
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
  score?: number;
  createdAt?: string;
  checkIn?: {
    measuredBloodPressure?: "sim" | "nao" | "";
    systolic?: string;
    diastolic?: string;
    measuredGlucose?: "sim" | "nao" | "";
    glucose?: string;
    weight?: string;
    sleptWell?: "sim" | "nao" | "";
  };
}

type ExamRequestStatus =
  | "aguardando_autorizacao"
  | "aguardando_medico"
  | "autorizado"
  | "recusado"
  | "resultado_recebido"
  | "concluido";

interface ExamRequest {
  id: string;
  status: ExamRequestStatus;
  observacao_medico: string | null;
  laboratorio_nome: string | null;
  laboratorio_endereco: string | null;
  laboratorio_telefone: string | null;
  requisicao_url: string | null;
  resultado_url: string | null;
}

interface DynamicQueryBuilder {
  eq: (column: string, value: string) => DynamicQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQueryBuilder;
  limit: (count: number) => DynamicQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
}

interface DynamicSupabaseTable {
  select: (columns: string) => DynamicQueryBuilder;
  insert?: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function PanelPage() {
  const { user } = Route.useRouteContext();
  const [stored, setStored] = useState<StoredResult | null>(null);
  const [history, setHistory] = useState<ScorePoint[]>([]);
  const [examRequest, setExamRequest] = useState<ExamRequest | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dailyCheckinDone, setDailyCheckinDone] = useState(() => isDailyCheckinDoneToday());
  const [daysAway] = useState(() => getDaysSinceLastOpen(user.id));
  const [carelitoOpenSignal, setCarelitoOpenSignal] = useState(0);

  useEffect(() => {
    async function loadData() {
      const raw = window.localStorage.getItem("htcare:onboarding");
      const rawHistory = window.localStorage.getItem("htcare:score-history");
      const parsed = raw ? (JSON.parse(raw) as StoredResult) : null;
      const parsedHistory = rawHistory ? (JSON.parse(rawHistory) as ScorePoint[]) : [];
      setStored(parsed);
      setHistory(parsedHistory);

      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setAvatarUrl(profile?.avatar_url ?? null);

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
  }, [user.id]);

  useEffect(() => {
    void recordUserActivity(user.id, "app_open");
  }, [user.id]);

  useEffect(() => {
    void loadExamRequest(user.id, setExamRequest);
  }, [user.id]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [history],
  );
  const latest = sortedHistory.at(-1);
  const previous = sortedHistory.length >= 2 ? sortedHistory.at(-2) : null;
  const currentScore = latest?.score ?? stored?.result?.score ?? null;
  const trend = getTrend(currentScore, previous?.score ?? null);
  const firstName = getFirstName(
    (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email,
  );
  const lastCheckIn = readLastCheckIn();
  const mobileHealthData = buildMobileHealthData(stored, lastCheckIn);
  const recommendedAction = getRecommendedAction(
    currentScore,
    previous?.score ?? null,
    latest?.createdAt ?? null,
    stored?.result?.factors ?? latest?.factors ?? [],
    lastCheckIn,
  );
  const insight = buildCarelitoInsight(stored, lastCheckIn, trend, currentScore);
  const initials = getInitials(firstName);
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());
  const todayCards = buildTodayCards({
    examRequest,
    dailyCheckinDone,
    daysAway,
    insightText: insight.text,
  });
  const weeklyMissions = useMemo(
    () => getWeeklyMissions(stored?.result?.factors ?? latest?.factors ?? []),
    [latest?.factors, stored?.result?.factors],
  );
  const missionStats = getChallengeStats(weeklyMissions);
  const quickActions = buildQuickActions({
    examRequest,
    pendingMissions: missionStats.pendingThisWeek,
    onCarelito: () => setCarelitoOpenSignal((current) => current + 1),
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#EBF5FF_0%,#F0FDF4_100%)] px-4 pb-28 pt-4 text-[#10201f] sm:bg-[#fbfcfc] sm:px-5 sm:py-6">
      <div className="mx-auto grid max-w-md grid-cols-3 items-center sm:hidden">
        <div className="relative h-11 w-11">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white/72 text-sm font-black text-[#2563EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-md">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {examRequest && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#16A34A] px-1 text-[0.62rem] font-bold text-white">
              1
            </span>
          )}
        </div>
        <Link to="/" className="justify-self-center">
          <Logo />
        </Link>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center justify-self-end rounded-full bg-white/58 text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-md"
          aria-label="Calendário"
        >
          <CalendarDays className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto hidden max-w-6xl items-center justify-between sm:flex">
        <Link to="/">
          <Logo />
        </Link>
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
          <section className="relative pt-3 text-center">
            <p className="text-base font-semibold text-[#111827]">Bom dia, {firstName}</p>
            <div className="mx-auto mt-3 flex max-w-xs items-center justify-center gap-2">
              <p className="font-sans text-[88px] font-bold leading-none tracking-[-0.06em] text-[#111827]">
                {currentScore ?? "—"}
              </p>
              <div className="flex w-[98px] shrink-0 flex-col items-center">
                <Carelito className="h-14 w-14" expression="confident" />
                <div className="mt-1 rounded-2xl rounded-tl-md bg-white/90 px-2.5 py-2 text-left text-[0.6rem] font-bold leading-tight text-[#16A34A] shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-md">
                  {trend.mobileLabel || insight.speech}
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#6B7280]">
              Score cardiovascular · {scoreRiskLabel(currentScore)}.
            </p>
          </section>

          <section className="mt-7 grid grid-cols-3 gap-4">
            <FloatingActionCircle
              icon={<HeartPulse className="h-7 w-7" />}
              label="Check-in"
              to="/check-in"
              active
            />
            <FloatingActionCircle
              icon={<Syringe className="h-7 w-7" />}
              label="Exame"
              to="/meu-risco"
            />
            <FloatingActionCircle
              icon={<ChartLine className="h-7 w-7" />}
              label="Evolução"
              to="/meu-risco"
            />
          </section>

          <QuickAccessBar actions={quickActions} />

          <section className="mt-8">
            <p className="text-sm font-bold text-[#111827]">Hoje · {todayLabel}</p>
            <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {todayCards.map((card) => (
                <TodayFeedCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          {examRequest && <ExamStatusCard request={examRequest} compact />}

          <p className="sr-only">{recommendedAction.title}</p>
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
          </motion.div>

          <ExamReportPreviewCard />

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
                  <h2 className="mt-2 font-sans text-3xl font-semibold">
                    {recommendedAction.title}
                  </h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-[#536b68]">
                    {recommendedAction.text}
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

          {examRequest && <ExamStatusCard request={examRequest} />}

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
        openSignal={carelitoOpenSignal}
      />
      <MobileAppNav />
    </main>
  );
}

async function loadExamRequest(
  userId: string,
  setExamRequest: (request: ExamRequest | null) => void,
) {
  const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
  const { data, error } = await dynamicSupabase
    .from("exam_requests")
    .select(
      "id,status,observacao_medico,laboratorio_nome,laboratorio_endereco,laboratorio_telefone,requisicao_url,resultado_url",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  setExamRequest(isExamRequest(data) ? data : null);
}

function isExamRequest(data: unknown): data is ExamRequest {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamRequest>;
  return typeof record.id === "string" && typeof record.status === "string";
}

function ExamStatusCard({ request, compact = false }: { request: ExamRequest; compact?: boolean }) {
  const content = getExamStatusContent(request);
  const Icon = content.icon;
  return (
    <section
      className={`rounded-[1.7rem] border border-[#10201f]/8 bg-white shadow-soft ${
        compact ? "mt-3 p-4" : "mt-5 p-6"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${content.tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-lg font-semibold">{content.title}</p>
          <p className="mt-1 text-sm leading-6 text-[#536b68]">{content.text}</p>
          {request.status === "autorizado" && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {request.requisicao_url && (
                <Button className="rounded-full bg-[#2563EB] font-semibold" asChild>
                  <a href={request.requisicao_url} target="_blank" rel="noreferrer">
                    Baixar requisição (PDF)
                  </a>
                </Button>
              )}
              <Button variant="outline" className="rounded-full font-semibold" asChild>
                <Link to="/meu-risco">Ver laboratório parceiro</Link>
              </Button>
            </div>
          )}
          {request.status === "concluido" && (
            <Button className="mt-4 rounded-full bg-[#2563EB] font-semibold" asChild>
              <Link to="/meu-risco">Ver interpretação completa</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function ExamReportPreviewCard({ compact = false }: { compact?: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`rounded-[1.7rem] border border-[#2f8fc8]/15 bg-[#f2faf9] shadow-soft ${
        compact ? "mt-3 p-4" : "mt-5 p-7"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#2f8fc8] shadow-soft">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f6760]">
            Relatório com exame de sangue
          </p>
          <h2
            className={`mt-2 font-sans font-semibold leading-tight ${
              compact ? "text-xl" : "text-3xl"
            }`}
          >
            Entenda seus biomarcadores com clareza
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#536b68]">
            Veja como ApoB, resistência à insulina e inflamação mudam seu score, com comparação por
            faixa etária, evolução e um plano de 90 dias.
          </p>
          <Button asChild className="mt-4 min-h-12 rounded-full bg-[#10201f] font-semibold">
            <Link to="/exame-resultado/$id" params={{ id: "demo" }}>
              Ver exemplo do relatório <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

interface TodayCardConfig {
  icon: ReactNode;
  title: string;
  text: string;
  to: "/check-in" | "/meu-risco" | "/historico" | "/protocolo-90-dias/$id";
  params?: { id: string };
}

function buildTodayCards({
  examRequest,
  dailyCheckinDone,
  daysAway,
  insightText,
}: {
  examRequest: ExamRequest | null;
  dailyCheckinDone: boolean;
  daysAway: number | null;
  insightText: string;
}): TodayCardConfig[] {
  const cards: TodayCardConfig[] = [];

  if (!examRequest) {
    cards.push({
      icon: <FlaskConical className="h-5 w-5" />,
      title: "Fazer exame",
      text: "Aprofunde seu score com biomarcadores reais.",
      to: "/meu-risco",
    });
  } else if (examRequest.status === "concluido") {
    cards.push({
      icon: <FlaskConical className="h-5 w-5" />,
      title: "Resultado liberado",
      text: "Veja a interpretação completa do seu exame.",
      to: "/meu-risco",
    });
  } else if (examRequest.status === "resultado_recebido") {
    cards.push({
      icon: <Clock3 className="h-5 w-5" />,
      title: "Resultado em análise",
      text: "O médico parceiro vai liberar a nota final.",
      to: "/meu-risco",
    });
  } else if (examRequest.status === "autorizado") {
    cards.push({
      icon: <Download className="h-5 w-5" />,
      title: "Baixar requisição",
      text: "Leve o PDF ao laboratório em jejum de 12 horas.",
      to: "/meu-risco",
    });
  } else if (dailyCheckinDone) {
    cards.push({
      icon: <CheckCircle2 className="h-5 w-5" />,
      title: "Resumo do dia",
      text: "Check-in registrado. Seu histórico foi atualizado.",
      to: "/historico",
    });
  } else if (daysAway != null && daysAway > 3) {
    cards.push({
      icon: <Bell className="h-5 w-5" />,
      title: "Bem-vindo de volta",
      text: "Carelito separou uma ação simples para retomar hoje.",
      to: "/check-in",
    });
  }

  const fallback: TodayCardConfig[] = [
    {
      icon: <HeartPulse className="h-5 w-5" />,
      title: "Registrar pressão",
      text: "Atualize sua medida em menos de 30 segundos.",
      to: "/check-in",
    },
    {
      icon: <CheckCircle2 className="h-5 w-5" />,
      title: "Protocolo de hoje",
      text: "Veja a próxima ação do seu plano de 90 dias.",
      to: "/protocolo-90-dias/$id",
      params: { id: "demo" },
    },
    {
      icon: <Bell className="h-5 w-5" />,
      title: "Insight do Carelito",
      text: insightText,
      to: "/meu-risco",
    },
  ];

  for (const card of fallback) {
    if (!cards.some((item) => item.title === card.title)) cards.push(card);
  }

  return cards.slice(0, 3);
}

function FloatingActionCircle({
  icon,
  label,
  to,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  to: "/check-in" | "/meu-risco";
  active?: boolean;
}) {
  return (
    <Link to={to} className="group flex flex-col items-center gap-2">
      <span
        className={`grid h-[82px] w-[82px] place-items-center rounded-full shadow-[0_16px_44px_-28px_rgba(17,24,39,0.45)] backdrop-blur-md transition active:scale-95 ${
          active ? "bg-[#2563EB] text-white" : "bg-white/58 text-[#2563EB]"
        }`}
      >
        {icon}
      </span>
      <span className="text-xs font-bold text-[#111827]">{label}</span>
    </Link>
  );
}

function TodayFeedCard({
  icon,
  title,
  text,
  to,
  params,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  to: "/check-in" | "/meu-risco" | "/historico" | "/protocolo-90-dias/$id";
  params?: { id: string };
}) {
  return (
    <Link
      to={to}
      params={params}
      className="flex h-[120px] w-[60vw] shrink-0 snap-start flex-col justify-between rounded-3xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </span>
      <span>
        <span className="block text-base font-semibold leading-tight text-[#111827]">{title}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-4 text-[#6B7280]">{text}</span>
      </span>
    </Link>
  );
}

interface QuickAccessAction {
  icon: ReactNode;
  label: string;
  badge?: true | number;
  to?: "/exames" | "/perfil/$section" | "/missoes" | "/historico" | "/protocolo-90-dias/$id";
  params?: { section: string } | { id: string };
  onClick?: () => void;
}

function buildQuickActions({
  examRequest,
  pendingMissions,
  onCarelito,
}: {
  examRequest: ExamRequest | null;
  pendingMissions: number;
  onCarelito: () => void;
}): QuickAccessAction[] {
  const hasExamPending =
    examRequest?.status === "resultado_recebido" ||
    examRequest?.status === "concluido" ||
    Boolean(examRequest?.resultado_url);

  return [
    {
      icon: <FlaskConical className="h-[26px] w-[26px]" />,
      label: "Ler Exame",
      to: "/exames",
      badge: hasExamPending || undefined,
    },
    {
      icon: <HeartPulse className="h-[26px] w-[26px]" />,
      label: "Minha Saúde",
      to: "/perfil/$section",
      params: { section: "dados-saude" },
    },
    {
      icon: <Target className="h-[26px] w-[26px]" />,
      label: "Missões",
      to: "/missoes",
      badge: pendingMissions || undefined,
    },
    {
      icon: <Bot className="h-[26px] w-[26px]" />,
      label: "Carelito",
      onClick: onCarelito,
    },
    {
      icon: <ChartLine className="h-[26px] w-[26px]" />,
      label: "Evolução",
      to: "/historico",
    },
    {
      icon: <Pill className="h-[26px] w-[26px]" />,
      label: "Medicamentos",
      to: "/perfil/$section",
      params: { section: "medicamentos" },
    },
    {
      icon: <ClipboardList className="h-[26px] w-[26px]" />,
      label: "Protocolo",
      to: "/protocolo-90-dias/$id",
      params: { id: "demo" },
    },
  ];
}

function QuickAccessBar({ actions }: { actions: QuickAccessAction[] }) {
  return (
    <section className="mt-6">
      <p className="px-0 text-xs font-bold text-[#6B7280]">Acesso rápido</p>
      <div className="-mx-4 mt-2 flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {actions.map((action) => (
          <QuickAccessTile key={action.label} action={action} />
        ))}
      </div>
    </section>
  );
}

function QuickAccessTile({ action }: { action: QuickAccessAction }) {
  const content = (
    <>
      {action.badge && (
        <span
          className={`absolute right-2 top-2 grid place-items-center rounded-full bg-[#2563EB] font-bold leading-none text-white ${
            typeof action.badge === "number" ? "h-4 min-w-4 px-1 text-[0.6rem]" : "h-2 w-2"
          }`}
        >
          {typeof action.badge === "number" ? action.badge : ""}
        </span>
      )}
      <span className="grid h-[26px] w-[26px] place-items-center text-[#2563EB]">
        {action.icon}
      </span>
      <span className="mt-1.5 line-clamp-2 block max-w-[66px] text-center text-[11px] font-semibold leading-tight text-[#6B7280]">
        {action.label}
      </span>
    </>
  );

  const className =
    "relative flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition active:scale-95";

  if (action.onClick) {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {content}
      </button>
    );
  }

  if (action.to === "/perfil/$section") {
    return (
      <Link
        to="/perfil/$section"
        params={action.params as { section: string }}
        className={className}
      >
        {content}
      </Link>
    );
  }

  if (action.to === "/protocolo-90-dias/$id") {
    return (
      <Link
        to="/protocolo-90-dias/$id"
        params={action.params as { id: string }}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link to={action.to ?? "/painel"} className={className}>
      {content}
    </Link>
  );
}

function getExamStatusContent(request: ExamRequest) {
  if (request.status === "autorizado") {
    return {
      icon: CheckCircle2,
      tone: "bg-[#e8f5ef] text-[#2f6760]",
      title: "Requisição pronta ✅",
      text: "Seu médico aprovou. Baixe a requisição e leve ao laboratório em jejum de 12 horas.",
    };
  }
  if (request.status === "resultado_recebido") {
    return {
      icon: CheckCircle2,
      tone: "bg-[#e8f5ef] text-[#2f6760]",
      title: "Resultado recebido",
      text: "Seu resultado foi enviado. A interpretação clínica será atualizada em breve.",
    };
  }
  if (request.status === "concluido") {
    return {
      icon: FlaskConical,
      tone: "bg-[#2563EB] text-white",
      title: "Seu resultado chegou 🔬",
      text: "O Carelito e o médico parceiro já liberaram sua interpretação completa.",
    };
  }
  if (request.status === "recusado") {
    return {
      icon: Clock3,
      tone: "bg-[#fff7dc] text-[#9a5b12]",
      title: "Solicitação em revisão",
      text:
        request.observacao_medico ??
        "O médico parceiro pediu mais informações antes de autorizar o exame.",
    };
  }
  return {
    icon: FlaskConical,
    tone: "bg-[#e9f4fb] text-[#2f8fc8]",
    title: "Seu exame está sendo analisado pelo Dr. Danilo",
    text: "Você receberá a autorização remota e as instruções em até 2 horas.",
  };
}

interface MobileDataCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "attention" | "risk" | "neutral";
  freshness?: "today" | "yesterday" | "old" | "missing";
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

function CompactClinicalShortcut({
  icon,
  label,
  value,
  detail,
  tone,
  freshness = "missing",
}: MobileDataCardProps) {
  const toneClasses = {
    good: "bg-[#e8f5ef] text-[#2f6760]",
    attention: "bg-[#fff7dc] text-[#9a5b12]",
    risk: "bg-[#ffece7] text-[#c14525]",
    neutral: "bg-[#eef3f1] text-[#536b68]",
  };
  const dotClasses = {
    today: "bg-[#49c7ae]",
    yesterday: "bg-[#d89a1d]",
    old: "bg-[#9aa8a5]",
    missing: "bg-[#c8d2cf]",
  };
  return (
    <Link
      to="/check-in"
      className="min-h-[7rem] w-[38vw] min-w-[8.6rem] snap-start rounded-[1.25rem] border border-[#10201f]/6 bg-white p-3 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-full ${toneClasses[tone]}`}>
          {icon}
        </div>
        <ChevronRight className="h-4 w-4 text-[#9aa8a5]" />
      </div>
      <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#78908d]">
        {label}
      </p>
      <p className="mt-1 truncate font-sans text-sm font-semibold">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-[0.68rem] font-semibold text-[#78908d]">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[freshness]}`} />
        {detail}
      </p>
    </Link>
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
  const weight = getWeightSummary(stored, lastCheckIn);
  const glucose = getGlucoseSummary(lastCheckIn);
  const sleep = getSleepSummary(stored, lastCheckIn);
  return [
    {
      icon: <HeartPulse className="h-4 w-4" />,
      label: "Pressão",
      value: pressure.value,
      detail: pressure.detail,
      tone: pressure.tone,
      freshness: pressure.freshness,
      action: pressure.action,
    },
    {
      icon: <Scale className="h-4 w-4" />,
      label: "Peso",
      value: weight.value,
      detail: weight.detail,
      tone: weight.tone,
      freshness: weight.freshness,
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: "Glicemia",
      value: glucose.value,
      detail: glucose.detail,
      tone: glucose.tone,
      freshness: glucose.freshness,
    },
    {
      icon: <Moon className="h-4 w-4" />,
      label: "Sono",
      value: sleep.value,
      detail: sleep.detail,
      tone: sleep.tone,
      freshness: sleep.freshness,
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
      detail: "Atualizar",
      tone: "neutral" as const,
      freshness: "missing" as const,
      action: "Atualizar",
    };
  }

  const systolic = Number(hasCheckInPressure ? checkIn?.systolic : stored?.systolic);
  const diastolic = Number(hasCheckInPressure ? checkIn?.diastolic : stored?.diastolic);
  const classification = classifyPressure(systolic, diastolic);
  return {
    value: `${systolic}/${diastolic}`,
    detail: hasCheckInPressure ? `${freshnessLabel(lastCheckIn?.createdAt)} •` : "Mais antigo •",
    tone: classification.tone,
    freshness: hasCheckInPressure ? freshnessFromDate(lastCheckIn?.createdAt) : ("old" as const),
  };
}

function classifyPressure(systolic: number, diastolic: number) {
  if (systolic >= 140 || diastolic >= 90) return { label: "Alta", tone: "risk" as const };
  if (systolic >= 120 || diastolic >= 80) return { label: "Elevada", tone: "attention" as const };
  return { label: "Normal", tone: "good" as const };
}

function getWeightSummary(stored: StoredResult | null, lastCheckIn: LastCheckIn | null) {
  const weight = Number(lastCheckIn?.checkIn?.weight || stored?.weight);
  if (!weight) {
    return {
      value: "Não informado",
      detail: "Atualizar",
      tone: "neutral" as const,
      freshness: "missing" as const,
    };
  }
  const hasCheckInWeight = Number(lastCheckIn?.checkIn?.weight) > 0;
  return {
    value: `${weight} kg`,
    detail: hasCheckInWeight ? `${freshnessLabel(lastCheckIn?.createdAt)} •` : "Mais antigo •",
    tone: "neutral" as const,
    freshness: hasCheckInWeight ? freshnessFromDate(lastCheckIn?.createdAt) : ("old" as const),
  };
}

function getGlucoseSummary(lastCheckIn: LastCheckIn | null) {
  const glucose = Number(lastCheckIn?.checkIn?.glucose);
  if (!glucose) {
    return {
      value: "Registrar",
      detail: "Atualizar",
      tone: "neutral" as const,
      freshness: "missing" as const,
    };
  }
  return {
    value: `${glucose} mg/dL`,
    detail: `${freshnessLabel(lastCheckIn?.createdAt)} •`,
    tone:
      glucose >= 180
        ? ("risk" as const)
        : glucose >= 140
          ? ("attention" as const)
          : ("good" as const),
    freshness: freshnessFromDate(lastCheckIn?.createdAt),
  };
}

function getSleepSummary(stored: StoredResult | null, lastCheckIn: LastCheckIn | null) {
  const sleptWell = lastCheckIn?.checkIn?.sleptWell;
  if (sleptWell === "sim" || sleptWell === "nao") {
    return {
      value: sleptWell === "sim" ? "Dormiu bem" : "Atenção",
      detail: `${freshnessLabel(lastCheckIn?.createdAt)} •`,
      tone: sleptWell === "sim" ? ("good" as const) : ("attention" as const),
      freshness: freshnessFromDate(lastCheckIn?.createdAt),
    };
  }
  return {
    value: formatSleep(stored?.sleepHours),
    detail: stored?.sleepHours ? "Mais antigo •" : "Atualizar",
    tone: sleepTone(stored?.sleepHours),
    freshness: stored?.sleepHours ? ("old" as const) : ("missing" as const),
  };
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

function freshnessFromDate(value?: string): MobileDataCardProps["freshness"] {
  if (!value) return "missing";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return "old";
}

function freshnessLabel(value?: string) {
  const freshness = freshnessFromDate(value);
  if (freshness === "today") return "Hoje";
  if (freshness === "yesterday") return "Ontem";
  if (freshness === "old") return "Mais antigo";
  return "Atualizar";
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

function scoreRiskLabel(score: number | null) {
  if (score == null) return "Avaliação pendente";
  if (score >= 80) return "Risco baixo";
  if (score >= 50) return "Risco moderado";
  return "Risco alto";
}

function scoreRiskClass(score: number | null) {
  if (score == null) return "bg-[#eef3f1] text-[#536b68]";
  if (score >= 80) return "bg-[#e8f5ef] text-[#2f6760]";
  if (score >= 50) return "bg-[#fff7dc] text-[#9a5b12]";
  return "bg-[#ffece7] text-[#c14525]";
}

function ScoreGauge({ score }: { score: number | null }) {
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  return (
    <div
      className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#49c7ae_var(--score),#eef3f1_var(--score)_100%)] p-2"
      style={{ "--score": `${safeScore}%` } as React.CSSProperties}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white shadow-inner">
        <span className="font-sans text-2xl font-semibold text-[#10201f]">{score ?? "—"}</span>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getTrend(current: number | null, previous: number | null) {
  if (current == null || previous == null) {
    return {
      label: "Estável",
      mobileLabel: "Estável desde a última avaliação",
      status: "Estável",
      healthText: "Sua saúde está estável.",
      textClass: "text-[#536b68]",
      delta: 0,
      icon: Minus,
      tone: "bg-[#eef3f1] text-[#536b68]",
    };
  }
  const delta = current - previous;
  if (delta >= 3)
    return {
      label: `Subiu ${delta} pts`,
      mobileLabel: `↗ +${delta} pontos desde última semana`,
      status: "Melhorando",
      healthText: "Seu risco melhorou desde a última avaliação.",
      textClass: "text-[#2f6760]",
      delta,
      icon: ArrowUp,
      tone: "bg-[#e8f5ef] text-[#2f6760]",
    };
  if (delta <= -3)
    return {
      label: `Desceu ${Math.abs(delta)} pts`,
      mobileLabel: `↘ ${Math.abs(delta)} pontos desde última semana`,
      status: "Atenção",
      healthText: "Vale atualizar seus dados hoje.",
      textClass: "text-[#9a5b12]",
      delta,
      icon: ArrowDown,
      tone: "bg-[#fff3e8] text-[#9a5b12]",
    };
  return {
    label: "Estável",
    mobileLabel: "Estável desde a última semana",
    status: "Estável",
    healthText: "Sua saúde está estável.",
    textClass: "text-[#536b68]",
    delta,
    icon: Minus,
    tone: "bg-[#eef3f1] text-[#536b68]",
  };
}

function buildCarelitoInsight(
  stored: StoredResult | null,
  lastCheckIn: LastCheckIn | null,
  trend: ReturnType<typeof getTrend>,
  score: number | null,
) {
  const pressure = getLatestPressure(stored, lastCheckIn);
  const sleep = getSleepSummary(stored, lastCheckIn);

  if (pressure.tone === "risk") {
    return {
      speech: "Vamos acompanhar sua pressão de perto hoje?",
      text: "Sua pressão mais recente está alta. Registrar uma nova medida em repouso ajuda a entender se isso foi pontual ou recorrente.",
      expression: "thoughtful" as const,
    };
  }

  if (sleep.tone === "good") {
    return {
      speech: "Você está indo bem! Vamos melhorar mais 1%?",
      text: "Seu sono está dentro de um padrão positivo. Manter essa rotina ajuda seu coração ao longo do tempo.",
      expression: "happy" as const,
    };
  }

  if (trend.delta >= 3) {
    return {
      speech: "Seu score melhorou. Continue assim.",
      text: "Seu risco cardiovascular melhorou desde a última avaliação. Pequenas atualizações mantêm esse acompanhamento mais preciso.",
      expression: "confident" as const,
    };
  }

  if (score != null && score < 50) {
    return {
      speech: "Vamos focar no próximo passo com calma.",
      text: "Seu score pede atenção. Comece registrando pressão, peso ou glicemia hoje para deixar seu relatório mais completo.",
      expression: "thoughtful" as const,
    };
  }

  return {
    speech: "Você está indo bem! Vamos melhorar mais 1%?",
    text: "Seu acompanhamento está estável. Registrar um indicador hoje ajuda a enxergar tendências com mais clareza.",
    expression: "confident" as const,
  };
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

function isDailyCheckinDoneToday() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("htcare:daily-checkin-date") === todayKey();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysSinceLastOpen(userId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`htcare:activity-days:${userId}`);
    const days = raw ? Object.keys(JSON.parse(raw) as Record<string, unknown>) : [];
    const previousDays = days.filter((day) => day !== todayKey()).sort();
    const lastPreviousDay = previousDays.at(-1);
    if (!lastPreviousDay) return null;
    const lastOpenAt = new Date(`${lastPreviousDay}T12:00:00`).getTime();
    return Math.floor((Date.now() - lastOpenAt) / 86_400_000);
  } catch {
    return null;
  }
}

function getRecommendedAction(
  score: number | null,
  previousScore: number | null,
  lastAssessment: string | null,
  factors: string[],
  lastCheckIn: LastCheckIn | null,
) {
  const normalizedFactors = factors.join(" ").toLowerCase();
  const weekday = new Date().getDay();
  const pressure = getLatestPressure(null, lastCheckIn);
  const hasHypertension =
    normalizedFactors.includes("pressão") ||
    normalizedFactors.includes("hipertensão") ||
    pressure.tone === "risk" ||
    pressure.tone === "attention";
  const sedentary =
    normalizedFactors.includes("sedent") || normalizedFactors.includes("atividade física");
  const diabetes = normalizedFactors.includes("diabetes") || normalizedFactors.includes("glicemia");
  const pressureDays = lastCheckIn?.createdAt
    ? Math.floor((Date.now() - new Date(lastCheckIn.createdAt).getTime()) / 86_400_000)
    : 999;

  if (score == null) {
    return {
      title: "Complete sua avaliação",
      text: "Responda o questionário para gerar seu primeiro score cardiovascular.",
    };
  }

  if (previousScore != null && score < previousScore - 2) {
    return {
      title: `Seu score caiu ${previousScore - score} pontos`,
      text: "Faça um check-in agora para entender o que mudou e ajustar o próximo passo.",
    };
  }

  if (hasHypertension && pressureDays > 2) {
    return {
      title: `Você não mede sua pressão há ${pressureDays} dias`,
      text: "Leva 2 minutos. Registre uma medida em repouso para comparar com os últimos dados.",
    };
  }

  if (hasHypertension && weekday === 2) {
    return {
      title: "Registre sua pressão de hoje",
      text: "Compare com o último valor e veja se a tendência está estável.",
    };
  }

  if (sedentary && weekday === 3) {
    return {
      title: "10 minutos de caminhada hoje",
      text: "Você não se moveu muito esta semana. Uma ação pequena já conta.",
    };
  }

  if (diabetes && weekday === 2) {
    return {
      title: "Registre sua glicemia hoje",
      text: "Um valor manual ajuda a enxergar tendência ao longo do tempo.",
    };
  }

  if (weekday === 1) {
    return {
      title: "Comece a semana com uma troca simples",
      text: "Troque o refrigerante por água no almoço hoje. Só isso.",
    };
  }

  if (weekday === 5) {
    return {
      title: "Final de semana chegando",
      text: "Reduza o sal hoje e mantenha sua pressão mais previsível.",
    };
  }

  if (!lastAssessment) {
    return {
      title: "Registre sua pressão de hoje",
      text: "Uma medida simples ajuda a manter seu acompanhamento mais preciso.",
    };
  }

  return {
    title: "Atualize um indicador hoje",
    text: "Pressão, peso, glicemia ou sono: um registro pequeno deixa seu relatório mais útil.",
  };
}
