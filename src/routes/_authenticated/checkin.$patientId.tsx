import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, HeartPulse, Pill, Scale, ShieldAlert } from "lucide-react";
import { computeCardiovascularScores, type CardiovascularInput } from "@/lib/cardiovascular";
import { createCardioLog, fetchPatient } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/checkin/$patientId")({
  head: () => ({ meta: [{ title: "Registro cardiovascular — HTCare" }] }),
  component: CardioEntry,
});

const initial: CardiovascularInput = {
  systolic: 124,
  diastolic: 78,
  heartRate: 72,
  medicationAdherence: 8,
  activity: 3,
  symptoms: 1,
  examsPending: 0,
  weight: null,
  smoking: false,
  diabetes: false,
  cholesterol: false,
  hypertension: true,
  familyHistory: false,
  clinicalNotes: "",
};

function CardioEntry() {
  const { patientId } = useParams({ from: "/_authenticated/checkin/$patientId" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<CardiovascularInput>(initial);
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => fetchPatient(patientId),
  });
  const preview = computeCardiovascularScores(form);
  const mutation = useMutation({
    mutationFn: () => createCardioLog(patientId, form),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("Registro cardiovascular salvo.");
      navigate({ to: "/pacientes/$id", params: { id: patientId }, replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar registro"),
  });

  if (isLoading) return <Skeleton className="mx-auto h-96 max-w-3xl rounded-2xl" />;
  if (!patient) return <p className="text-muted-foreground">Paciente não encontrado.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/pacientes/$id"
        params={{ id: patientId }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Registro cardiovascular
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-foreground">
              {patient.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Atualize pressão, adesão, sintomas, exames e hábitos para alimentar o radar de risco.
            </p>
          </div>
          <div className="rounded-2xl bg-foreground p-5 text-background">
            <p className="text-xs uppercase tracking-[0.18em] text-background/60">Prévia</p>
            <p className="mt-2 font-display text-5xl font-extrabold">{preview.heart_score}</p>
            <p className="text-sm text-background/70">Heart Score</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <NumberField
            icon={HeartPulse}
            label="Pressão sistólica"
            value={form.systolic}
            suffix="mmHg"
            onChange={(systolic) => setForm({ ...form, systolic })}
          />
          <NumberField
            icon={HeartPulse}
            label="Pressão diastólica"
            value={form.diastolic}
            suffix="mmHg"
            onChange={(diastolic) => setForm({ ...form, diastolic })}
          />
          <NumberField
            icon={HeartPulse}
            label="Frequência cardíaca"
            value={form.heartRate}
            suffix="bpm"
            onChange={(heartRate) => setForm({ ...form, heartRate })}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Question
            icon={Pill}
            label="Adesão à medicação"
            value={form.medicationAdherence}
            onChange={(medicationAdherence) => setForm({ ...form, medicationAdherence })}
          />
          <Question
            label="Atividade física na semana"
            value={form.activity}
            min={0}
            max={7}
            suffix="x"
            onChange={(activity) => setForm({ ...form, activity })}
          />
          <Question
            icon={ShieldAlert}
            label="Sintomas relevantes"
            value={form.symptoms}
            min={0}
            max={10}
            inverse
            onChange={(symptoms) => setForm({ ...form, symptoms })}
          />
          <Question
            label="Exames pendentes"
            value={form.examsPending ?? 0}
            min={0}
            max={5}
            onChange={(examsPending) => setForm({ ...form, examsPending })}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="weight">Peso atual opcional</Label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="weight"
                type="number"
                className="pl-9"
                value={form.weight ?? ""}
                onChange={(e) =>
                  setForm({ ...form, weight: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="kg"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações clínicas</Label>
            <Textarea
              id="notes"
              value={form.clinicalNotes ?? ""}
              onChange={(e) => setForm({ ...form, clinicalNotes: e.target.value })}
              placeholder="Contexto do registro, sintomas, plano combinado ou orientação da equipe."
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <RiskCheck
            label="Hipertensão"
            checked={form.hypertension}
            onChange={(hypertension) => setForm({ ...form, hypertension })}
          />
          <RiskCheck
            label="Colesterol alto"
            checked={form.cholesterol}
            onChange={(cholesterol) => setForm({ ...form, cholesterol })}
          />
          <RiskCheck
            label="Diabetes"
            checked={form.diabetes}
            onChange={(diabetes) => setForm({ ...form, diabetes })}
          />
          <RiskCheck
            label="Tabagismo"
            checked={form.smoking}
            onChange={(smoking) => setForm({ ...form, smoking })}
          />
          <RiskCheck
            label="Histórico familiar"
            checked={form.familyHistory}
            onChange={(familyHistory) => setForm({ ...form, familyHistory })}
          />
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
            <MiniScore label="Pressão" value={preview.score_pressure} />
            <MiniScore label="Adesão" value={preview.score_adherence} />
            <MiniScore label="Metabólico" value={preview.score_metabolic} />
            <MiniScore label="Hábitos" value={preview.score_habits} />
            <MiniScore label="Sintomas" value={preview.score_symptoms} />
          </div>
          <Button
            variant="hero"
            size="lg"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar registro"}
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.section>
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold text-foreground">{label}</Label>
      </div>
      <div className="flex items-end gap-2">
        <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="pb-2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function Question({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  suffix,
  inverse,
  icon: Icon = HeartPulse,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  inverse?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">{label}</Label>
        </div>
        <span className="font-display text-2xl font-extrabold text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([next]) => onChange(next)}
        className="mt-4"
      />
      {inverse && <p className="mt-2 text-xs text-muted-foreground">Quanto menor, melhor.</p>}
    </div>
  );
}

function RiskCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-sm font-medium">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      {label}
    </label>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p>{label}</p>
      <p className="mt-1 font-display text-lg font-extrabold text-foreground">{value}</p>
    </div>
  );
}
