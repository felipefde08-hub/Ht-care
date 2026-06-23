import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRiskScoreFromCheckIn } from "@/lib/risk-score";
import { recordUserActivity } from "@/lib/user-activity";

export const Route = createFileRoute("/check-in")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Check-in — HTCare" }] }),
  component: CheckInPage,
});

type Feeling = "excelente" | "bem" | "normal" | "cansado" | "mal" | "";
type YesNo = "sim" | "nao" | "";

interface CheckInData {
  feeling: Feeling;
  symptoms: string[];
  measuredBloodPressure: YesNo;
  systolic: string;
  diastolic: string;
  measuredGlucose: YesNo;
  glucose: string;
  weight: string;
  sleptWell: YesNo;
  exercised: YesNo;
  tookMedication: YesNo;
}

const initialData: CheckInData = {
  feeling: "",
  symptoms: [],
  measuredBloodPressure: "",
  systolic: "",
  diastolic: "",
  measuredGlucose: "",
  glucose: "",
  weight: "",
  sleptWell: "",
  exercised: "",
  tookMedication: "",
};

const symptoms = ["dor no peito", "falta de ar", "palpitação", "inchaço nas pernas", "nenhum"];

function CheckInPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CheckInData>(initialData);
  const [completed, setCompleted] = useState(false);
  const canSave =
    Boolean(data.feeling) &&
    (data.measuredBloodPressure === "nao" ||
      data.measuredBloodPressure === "" ||
      (data.measuredBloodPressure === "sim" &&
        Number(data.systolic) > 0 &&
        Number(data.diastolic) > 0)) &&
    (data.measuredGlucose === "nao" ||
      data.measuredGlucose === "" ||
      (data.measuredGlucose === "sim" && Number(data.glucose) > 0));

  function update<K extends keyof CheckInData>(key: K, value: CheckInData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleSymptom(symptom: string) {
    setData((current) => {
      if (symptom === "nenhum") {
        return { ...current, symptoms: current.symptoms.includes(symptom) ? [] : [symptom] };
      }
      const next = current.symptoms.includes(symptom)
        ? current.symptoms.filter((item) => item !== symptom)
        : [...current.symptoms.filter((item) => item !== "nenhum"), symptom];
      return { ...current, symptoms: next };
    });
  }

  async function save() {
    if (!canSave) return;
    setCompleted(true);
    window.navigator.vibrate?.(35);
    const rawHistory = window.localStorage.getItem("htcare:score-history");
    const history = rawHistory
      ? (JSON.parse(rawHistory) as Array<{ score: number; createdAt: string; source: string }>)
      : [];
    const lastScore = history.at(-1)?.score ?? 75;
    const riskInput = {
      ...data,
      feeling: normalizeFeeling(data.feeling),
      symptoms: data.symptoms.length ? data.symptoms : ["nenhum"],
      measuredBloodPressure: data.measuredBloodPressure || "nao",
      measuredGlucose: data.measuredGlucose || "nao",
    };
    const result = updateRiskScoreFromCheckIn(lastScore, riskInput);
    const score = result.score;
    const point = {
      score,
      createdAt: new Date().toISOString(),
      source: "check-in",
      checkIn: riskInput,
    };
    window.localStorage.setItem("htcare:score-history", JSON.stringify([...history, point]));
    window.localStorage.setItem("htcare:last-check-in", JSON.stringify(point));
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (user) {
      const { error: checkinError } = await supabase.from("checkins").insert({
        user_id: user.id,
        humor: normalizeFeeling(data.feeling),
        sintomas: data.symptoms.length ? data.symptoms : ["nenhum"],
        pressao_sistolica:
          data.measuredBloodPressure === "sim" ? toNumberOrNull(data.systolic) : null,
        pressao_diastolica:
          data.measuredBloodPressure === "sim" ? toNumberOrNull(data.diastolic) : null,
        glicemia: data.measuredGlucose === "sim" ? toNumberOrNull(data.glucose) : null,
        peso_kg: toNumberOrNull(data.weight),
      });
      if (checkinError) {
        toast.error("Não foi possível salvar o check-in no Supabase.");
        console.error(checkinError);
      }

      const { error: assessmentError } = await supabase.from("assessments").insert({
        user_id: user.id,
        score,
        categoria_risco: result.level,
        fatores_que_pesaram: result.factors,
        origem: "checkin",
      });
      if (assessmentError) {
        toast.error("Não foi possível salvar o score no Supabase.");
        console.error(assessmentError);
      }
      void recordUserActivity(user.id, "checkin");
    }
    window.setTimeout(() => navigate({ to: "/painel", replace: true }), 850);
  }

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="outline" className="hidden sm:inline-flex" asChild>
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </div>
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-3xl items-center justify-center py-4 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full overflow-hidden rounded-[2rem] border border-[#10201f]/8 bg-white p-4 shadow-soft sm:p-10"
        >
          <AnimatePresence>
            {completed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 grid place-items-center bg-white/92 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: 20, scale: 0.92 }}
                  animate={{ y: 0, scale: 1 }}
                  className="text-center"
                >
                  <Carelito className="mx-auto h-28 w-28" expression="confident" />
                  <h2 className="mt-3 font-sans text-3xl font-semibold">Registrado.</h2>
                  <p className="mx-auto mt-2 max-w-xs font-semibold leading-6 text-[#536b68]">
                    Seu histórico foi atualizado e o score será acompanhado com esses dados.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <Carelito className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" expression="happy" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f8fc8]">
                Check-in de 30 segundos
              </p>
              <h1 className="mt-2 font-sans text-3xl font-semibold leading-tight sm:text-5xl">
                Como seu coração está hoje?
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-8">
            <Question title="Escolha seu estado de hoje">
              <div className="grid grid-cols-5 gap-2">
                {[
                  ["excelente", "😃", "Excelente"],
                  ["bem", "🙂", "Bem"],
                  ["normal", "😐", "Normal"],
                  ["cansado", "😕", "Cansado"],
                  ["mal", "😞", "Mal"],
                ].map(([value, emoji, label]) => (
                  <MoodChoice
                    key={value}
                    selected={data.feeling === value}
                    onClick={() => update("feeling", value as Feeling)}
                    emoji={emoji}
                  >
                    {label}
                  </MoodChoice>
                ))}
              </div>
            </Question>

            <Question title="Sentiu algum destes sintomas na última semana?">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {symptoms.map((symptom) => (
                  <Choice
                    key={symptom}
                    selected={data.symptoms.includes(symptom)}
                    onClick={() => toggleSymptom(symptom)}
                  >
                    {symptom}
                  </Choice>
                ))}
              </div>
            </Question>

            <div className="grid gap-3 sm:grid-cols-2">
              <QuickCard title="Pressão hoje?">
                <YesNoChoices
                  value={data.measuredBloodPressure}
                  onChange={(value) => update("measuredBloodPressure", value)}
                />
                {data.measuredBloodPressure === "sim" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <NumberField
                      label="Sistólica"
                      value={data.systolic}
                      onChange={(value) => update("systolic", value)}
                      placeholder="120"
                    />
                    <NumberField
                      label="Diastólica"
                      value={data.diastolic}
                      onChange={(value) => update("diastolic", value)}
                      placeholder="80"
                    />
                  </div>
                )}
              </QuickCard>

              <QuickCard title="Peso hoje?">
                <NumberField
                  label="Peso (kg)"
                  value={data.weight}
                  onChange={(value) => update("weight", value)}
                  placeholder="72"
                />
              </QuickCard>

              <QuickCard title="Dormiu bem?">
                <YesNoChoices
                  value={data.sleptWell}
                  onChange={(value) => update("sleptWell", value)}
                />
              </QuickCard>

              <QuickCard title="Fez exercício?">
                <YesNoChoices
                  value={data.exercised}
                  onChange={(value) => update("exercised", value)}
                />
              </QuickCard>

              <QuickCard title="Tomou seus medicamentos?">
                <YesNoChoices
                  value={data.tookMedication}
                  onChange={(value) => update("tookMedication", value)}
                />
              </QuickCard>

              <QuickCard title="Glicemia?">
                <YesNoChoices
                  value={data.measuredGlucose}
                  onChange={(value) => update("measuredGlucose", value)}
                />
                {data.measuredGlucose === "sim" && (
                  <div className="mt-3">
                    <NumberField
                      label="Glicemia"
                      value={data.glucose}
                      onChange={(value) => update("glucose", value)}
                      placeholder="92"
                    />
                  </div>
                )}
              </QuickCard>
            </div>

            <div className="rounded-[1.4rem] bg-[#f7faf9] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#2f6760]">
                <ShieldCheck className="h-4 w-4" />
                Atualização clínica rápida
              </div>
              <p className="mt-1 text-sm leading-5 text-[#536b68]">
                O Carelito usa esse check-in para manter seu relatório vivo, sem complicar sua
                rotina.
              </p>
            </div>
          </div>

          <Button
            size="xl"
            className="mt-6 w-full rounded-[1.25rem] bg-[linear-gradient(135deg,#2f8fc8,#49c7ae)] font-black uppercase tracking-[0.04em] shadow-[0_20px_60px_-36px_rgba(47,143,200,0.9)]"
            disabled={!canSave || completed}
            onClick={save}
          >
            Finalizar check-in <CheckCircle2 className="h-5 w-5" />
          </Button>
        </motion.div>
      </section>
      <MobileAppNav />
    </main>
  );
}

function normalizeFeeling(value: Feeling): "bem" | "cansado" | "mal" {
  if (value === "mal") return "mal";
  if (value === "cansado" || value === "normal") return "cansado";
  return "bem";
}

function toNumberOrNull(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-sans text-lg font-semibold text-[#10201f] sm:text-xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function QuickCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.35rem] border border-[#10201f]/8 bg-[#fbfcfc] p-3">
      <h3 className="font-sans text-base font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MoodChoice({
  selected,
  onClick,
  emoji,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-20 rounded-[1.25rem] border p-2 text-center transition active:scale-95 ${
        selected
          ? "border-[#49c7ae] bg-[#e8f5ef] shadow-soft"
          : "border-[#10201f]/8 bg-white hover:bg-[#f7faf9]"
      }`}
    >
      <span className="block text-2xl">{emoji}</span>
      <span className="mt-1 block text-[0.68rem] font-bold leading-tight text-[#536b68]">
        {children}
      </span>
    </button>
  );
}

function ChoiceGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-3">{children}</div>;
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-2xl bg-[#10201f] p-4 text-left font-semibold text-white"
          : "rounded-2xl border border-[#10201f]/10 bg-white p-4 text-left font-semibold text-[#10201f] hover:bg-[#f7faf9]"
      }
    >
      {children}
    </button>
  );
}

function YesNoChoices({ value, onChange }: { value: YesNo; onChange: (value: YesNo) => void }) {
  return (
    <ChoiceGrid>
      <Choice selected={value === "sim"} onClick={() => onChange("sim")}>
        Sim
      </Choice>
      <Choice selected={value === "nao"} onClick={() => onChange("nao")}>
        Não
      </Choice>
    </ChoiceGrid>
  );
}

function NumberField({
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
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12"
      />
    </div>
  );
}
