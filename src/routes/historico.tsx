import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FileText,
  HeartPulse,
  Lock,
  Ruler,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { getChallengeStats, getWeeklyMissions } from "@/lib/challenge";
import {
  getActiveDaysThisMonth,
  getUserActivityEvents,
  recordUserActivity,
  type UserActivityEvent,
} from "@/lib/user-activity";

export const Route = createFileRoute("/historico")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Histórico — HTCare" }] }),
  component: HistoryPage,
});

interface CheckInData {
  createdAt: string;
  systolic?: number | null;
  diastolic?: number | null;
  glucose?: number | null;
  weight?: number | null;
  feeling?: string;
  symptoms?: string[];
}

interface ScorePoint {
  score: number;
  createdAt: string;
  source: string;
}

interface LocalScorePoint extends ScorePoint {
  checkIn?: {
    systolic?: string;
    diastolic?: string;
    glucose?: string;
    weight?: string;
    feeling?: string;
    symptoms?: string[];
  };
}

function HistoryPage() {
  const { user } = Route.useRouteContext();
  const [history, setHistory] = useState<ScorePoint[]>([]);
  const [checkins, setCheckins] = useState<CheckInData[]>([]);
  const [activeDaysThisMonth, setActiveDaysThisMonth] = useState(0);
  const [activityEvents, setActivityEvents] = useState<UserActivityEvent[]>([]);
  const [activeTab, setActiveTab] = useState<HistoryTab>("overview");

  useEffect(() => {
    async function loadData() {
      const raw = window.localStorage.getItem("htcare:score-history");
      const localHistory = raw ? (JSON.parse(raw) as LocalScorePoint[]) : [];
      setHistory(localHistory);
      setCheckins(
        localHistory
          .filter((item) => item.checkIn)
          .map((item) => ({
            createdAt: item.createdAt,
            systolic: item.checkIn?.systolic ? Number(item.checkIn.systolic) : null,
            diastolic: item.checkIn?.diastolic ? Number(item.checkIn.diastolic) : null,
            glucose: item.checkIn?.glucose ? Number(item.checkIn.glucose) : null,
            weight: item.checkIn?.weight ? Number(item.checkIn.weight) : null,
            feeling: item.checkIn?.feeling,
            symptoms: item.checkIn?.symptoms,
          })),
      );

      const [
        { data: assessments, error: assessmentsError },
        { data: remoteCheckins, error: checkinsError },
      ] = await Promise.all([
        supabase
          .from("assessments")
          .select("score,origem,created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("checkins")
          .select("created_at,humor,sintomas,pressao_sistolica,pressao_diastolica,glicemia,peso_kg")
          .order("created_at", { ascending: true }),
      ]);

      if (assessmentsError) console.error(assessmentsError);
      if (checkinsError) console.error(checkinsError);

      if (assessments?.length) {
        setHistory(
          assessments.map((item) => ({
            score: Number(item.score),
            createdAt: item.created_at,
            source: item.origem,
          })),
        );
      }
      if (remoteCheckins?.length) {
        setCheckins(
          remoteCheckins.map((item) => ({
            createdAt: item.created_at,
            systolic: item.pressao_sistolica,
            diastolic: item.pressao_diastolica,
            glucose: item.glicemia,
            weight: item.peso_kg,
            feeling: item.humor,
            symptoms: item.sintomas,
          })),
        );
      }

      await recordUserActivity(user.id, "app_open");
      setActiveDaysThisMonth(await getActiveDaysThisMonth(user.id));
      setActivityEvents(await getUserActivityEvents(user.id, 40));
    }

    void loadData();
  }, [user.id]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [history],
  );

  const scoreData = sortedHistory.map((item) => ({
    date: formatShortDate(item.createdAt),
    score: item.score,
  }));

  const sortedCheckins = useMemo(
    () => [...checkins].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [checkins],
  );

  const pressureData = sortedCheckins
    .filter((item) => item.systolic && item.diastolic)
    .map((item) => ({
      date: formatShortDate(item.createdAt),
      sistolica: Number(item.systolic),
      diastolica: Number(item.diastolic),
    }))
    .filter((item) => item.sistolica > 0 && item.diastolica > 0);

  const glucoseData = sortedCheckins
    .filter((item) => item.glucose)
    .map((item) => ({
      date: formatShortDate(item.createdAt),
      glicemia: Number(item.glucose),
    }))
    .filter((item) => item.glicemia > 0);

  const weightData = sortedCheckins
    .map((item) => ({
      date: formatShortDate(item.createdAt),
      peso: Number(item.weight),
    }))
    .filter((item) => item.peso > 0);
  const onboardingState = readOnboardingState();
  const weeklyMissions = useMemo(
    () => getWeeklyMissions(onboardingState.factors),
    [onboardingState.factors],
  );
  const challengeStats = getChallengeStats(weeklyMissions);
  const achievements = buildAchievements(challengeStats, activityEvents, onboardingState);
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked);
  const scoreEvolution = getScoreEvolution(sortedHistory);

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
            {challengeStats.pendingThisWeek > 0 && (
              <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff9f43] px-1 text-[0.62rem] font-bold leading-none text-white">
                {challengeStats.pendingThisWeek}
              </span>
            )}
          </button>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-[#10201f]/8 bg-white text-[#10201f] shadow-soft"
            aria-label="Calendário de atividades"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
        </div>
        <nav className="hidden items-center gap-2 sm:flex">
          <Button variant="ghost" asChild>
            <Link to="/perfil">Perfil</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/painel">Voltar ao painel</Link>
          </Button>
        </nav>
      </div>

      <section className="mx-auto mt-5 max-w-md sm:hidden">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f8fc8]">
              Histórico
            </p>
            <h1 className="mt-2 font-sans text-3xl font-semibold leading-tight">
              Acompanhe sua evolução e celebre cada conquista!
            </h1>
          </div>
          <motion.div
            animate={{ rotate: [-1.5, 1.5, -1.5], y: [0, -2, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-24 w-24 shrink-0"
          >
            <Carelito className="h-full w-full" expression="thoughtful" />
          </motion.div>
        </motion.div>

        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2">
          {historyTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-[#10201f] text-white shadow-soft"
                  : "bg-white text-[#78908d]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <MobileCard title="Visão geral">
              <div className="grid grid-cols-2 gap-2">
                <OverviewMetric
                  icon={HeartPulse}
                  label="Evolução geral"
                  value={scoreEvolution ? `${scoreEvolution.percent}%` : "Em breve"}
                  detail={
                    scoreEvolution
                      ? scoreEvolution.label
                      : "Disponível após sua próxima reavaliação"
                  }
                  tone="blue"
                />
                <OverviewMetric
                  icon={Activity}
                  label="Dias ativos"
                  value={`${activeDaysThisMonth}`}
                  detail="este mês"
                  tone="green"
                />
                <OverviewMetric
                  icon={Award}
                  label="Conquistas"
                  value={`${unlockedAchievements.length}`}
                  detail="alcançadas"
                  tone="gold"
                />
                <OverviewMetric
                  icon={Sparkles}
                  label="Sequência"
                  value={`${challengeStats.streakWeeks}`}
                  detail="semanas atuais"
                  tone="dark"
                />
              </div>
            </MobileCard>

            <MobileCard title="Evolução do seu risco">
              {scoreData.length >= 2 ? (
                <div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreData} margin={{ left: -18, right: 10, top: 10 }}>
                        <CartesianGrid stroke="#e5ecea" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78908d" }} />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[25, 50, 80]}
                          tickFormatter={(value) =>
                            value === 25 ? "Alto" : value === 50 ? "Moderado" : "Baixo"
                          }
                          tick={{ fontSize: 11, fill: "#78908d" }}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="score"
                          name="Score"
                          stroke="#2f8fc8"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#49c7ae", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {scoreEvolution && (
                    <p className="mt-3 rounded-[1.2rem] bg-[#f7faf9] p-3 text-sm leading-5 text-[#536b68]">
                      {scoreEvolution.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-[1.4rem] bg-[#f7faf9] p-4">
                  <Carelito className="h-16 w-16 shrink-0" expression="confident" />
                  <p className="text-sm leading-5 text-[#536b68]">
                    Seu gráfico de evolução vai aparecer aqui assim que você tiver pelo menos 2
                    avaliações registradas. Continue acompanhando!
                  </p>
                </div>
              )}
            </MobileCard>

            <MobileCard title="Últimas atividades">
              <ActivityFeed events={activityEvents} />
            </MobileCard>

            <MobileCard title="Conquistas recentes">
              <AchievementList achievements={unlockedAchievements} />
            </MobileCard>
          </div>
        )}

        {activeTab === "exams" && (
          <MobileEmptyState
            icon={FileText}
            title="Nenhum exame registrado ainda."
            text="Em breve você poderá conectar resultados de laboratórios parceiros."
          />
        )}

        {activeTab === "measures" && (
          <MobileCard title="Medidas registradas">
            <MeasuresList checkins={sortedCheckins} />
          </MobileCard>
        )}

        {activeTab === "activities" && (
          <MobileCard title="Atividades registradas">
            <ActivityFeed events={activityEvents.filter((event) => event.type === "mission")} />
          </MobileCard>
        )}

        {activeTab === "questionnaires" && (
          <MobileCard title="Questionários">
            <QuestionnaireList history={sortedHistory} />
          </MobileCard>
        )}
      </section>

      <section className="mx-auto mt-14 hidden max-w-6xl sm:block">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]"
        >
          Histórico
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="mt-4 font-sans text-5xl font-semibold leading-tight sm:text-7xl"
        >
          Evolução do score.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="mt-10 rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft sm:p-7"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-sans text-2xl font-semibold">Score ao longo do tempo</h2>
              <p className="mt-1 text-sm text-[#536b68]">
                Linha do tempo do score desde a avaliação inicial.
              </p>
            </div>
          </div>
          <div className="mt-6 h-80">
            {scoreData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData} margin={{ left: -20, right: 12, top: 12 }}>
                  <CartesianGrid stroke="#e5ecea" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#78908d" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#78908d" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="#10201f"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </motion.div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <SecondaryChart title="Peso" unit="kg" data={weightData} dataKey="peso" />
          <SecondaryChart title="Glicemia" unit="mg/dL" data={glucoseData} dataKey="glicemia" />
          <PressureChart data={pressureData} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-5 rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft sm:p-7"
        >
          <h2 className="font-sans text-2xl font-semibold">Check-ins anteriores</h2>
          <div className="mt-5 space-y-3">
            {[...sortedHistory].reverse().map((item, index) => (
              <motion.div
                key={`${item.createdAt}-${item.score}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index, 6) * 0.04 }}
                className="flex items-center justify-between rounded-2xl bg-[#f7faf9] p-5"
              >
                <div>
                  <p className="font-semibold">
                    {item.source === "check-in" ? "Check-in" : "Avaliação inicial"}
                  </p>
                  <p className="text-sm text-[#536b68]">
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <p className="font-sans text-3xl font-semibold">{item.score}</p>
              </motion.div>
            ))}
            {history.length === 0 && (
              <div className="rounded-2xl bg-[#f7faf9] p-6 text-[#536b68]">
                Nenhum histórico registrado ainda.
              </div>
            )}
          </div>
        </motion.div>
      </section>
      <MobileAppNav />
    </main>
  );
}

const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid rgba(16,32,31,0.08)",
  boxShadow: "0 20px 60px -34px rgba(16,32,31,0.55)",
  fontSize: 13,
};

function SecondaryChart({
  title,
  unit,
  data,
  dataKey,
}: {
  title: string;
  unit: string;
  data: Array<{ date: string } & Record<string, number | string>>;
  dataKey: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft"
    >
      <h2 className="font-sans text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[#536b68]">{unit}</p>
      <div className="mt-5 h-52">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -22, right: 8, top: 8 }}>
              <CartesianGrid stroke="#e5ecea" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78908d" }} />
              <YAxis tick={{ fontSize: 11, fill: "#78908d" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="#2f6760"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart compact />
        )}
      </div>
    </motion.div>
  );
}

function PressureChart({
  data,
}: {
  data: Array<{ date: string; sistolica: number; diastolica: number }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      className="rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft"
    >
      <h2 className="font-sans text-xl font-semibold">Pressão</h2>
      <p className="mt-1 text-sm text-[#536b68]">mmHg</p>
      <div className="mt-5 h-52">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -22, right: 8, top: 8 }}>
              <CartesianGrid stroke="#e5ecea" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78908d" }} />
              <YAxis tick={{ fontSize: 11, fill: "#78908d" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="sistolica"
                name="Sistólica"
                stroke="#10201f"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="diastolica"
                name="Diastólica"
                stroke="#2f6760"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart compact />
        )}
      </div>
    </motion.div>
  );
}

function EmptyChart({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`grid h-full place-items-center rounded-2xl bg-[#f7faf9] text-center text-sm text-[#78908d] ${
        compact ? "px-4" : "px-6"
      }`}
    >
      Sem dados suficientes ainda.
    </div>
  );
}

type HistoryTab = "overview" | "exams" | "measures" | "activities" | "questionnaires";

const historyTabs: Array<{ id: HistoryTab; label: string }> = [
  { id: "overview", label: "Visão geral" },
  { id: "exams", label: "Exames" },
  { id: "measures", label: "Medidas" },
  { id: "activities", label: "Atividades" },
  { id: "questionnaires", label: "Questionários" },
];

function MobileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      className="rounded-[1.8rem] border border-[#10201f]/8 bg-white p-4 shadow-soft"
    >
      <h2 className="font-sans text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "gold" | "dark";
}) {
  const toneClasses = {
    blue: "bg-[#e9f4fb] text-[#2f8fc8]",
    green: "bg-[#e8f5ef] text-[#2f6760]",
    gold: "bg-[#fff7dc] text-[#9a5b12]",
    dark: "bg-[#10201f] text-white",
  };
  return (
    <div className={`rounded-[1.25rem] p-3 ${toneClasses[tone]}`}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 text-[0.64rem] font-bold uppercase tracking-[0.1em] opacity-70">{label}</p>
      <p className="mt-1 font-sans text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-75">{detail}</p>
    </div>
  );
}

function ActivityFeed({ events }: { events: UserActivityEvent[] }) {
  if (!events.length) {
    return (
      <div className="rounded-[1.4rem] bg-[#f7faf9] p-4 text-sm leading-5 text-[#78908d]">
        Nenhuma atividade registrada ainda. Suas ações aparecem aqui conforme você usa o app.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 8).map((event) => {
        const Icon = activityIcon(event.type);
        return (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-[1.25rem] bg-[#f7faf9] p-3"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#2f6760] shadow-soft">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{event.title}</p>
              <p className="text-xs text-[#78908d]">{formatDateTime(event.createdAt)}</p>
            </div>
            <span className="rounded-full bg-[#e8f5ef] px-2.5 py-1 text-xs font-bold text-[#2f6760]">
              +{event.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MeasuresList({ checkins }: { checkins: CheckInData[] }) {
  const items = checkins
    .flatMap((item) => [
      item.weight
        ? { label: "Peso", value: `${item.weight} kg`, createdAt: item.createdAt, icon: Ruler }
        : null,
      item.systolic && item.diastolic
        ? {
            label: "Pressão arterial",
            value: `${item.systolic}/${item.diastolic} mmHg`,
            createdAt: item.createdAt,
            icon: HeartPulse,
          }
        : null,
      item.glucose
        ? {
            label: "Glicemia",
            value: `${item.glucose} mg/dL`,
            createdAt: item.createdAt,
            icon: Activity,
          }
        : null,
    ])
    .filter(Boolean) as Array<{
    label: string;
    value: string;
    createdAt: string;
    icon: LucideIcon;
  }>;

  if (!items.length) {
    return (
      <MobileEmptyState
        icon={Ruler}
        title="Nenhuma medida registrada ainda."
        text="Peso, pressão e glicemia aparecem aqui quando forem informados em check-ins."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={`${item.label}-${item.createdAt}`}
              className="flex items-center gap-3 rounded-[1.25rem] bg-[#f7faf9] p-3"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#2f8fc8] shadow-soft">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-[#78908d]">{formatDateTime(item.createdAt)}</p>
              </div>
              <p className="ml-auto text-sm font-bold">{item.value}</p>
            </div>
          );
        })}
    </div>
  );
}

function QuestionnaireList({ history }: { history: ScorePoint[] }) {
  const items = history.filter((item) => item.source === "onboarding" || item.source === "checkin");
  if (!items.length) {
    return (
      <MobileEmptyState
        icon={ClipboardList}
        title="Nenhum questionário registrado ainda."
        text="Quando você concluir uma avaliação, ela aparecerá aqui."
      />
    );
  }
  return (
    <div className="space-y-2">
      {[...items].reverse().map((item) => (
        <div
          key={`${item.source}-${item.createdAt}`}
          className="flex items-center gap-3 rounded-[1.25rem] bg-[#f7faf9] p-3"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#2f6760] shadow-soft">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {item.source === "check-in" || item.source === "checkin"
                ? "Check-in completo"
                : "Questionário inicial"}
            </p>
            <p className="text-xs text-[#78908d]">{formatDateTime(item.createdAt)}</p>
          </div>
          <p className="ml-auto font-sans text-xl font-semibold">{item.score}</p>
        </div>
      ))}
    </div>
  );
}

function AchievementList({ achievements }: { achievements: Achievement[] }) {
  if (!achievements.length) {
    return (
      <div className="flex items-center gap-3 rounded-[1.4rem] bg-[#f7faf9] p-4">
        <Carelito className="h-16 w-16 shrink-0" expression="confident" />
        <p className="text-sm leading-5 text-[#78908d]">
          Suas conquistas recentes vão aparecer aqui conforme você avança na jornada.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {achievements.slice(0, 3).map((achievement) => (
        <div
          key={achievement.id}
          className="flex items-center gap-3 rounded-[1.25rem] bg-[#f7faf9] p-3"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff7dc] text-[#9a5b12]">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">{achievement.title}</p>
            <p className="text-xs text-[#78908d]">{achievement.description}</p>
          </div>
          <CheckCircle2 className="ml-auto h-5 w-5 text-[#2f6760]" />
        </div>
      ))}
    </div>
  );
}

function MobileEmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      className="rounded-[1.8rem] border border-[#10201f]/8 bg-white p-5 text-center shadow-soft"
    >
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f7faf9] text-[#78908d]">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-sans text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#78908d]">{text}</p>
    </motion.div>
  );
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

function buildAchievements(
  stats: ReturnType<typeof getChallengeStats>,
  events: UserActivityEvent[],
  onboarding: ReturnType<typeof readOnboardingState>,
): Achievement[] {
  const foodMissions = events.filter(
    (event) => event.type === "mission" && event.metadata?.category === "food",
  ).length;
  const adequateSleepCheckins = events.filter(
    (event) => event.type === "checkin" && event.metadata?.sleep === "adequate",
  ).length;
  return [
    {
      id: "heart-in-day",
      title: "Coração em dia",
      description: "Questionário inicial concluído",
      unlocked: onboarding.hasQuestionnaire,
    },
    {
      id: "healthy-week",
      title: "Uma semana saudável",
      description: "Sequência semanal iniciada",
      unlocked: stats.streakWeeks >= 1,
    },
    {
      id: "mind-body",
      title: "Mente e corpo",
      description: "10 atividades ou missões registradas",
      unlocked: stats.progress.completions.length >= 10,
    },
    {
      id: "slept-well",
      title: "Dormiu bem",
      description: "5 registros de sono adequado",
      unlocked: adequateSleepCheckins >= 5,
    },
    {
      id: "conscious-food",
      title: "Alimentação consciente",
      description: "7 missões de alimentação concluídas",
      unlocked: foodMissions >= 7,
    },
  ];
}

function getScoreEvolution(history: ScorePoint[]) {
  if (history.length < 2) return null;
  const first = history[0].score;
  const last = history.at(-1)?.score ?? first;
  if (!first) return null;
  const percent = Math.round((Math.abs(last - first) / first) * 100);
  if (last > first) {
    return {
      percent,
      label: "melhora real",
      message: `Ótimo trabalho! Seu risco cardiovascular caiu ${percent}% desde sua primeira avaliação.`,
    };
  }
  if (last < first) {
    return {
      percent,
      label: "atenção",
      message: `Seu risco cardiovascular subiu ${percent}% desde sua primeira avaliação. Vale atualizar seus dados e seguir o plano com calma.`,
    };
  }
  return {
    percent: 0,
    label: "estável",
    message: "Seu risco cardiovascular se manteve estável desde sua primeira avaliação.",
  };
}

function readOnboardingState() {
  try {
    const raw = window.localStorage.getItem("htcare:onboarding");
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      hasQuestionnaire: Boolean(parsed),
      factors: (parsed?.result?.factors ?? []) as string[],
    };
  } catch {
    return { hasQuestionnaire: false, factors: [] };
  }
}

function activityIcon(type: UserActivityEvent["type"]) {
  if (type === "onboarding") return ClipboardList;
  if (type === "checkin") return HeartPulse;
  if (type === "mission") return Dumbbell;
  if (type === "data_update") return Ruler;
  return Activity;
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
