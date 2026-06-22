import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  CalendarCheck,
  HeartPulse,
  Pill,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { recommendationFor } from "@/lib/cardiovascular";
import { fetchPatient, fetchPatientCardioLogs, monthlyAverage } from "@/lib/data";
import { ScoreRing } from "@/components/ScoreRing";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/paciente-dashboard/$id")({
  head: () => ({ meta: [{ title: "App da paciente — HTCare" }] }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const { id } = useParams({ from: "/_authenticated/paciente-dashboard/$id" });
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatient(id),
  });
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["patient-cardio-logs", id],
    queryFn: () => fetchPatientCardioLogs(id),
  });

  if (loadingPatient || loadingLogs)
    return <Skeleton className="mx-auto h-[520px] max-w-6xl rounded-3xl" />;
  if (!patient) return <p className="text-muted-foreground">Paciente não encontrada.</p>;

  const history = logs ?? [];
  const latest = history.at(-1);
  const previous = history.length >= 2 ? history.at(-2) : null;
  const delta = latest && previous ? latest.heart_score - previous.heart_score : null;
  const monthly = monthlyAverage(history);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/pacientes/$id"
        params={{ id }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Perfil da paciente
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="overflow-hidden rounded-3xl border border-border bg-foreground text-background shadow-card"
      >
        <div className="grid gap-8 p-7 lg:grid-cols-[1fr_320px] lg:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-background/55">
              App da paciente
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              {patient.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-background/70">
              Acompanhe seu coração entre consultas com registros simples, metas semanais e uma
              visão clara da sua evolução.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <PremiumMetric
                icon={CalendarCheck}
                label="Registros"
                value={history.length}
                delay={0.1}
              />
              <PremiumMetric
                icon={TrendingUp}
                label="Tendência"
                value={
                  delta == null ? "Base" : delta >= 0 ? `+${Math.round(delta)}` : Math.round(delta)
                }
                delay={0.16}
              />
              <PremiumMetric
                icon={Award}
                label="Conquistas"
                value={buildAchievements(history).length}
                delay={0.22}
              />
            </div>
          </div>
          <div className="rounded-3xl bg-background p-6 text-foreground">
            {latest ? (
              <>
                <ScoreRing value={latest.heart_score} label="Heart Score" size={170} />
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  {recommendationFor(latest.heart_score)}
                </p>
              </>
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Seu primeiro registro cria a linha de base.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h2 className="font-display text-xl font-extrabold text-foreground">Evolução mensal</h2>
          <div className="mt-5 h-72">
            {monthly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="patientArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
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
                    fill="url(#patientArea)"
                    name="Heart Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
                Sem dados suficientes para gráfico.
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h2 className="font-display text-xl font-extrabold text-foreground">Agora</h2>
          <div className="mt-5 space-y-3">
            <StatusLine
              icon={HeartPulse}
              label="Pressão recente"
              value={latest ? `${latest.systolic}/${latest.diastolic}` : "Sem registro"}
            />
            <StatusLine
              icon={Pill}
              label="Adesão"
              value={latest ? `${latest.medication_adherence}/10` : "Sem registro"}
            />
            <StatusLine
              icon={CalendarCheck}
              label="Exames"
              value={latest?.exams_pending ? "Pendentes" : "Em dia"}
            />
          </div>
        </motion.section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h2 className="font-display text-xl font-extrabold text-foreground">Conquistas</h2>
          <div className="mt-5 space-y-3">
            {buildAchievements(history).map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border p-3 text-sm font-medium text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h2 className="font-display text-xl font-extrabold text-foreground">Recomendações</h2>
          <div className="mt-4 grid gap-3">
            <Recommendation text="Registre pressão e sintomas de forma consistente para enxergar tendências." />
            <Recommendation text="Use a adesão como um marcador de rotina, não como julgamento." />
            <Recommendation text="Compartilhe seu resumo com a equipe antes das consultas de retorno." />
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function PremiumMetric({
  icon: Icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="rounded-2xl bg-background/10 p-4"
    >
      <Icon className="h-4 w-4 text-background/70" />
      <p className="mt-3 font-display text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-background/60">{label}</p>
    </motion.div>
  );
}

function StatusLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/55 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-background text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function buildAchievements(
  history: { heart_score: number; activity: number; medication_adherence: number }[],
) {
  const achievements = [];
  if (history.length >= 4) achievements.push("4 semanas acompanhadas");
  if (history.some((item) => item.heart_score >= 80)) achievements.push("Heart Score acima de 80");
  if (history.some((item) => item.activity >= 3)) achievements.push("Rotina ativa registrada");
  if (history.some((item) => item.medication_adherence >= 9))
    achievements.push("Alta adesão registrada");
  return achievements.length ? achievements : ["Primeiro passo registrado"];
}

function Recommendation({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">{text}</div>
  );
}
