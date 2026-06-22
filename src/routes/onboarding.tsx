import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Gem,
  HeartPulse,
  ShieldCheck,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HealthReport } from "@/components/HealthReport";
import { MobileAppNav } from "@/components/MobileAppNav";
import { calculateInitialRiskScore } from "@/lib/risk-score";
import { getChallengeStats } from "@/lib/challenge";
import { recordUserActivity } from "@/lib/user-activity";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Onboarding — HTCare" }] }),
  component: OnboardingPage,
});

type YesNo = "sim" | "nao";
type YesNoUnknown = "sim" | "nao" | "nao_sei";

interface OnboardingData {
  age: string;
  biologicalSex: "feminino" | "masculino" | "";
  smokes: YesNo | "";
  diabetes: YesNoUnknown | "";
  knowsBloodPressure: YesNo | "";
  systolic: string;
  diastolic: string;
  knowsCholesterol: YesNo | "";
  ldl: string;
  hdl: string;
  totalCholesterol: string;
  familyHistory: YesNo | "";
  weight: string;
  height: string;
  activityLevel: "sedentario" | "leve" | "moderado" | "intenso" | "";
  previousCardiacDiagnosis: YesNo | "";
  frequentSymptoms: string[];
  stressLevel: "baixo" | "moderado" | "alto" | "";
  sleepHours: "menos_5" | "5_6" | "7_8" | "mais_8" | "";
  alcoholUse: "nao_bebo" | "socialmente" | "algumas_vezes_semana" | "diariamente" | "";
  waistCircumference: string;
  highCholesterolDiagnosis: YesNoUnknown | "";
  sleepApnea: YesNoUnknown | "";
  pregnancyHypertensionOrDiabetes: "sim" | "nao" | "nao_se_aplica" | "";
  takesMedication: YesNo | "";
  medicationCategories: string[];
  mainReason: string[];
}

const initialData: OnboardingData = {
  age: "",
  biologicalSex: "",
  smokes: "",
  diabetes: "",
  knowsBloodPressure: "",
  systolic: "",
  diastolic: "",
  knowsCholesterol: "",
  ldl: "",
  hdl: "",
  totalCholesterol: "",
  familyHistory: "",
  weight: "",
  height: "",
  activityLevel: "",
  previousCardiacDiagnosis: "",
  frequentSymptoms: [],
  stressLevel: "",
  sleepHours: "",
  alcoholUse: "",
  waistCircumference: "",
  highCholesterolDiagnosis: "",
  sleepApnea: "",
  pregnancyHypertensionOrDiabetes: "",
  takesMedication: "",
  medicationCategories: [],
  mainReason: [],
};

const symptomOptions = [
  "falta de ar ao fazer esforço leve",
  "dor ou aperto no peito",
  "palpitação/coração acelerado sem motivo",
  "inchaço nas pernas/tornozelos",
  "nenhum desses",
];

const medicationCategories = ["pressão", "colesterol", "diabetes"];

const reasons = [
  "tenho diabetes/pré-diabetes",
  "tenho medo por histórico familiar",
  "só quero acompanhar minha saúde",
  "meu médico recomendou",
  "já tive algum evento cardíaco e quero acompanhar",
];

const onboardingStages = [
  { name: "Perfil", start: 0, end: 1 },
  { name: "Hábitos", start: 2, end: 2 },
  { name: "Saúde", start: 3, end: 8 },
  { name: "Histórico", start: 9, end: 18 },
  { name: "Resultado", start: 19, end: 19 },
];

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [data, setData] = useState<OnboardingData>(initialData);
  const totalSteps = 20;
  const stage = getOnboardingStage(step);
  const progress = ((stage.index + 1) / onboardingStages.length) * 100;
  const challengeStats = useMemo(() => getChallengeStats(), []);
  const bmi = useMemo(() => calculateBmi(data.weight, data.height), [data.height, data.weight]);
  const canContinue = isStepValid(step, data);
  const firstName = getFirstName(
    (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email,
  );

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleReason(reason: string) {
    setData((current) => ({
      ...current,
      mainReason: current.mainReason.includes(reason)
        ? current.mainReason.filter((item) => item !== reason)
        : [...current.mainReason, reason],
    }));
  }

  function toggleArrayItem(key: "frequentSymptoms" | "medicationCategories", value: string) {
    setData((current) => {
      const values = current[key];
      const next =
        key === "frequentSymptoms" && value === "nenhum desses"
          ? values.includes(value)
            ? []
            : [value]
          : values.includes(value)
            ? values.filter((item) => item !== value)
            : [...values.filter((item) => item !== "nenhum desses"), value];
      return { ...current, [key]: next };
    });
  }

  async function next() {
    if (!canContinue) return;
    if (step < totalSteps - 1) {
      setStep((current) => current + 1);
      return;
    }
    const result = calculateInitialRiskScore(data);
    window.localStorage.setItem("htcare:onboarding", JSON.stringify({ ...data, bmi, result }));
    const previousHistory = JSON.parse(
      window.localStorage.getItem("htcare:score-history") || "[]",
    ) as Array<{ score: number; createdAt: string; source: string }>;
    window.localStorage.setItem(
      "htcare:score-history",
      JSON.stringify([
        ...previousHistory,
        { score: result.score, createdAt: new Date().toISOString(), source: "onboarding" },
      ]),
    );
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        nome:
          (user.user_metadata?.name as string | undefined) ??
          (user.user_metadata?.full_name as string | undefined) ??
          "",
        idade: toNumberOrNull(data.age),
        sexo: data.biologicalSex || null,
        fumante: data.smokes === "sim",
        diabetes_status: mapDiabetesStatus(data.diabetes),
        historico_familiar: data.familyHistory === "sim",
        peso_kg: toNumberOrNull(data.weight),
        altura_cm: toNumberOrNull(data.height),
        nivel_atividade: data.activityLevel || null,
        motivo_principal: data.mainReason,
      });
      if (profileError) {
        toast.error("Não foi possível salvar seu perfil no Supabase.");
        console.error(profileError);
      }

      const { error: assessmentError } = await supabase.from("assessments").insert({
        user_id: user.id,
        score: result.score,
        categoria_risco: result.level,
        fatores_que_pesaram: result.factors,
        origem: "onboarding",
      });
      if (assessmentError) {
        toast.error("Não foi possível salvar o score no Supabase.");
        console.error(assessmentError);
      }
      void recordUserActivity(user.id, "onboarding");
    }
    setCompleted(true);
  }

  if (completed) {
    const result = calculateInitialRiskScore(data);
    const personName =
      (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      "Paciente HTCare";
    return (
      <main className="min-h-screen bg-[#fbfcfc] px-5 py-6 text-[#10201f]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
          >
            <HealthReport
              personName={personName}
              assessmentDate={new Date()}
              data={data}
              bmi={bmi}
              result={result}
              onReview={() => {
                setCompleted(false);
                setStep(0);
              }}
            />
          </motion.div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-4 pb-28 pt-5 text-[#10201f] sm:bg-[#fbfcfc] sm:px-5 sm:pb-6 sm:pt-6">
      <MobileOnboardingHeader
        streakWeeks={challengeStats.streakWeeks}
        points={challengeStats.points}
      />
      <MobileStageProgress stageIndex={stage.index} progress={progress} />

      <div className="mx-auto hidden max-w-6xl items-center justify-between sm:flex">
        <Link to="/">
          <Logo />
        </Link>
        <p className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#536b68] shadow-soft">
          Etapa {stage.index + 1} de {onboardingStages.length} · {stage.name}
        </p>
      </div>

      <section className="mx-auto flex max-w-6xl items-center justify-center py-4 sm:min-h-[calc(100vh-96px)] sm:py-10">
        <div className="grid w-full gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="hidden h-1.5 overflow-hidden rounded-full bg-[#e5ecea] sm:block">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#2f8fc8,#49c7ae)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            <div className="rounded-[2rem] border border-[#dce9f2] bg-white/92 p-5 shadow-[0_28px_90px_-62px_rgba(16,32,31,0.72)] backdrop-blur sm:mt-10 sm:border-[#10201f]/8 sm:p-10">
              <div className="hidden items-center justify-between gap-4 sm:flex">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
                  Jornada inicial
                </p>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff7dc] px-3 py-1.5 text-xs font-bold text-[#9a5b12]">
                  <Trophy className="h-4 w-4" />
                  +50 XP nesta etapa
                </span>
              </div>
              <div className="min-h-[430px] overflow-hidden sm:mt-6 sm:min-h-[360px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {renderStep(step, data, update, toggleReason, toggleArrayItem, bmi, firstName)}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex items-center justify-between gap-3 sm:mt-10">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="min-h-12 rounded-full px-2 text-[#6b7d8f] sm:px-4"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button
                  type="button"
                  className="min-h-14 rounded-full bg-[#19b84d] px-7 font-semibold text-white shadow-[0_18px_44px_-22px_rgba(25,184,77,0.82)] hover:bg-[#16a843] sm:min-h-10 sm:bg-[#10201f] sm:px-6"
                  disabled={!canContinue}
                  onClick={next}
                >
                  {step === totalSteps - 1 ? "Finalizar" : "Continuar"}
                  {step === totalSteps - 1 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <MobileOutcomeCards />
          </div>
          <ResultPreviewCard />
        </div>
      </section>
      <MobileAppNav />
    </main>
  );
}

function renderStep(
  step: number,
  data: OnboardingData,
  update: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void,
  toggleReason: (reason: string) => void,
  toggleArrayItem: (key: "frequentSymptoms" | "medicationCategories", value: string) => void,
  bmi: number | null,
  firstName: string,
) {
  switch (step) {
    case 0:
      return (
        <Question
          firstName={firstName}
          title="Qual é a sua idade?"
          subtitle="Usamos sua idade para calibrar seu perfil de risco inicial."
        >
          <div className="max-w-xs">
            <Label htmlFor="age">Idade</Label>
            <Input
              id="age"
              type="number"
              min={1}
              max={120}
              value={data.age}
              onChange={(e) => update("age", e.target.value)}
              placeholder="Ex: 42"
              className="mt-2 h-14 text-lg"
            />
          </div>
        </Question>
      );
    case 1:
      return (
        <Question
          firstName={firstName}
          title="Qual é seu sexo biológico?"
          subtitle="Essa informação ajuda a ajustar referências clínicas de risco."
        >
          <ChoiceGrid>
            <Choice
              selected={data.biologicalSex === "feminino"}
              onClick={() => update("biologicalSex", "feminino")}
            >
              Feminino
            </Choice>
            <Choice
              selected={data.biologicalSex === "masculino"}
              onClick={() => update("biologicalSex", "masculino")}
            >
              Masculino
            </Choice>
          </ChoiceGrid>
        </Question>
      );
    case 2:
      return (
        <Question
          firstName={firstName}
          title="Você fuma?"
          subtitle="Tabagismo é um dos fatores mais importantes no risco cardiovascular."
        >
          <YesNoChoices value={data.smokes} onChange={(value) => update("smokes", value)} />
        </Question>
      );
    case 3:
      return (
        <Question
          firstName={firstName}
          title="Você tem diabetes ou pré-diabetes diagnosticada?"
          subtitle="Se você não souber, tudo bem. O acompanhamento começa mesmo assim."
        >
          <ChoiceGrid>
            <Choice selected={data.diabetes === "sim"} onClick={() => update("diabetes", "sim")}>
              Sim
            </Choice>
            <Choice selected={data.diabetes === "nao"} onClick={() => update("diabetes", "nao")}>
              Não
            </Choice>
            <Choice
              selected={data.diabetes === "nao_sei"}
              onClick={() => update("diabetes", "nao_sei")}
            >
              Não sei
            </Choice>
          </ChoiceGrid>
        </Question>
      );
    case 4:
      return (
        <Question
          firstName={firstName}
          title="Você sabe seus números de pressão arterial?"
          subtitle="Se souber, informe sistólica e diastólica. Se não souber, marque não sei."
        >
          <ChoiceGrid>
            <Choice
              selected={data.knowsBloodPressure === "sim"}
              onClick={() => update("knowsBloodPressure", "sim")}
            >
              Sim
            </Choice>
            <Choice
              selected={data.knowsBloodPressure === "nao"}
              onClick={() => update("knowsBloodPressure", "nao")}
            >
              Não sei
            </Choice>
          </ChoiceGrid>
          {data.knowsBloodPressure === "sim" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
      );
    case 5:
      return (
        <Question
          firstName={firstName}
          title="Você sabe seus números de colesterol?"
          subtitle="Informe LDL, HDL e colesterol total se tiver esses resultados em mãos."
        >
          <ChoiceGrid>
            <Choice
              selected={data.knowsCholesterol === "sim"}
              onClick={() => update("knowsCholesterol", "sim")}
            >
              Sim
            </Choice>
            <Choice
              selected={data.knowsCholesterol === "nao"}
              onClick={() => update("knowsCholesterol", "nao")}
            >
              Não sei
            </Choice>
          </ChoiceGrid>
          {data.knowsCholesterol === "sim" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <NumberField
                label="LDL"
                value={data.ldl}
                onChange={(value) => update("ldl", value)}
                placeholder="110"
              />
              <NumberField
                label="HDL"
                value={data.hdl}
                onChange={(value) => update("hdl", value)}
                placeholder="50"
              />
              <NumberField
                label="Total"
                value={data.totalCholesterol}
                onChange={(value) => update("totalCholesterol", value)}
                placeholder="180"
              />
            </div>
          )}
        </Question>
      );
    case 6:
      return (
        <Question
          firstName={firstName}
          title="Há histórico familiar de infarto ou AVC antes dos 60 anos?"
          subtitle="Histórico familiar precoce pode mudar a leitura do seu risco."
        >
          <YesNoChoices
            value={data.familyHistory}
            onChange={(value) => update("familyHistory", value)}
          />
        </Question>
      );
    case 7:
      return (
        <Question
          firstName={firstName}
          title="Qual é seu peso e altura?"
          subtitle="A HTCare calcula seu IMC automaticamente a partir desses dados."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Peso (kg)"
              value={data.weight}
              onChange={(value) => update("weight", value)}
              placeholder="72"
            />
            <NumberField
              label="Altura (cm)"
              value={data.height}
              onChange={(value) => update("height", value)}
              placeholder="170"
            />
          </div>
          <div className="mt-6 rounded-2xl bg-[#f4f8f6] p-5">
            <p className="text-sm font-medium text-[#536b68]">IMC calculado</p>
            <p className="mt-2 font-sans text-4xl font-semibold text-[#10201f]">
              {bmi == null ? "—" : bmi.toFixed(1)}
            </p>
          </div>
        </Question>
      );
    case 8:
      return (
        <Question
          firstName={firstName}
          title="Qual é seu nível de atividade física?"
          subtitle="Escolha a opção que mais parece com sua rotina atual."
        >
          <ChoiceGrid>
            {[
              ["sedentario", "Sedentário"],
              ["leve", "Leve"],
              ["moderado", "Moderado"],
              ["intenso", "Intenso"],
            ].map(([value, label]) => (
              <Choice
                key={value}
                selected={data.activityLevel === value}
                onClick={() => update("activityLevel", value as OnboardingData["activityLevel"])}
              >
                {label}
              </Choice>
            ))}
          </ChoiceGrid>
        </Question>
      );
    case 9:
      return (
        <Question
          firstName={firstName}
          title="Você já teve algum diagnóstico cardíaco anterior?"
          subtitle="Inclui infarto, arritmia, insuficiência cardíaca ou outro diagnóstico cardíaco já informado por profissional de saúde."
        >
          <YesNoChoices
            value={data.previousCardiacDiagnosis}
            onChange={(value) => update("previousCardiacDiagnosis", value)}
          />
        </Question>
      );
    case 10:
      return (
        <Question
          firstName={firstName}
          title="Você sente algum destes sintomas com frequência?"
          subtitle="Escolha todos que se aplicam. Se nenhum fizer sentido para você, selecione 'nenhum desses'."
        >
          <ChoiceGrid>
            {symptomOptions.map((symptom) => (
              <Choice
                key={symptom}
                selected={data.frequentSymptoms.includes(symptom)}
                onClick={() => toggleArrayItem("frequentSymptoms", symptom)}
              >
                {symptom}
              </Choice>
            ))}
          </ChoiceGrid>
        </Question>
      );
    case 11:
      return (
        <Question
          firstName={firstName}
          title="Como você descreveria seu nível de estresse no dia a dia?"
          subtitle="Estresse frequente pode influenciar sono, pressão, hábitos e risco metabólico."
        >
          <ChoiceGrid>
            {[
              ["baixo", "Baixo"],
              ["moderado", "Moderado"],
              ["alto", "Alto"],
            ].map(([value, label]) => (
              <Choice
                key={value}
                selected={data.stressLevel === value}
                onClick={() => update("stressLevel", value as OnboardingData["stressLevel"])}
              >
                {label}
              </Choice>
            ))}
          </ChoiceGrid>
        </Question>
      );
    case 12:
      return (
        <Question
          firstName={firstName}
          title="Quantas horas você dorme em média por noite?"
          subtitle="Sono é um marcador importante para risco cardiovascular, energia e metabolismo."
        >
          <ChoiceGrid>
            {[
              ["menos_5", "Menos de 5h"],
              ["5_6", "5-6h"],
              ["7_8", "7-8h"],
              ["mais_8", "Mais de 8h"],
            ].map(([value, label]) => (
              <Choice
                key={value}
                selected={data.sleepHours === value}
                onClick={() => update("sleepHours", value as OnboardingData["sleepHours"])}
              >
                {label}
              </Choice>
            ))}
          </ChoiceGrid>
        </Question>
      );
    case 13:
      return (
        <Question
          firstName={firstName}
          title="Você consome bebida alcoólica?"
          subtitle="Essa informação ajuda a entender hábitos e possíveis impactos no risco cardiometabólico."
        >
          <ChoiceGrid>
            {[
              ["nao_bebo", "Não bebo"],
              ["socialmente", "Socialmente"],
              ["algumas_vezes_semana", "Algumas vezes por semana"],
              ["diariamente", "Diariamente"],
            ].map(([value, label]) => (
              <Choice
                key={value}
                selected={data.alcoholUse === value}
                onClick={() => update("alcoholUse", value as OnboardingData["alcoholUse"])}
              >
                {label}
              </Choice>
            ))}
          </ChoiceGrid>
        </Question>
      );
    case 14:
      return (
        <Question
          firstName={firstName}
          title="Você sabe sua circunferência da cintura?"
          subtitle="Opcional. A medida em cm pode indicar gordura abdominal e risco metabólico. Você pode pular se não souber."
        >
          <div className="max-w-xs">
            <NumberField
              label="Circunferência da cintura (cm)"
              value={data.waistCircumference}
              onChange={(value) => update("waistCircumference", value)}
              placeholder="Ex: 88"
            />
          </div>
        </Question>
      );
    case 15:
      return (
        <Question
          firstName={firstName}
          title="Você tem diagnóstico de colesterol alto ou triglicerídeos altos?"
          subtitle="Mesmo sem saber os números exatos, marque se isso já foi prescrito ou informado por médico."
        >
          <YesNoUnknownChoices
            value={data.highCholesterolDiagnosis}
            onChange={(value) => update("highCholesterolDiagnosis", value)}
          />
        </Question>
      );
    case 16:
      return (
        <Question
          firstName={firstName}
          title="Você já foi diagnosticada com apneia do sono ou ronca muito?"
          subtitle="Considere também se você se sente cansado mesmo dormindo bem."
        >
          <YesNoUnknownChoices
            value={data.sleepApnea}
            onChange={(value) => update("sleepApnea", value)}
          />
        </Question>
      );
    case 17:
      return (
        <Question
          firstName={firstName}
          title="Se aplicável, houve pressão alta na gravidez ou diabetes gestacional?"
          subtitle="Essa informação ajuda a compor histórico cardiometabólico ao longo da vida."
        >
          <ChoiceGrid>
            <Choice
              selected={data.pregnancyHypertensionOrDiabetes === "sim"}
              onClick={() => update("pregnancyHypertensionOrDiabetes", "sim")}
            >
              Sim
            </Choice>
            <Choice
              selected={data.pregnancyHypertensionOrDiabetes === "nao"}
              onClick={() => update("pregnancyHypertensionOrDiabetes", "nao")}
            >
              Não
            </Choice>
            <Choice
              selected={data.pregnancyHypertensionOrDiabetes === "nao_se_aplica"}
              onClick={() => update("pregnancyHypertensionOrDiabetes", "nao_se_aplica")}
            >
              Não se aplica
            </Choice>
          </ChoiceGrid>
        </Question>
      );
    case 18:
      return (
        <Question
          firstName={firstName}
          title="Você toma atualmente algum remédio para pressão, colesterol ou diabetes?"
          subtitle="Se sim, escolha apenas a categoria. Não precisamos do nome exato do remédio."
        >
          <YesNoChoices
            value={data.takesMedication}
            onChange={(value) => update("takesMedication", value)}
          />
          {data.takesMedication === "sim" && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-[#536b68]">Categorias</p>
              <ChoiceGrid>
                {medicationCategories.map((category) => (
                  <Choice
                    key={category}
                    selected={data.medicationCategories.includes(category)}
                    onClick={() => toggleArrayItem("medicationCategories", category)}
                  >
                    {category}
                  </Choice>
                ))}
              </ChoiceGrid>
            </div>
          )}
        </Question>
      );
    case 19:
      return (
        <Question
          firstName={firstName}
          title="Qual é o principal motivo de você estar aqui?"
          subtitle="Você pode escolher mais de uma opção."
        >
          <ChoiceGrid>
            {reasons.map((reason) => (
              <Choice
                key={reason}
                selected={data.mainReason.includes(reason)}
                onClick={() => toggleReason(reason)}
              >
                {reason}
              </Choice>
            ))}
          </ChoiceGrid>
        </Question>
      );
  }
}

function Question({
  firstName,
  title,
  subtitle,
  children,
}: {
  firstName: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="grid items-end gap-2 sm:flex sm:items-start sm:gap-4">
        <Carelito
          className="mx-auto h-40 w-40 shrink-0 sm:mx-0 sm:h-16 sm:w-16"
          expression="happy"
        />
        <div className="relative min-w-0 flex-1 rounded-[1.5rem] bg-[#f3f7ff] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] before:absolute before:-left-3 before:top-12 before:hidden before:h-5 before:w-5 before:rotate-45 before:bg-[#f3f7ff] sm:rounded-tl-md sm:bg-[#f7faf9] sm:before:block">
          <p className="text-sm font-bold text-[#1a62d8] sm:text-[#2f8fc8]">Carelito</p>
          <p className="mt-2 text-[1.05rem] leading-7 text-[#55677e] sm:text-base sm:text-[#536b68]">
            Olá, {firstName}! Antes de continuarmos, preciso conhecer você melhor.
          </p>
          <h1 className="mt-4 font-sans text-2xl font-semibold leading-tight tracking-normal text-[#10203a] sm:text-5xl sm:text-[#10201f]">
            {title}
          </h1>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-[#d8e9ff] bg-[#eff6ff] p-4 text-[#0f63ff] shadow-[0_18px_55px_-42px_rgba(47,143,200,0.8)] sm:border-[#10201f]/8 sm:bg-white sm:text-[#536b68] sm:shadow-soft">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#0f63ff] sm:text-[#10201f]">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-current text-xs">
            i
          </span>
          Por que isso importa?
        </p>
        <p className="mt-2 text-sm leading-6">
          {subtitle} Com isso vamos calcular seu risco cardiovascular e criar um plano personalizado
          para você.
        </p>
      </div>
      <div className="mt-6 sm:mt-9">{children}</div>
    </div>
  );
}

function ResultPreviewCard() {
  return (
    <aside className="hidden rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-[0_32px_100px_-72px_rgba(16,32,31,0.7)] lg:sticky lg:top-6 lg:block lg:self-start">
      <div className="flex items-center gap-3">
        <Carelito className="h-14 w-14" expression="confident" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">Ao final</p>
          <h2 className="font-sans text-xl font-semibold">Sua jornada começa aqui</h2>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {[
          "Score cardiovascular",
          "Principais riscos",
          "Plano personalizado",
          "Jornada de evolução",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#f7faf9] p-3">
            <CheckCircle2 className="h-5 w-5 text-[#49a37f]" />
            <span className="text-sm font-semibold text-[#10201f]">{item}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-[#fff7dc] p-4 text-sm leading-6 text-[#7a4a0c]">
        Cada resposta desbloqueia uma visão mais clara sobre seu coração. Pequenas escolhas, grandes
        mudanças.
      </div>
    </aside>
  );
}

function ChoiceGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
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
          ? "rounded-2xl border border-[#10201f] bg-[#10201f] p-5 text-left font-semibold text-white shadow-soft transition"
          : "rounded-2xl border border-[#dce9f2] bg-white p-5 text-left font-semibold text-[#10201f] shadow-soft transition hover:border-[#10201f]/30 hover:bg-[#f7faf9] sm:border-[#10201f]/10"
      }
    >
      {children}
    </button>
  );
}

function MobileOnboardingHeader({ streakWeeks, points }: { streakWeeks: number; points: number }) {
  return (
    <header className="mx-auto mb-7 flex max-w-md items-center justify-between sm:hidden">
      <Logo />
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-xl font-black leading-none">🔥 {streakWeeks}</p>
          <p className="mt-1 text-[0.68rem] font-medium text-[#5d6d82]">Sequência</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black leading-none text-[#10203a]">
            <Gem className="mr-1 inline h-5 w-5 fill-[#ffc928] text-[#ffc928]" />
            {points}
          </p>
          <p className="mt-1 text-[0.68rem] font-medium text-[#5d6d82]">Pontos</p>
        </div>
        <button
          type="button"
          aria-label="Notificações"
          className="relative grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_14px_38px_-26px_rgba(16,32,31,0.7)]"
        >
          <Bell className="h-6 w-6 text-[#10203a]" strokeWidth={2.5} />
          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#f04438] text-[0.68rem] font-black text-white">
            1
          </span>
        </button>
      </div>
    </header>
  );
}

function MobileStageProgress({ stageIndex, progress }: { stageIndex: number; progress: number }) {
  return (
    <div className="mx-auto mb-6 max-w-md sm:hidden">
      <div className="grid grid-cols-5 gap-3">
        {onboardingStages.map((item, index) => {
          const active = index === stageIndex;
          const done = index < stageIndex;
          return (
            <div key={item.name} className="text-center">
              <div
                className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-lg font-black shadow-sm ${
                  active || done ? "bg-[#18b84d] text-white" : "bg-[#edf2f7] text-[#40546c]"
                }`}
              >
                {index + 1}
              </div>
              <p
                className={`mt-2 text-sm font-bold ${active ? "text-[#18b84d]" : "text-[#50627a]"}`}
              >
                {item.name}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e8eef4]">
        <motion.div
          className="h-full rounded-full bg-[#18b84d]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
      <p className="mt-5 text-center text-lg font-bold text-[#10203a]">
        <span className="text-[#18b84d]">Etapa {stageIndex + 1}</span> de {onboardingStages.length}
      </p>
    </div>
  );
}

function MobileOutcomeCards() {
  const previewItems = [
    {
      title: "Score cardiovascular",
      detail: "Seu risco atual de forma clara",
      icon: HeartPulse,
      color: "bg-[#19b84d] text-white",
    },
    {
      title: "Principais riscos",
      detail: "O que merece sua atenção",
      icon: AlertTriangle,
      color: "bg-[#4778f5] text-white",
    },
    {
      title: "Plano personalizado",
      detail: "Ações práticas para melhorar",
      icon: ClipboardList,
      color: "bg-[#7557df] text-white",
    },
    {
      title: "Jornada de evolução",
      detail: "Acompanhe seu progresso",
      icon: TrendingUp,
      color: "bg-[#2bbca8] text-white",
    },
  ];

  return (
    <div className="mt-5 space-y-4 sm:hidden">
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[1.5rem] border border-[#dce9f2] bg-white p-4 shadow-[0_18px_60px_-44px_rgba(16,32,31,0.75)]">
          <h2 className="font-sans text-base font-black text-[#10203a]">
            Seu resultado final incluirá:
          </h2>
          <div className="mt-4 space-y-3">
            {previewItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${item.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-black leading-tight text-[#10203a]">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-4 text-[#586980]">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="relative overflow-hidden rounded-[1.5rem] border border-[#d9efe3] bg-[#f0fbf4] p-4 text-center shadow-[0_18px_60px_-44px_rgba(16,32,31,0.75)]">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white/70">
            <Gem className="h-6 w-6 fill-[#19b84d] text-[#19b84d]" />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#10203a]">Você ganhará</p>
          <p className="mt-1 font-sans text-4xl font-black text-[#19b84d]">50 XP</p>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#10203a]">
            ao concluir esta etapa!
          </p>
          <div className="mx-auto mt-5 grid h-20 w-24 place-items-center rounded-[1.35rem] bg-[linear-gradient(135deg,#2f8fc8,#19b84d)] shadow-[0_18px_42px_-22px_rgba(25,184,77,0.72)]">
            <Trophy className="h-10 w-10 fill-[#ffd36a] text-[#ffd36a]" />
          </div>
        </section>
      </div>
      <section className="flex items-center justify-between rounded-[1.45rem] border border-[#dce9f2] bg-[#eef9f8] p-5 shadow-[0_18px_60px_-48px_rgba(16,32,31,0.75)]">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#19b84d] text-white">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="max-w-[220px] text-sm font-semibold leading-5 text-[#10203a]">
            Seus dados estão 100% protegidos com segurança e privacidade.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-[#52657a]" />
      </section>
    </div>
  );
}

function YesNoChoices({
  value,
  onChange,
}: {
  value: YesNo | "";
  onChange: (value: YesNo) => void;
}) {
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

function YesNoUnknownChoices({
  value,
  onChange,
}: {
  value: YesNoUnknown | "";
  onChange: (value: YesNoUnknown) => void;
}) {
  return (
    <ChoiceGrid>
      <Choice selected={value === "sim"} onClick={() => onChange("sim")}>
        Sim
      </Choice>
      <Choice selected={value === "nao"} onClick={() => onChange("nao")}>
        Não
      </Choice>
      <Choice selected={value === "nao_sei"} onClick={() => onChange("nao_sei")}>
        Não sei
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
        className="mt-2 h-14 text-lg"
      />
    </div>
  );
}

function calculateBmi(weight: string, height: string) {
  const weightValue = Number(weight);
  const heightValue = Number(height) / 100;
  if (!weightValue || !heightValue) return null;
  return weightValue / (heightValue * heightValue);
}

function toNumberOrNull(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function mapDiabetesStatus(value: YesNoUnknown | "") {
  if (value === "sim") return "diabetes";
  if (value === "nao") return "nao";
  return "nao_sei";
}

function getOnboardingStage(step: number) {
  const index = onboardingStages.findIndex((stage) => step >= stage.start && step <= stage.end);
  return { ...onboardingStages[Math.max(0, index)], index: Math.max(0, index) };
}

function getFirstName(value?: string | null) {
  return value?.split(" ")[0]?.split("@")[0] || "por aqui";
}

function isStepValid(step: number, data: OnboardingData) {
  switch (step) {
    case 0:
      return Number(data.age) > 0;
    case 1:
      return Boolean(data.biologicalSex);
    case 2:
      return Boolean(data.smokes);
    case 3:
      return Boolean(data.diabetes);
    case 4:
      return (
        data.knowsBloodPressure === "nao" ||
        (data.knowsBloodPressure === "sim" &&
          Number(data.systolic) > 0 &&
          Number(data.diastolic) > 0)
      );
    case 5:
      return (
        data.knowsCholesterol === "nao" ||
        (data.knowsCholesterol === "sim" &&
          Number(data.ldl) > 0 &&
          Number(data.hdl) > 0 &&
          Number(data.totalCholesterol) > 0)
      );
    case 6:
      return Boolean(data.familyHistory);
    case 7:
      return Number(data.weight) > 0 && Number(data.height) > 0;
    case 8:
      return Boolean(data.activityLevel);
    case 9:
      return Boolean(data.previousCardiacDiagnosis);
    case 10:
      return data.frequentSymptoms.length > 0;
    case 11:
      return Boolean(data.stressLevel);
    case 12:
      return Boolean(data.sleepHours);
    case 13:
      return Boolean(data.alcoholUse);
    case 14:
      return true;
    case 15:
      return Boolean(data.highCholesterolDiagnosis);
    case 16:
      return Boolean(data.sleepApnea);
    case 17:
      return Boolean(data.pregnancyHypertensionOrDiabetes);
    case 18:
      return (
        data.takesMedication === "nao" ||
        (data.takesMedication === "sim" && data.medicationCategories.length > 0)
      );
    case 19:
      return data.mainReason.length > 0;
    default:
      return false;
  }
}
