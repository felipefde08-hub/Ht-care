import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

type Feeling = "bem" | "cansado" | "mal" | "";
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
};

const symptoms = ["dor no peito", "falta de ar", "palpitação", "inchaço nas pernas", "nenhum"];

function CheckInPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CheckInData>(initialData);
  const canSave =
    Boolean(data.feeling) &&
    data.symptoms.length > 0 &&
    (data.measuredBloodPressure === "nao" ||
      (data.measuredBloodPressure === "sim" &&
        Number(data.systolic) > 0 &&
        Number(data.diastolic) > 0)) &&
    (data.measuredGlucose === "nao" ||
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
    const rawHistory = window.localStorage.getItem("htcare:score-history");
    const history = rawHistory
      ? (JSON.parse(rawHistory) as Array<{ score: number; createdAt: string; source: string }>)
      : [];
    const lastScore = history.at(-1)?.score ?? 75;
    const result = updateRiskScoreFromCheckIn(lastScore, data);
    const score = result.score;
    const point = {
      score,
      createdAt: new Date().toISOString(),
      source: "check-in",
      checkIn: data,
    };
    window.localStorage.setItem("htcare:score-history", JSON.stringify([...history, point]));
    window.localStorage.setItem("htcare:last-check-in", JSON.stringify(point));
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (user) {
      const { error: checkinError } = await supabase.from("checkins").insert({
        user_id: user.id,
        humor: data.feeling as "bem" | "cansado" | "mal",
        sintomas: data.symptoms,
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
    navigate({ to: "/painel", replace: true });
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
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-3xl items-center justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft sm:p-10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
            Check-in recorrente
          </p>
          <h1 className="mt-5 font-sans text-4xl font-semibold leading-tight sm:text-5xl">
            Atualize seu score em menos de 1 minuto.
          </h1>

          <div className="mt-8 space-y-8">
            <Question title="Como você está se sentindo hoje?">
              <ChoiceGrid>
                {[
                  ["bem", "Bem"],
                  ["cansado", "Cansado"],
                  ["mal", "Mal"],
                ].map(([value, label]) => (
                  <Choice
                    key={value}
                    selected={data.feeling === value}
                    onClick={() => update("feeling", value as Feeling)}
                  >
                    {label}
                  </Choice>
                ))}
              </ChoiceGrid>
            </Question>

            <Question title="Sentiu algum destes sintomas na última semana?">
              <ChoiceGrid>
                {symptoms.map((symptom) => (
                  <Choice
                    key={symptom}
                    selected={data.symptoms.includes(symptom)}
                    onClick={() => toggleSymptom(symptom)}
                  >
                    {symptom}
                  </Choice>
                ))}
              </ChoiceGrid>
            </Question>

            <Question title="Mediu a pressão essa semana?">
              <YesNoChoices
                value={data.measuredBloodPressure}
                onChange={(value) => update("measuredBloodPressure", value)}
              />
              {data.measuredBloodPressure === "sim" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            </Question>

            <Question title="Mediu glicemia essa semana?">
              <YesNoChoices
                value={data.measuredGlucose}
                onChange={(value) => update("measuredGlucose", value)}
              />
              {data.measuredGlucose === "sim" && (
                <div className="mt-4 max-w-xs">
                  <NumberField
                    label="Glicemia"
                    value={data.glucose}
                    onChange={(value) => update("glucose", value)}
                    placeholder="92"
                  />
                </div>
              )}
            </Question>

            <Question title="Peso atual">
              <p className="mb-3 text-sm leading-6 text-[#536b68]">
                Opcional. Sugerimos atualizar aproximadamente 1x por mês.
              </p>
              <div className="max-w-xs">
                <NumberField
                  label="Peso (kg)"
                  value={data.weight}
                  onChange={(value) => update("weight", value)}
                  placeholder="72"
                />
              </div>
            </Question>
          </div>

          <Button
            size="xl"
            className="mt-9 w-full rounded-full bg-[#10201f] font-semibold"
            disabled={!canSave}
            onClick={save}
          >
            Salvar check-in <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>
      <MobileAppNav />
    </main>
  );
}

function toNumberOrNull(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-sans text-xl font-semibold text-[#10201f]">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
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
