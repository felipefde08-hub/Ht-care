import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CircleGauge,
  Cigarette,
  Dumbbell,
  FileText,
  HeartPulse,
  Moon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import type { RiskResult } from "@/lib/risk-score";

export interface HealthReportData {
  age: string;
  biologicalSex: "feminino" | "masculino" | "";
  smokes: "sim" | "nao" | "";
  diabetes: "sim" | "nao" | "nao_sei" | "";
  knowsBloodPressure: "sim" | "nao" | "";
  systolic: string;
  diastolic: string;
  knowsCholesterol: "sim" | "nao" | "";
  ldl: string;
  hdl: string;
  totalCholesterol: string;
  familyHistory: "sim" | "nao" | "";
  weight: string;
  height: string;
  activityLevel: "sedentario" | "leve" | "moderado" | "intenso" | "";
  frequentSymptoms: string[];
  stressLevel: "baixo" | "moderado" | "alto" | "";
  sleepHours: "menos_5" | "5_6" | "7_8" | "mais_8" | "";
  alcoholUse: "nao_bebo" | "socialmente" | "algumas_vezes_semana" | "diariamente" | "";
}

interface ReportFactor {
  title: string;
  explanation: string;
  recommendation: string;
}

export function HealthReport({
  personName,
  assessmentDate,
  data,
  bmi,
  result,
  onReview,
}: {
  personName: string;
  assessmentDate: Date;
  data: HealthReportData;
  bmi: number | null;
  result: RiskResult;
  onReview?: () => void;
}) {
  const factors = buildReportFactors(data, bmi, result);
  const nextStep = nextStepFor(result.level);
  const display = displayFor(result.level);
  const riskPercent = result.level === "baixo" ? 17 : result.level === "moderado" ? 50 : 84;

  return (
    <article className="w-full rounded-[1.5rem] border border-[#10201f]/8 bg-[#f6f8f7] p-3 shadow-[0_34px_140px_-92px_rgba(16,32,31,0.74)] sm:rounded-[2.25rem] sm:p-8">
      <header className="flex flex-col gap-3 rounded-[1.25rem] border border-[#10201f]/8 bg-white p-4 sm:gap-5 sm:rounded-[1.75rem] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#78908d] sm:text-xs sm:tracking-[0.24em]">
              Relatório de Saúde
            </p>
            <h1 className="mt-1 font-sans text-xl font-semibold leading-tight sm:text-3xl">
              {personName}
            </h1>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#10201f]/8 bg-[#f7faf9] px-3 py-2 text-xs font-medium text-[#536b68] sm:px-4 sm:text-sm">
          <CalendarDays className="h-4 w-4 text-[#2f6760]" />
          Avaliação em {assessmentDate.toLocaleDateString("pt-BR")}
        </div>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="order-2 grid gap-4 lg:grid-cols-2 xl:order-1 xl:gap-5">
          <ReportCard className="lg:col-span-2">
            <SectionTitle icon={Activity} title="Seus Hábitos" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HabitChip
                icon={Dumbbell}
                label="Atividade"
                value={formatActivity(data.activityLevel)}
              />
              <HabitChip icon={Moon} label="Sono" value={formatSleep(data.sleepHours)} />
              <HabitChip icon={Sparkles} label="Estresse" value={formatStress(data.stressLevel)} />
              <HabitChip icon={Wine} label="Álcool" value={formatAlcohol(data.alcoholUse)} />
            </div>
          </ReportCard>

          <ReportCard>
            <SectionTitle icon={CircleGauge} title="Seus Dados Informados" />
            <div className="mt-6 grid gap-4">
              <DataLine label="IMC" value={bmiLabel(data, bmi)} tone={bmiTone(bmi)} />
              <DataLine
                label="Pressão arterial"
                value={pressureLabel(data)}
                tone={pressureTone(data)}
              />
              <DataLine
                label="Colesterol"
                value={cholesterolLabel(data)}
                tone={cholesterolTone(data)}
              />
            </div>
          </ReportCard>

          <ReportCard>
            <SectionTitle icon={TrendingUp} title="Risco Cardiovascular Estimado" />
            <p className="mt-5 text-base leading-7 text-[#536b68]">
              Seu risco estimado é{" "}
              <span className="font-semibold text-[#10201f]">{result.label}</span>, baseado nos
              fatores identificados nesta avaliação.
            </p>
            <RiskBar percent={riskPercent} level={result.level} />
          </ReportCard>

          <ReportCard className="lg:col-span-2">
            <SectionTitle icon={ShieldCheck} title="Fatores que Pesaram no Seu Resultado" />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {factors.length ? (
                factors.map((factor) => <FactorMiniCard key={factor.title} factor={factor} />)
              ) : (
                <div className="rounded-2xl bg-[#f7faf9] p-5 text-[#536b68] md:col-span-2">
                  Nenhum fator crítico foi identificado nas respostas informadas. Ainda assim,
                  acompanhamento preventivo continua sendo importante.
                </div>
              )}
            </div>
          </ReportCard>
        </div>

        <div className="order-1 grid gap-4 xl:order-2 xl:gap-5">
          <ReportCard className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
              Score de Saúde
            </p>
            <div className="mt-6 flex justify-center">
              <ScoreRing value={result.score} />
            </div>
            <h2 className="mt-6 font-sans text-2xl font-semibold">{display.title}</h2>
            <p className="mt-2 text-base leading-7 text-[#536b68]">{display.subtitle}</p>
            <ReportFeedback score={result.score} />
          </ReportCard>

          <ReportCard>
            <SectionTitle icon={FileText} title="Próximos Passos" />
            <h3 className="mt-5 font-sans text-2xl font-semibold">{nextStep.title}</h3>
            <p className="mt-3 text-base leading-7 text-[#536b68]">{nextStep.text}</p>
            <div className="mt-6 grid gap-3">
              <Button className="rounded-full bg-[#10201f] font-semibold" asChild>
                <Link to="/desafio">Continuar para o desafio</Link>
              </Button>
              {result.level !== "baixo" && (
                <Button variant="outline" className="rounded-full" asChild>
                  <a href="mailto:contato@htcare.com.br?subject=Quero%20ser%20conectado%20a%20um%20cardiologista%20parceiro">
                    Buscar cardiologista parceiro
                  </a>
                </Button>
              )}
              {onReview && (
                <Button variant="ghost" className="rounded-full" onClick={onReview}>
                  Revisar respostas
                </Button>
              )}
            </div>
          </ReportCard>
        </div>
      </div>

      <footer className="mt-5 rounded-[1.5rem] border border-[#10201f]/8 bg-white p-5 text-sm leading-6 text-[#536b68]">
        Este relatório é uma ferramenta de triagem e educação em saúde, baseada em diretrizes da OMS
        e da Sociedade Brasileira de Cardiologia. Não substitui consulta, diagnóstico ou prescrição
        médica. <span className="font-semibold text-[#10201f]">www.htcare.com.br</span>
      </footer>
    </article>
  );
}

type FeedbackAnswer = "sim" | "nao" | "mais_ou_menos";

interface ReportFeedbackEntry {
  score: number;
  answer: FeedbackAnswer;
  feedback: string;
  createdAt: string;
}

function ReportFeedback({ score }: { score: number }) {
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submitFeedback(nextAnswer = answer) {
    if (!nextAnswer) return;
    const payload = {
      score,
      answer: nextAnswer,
      feedback,
      createdAt: new Date().toISOString(),
    };
    const previous = JSON.parse(
      window.localStorage.getItem("htcare:report-feedback") || "[]",
    ) as ReportFeedbackEntry[];
    window.localStorage.setItem("htcare:report-feedback", JSON.stringify([...previous, payload]));
    setSubmitted(true);
  }

  return (
    <div className="mt-7 rounded-[1.25rem] border border-[#10201f]/8 bg-[#f7faf9] p-4 text-left">
      <p className="font-sans text-base font-semibold text-[#10201f]">
        O resultado foi útil pra você?
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["sim", "Sim"],
          ["nao", "Não"],
          ["mais_ou_menos", "Mais ou menos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setAnswer(value as FeedbackAnswer);
              setSubmitted(false);
            }}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
              answer === value
                ? "border-[#10201f] bg-[#10201f] text-white"
                : "border-[#10201f]/10 bg-white text-[#536b68] hover:border-[#10201f]/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={feedback}
        onChange={(event) => {
          setFeedback(event.target.value);
          setSubmitted(false);
        }}
        placeholder="Deixe um feedback para melhorarmos"
        className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-[#10201f]/8 bg-white px-4 py-3 text-sm leading-6 text-[#10201f] outline-none transition placeholder:text-[#78908d] focus:border-[#2f6760]/45 focus:ring-4 focus:ring-[#2f6760]/10"
      />
      <button
        type="button"
        disabled={!answer}
        onClick={() => submitFeedback()}
        className="mt-3 w-full rounded-full bg-[#10201f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f3b38] disabled:cursor-not-allowed disabled:bg-[#10201f]/30"
      >
        {submitted ? "Feedback salvo. Obrigado." : "Enviar feedback"}
      </button>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative h-36 w-36 rounded-full bg-[radial-gradient(circle,white_58%,transparent_59%),conic-gradient(from_180deg,#1d7cff,#31b68f,#e5ecea)] p-2 sm:h-56 sm:w-56 sm:p-3">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#e5ecea" strokeWidth="12" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeLinecap="round"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="20" y1="20" x2="160" y2="160">
            <stop stopColor="#1d7cff" />
            <stop offset="1" stopColor="#31b68f" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-sans text-4xl font-semibold text-[#10201f] sm:text-6xl">{value}</p>
          <p className="mt-1 text-sm font-medium text-[#78908d]">/ 100</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7faf9] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78908d]">{label}</p>
      <p className="mt-2 font-sans text-xl font-semibold">{value}</p>
    </div>
  );
}

function ReportCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[1.25rem] border border-[#10201f]/8 bg-white p-4 shadow-[0_22px_90px_-76px_rgba(16,32,31,0.56)] sm:rounded-[1.6rem] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eef6f3] text-[#2f6760] sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <h2 className="font-sans text-xl font-semibold sm:text-2xl">{title}</h2>
    </div>
  );
}

function HabitChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#10201f]/8 bg-[#f7faf9] p-3 sm:p-4">
      <Icon className="h-5 w-5 text-[#2f6760]" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#78908d]">
        {label}
      </p>
      <p className="mt-2 font-sans text-lg font-semibold leading-tight sm:text-xl">{value}</p>
    </div>
  );
}

function DataLine({ label, value, tone }: { label: string; value: string; tone: RiskLevelTone }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7faf9] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78908d]">{label}</p>
        <p className="mt-2 font-medium text-[#10201f]">{value}</p>
      </div>
      <span className={`h-3 w-3 shrink-0 rounded-full ${toneClass(tone)}`} />
    </div>
  );
}

function RiskBar({ percent, level }: { percent: number; level: RiskResult["level"] }) {
  return (
    <div className="mt-7">
      <div className="relative h-3 rounded-full bg-gradient-to-r from-[#31b68f] via-[#d89a1d] to-[#c4413a]">
        <span
          className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-white bg-[#10201f] shadow-soft"
          style={{ left: `calc(${percent}% - 12px)` }}
        />
      </div>
      <div className="mt-3 flex justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#78908d]">
        <span>Baixo</span>
        <span>Moderado</span>
        <span>Alto</span>
      </div>
      <p className="mt-5 rounded-2xl bg-[#f7faf9] p-4 text-sm leading-6 text-[#536b68]">
        Posição atual: <span className="font-semibold text-[#10201f]">{riskLabelText(level)}</span>.
      </p>
    </div>
  );
}

function FactorMiniCard({ factor }: { factor: ReportFactor }) {
  const tone = factorTone(factor.title);
  const Icon = factorIcon(factor.title);
  return (
    <div className="rounded-2xl border border-[#10201f]/8 bg-[#fbfcfc] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#2f6760] shadow-soft">
          <Icon className="h-5 w-5" />
        </span>
        <span className={`mt-1 h-3 w-3 rounded-full ${toneClass(tone)}`} />
      </div>
      <h3 className="mt-4 font-sans text-lg font-semibold">{factor.title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#536b68]">{factor.explanation}</p>
      <p className="mt-4 rounded-2xl bg-white p-3 text-sm leading-6 text-[#304643]">
        <span className="font-semibold">Recomendação: </span>
        {factor.recommendation}
      </p>
    </div>
  );
}

type RiskLevelTone = "good" | "attention" | "risk";

function displayFor(level: RiskResult["level"]) {
  if (level === "baixo") {
    return { title: "Muito bom", subtitle: "Você está no caminho certo." };
  }
  if (level === "moderado") {
    return { title: "Atenção necessária", subtitle: "Vamos te ajudar a melhorar isso." };
  }
  return {
    title: "Risco identificado",
    subtitle: "Vamos te ajudar a entender os próximos passos.",
  };
}

function riskLabelText(level: RiskResult["level"]) {
  if (level === "baixo") return "baixo risco";
  if (level === "moderado") return "risco moderado";
  return "risco alto";
}

function toneClass(tone: RiskLevelTone) {
  if (tone === "good") return "bg-[#31b68f]";
  if (tone === "attention") return "bg-[#d89a1d]";
  return "bg-[#c4413a]";
}

function bmiLabel(data: HealthReportData, bmi: number | null) {
  if (bmi == null) return "Não calculado";
  return `IMC ${bmi.toFixed(1)} — ${bmiCategory(bmi)} (${data.weight || "—"} kg / ${
    data.height || "—"
  } cm)`;
}

function bmiCategory(bmi: number) {
  if (bmi >= 35) return "Obesidade grau 2/3";
  if (bmi >= 30) return "Obesidade grau 1";
  if (bmi >= 25) return "Sobrepeso";
  return "Dentro do esperado";
}

function bmiTone(bmi: number | null): RiskLevelTone {
  if (bmi == null || bmi < 25) return "good";
  if (bmi < 30) return "attention";
  return "risk";
}

function pressureLabel(data: HealthReportData) {
  if (data.knowsBloodPressure !== "sim") return "Não informado — considere medir e atualizar";
  return `${data.systolic || "—"} / ${data.diastolic || "—"} mmHg`;
}

function pressureTone(data: HealthReportData): RiskLevelTone {
  if (data.knowsBloodPressure !== "sim") return "attention";
  const systolic = Number(data.systolic);
  const diastolic = Number(data.diastolic);
  if (systolic >= 140 || diastolic >= 90) return "risk";
  if (systolic >= 120 || diastolic >= 80) return "attention";
  return "good";
}

function cholesterolLabel(data: HealthReportData) {
  if (data.knowsCholesterol !== "sim") return "Não informado";
  return `LDL ${data.ldl || "—"} · HDL ${data.hdl || "—"} · Total ${data.totalCholesterol || "—"}`;
}

function cholesterolTone(data: HealthReportData): RiskLevelTone {
  if (data.knowsCholesterol !== "sim") return "attention";
  const total = Number(data.totalCholesterol);
  const ldl = Number(data.ldl);
  const hdl = Number(data.hdl);
  if (total >= 240 || ldl >= 160 || (hdl > 0 && hdl < 35)) return "risk";
  if (total >= 200 || ldl >= 130 || (hdl > 0 && hdl < 40)) return "attention";
  return "good";
}

function factorTone(title: string): RiskLevelTone {
  if (
    title.includes("Fumante") ||
    title.includes("Pressão") ||
    title.includes("Diabetes") ||
    title.includes("Sintomas")
  ) {
    return "risk";
  }
  if (title.includes("IMC") || title.includes("Sedentarismo") || title.includes("Histórico")) {
    return "attention";
  }
  return "attention";
}

function factorIcon(title: string): LucideIcon {
  if (title.includes("Fumante")) return Cigarette;
  if (title.includes("Pressão") || title.includes("Sintomas")) return HeartPulse;
  if (title.includes("IMC")) return CircleGauge;
  if (title.includes("Sedentarismo")) return Dumbbell;
  if (title.includes("Estresse")) return Sparkles;
  if (title.includes("álcool")) return Wine;
  if (title.includes("Histórico")) return FileText;
  return AlertTriangle;
}

function nextStepFor(level: RiskResult["level"]) {
  if (level === "baixo") {
    return {
      title: "Continue acompanhando",
      text: "Seus hábitos atuais estão alinhados com um perfil de baixo risco. Recomendamos refazer esta avaliação em 6 a 12 meses, ou antes se algo mudar no seu histórico de saúde.",
    };
  }
  if (level === "moderado") {
    return {
      title: "Converse com um médico",
      text: "Identificamos alguns fatores que merecem atenção. Recomendamos conversar com um médico sobre os pontos levantados neste relatório, e considerar exames complementares para uma avaliação mais completa.",
    };
  }
  return {
    title: "Busque avaliação médica",
    text: "Seu resultado indica fatores de risco significativos. Recomendamos fortemente buscar avaliação médica o quanto antes para investigação adequada.",
  };
}

function buildReportFactors(
  data: HealthReportData,
  bmi: number | null,
  result: RiskResult,
): ReportFactor[] {
  const factors: ReportFactor[] = [];
  const systolic = Number(data.systolic);
  const diastolic = Number(data.diastolic);
  const hasSymptoms = data.frequentSymptoms.some((item) => item !== "nenhum desses");

  function addFactor(factor: ReportFactor) {
    if (!factors.some((item) => item.title === factor.title)) factors.push(factor);
  }

  if (data.smokes === "sim") {
    addFactor({
      title: "Fumante",
      explanation:
        "Fumar é um dos fatores que mais aumenta o risco cardiovascular — danifica os vasos sanguíneos e acelera o acúmulo de placas de gordura nas artérias.",
      recommendation:
        "Parar de fumar é a mudança isolada que mais reduz risco cardiovascular, com efeito mensurável já no primeiro ano sem fumar.",
    });
  }
  if (data.activityLevel === "sedentario") {
    addFactor({
      title: "Sedentarismo",
      explanation:
        "A falta de atividade física regular contribui para pressão alta, colesterol elevado e resistência à insulina.",
      recommendation:
        "A Organização Mundial da Saúde recomenda pelo menos 150 minutos de atividade física moderada por semana — o equivalente a uma caminhada de 30 minutos, 5 vezes por semana.",
    });
  }
  if (bmi != null && bmi >= 25) {
    addFactor({
      title: "IMC elevado",
      explanation:
        "O excesso de peso, principalmente concentrado na região abdominal, está associado a maior risco de hipertensão, diabetes tipo 2 e doenças cardiovasculares.",
      recommendation:
        "Uma redução de 5 a 10% do peso corporal já traz benefícios mensuráveis para pressão arterial e controle de glicemia.",
    });
  }
  if (data.familyHistory === "sim") {
    addFactor({
      title: "Histórico familiar de infarto/AVC antes dos 60 anos",
      explanation:
        "Ter um parente de primeiro grau com evento cardiovascular precoce aumenta seu risco individual, independente dos seus próprios hábitos.",
      recommendation:
        "Esse é um fator que não pode ser mudado, mas pode ser compensado controlando os fatores que estão sob seu controle — e justifica avaliação médica preventiva mais cedo.",
    });
  }
  if (data.knowsBloodPressure === "sim" && (systolic >= 130 || diastolic >= 85)) {
    addFactor({
      title: "Pressão arterial elevada",
      explanation:
        "Pressão alta não controlada é um dos principais fatores de risco para infarto e AVC, e frequentemente não causa nenhum sintoma perceptível.",
      recommendation:
        "Medir a pressão regularmente e buscar acompanhamento médico é essencial, mesmo sem sintomas.",
    });
  }
  if (data.diabetes === "sim") {
    addFactor({
      title: "Diabetes ou pré-diabetes",
      explanation:
        "Glicemia elevada de forma persistente danifica vasos sanguíneos ao longo do tempo, aumentando significativamente o risco cardiovascular.",
      recommendation:
        "Manter acompanhamento médico regular e atenção à alimentação e atividade física é essencial para esse perfil.",
    });
  }
  if (hasSymptoms) {
    addFactor({
      title: "Sintomas relatados",
      explanation: "Você relatou sintomas que merecem atenção médica para investigação adequada.",
      recommendation:
        "Recomendamos buscar avaliação médica para investigar a causa desses sintomas, independente do score calculado.",
    });
  }
  if (data.stressLevel === "alto" || data.sleepHours === "menos_5" || data.sleepHours === "5_6") {
    addFactor({
      title: "Estresse alto / sono insuficiente",
      explanation:
        "Estresse crônico e sono insuficiente estão associados a pressão arterial elevada e maior risco cardiovascular ao longo do tempo.",
      recommendation:
        "Priorizar qualidade de sono (7-8 horas) e estratégias de manejo de estresse traz benefício mensurável para saúde cardiovascular.",
    });
  }
  if (data.alcoholUse === "algumas_vezes_semana" || data.alcoholUse === "diariamente") {
    addFactor({
      title: "Consumo de álcool frequente",
      explanation:
        "Consumo frequente de álcool está associado a aumento de pressão arterial e de triglicerídeos.",
      recommendation:
        "Reduzir a frequência de consumo de álcool é uma medida com benefício direto para saúde cardiovascular.",
    });
  }

  for (const factor of result.factors) {
    if (factor === "perfil inicial sem fatores críticos informados") continue;
    addFactor(copyForScoreFactor(factor));
  }

  return factors;
}

function copyForScoreFactor(factor: string): ReportFactor {
  if (factor.includes("hipertensão estágio 2")) {
    return {
      title: "Pressão arterial em estágio 2",
      explanation:
        "A pressão informada entrou em uma faixa de maior atenção cardiovascular e pesa bastante no score.",
      recommendation:
        "Procure avaliação médica para confirmar medidas, investigar causas e definir um plano de acompanhamento.",
    };
  }
  if (factor.includes("hipertensão estágio 1") || factor.includes("pressão arterial elevada")) {
    return {
      title: "Pressão arterial elevada",
      explanation:
        "A pressão informada está acima do ideal e pode aumentar risco cardiovascular quando persiste ao longo do tempo.",
      recommendation:
        "Meça novamente em dias diferentes e leve os registros para conversar com um médico.",
    };
  }
  if (factor.includes("pressão arterial não informada")) {
    return {
      title: "Pressão não informada",
      explanation:
        "Sem uma medida recente de pressão, a avaliação fica menos precisa e recebe uma penalidade pequena por falta de acompanhamento.",
      recommendation: "Faça uma medida de pressão e atualize seus dados no próximo check-in.",
    };
  }
  if (factor.includes("colesterol")) {
    return {
      title: factor.includes("não informado") ? "Colesterol não informado" : "Colesterol alterado",
      explanation:
        "Colesterol é um dos marcadores usados em calculadoras clínicas de risco cardiovascular.",
      recommendation:
        "Se você tiver exames recentes, atualize os valores. Se não tiver, converse com seu médico sobre quando faz sentido medir.",
    };
  }
  if (factor.includes("atividade física")) {
    return {
      title: "Atividade física abaixo do ideal",
      explanation:
        "Níveis menores de atividade física reduzem proteção metabólica e cardiovascular ao longo do tempo.",
      recommendation:
        "Aumentar frequência de movimento semanal costuma ser um dos primeiros passos de maior impacto.",
    };
  }
  if (factor.includes("combinação de fatores graves")) {
    return {
      title: "Combinação de fatores graves",
      explanation:
        "Tabagismo, pressão alta e obesidade juntos aumentam o risco de forma acumulativa, não isolada.",
      recommendation:
        "Esse conjunto merece conversa médica prioritária e acompanhamento estruturado.",
    };
  }
  return {
    title: factor.charAt(0).toUpperCase() + factor.slice(1),
    explanation: "Este item teve peso no cálculo determinístico do seu score.",
    recommendation:
      "Use este ponto como guia para acompanhar sua evolução e conversar com um profissional de saúde.",
  };
}

function formatActivity(value: HealthReportData["activityLevel"]) {
  if (value === "sedentario") return "Sedentário";
  if (value === "leve") return "Leve";
  if (value === "moderado") return "Moderado";
  if (value === "intenso") return "Intenso";
  return "Não informado";
}

function formatSleep(value: HealthReportData["sleepHours"]) {
  if (value === "menos_5") return "Menos de 5h";
  if (value === "5_6") return "5-6h";
  if (value === "7_8") return "7-8h, ideal";
  if (value === "mais_8") return "Mais de 8h";
  return "Não informado";
}

function formatStress(value: HealthReportData["stressLevel"]) {
  if (value === "baixo") return "Baixo";
  if (value === "moderado") return "Moderado";
  if (value === "alto") return "Alto";
  return "Não informado";
}

function formatAlcohol(value: HealthReportData["alcoholUse"]) {
  if (value === "nao_bebo") return "Não bebe";
  if (value === "socialmente") return "Socialmente";
  if (value === "algumas_vezes_semana") return "Algumas vezes/semana";
  if (value === "diariamente") return "Diariamente";
  return "Não informado";
}
