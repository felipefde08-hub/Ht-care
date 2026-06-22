import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  FileText,
  LineChart as LineChartIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORIES, classifyRisk, getTrendLabel, toneClasses } from "@/lib/cardiovascular";
import { fetchPatient, fetchPatientCardioLogs } from "@/lib/data";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  head: () => ({ meta: [{ title: "Perfil da paciente — HTCare" }] }),
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = useParams({ from: "/_authenticated/pacientes/$id" });
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatient(id),
  });
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["patient-cardio-logs", id],
    queryFn: () => fetchPatientCardioLogs(id),
  });

  if (loadingPatient || loadingLogs) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }
  if (!patient) return <p className="text-muted-foreground">Paciente não encontrada.</p>;

  const history = logs ?? [];
  const latest = history.at(-1);
  const previous = history.length >= 2 ? history.at(-2) : null;
  const delta = latest && previous ? latest.heart_score - previous.heart_score : null;
  const chartData = history.map((item) => ({
    date: new Date(item.created_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    "Heart Score": item.heart_score,
    Pressao: item.score_pressure,
    Adesao: item.score_adherence,
    Metabolico: item.score_metabolic,
    Habitos: item.score_habits,
    Sintomas: item.score_symptoms,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/pacientes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-2xl border border-border bg-card p-6 shadow-soft"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-foreground text-background font-display text-xl font-bold">
              {patient.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl font-extrabold text-foreground">
                {patient.name}
              </h1>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {patient.age != null && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {patient.age} anos
                  </span>
                )}
                {patient.phone && <span>{patient.phone}</span>}
                <span>{history.length} registros</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <Link to="/paciente-dashboard/$id" params={{ id: patient.id }}>
                <Sparkles className="h-4 w-4" /> App da paciente
              </Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/checkin/$patientId" params={{ patientId: patient.id }}>
                <Plus className="h-4 w-4" /> Novo registro
              </Link>
            </Button>
          </div>
        </div>
        {patient.notes && (
          <div className="mt-5 rounded-xl bg-muted/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Observações clínicas
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">{patient.notes}</p>
          </div>
        )}
      </motion.section>

      {!latest ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center"
        >
          <h3 className="font-display text-xl font-extrabold text-foreground">
            Nenhum registro cardiovascular ainda
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            O primeiro registro cria a linha de base para acompanhar pressão, adesão, sintomas,
            fatores de risco e evolução.
          </p>
          <Button variant="hero" className="mt-6" asChild>
            <Link to="/checkin/$patientId" params={{ patientId: patient.id }}>
              <Plus className="h-4 w-4" /> Iniciar acompanhamento
            </Link>
          </Button>
        </motion.section>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
            >
              <ScoreRing value={latest.heart_score} label="Heart Score" size={144} />
              <div className="mt-4 flex justify-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    toneClasses(classifyRisk(latest.heart_score).tone),
                  )}
                >
                  {classifyRisk(latest.heart_score).label}
                </span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {getTrendLabel(delta)}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Último registro: {new Date(latest.created_at).toLocaleDateString("pt-BR")}
              </p>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.06 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <h2 className="font-display text-xl font-extrabold text-foreground">
                Resumo clínico
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Pressão" value={`${latest.systolic}/${latest.diastolic}`} />
                <Metric label="Frequência" value={`${latest.heart_rate} bpm`} />
                <Metric label="Adesão" value={`${latest.medication_adherence}/10`} />
                <Metric label="Sintomas" value={`${latest.symptoms}/10`} />
              </div>
              <div className="mt-5 space-y-4">
                {CATEGORIES.map((category) => {
                  const value = latest[category.scoreField];
                  const level = classifyRisk(value);
                  return (
                    <div key={category.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{category.label}</span>
                        <span className="font-semibold text-muted-foreground">
                          {Math.round(value)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            level.tone === "success"
                              ? "bg-success"
                              : level.tone === "warning"
                                ? "bg-warning"
                                : "bg-destructive",
                          )}
                          style={{ width: `${Math.max(2, value)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-extrabold text-foreground">
                Evolução dos scores
              </h2>
            </div>
            <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="Heart Score"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Pressao"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Adesao"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Sintomas"
                    stroke="var(--chart-4)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-extrabold text-foreground">
                Linha do tempo
              </h2>
            </div>
            <div className="mt-5 space-y-3">
              {[...history].reverse().map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index, 6) * 0.04 }}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {new Date(item.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PA {item.systolic}/{item.diastolic} · adesão {item.medication_adherence}/10
                        · sintomas {item.symptoms}/10 · atividade {item.activity}x/semana
                      </p>
                    </div>
                    <span className="font-display text-2xl font-extrabold text-foreground">
                      {Math.round(item.heart_score)}
                    </span>
                  </div>
                  {item.exams_pending && (
                    <p className="mt-3 rounded-lg bg-warning/15 p-3 text-sm text-warning-foreground">
                      Exames pendentes registrados.
                    </p>
                  )}
                  {item.clinical_notes && (
                    <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                      {item.clinical_notes}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
