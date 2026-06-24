import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Carelito } from "@/components/HeartMascot";
import { HealthReport } from "@/components/HealthReport";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { recordUserActivity } from "@/lib/user-activity";
import { calculateInitialRiskScore } from "@/lib/risk-score";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Avaliação inicial — HTCare" }] }),
  component: OnboardingPage,
});

type YesNo = "sim" | "nao";
type YesNoUnknown = "sim" | "nao" | "nao_sei";
type DiabetesStatus = "diabetes_tipo_1" | "diabetes_tipo_2" | "pre_diabetes" | "nao" | "nao_sei";

interface OnboardingData {
  age: string;
  biologicalSex: "feminino" | "masculino" | "";
  smokes: "sim" | "ex_fumante_menos_5" | "ex_fumante_mais_5" | "nao" | "";
  diabetes: DiabetesStatus | "";
  knowsBloodPressure: YesNo | "";
  systolic: string;
  diastolic: string;
  knowsCholesterol: YesNo | "";
  ldl: string;
  hdl: string;
  totalCholesterol: string;
  familyHistory: YesNoUnknown | "";
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

interface DynamicSupabaseTable {
  upsert?: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

interface ChatProgress {
  step: number;
  data: OnboardingData;
  skipped?: boolean;
}

type QuestionId =
  | "age"
  | "biologicalSex"
  | "smokes"
  | "diabetes"
  | "bloodPressure"
  | "cholesterol"
  | "familyHistory"
  | "body"
  | "activity"
  | "previousCardiacDiagnosis"
  | "symptoms"
  | "stress"
  | "sleep"
  | "alcohol"
  | "waist"
  | "highCholesterolDiagnosis"
  | "sleepApnea"
  | "pregnancy"
  | "medication"
  | "mainReason";

interface QuestionConfig {
  id: QuestionId;
  text: (data: OnboardingData, firstName: string) => string;
  confirmation?: (data: OnboardingData) => string;
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

const confirmations = ["Anotado! 😊", "Entendido!", "Ótimo.", "Perfeito!", "Obrigado!"];

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"intro" | "questions" | "calculating" | "completed">("intro");
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const firstName = getFirstName(
    (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email,
  );
  const questions = useMemo(() => getQuestions(data), [data]);
  const currentQuestion = questions[Math.min(step, questions.length - 1)];
  const bmi = useMemo(() => calculateBmi(data.weight, data.height), [data.height, data.weight]);

  useEffect(() => {
    const saved = readSavedProgress(user.id);
    if (saved?.skipped) {
      setLoaded(true);
      return;
    }
    if (saved) {
      setData({ ...initialData, ...saved.data });
      setStep(Math.max(0, saved.step));
      setPhase(saved.step > 0 ? "questions" : "intro");
    }
    setLoaded(true);
  }, [user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [phase, step, data, completed]);

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleArrayItem(
    key: "frequentSymptoms" | "medicationCategories" | "mainReason",
    value: string,
  ) {
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

  async function persist(nextData = data, nextStep = step, skipped = false) {
    const payload: ChatProgress = { step: nextStep, data: nextData, skipped };
    window.localStorage.setItem(progressStorageKey(user.id), JSON.stringify(payload));
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } =
      (await dynamicSupabase.from("onboarding_chat_progress").upsert?.({
        user_id: user.id,
        step: nextStep,
        data: nextData,
        skipped,
        updated_at: new Date().toISOString(),
      })) ?? {};
    if (error) console.warn("Não foi possível sincronizar progresso do chat no Supabase.", error);
  }

  async function start() {
    setPhase("questions");
    await persist(data, 0);
  }

  async function skip() {
    window.localStorage.setItem("htcare:onboarding-skipped", "true");
    await persist(data, step, true);
    navigate({ to: "/painel", replace: true });
  }

  async function answerAndNext(nextData = data) {
    const nextStep = step + 1;
    if (nextStep >= questions.length) {
      await persist(nextData, nextStep);
      setData(nextData);
      setPhase("calculating");
      window.setTimeout(() => {
        void finish(nextData);
      }, 2300);
      return;
    }
    setData(nextData);
    setStep(nextStep);
    await persist(nextData, nextStep);
  }

  async function finish(finalData: OnboardingData) {
    const result = calculateInitialRiskScore(finalData);
    const finalBmi = calculateBmi(finalData.weight, finalData.height);
    window.localStorage.removeItem("htcare:onboarding-skipped");
    window.localStorage.setItem(
      "htcare:onboarding",
      JSON.stringify({ ...finalData, bmi: finalBmi, result }),
    );
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

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      nome:
        (user.user_metadata?.name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        "",
      idade: toNumberOrNull(finalData.age),
      sexo: finalData.biologicalSex || null,
      fumante: finalData.smokes === "sim",
      diabetes_status: mapDiabetesStatus(finalData.diabetes),
      historico_familiar: finalData.familyHistory === "sim",
      peso_kg: toNumberOrNull(finalData.weight),
      altura_cm: toNumberOrNull(finalData.height),
      nivel_atividade: finalData.activityLevel || null,
      motivo_principal: finalData.mainReason,
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
    setCompleted(true);
    setPhase("completed");
  }

  if (!loaded) {
    return <main className="min-h-screen bg-[#eef2ee]" />;
  }

  if (completed || phase === "completed") {
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
                setPhase("questions");
                setStep(0);
              }}
            />
          </motion.div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef2ee] text-[#10201f]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#eef2ee]/92 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-[#536b68] shadow-sm">
            {phase === "questions" && currentQuestion
              ? `Pergunta ${step + 1} de ${questions.length}`
              : "Avaliação rápida"}
          </span>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-3xl flex-col px-3 pb-28 pt-4 sm:px-5 sm:pb-10">
        <div className="flex-1 space-y-3">
          <CarelitoBubble>
            Olá, {firstName}! 👋 Sou o Carelito, seu assistente de saúde cardiovascular. Vamos fazer
            uma avaliação rápida juntos? São 20 perguntas bem rápidas — leva menos de 5 minutos.
          </CarelitoBubble>

          {phase === "intro" && (
            <div className="ml-14 flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full bg-[#0d9488] px-5 font-semibold text-white"
                onClick={() => void start()}
              >
                Vamos lá! ✅
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={skip}>
                Pular por agora
              </Button>
            </div>
          )}

          {phase !== "intro" &&
            questions
              .slice(0, Math.min(step, questions.length))
              .map((question, index) => (
                <AnsweredQuestion
                  key={question.id}
                  question={question}
                  data={data}
                  firstName={firstName}
                  confirmation={
                    question.confirmation?.(data) ?? confirmations[index % confirmations.length]
                  }
                />
              ))}

          {phase === "questions" && currentQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <CarelitoBubble>{currentQuestion.text(data, firstName)}</CarelitoBubble>
                <AnswerComposer
                  question={currentQuestion}
                  data={data}
                  update={update}
                  toggleArrayItem={toggleArrayItem}
                  bmi={bmi}
                  onSubmit={() => void answerAndNext(data)}
                />
              </motion.div>
            </AnimatePresence>
          )}

          {phase === "calculating" && (
            <>
              <CarelitoBubble>
                Perfeito, {firstName}! Tenho tudo que preciso. Vou calcular seu score agora... 🔍
              </CarelitoBubble>
              <CarelitoBubble>
                <span className="inline-flex items-center gap-1 py-1">
                  <TypingDot delay="0s" />
                  <TypingDot delay="0.15s" />
                  <TypingDot delay="0.3s" />
                </span>
              </CarelitoBubble>
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </section>
      <MobileAppNav />
    </main>
  );
}

function AnsweredQuestion({
  question,
  data,
  firstName,
  confirmation,
}: {
  question: QuestionConfig;
  data: OnboardingData;
  firstName: string;
  confirmation: string;
}) {
  return (
    <>
      <CarelitoBubble>{question.text(data, firstName)}</CarelitoBubble>
      <UserBubble>{formatAnswer(question.id, data)}</UserBubble>
      <CarelitoBubble compact>{confirmation}</CarelitoBubble>
    </>
  );
}

function AnswerComposer({
  question,
  data,
  update,
  toggleArrayItem,
  bmi,
  onSubmit,
}: {
  question: QuestionConfig;
  data: OnboardingData;
  update: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  toggleArrayItem: (
    key: "frequentSymptoms" | "medicationCategories" | "mainReason",
    value: string,
  ) => void;
  bmi: number | null;
  onSubmit: () => void;
}) {
  const valid = isQuestionValid(question.id, data);

  if (question.id === "age") {
    return (
      <NumberReply
        value={data.age}
        onChange={(value) => update("age", value)}
        placeholder="Ex: 42"
        disabled={!valid}
        onSubmit={onSubmit}
      />
    );
  }

  if (question.id === "biologicalSex") {
    return (
      <ReplyOptions
        options={[
          ["masculino", "Masculino"],
          ["feminino", "Feminino"],
        ]}
        selected={data.biologicalSex}
        onSelect={(value) => {
          update("biologicalSex", value as OnboardingData["biologicalSex"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "smokes") {
    return (
      <ReplyOptions
        options={[
          ["sim", "Sim, fumo"],
          ["ex_fumante_menos_5", "Já fumei, parei há menos de 5 anos"],
          ["ex_fumante_mais_5", "Já fumei, parei há mais de 5 anos"],
          ["nao", "Nunca fumei"],
        ]}
        selected={data.smokes}
        onSelect={(value) => {
          update("smokes", value as OnboardingData["smokes"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "diabetes") {
    return (
      <ReplyOptions
        options={[
          ["diabetes_tipo_1", "Sim, diabetes tipo 1"],
          ["diabetes_tipo_2", "Sim, diabetes tipo 2"],
          ["pre_diabetes", "Pré-diabetes"],
          ["nao", "Não"],
          ["nao_sei", "Não sei"],
        ]}
        selected={data.diabetes}
        onSelect={(value) => {
          update("diabetes", value as OnboardingData["diabetes"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "bloodPressure") {
    return (
      <div className="ml-12 space-y-2">
        <ReplyOptions
          options={[
            ["sim", "Sei os números"],
            ["nao", "Não sei"],
          ]}
          selected={data.knowsBloodPressure}
          onSelect={(value) => update("knowsBloodPressure", value as YesNo)}
          autoSubmit={false}
        />
        {data.knowsBloodPressure === "sim" && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              inputMode="numeric"
              value={data.systolic}
              onChange={(event) => update("systolic", event.target.value)}
              placeholder="Sistólica"
              className="h-12 rounded-2xl bg-white"
            />
            <Input
              type="number"
              inputMode="numeric"
              value={data.diastolic}
              onChange={(event) => update("diastolic", event.target.value)}
              placeholder="Diastólica"
              className="h-12 rounded-2xl bg-white"
            />
          </div>
        )}
        <SubmitReply disabled={!valid} onClick={onSubmit} />
      </div>
    );
  }

  if (question.id === "cholesterol") {
    return (
      <div className="ml-12 space-y-2">
        <ReplyOptions
          options={[
            ["sim", "Sei os números"],
            ["nao", "Não sei"],
          ]}
          selected={data.knowsCholesterol}
          onSelect={(value) => update("knowsCholesterol", value as YesNo)}
          autoSubmit={false}
        />
        {data.knowsCholesterol === "sim" && (
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              inputMode="numeric"
              value={data.ldl}
              onChange={(event) => update("ldl", event.target.value)}
              placeholder="LDL"
              className="h-12 rounded-2xl bg-white"
            />
            <Input
              type="number"
              inputMode="numeric"
              value={data.hdl}
              onChange={(event) => update("hdl", event.target.value)}
              placeholder="HDL"
              className="h-12 rounded-2xl bg-white"
            />
            <Input
              type="number"
              inputMode="numeric"
              value={data.totalCholesterol}
              onChange={(event) => update("totalCholesterol", event.target.value)}
              placeholder="Total"
              className="h-12 rounded-2xl bg-white"
            />
          </div>
        )}
        <SubmitReply disabled={!valid} onClick={onSubmit} />
      </div>
    );
  }

  if (question.id === "familyHistory") {
    return (
      <ReplyOptions
        options={[
          ["sim", "Sim"],
          ["nao", "Não"],
          ["nao_sei", "Não sei"],
        ]}
        selected={data.familyHistory}
        onSelect={(value) => {
          update("familyHistory", value as OnboardingData["familyHistory"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "body") {
    return (
      <div className="ml-12 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="decimal"
            value={data.weight}
            onChange={(event) => update("weight", event.target.value)}
            placeholder="Peso kg"
            className="h-12 rounded-2xl bg-white"
          />
          <Input
            type="number"
            inputMode="numeric"
            value={data.height}
            onChange={(event) => update("height", event.target.value)}
            placeholder="Altura cm"
            className="h-12 rounded-2xl bg-white"
          />
        </div>
        <div className="rounded-2xl bg-white/75 px-4 py-3 text-sm font-semibold text-[#536b68]">
          {bmi == null ? "Seu IMC aparece aqui automaticamente." : `Seu IMC é ${bmi.toFixed(1)}.`}
        </div>
        <SubmitReply disabled={!valid} onClick={onSubmit} />
      </div>
    );
  }

  if (question.id === "activity") {
    return (
      <ReplyOptions
        options={[
          ["sedentario", "Sedentário"],
          ["leve", "1-2x por semana"],
          ["moderado", "3-4x por semana"],
          ["intenso", "Quase todo dia"],
        ]}
        selected={data.activityLevel}
        onSelect={(value) => {
          update("activityLevel", value as OnboardingData["activityLevel"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "previousCardiacDiagnosis") {
    return (
      <ReplyOptions
        options={[
          ["sim", "Sim"],
          ["nao", "Não"],
        ]}
        selected={data.previousCardiacDiagnosis}
        onSelect={(value) => {
          update("previousCardiacDiagnosis", value as YesNo);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "symptoms") {
    return (
      <MultiReply
        values={data.frequentSymptoms}
        options={symptomOptions}
        onToggle={(value) => toggleArrayItem("frequentSymptoms", value)}
        disabled={!valid}
        onSubmit={onSubmit}
      />
    );
  }

  if (question.id === "stress") {
    return (
      <ReplyOptions
        options={[
          ["baixo", "Baixo"],
          ["moderado", "Moderado"],
          ["alto", "Alto"],
        ]}
        selected={data.stressLevel}
        onSelect={(value) => {
          update("stressLevel", value as OnboardingData["stressLevel"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "sleep") {
    return (
      <ReplyOptions
        options={[
          ["menos_5", "Menos de 5h"],
          ["5_6", "5-6h"],
          ["7_8", "7-8h"],
          ["mais_8", "Mais de 8h"],
        ]}
        selected={data.sleepHours}
        onSelect={(value) => {
          update("sleepHours", value as OnboardingData["sleepHours"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "alcohol") {
    return (
      <ReplyOptions
        options={[
          ["nao_bebo", "Não bebo"],
          ["socialmente", "Socialmente"],
          ["algumas_vezes_semana", "Algumas vezes por semana"],
          ["diariamente", "Diariamente"],
        ]}
        selected={data.alcoholUse}
        onSelect={(value) => {
          update("alcoholUse", value as OnboardingData["alcoholUse"]);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "waist") {
    return (
      <div className="ml-12 flex gap-2">
        <Input
          type="number"
          inputMode="numeric"
          value={data.waistCircumference}
          onChange={(event) => update("waistCircumference", event.target.value)}
          placeholder="Cintura em cm"
          className="h-12 rounded-2xl bg-white"
        />
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-full bg-white"
          onClick={onSubmit}
        >
          Pular
        </Button>
        <SubmitReply disabled={false} onClick={onSubmit} iconOnly />
      </div>
    );
  }

  if (question.id === "highCholesterolDiagnosis" || question.id === "sleepApnea") {
    const key = question.id;
    return (
      <ReplyOptions
        options={[
          ["sim", "Sim"],
          ["nao", "Não"],
          ["nao_sei", "Não sei"],
        ]}
        selected={data[key]}
        onSelect={(value) => {
          update(key, value as YesNoUnknown);
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "pregnancy") {
    return (
      <ReplyOptions
        options={[
          ["sim", "Sim"],
          ["nao", "Não"],
          ["nao_se_aplica", "Não se aplica"],
        ]}
        selected={data.pregnancyHypertensionOrDiabetes}
        onSelect={(value) => {
          update(
            "pregnancyHypertensionOrDiabetes",
            value as OnboardingData["pregnancyHypertensionOrDiabetes"],
          );
          window.setTimeout(onSubmit, 80);
        }}
      />
    );
  }

  if (question.id === "medication") {
    return (
      <div className="ml-12 space-y-2">
        <ReplyOptions
          options={[
            ["sim", "Sim"],
            ["nao", "Não"],
          ]}
          selected={data.takesMedication}
          onSelect={(value) => update("takesMedication", value as YesNo)}
          autoSubmit={false}
        />
        {data.takesMedication === "sim" && (
          <MultiReply
            values={data.medicationCategories}
            options={medicationCategories}
            onToggle={(value) => toggleArrayItem("medicationCategories", value)}
            disabled={false}
            onSubmit={onSubmit}
            hideSubmit
          />
        )}
        <SubmitReply disabled={!valid} onClick={onSubmit} />
      </div>
    );
  }

  return (
    <MultiReply
      values={data.mainReason}
      options={reasons}
      onToggle={(value) => toggleArrayItem("mainReason", value)}
      disabled={!valid}
      onSubmit={onSubmit}
    />
  );
}

function CarelitoBubble({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm">
        <Carelito className="h-11 w-11" expression="happy" />
      </div>
      <div
        className={`relative max-w-[82%] rounded-[1.25rem] rounded-bl-sm bg-white text-sm leading-6 text-[#10201f] shadow-sm ${
          compact ? "px-4 py-2" : "px-4 py-3"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-[1.25rem] rounded-br-sm bg-[#0d9488] px-4 py-3 text-sm font-semibold leading-6 text-white shadow-sm">
        {children}
      </div>
    </div>
  );
}

function ReplyOptions({
  options,
  selected,
  onSelect,
  autoSubmit = true,
}: {
  options: Array<[string, string]>;
  selected: string;
  onSelect: (value: string) => void;
  autoSubmit?: boolean;
}) {
  return (
    <div className="ml-12 flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <button
          type="button"
          key={value}
          onClick={() => onSelect(value)}
          className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
            selected === value
              ? "border-[#0d9488] bg-[#0d9488] text-white"
              : "border-white bg-white text-[#10201f] hover:border-[#0d9488]/40"
          }`}
        >
          {label}
        </button>
      ))}
      {!autoSubmit && null}
    </div>
  );
}

function MultiReply({
  values,
  options,
  onToggle,
  disabled,
  onSubmit,
  hideSubmit = false,
}: {
  values: string[];
  options: string[];
  onToggle: (value: string) => void;
  disabled: boolean;
  onSubmit: () => void;
  hideSubmit?: boolean;
}) {
  return (
    <div className="ml-12 space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => onToggle(option)}
            className={`min-h-11 rounded-full border px-4 py-2 text-left text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
              values.includes(option)
                ? "border-[#0d9488] bg-[#0d9488] text-white"
                : "border-white bg-white text-[#10201f]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {!hideSubmit && <SubmitReply disabled={disabled} onClick={onSubmit} />}
    </div>
  );
}

function NumberReply({
  value,
  onChange,
  placeholder,
  disabled,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="ml-12 flex gap-2">
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-2xl bg-white"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !disabled) onSubmit();
        }}
      />
      <SubmitReply disabled={disabled} onClick={onSubmit} iconOnly />
    </div>
  );
}

function SubmitReply({
  disabled,
  onClick,
  iconOnly = false,
}: {
  disabled: boolean;
  onClick: () => void;
  iconOnly?: boolean;
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-12 rounded-full bg-[#10201f] px-4 font-semibold text-white disabled:opacity-45"
    >
      {iconOnly ? <Send className="h-4 w-4" /> : "Enviar"}
    </Button>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-[#8aa09d]"
      style={{ animationDelay: delay }}
    />
  );
}

function getQuestions(data: OnboardingData): QuestionConfig[] {
  const all: QuestionConfig[] = [
    {
      id: "age",
      text: () => "Ótimo! Vamos começar. Qual é a sua idade?",
    },
    {
      id: "biologicalSex",
      text: () => "E seu sexo biológico?",
    },
    {
      id: "smokes",
      text: () => "Você fuma ou já fumou?",
      confirmation: (current) =>
        current.smokes.startsWith("ex_fumante")
          ? "Ótima decisão! Vou considerar esse histórico na sua avaliação."
          : "Anotado!",
    },
    {
      id: "diabetes",
      text: () => "Você tem diabetes ou pré-diabetes diagnosticado?",
    },
    {
      id: "bloodPressure",
      text: () => "Você sabe sua pressão arterial? Pode digitar os números se souber.",
      confirmation: (current) =>
        current.knowsBloodPressure === "nao" ? "Tudo bem! Vamos seguir em frente. 👍" : "Anotado!",
    },
    {
      id: "cholesterol",
      text: () => "E o colesterol, você sabe os valores?",
    },
    {
      id: "familyHistory",
      text: () =>
        "Algum familiar próximo, como pai, mãe ou irmão, teve infarto, AVC ou morte súbita antes dos 60 anos?",
      confirmation: (current) =>
        current.familyHistory === "sim"
          ? "Entendido. Esse é um fator importante que vou considerar na sua avaliação."
          : "Entendido!",
    },
    {
      id: "body",
      text: () => "Me conta seu peso e altura para eu calcular seu IMC.",
      confirmation: (current) => {
        const bmi = calculateBmi(current.weight, current.height);
        return bmi == null ? "Anotado!" : `Seu IMC é ${bmi.toFixed(1)}. Anotado! ✍️`;
      },
    },
    {
      id: "activity",
      text: () => "Com que frequência você se exercita?",
    },
    {
      id: "previousCardiacDiagnosis",
      text: () =>
        "Você já teve algum diagnóstico cardíaco anterior? Como infarto, arritmia ou insuficiência cardíaca?",
    },
    {
      id: "symptoms",
      text: () => "Você sente algum desses sintomas com frequência?",
    },
    {
      id: "stress",
      text: () => "Como você descreveria seu nível de estresse no dia a dia?",
    },
    {
      id: "sleep",
      text: () => "Quantas horas você dorme em média por noite?",
    },
    {
      id: "alcohol",
      text: () => "Você consome bebida alcoólica?",
    },
    {
      id: "waist",
      text: () => "Se souber, qual é a medida da sua cintura em cm? Pode pular se não souber.",
    },
    {
      id: "highCholesterolDiagnosis",
      text: () =>
        "Você já foi diagnosticado com colesterol alto ou triglicerídeos altos por um médico, mesmo sem saber os números exatos?",
    },
    {
      id: "sleepApnea",
      text: () => "Você ronca muito ou foi diagnosticado com apneia do sono?",
    },
    {
      id: "pregnancy",
      text: () => "Você já teve pressão alta na gravidez ou diabetes gestacional?",
    },
    {
      id: "medication",
      text: () => "Você toma algum remédio para pressão, colesterol ou diabetes atualmente?",
    },
    {
      id: "mainReason",
      text: () => "Última pergunta! O que te trouxe até aqui hoje?",
    },
  ];
  return all.filter((question) => question.id !== "pregnancy" || data.biologicalSex === "feminino");
}

function isQuestionValid(question: QuestionId, data: OnboardingData) {
  if (question === "age") return Number(data.age) > 0;
  if (question === "biologicalSex") return Boolean(data.biologicalSex);
  if (question === "smokes") return Boolean(data.smokes);
  if (question === "diabetes") return Boolean(data.diabetes);
  if (question === "bloodPressure") {
    return (
      data.knowsBloodPressure === "nao" ||
      (data.knowsBloodPressure === "sim" && Number(data.systolic) > 0 && Number(data.diastolic) > 0)
    );
  }
  if (question === "cholesterol") {
    return (
      data.knowsCholesterol === "nao" ||
      (data.knowsCholesterol === "sim" &&
        Number(data.ldl) > 0 &&
        Number(data.hdl) > 0 &&
        Number(data.totalCholesterol) > 0)
    );
  }
  if (question === "familyHistory") return Boolean(data.familyHistory);
  if (question === "body") return Number(data.weight) > 0 && Number(data.height) > 0;
  if (question === "activity") return Boolean(data.activityLevel);
  if (question === "previousCardiacDiagnosis") return Boolean(data.previousCardiacDiagnosis);
  if (question === "symptoms") return data.frequentSymptoms.length > 0;
  if (question === "stress") return Boolean(data.stressLevel);
  if (question === "sleep") return Boolean(data.sleepHours);
  if (question === "alcohol") return Boolean(data.alcoholUse);
  if (question === "waist") return true;
  if (question === "highCholesterolDiagnosis") return Boolean(data.highCholesterolDiagnosis);
  if (question === "sleepApnea") return Boolean(data.sleepApnea);
  if (question === "pregnancy") return Boolean(data.pregnancyHypertensionOrDiabetes);
  if (question === "medication") {
    return (
      data.takesMedication === "nao" ||
      (data.takesMedication === "sim" && data.medicationCategories.length > 0)
    );
  }
  return data.mainReason.length > 0;
}

function formatAnswer(question: QuestionId, data: OnboardingData) {
  if (question === "age") return `${data.age} anos`;
  if (question === "biologicalSex") return label(data.biologicalSex);
  if (question === "smokes") return label(data.smokes);
  if (question === "diabetes") return label(data.diabetes);
  if (question === "bloodPressure") {
    return data.knowsBloodPressure === "sim"
      ? `${data.systolic}/${data.diastolic} mmHg`
      : "Não sei";
  }
  if (question === "cholesterol") {
    return data.knowsCholesterol === "sim"
      ? `LDL ${data.ldl}, HDL ${data.hdl}, total ${data.totalCholesterol}`
      : "Não sei";
  }
  if (question === "familyHistory") return label(data.familyHistory);
  if (question === "body") return `${data.weight} kg · ${data.height} cm`;
  if (question === "activity") return label(data.activityLevel);
  if (question === "previousCardiacDiagnosis") return label(data.previousCardiacDiagnosis);
  if (question === "symptoms") return data.frequentSymptoms.join(", ");
  if (question === "stress") return label(data.stressLevel);
  if (question === "sleep") return label(data.sleepHours);
  if (question === "alcohol") return label(data.alcoholUse);
  if (question === "waist")
    return data.waistCircumference ? `${data.waistCircumference} cm` : "Pular";
  if (question === "highCholesterolDiagnosis") return label(data.highCholesterolDiagnosis);
  if (question === "sleepApnea") return label(data.sleepApnea);
  if (question === "pregnancy") return label(data.pregnancyHypertensionOrDiabetes);
  if (question === "medication") {
    return data.takesMedication === "sim" ? data.medicationCategories.join(", ") : "Não";
  }
  return data.mainReason.join(", ");
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

function mapDiabetesStatus(value: OnboardingData["diabetes"]) {
  if (value === "diabetes_tipo_1" || value === "diabetes_tipo_2") return "diabetes";
  if (value === "pre_diabetes") return "pre_diabetes";
  if (value === "nao") return "nao";
  return "nao_sei";
}

function readSavedProgress(userId: string): ChatProgress | null {
  try {
    const raw = window.localStorage.getItem(progressStorageKey(userId));
    return raw ? (JSON.parse(raw) as ChatProgress) : null;
  } catch {
    return null;
  }
}

function progressStorageKey(userId: string) {
  return `htcare:onboarding-chat-progress:${userId}`;
}

function getFirstName(value?: string | null) {
  return value?.split(" ")[0]?.split("@")[0] || "por aqui";
}

function label(value: string) {
  const labels: Record<string, string> = {
    feminino: "Feminino",
    masculino: "Masculino",
    sim: "Sim",
    nao: "Não",
    nao_sei: "Não sei",
    nao_se_aplica: "Não se aplica",
    ex_fumante_menos_5: "Já fumei, parei há menos de 5 anos",
    ex_fumante_mais_5: "Já fumei, parei há mais de 5 anos",
    diabetes_tipo_1: "Diabetes tipo 1",
    diabetes_tipo_2: "Diabetes tipo 2",
    pre_diabetes: "Pré-diabetes",
    sedentario: "Sedentário",
    leve: "1-2x por semana",
    moderado: "3-4x por semana",
    intenso: "Quase todo dia",
    baixo: "Baixo",
    alto: "Alto",
    menos_5: "Menos de 5h",
    "5_6": "5-6h",
    "7_8": "7-8h",
    mais_8: "Mais de 8h",
    nao_bebo: "Não bebo",
    socialmente: "Socialmente",
    algumas_vezes_semana: "Algumas vezes por semana",
    diariamente: "Diariamente",
  };
  return labels[value] ?? value;
}
