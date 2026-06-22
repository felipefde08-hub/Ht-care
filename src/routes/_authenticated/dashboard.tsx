import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, HeartPulse, LineChart, Plus, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchCardioLogs,
  fetchPatients,
  monthlyAverage,
  needsFollowUp,
  type CardioLog,
  type Patient,
} from "@/lib/data";
import { classifyRisk, toneClasses } from "@/lib/cardiovascular";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HTCare" }] }),
  component: Dashboard,
});

function latestByPatient(logs: CardioLog[]) {
  const map = new Map<string, CardioLog[]>();
  for (const item of logs) {
    const arr = map.get(item.patient_id) ?? [];
    arr.push(item);
    map.set(item.patient_id, arr);
  }
  for (const arr of map.values())
    arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  return map;
}

function Dashboard() {
  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["cardio-logs"],
    queryFn: fetchCardioLogs,
  });

  if (loadingPatients || loadingLogs) return <DashboardSkeleton />;

  const pts = patients ?? [];
  const items = logs ?? [];
  const byPatient = latestByPatient(items);
  const latest = pts.map((patient) => ({ patient, log: byPatient.get(patient.id)?.at(-1) }));
  const latestLogs = latest.map((item) => item.log).filter(Boolean) as CardioLog[];
  const avgScore = latestLogs.length
    ? Math.round(latestLogs.reduce((sum, item) => sum + item.heart_score, 0) / latestLogs.length)
    : 0;
  const missing = latest.filter(({ log }) => needsFollowUp(log?.created_at ?? null));
  const alerts = latest.filter(
    ({ log }) =>
      log && (log.heart_score < 58 || log.systolic >= 145 || log.medication_adherence <= 6),
  );
  const monthly = monthlyAverage(items);
  const prioritized = [...latest].sort(
    (a, b) => (a.log?.heart_score ?? 0) - (b.log?.heart_score ?? 0),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Radar da clínica
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Prevenção cardiovascular contínua
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Priorize pacientes por risco, pressão, adesão e necessidade de retorno.
          </p>
        </div>
        <Button asChild>
          <Link to="/pacientes">
            <Plus className="h-4 w-4" /> Novo paciente
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={HeartPulse}
          label="Heart Score médio"
          value={avgScore || "—"}
          tone="primary"
          delay={0}
        />
        <StatCard
          icon={Users}
          label="Pacientes monitorados"
          value={pts.length}
          tone="muted"
          delay={0.05}
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertas clínicos"
          value={alerts.length}
          tone={alerts.length ? "warning" : "success"}
          delay={0.1}
        />
        <StatCard
          icon={LineChart}
          label="Sem registro recente"
          value={missing.length}
          tone={missing.length ? "warning" : "success"}
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-foreground">
                Evolução populacional
              </h2>
              <p className="text-sm text-muted-foreground">
                Média mensal do Heart Score dos pacientes acompanhados.
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/pacientes">
                Ver pacientes <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 h-72">
            {monthly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="heartArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#heartArea)"
                    name="Heart Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Registre dados para visualizar evolução." />
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.16 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h2 className="font-display text-xl font-extrabold text-foreground">
            Pacientes priorizados
          </h2>
          <p className="text-sm text-muted-foreground">
            Risco, pressão, adesão e retorno em uma lista acionável.
          </p>
          <div className="mt-5 space-y-3">
            {prioritized.slice(0, 7).map(({ patient, log }) => {
              const level = classifyRisk(log?.heart_score ?? 0);
              return (
                <Link
                  key={patient.id}
                  to="/pacientes/$id"
                  params={{ id: patient.id }}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border p-3 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {log
                        ? `${log.systolic}/${log.diastolic} mmHg · adesão ${log.medication_adherence}/10`
                        : "Sem dados recentes"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "h-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      toneClasses(level.tone),
                    )}
                  >
                    {log?.heart_score ?? "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: "primary" | "success" | "warning" | "muted";
  delay?: number;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-foreground text-background",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="rounded-2xl border border-border bg-card p-6 shadow-soft"
    >
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", toneMap[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <Skeleton className="h-12 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
