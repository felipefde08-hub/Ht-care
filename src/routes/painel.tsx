import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FlaskConical,
  HeartPulse,
  Minus,
  Moon,
  Scale,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CarelitoChat } from "@/components/CarelitoChat";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
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
}

interface DynamicQueryBuilder {
  eq: (column: string, value: string) => DynamicQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQueryBuilder;
  limit: (count: number) => DynamicQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
}

interface DynamicSupabaseTable {
  select: (columns: string) => DynamicQueryBuilder;
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
  const recommendedAction = getRecommendedAction(currentScore, latest?.createdAt ?? null);
  const insight = buildCarelitoInsight(stored, lastCheckIn, trend, currentScore);
  const initials = getInitials(firstName);

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-[#10201f]/8 bg-white text-[#10201f] shadow-soft"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {examRequest && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#49c7ae]" />
            )}
          </button>
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white bg-[#e8f5ef] text-sm font-black text-[#2f6760] shadow-soft">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
        </div>
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
          <div className="relative min-h-24">
            <div className="pr-24">
              <p className="text-[1.75rem] font-semibold leading-tight">Bom dia, {firstName}! 👋</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[#536b68]">
                Que tal cuidar do seu coração hoje?
              </p>
            </div>
            <Carelito className="absolute right-0 top-0 h-20 w-20" expression="confident" />
            <div className="absolute right-14 top-16 max-w-[13rem] rounded-2xl rounded-tr-md bg-white px-3 py-2 text-[0.72rem] font-bold leading-4 text-[#2f6760] shadow-soft">
              {insight.speech}
            </div>
          </div>

          <section className="mt-5 overflow-hidden rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-[0_26px_90px_-62px_rgba(16,32,31,0.62)]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ffece7] text-[#dc3f35]">
                    <HeartPulse className="h-5 w-5" fill="currentColor" />
                  </span>
                  <p className="font-sans text-lg font-semibold">Seu coração hoje</p>
                </div>
                <div className="mt-5 flex items-end gap-2">
                  <span className="font-sans text-6xl font-semibold leading-none">
                    {currentScore ?? "—"}
                  </span>
                  <span className="pb-1 text-lg font-semibold text-[#78908d]">/100</span>
                </div>
                <p
                  className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${scoreRiskClass(currentScore)}`}
                >
                  {scoreRiskLabel(currentScore)}
                </p>
                <p className={`mt-3 text-sm font-bold ${trend.textClass}`}>{trend.mobileLabel}</p>
                <Link
                  to="/meu-risco"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#2f8fc8]"
                >
                  Ver evolução <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="w-32 shrink-0 text-center">
                <ScoreGauge score={currentScore} />
                <p className="mt-3 text-sm font-bold text-[#10201f]">{trend.status}</p>
                <p className="mt-1 text-[0.72rem] leading-4 text-[#78908d]">{trend.healthText} ⓘ</p>
              </div>
            </div>
          </section>

          <section className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
            {mobileHealthData.map((item) => (
              <CompactClinicalShortcut key={item.label} {...item} />
            ))}
          </section>

          <section className="mt-3 flex items-center gap-3 rounded-[1.7rem] border border-[#10201f]/8 bg-white p-4 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f6760]">
                Insight do Carelito
              </p>
              <p className="mt-2 text-sm font-semibold leading-5 text-[#536b68]">{insight.text}</p>
            </div>
            <Carelito className="h-16 w-16 shrink-0" expression={insight.expression} />
          </section>

          {examRequest && <ExamStatusCard request={examRequest} compact />}

          <Button
            size="xl"
            className="mt-3 min-h-14 w-full rounded-[1.25rem] bg-[#10201f] text-base font-semibold text-white shadow-[0_20px_60px_-36px_rgba(16,32,31,0.75)]"
            asChild
          >
            <Link to="/check-in">
              Registrar agora <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>

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
      "id,status,observacao_medico,laboratorio_nome,laboratorio_endereco,laboratorio_telefone",
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
            <Button className="mt-4 rounded-full bg-[#10201f] font-semibold" asChild>
              <Link to="/meu-risco">Ver instruções de agendamento</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function getExamStatusContent(request: ExamRequest) {
  if (request.status === "autorizado") {
    return {
      icon: CheckCircle2,
      tone: "bg-[#e8f5ef] text-[#2f6760]",
      title: "Exame autorizado!",
      text: "Agende agora no laboratório parceiro.",
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
    text: "Você receberá a autorização e as instruções pelo WhatsApp em até 24 horas.",
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

function getRecommendedAction(score: number | null, lastCheckIn: string | null) {
  if (score == null) {
    return {
      title: "Complete sua avaliação",
      text: "Responda o questionário para gerar seu primeiro score cardiovascular.",
    };
  }
  if (!lastCheckIn) {
    return {
      title: "Registre sua pressão de hoje",
      text: "Uma medida simples ajuda a manter seu acompanhamento mais preciso.",
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
      title: "Registre sua pressão de hoje",
      text: "Já passou uma semana desde sua última atualização. Leva menos de um minuto.",
    };
  }
  return {
    title: "Seu acompanhamento está em dia",
    text: "Volte quando houver mudanças relevantes ou faça um novo check-in na próxima semana.",
  };
}
