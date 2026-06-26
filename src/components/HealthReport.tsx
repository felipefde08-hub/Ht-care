import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  Cigarette,
  ClipboardCheck,
  Dumbbell,
  FileHeart,
  HeartHandshake,
  HeartPulse,
  Microscope,
  Moon,
  Scale,
  Sparkles,
  Stethoscope,
  TestTube2,
  Wine,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  reference: string;
  severity: "Leve" | "Moderado" | "Alto";
  impact: "Baixo" | "Médio" | "Alto";
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
  const firstName = personName.split(" ")[0] || "Paciente";
  const status = statusFor(result.score);
  const factors = buildReportFactors(data, bmi, result).slice(0, 6);
  const quickSummary = quickSummaryFor(result.level, factors);
  const plan = planForFactors(factors, data);
  const insight = insightFor(result, factors);

  return (
    <article className="mx-auto w-full max-w-7xl text-[#111827]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[2rem] border border-black/[0.04] bg-white p-6 shadow-[0_28px_90px_-70px_rgba(15,23,42,0.55)] sm:p-8 lg:rounded-[2.5rem] lg:p-10"
      >
        <div className="pointer-events-none absolute right-[-120px] top-[-160px] h-80 w-80 rounded-full bg-[#2563EB]/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-180px] left-[-140px] h-96 w-96 rounded-full bg-[#16A34A]/[0.06] blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#6B7280]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#F3F4F6] px-3 py-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {assessmentDate.toLocaleDateString("pt-BR")}
              </span>
              <span className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-[#2563EB]">
                Relatório HTCare
              </span>
            </div>

            <p className="mt-8 text-sm font-medium text-[#6B7280]">Olá, {firstName}</p>
            <h1 className="mt-2 max-w-3xl font-sans text-4xl font-semibold tracking-[-0.03em] text-[#111827] sm:text-5xl lg:text-6xl">
              Seu relatório está pronto.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#6B7280] sm:text-lg">
              {quickSummary}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="xl"
                className="h-12 rounded-2xl bg-[#2563EB] px-6 font-semibold"
                asChild
              >
                <Link to="/plano-acao">
                  Continuar meu plano <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" className="h-12 rounded-2xl" asChild>
                <Link to="/meu-risco">Ver evolução</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/[0.04] bg-[#F9FAFB]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  Score principal
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="font-sans text-7xl font-semibold tracking-[-0.06em] text-[#111827]">
                    {result.score}
                  </span>
                  <span className="mb-3 text-xl font-semibold text-[#9CA3AF]">/100</span>
                </div>
              </div>
              <span
                className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", status.badgeClass)}
              >
                {status.label}
              </span>
            </div>
            <div className="mt-7">
              <ScoreGauge value={result.score} />
            </div>
            <p className="mt-5 text-sm leading-6 text-[#6B7280]">{status.summary}</p>
          </div>
        </div>
      </motion.section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickMetric
          icon={HeartPulse}
          label="Pressão"
          value={pressureShortLabel(data)}
          tone={pressureTone(data)}
          to="/perfil/dados-saude"
        />
        <QuickMetric
          icon={TestTube2}
          label="Colesterol"
          value={cholesterolShortLabel(data)}
          tone={cholesterolTone(data)}
          to="/perfil/dados-saude"
        />
        <QuickMetric
          icon={Scale}
          label="IMC"
          value={bmi == null ? "Não calculado" : bmi.toFixed(1)}
          tone={bmiTone(bmi)}
          to="/perfil/dados-saude"
        />
        <QuickMetric
          icon={Activity}
          label="Atividade"
          value={formatActivity(data.activityLevel)}
          tone={activityTone(data.activityLevel)}
          to="/perfil/dados-saude"
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-5">
          <PremiumCard>
            <SectionHeading
              eyebrow="Principais fatores"
              title="O que mais impactou sua saúde"
              description="Itens que mais pesaram no seu score, em ordem de atenção."
            />
            <Accordion type="single" collapsible className="mt-6 space-y-3">
              {factors.map((factor, index) => {
                const Icon = factorIcon(factor.title);
                return (
                  <AccordionItem
                    key={factor.title}
                    value={`factor-${index}`}
                    className="rounded-2xl border border-black/[0.05] bg-[#F9FAFB] px-4"
                  >
                    <AccordionTrigger className="gap-4 py-4 hover:no-underline">
                      <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                            factorToneClass(factor.severity, "soft"),
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-sans text-base font-semibold text-[#111827]">
                            {factor.title}
                          </span>
                          <span className="mt-1 block text-sm text-[#6B7280]">
                            Afeta {factor.impact.toLowerCase()} seu risco cardiovascular.
                          </span>
                        </span>
                      </div>
                      <span
                        className={cn(
                          "hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex",
                          factorToneClass(factor.severity, "badge"),
                        )}
                      >
                        {factor.severity}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 pt-0">
                      <div className="grid gap-3 text-sm leading-6 text-[#4B5563] sm:grid-cols-3">
                        <InfoBlock title="Explicação" text={factor.explanation} />
                        <InfoBlock title="Recomendação" text={factor.recommendation} />
                        <InfoBlock title="Referência clínica" text={factor.reference} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </PremiumCard>

          <PremiumCard className="overflow-hidden">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeading
                eyebrow="Plano personalizado"
                title="Seu plano para os próximos 30 dias"
                description="Três ações simples para começar a reduzir risco sem sobrecarregar sua rotina."
              />
              <Button variant="outline" className="rounded-2xl" asChild>
                <Link to="/plano-acao">Abrir plano</Link>
              </Button>
            </div>
            <div className="mt-7 grid gap-3">
              {plan.map((item, index) => (
                <PlanAction key={item.title} index={index + 1} {...item} />
              ))}
            </div>
          </PremiumCard>

          <PremiumCard className="bg-[#F8FBFF]">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#2563EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
                  Insight da IA
                </p>
                <h2 className="mt-2 font-sans text-2xl font-semibold tracking-[-0.02em]">
                  O que mais faria diferença hoje?
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#4B5563]">{insight}</p>
              </div>
            </div>
          </PremiumCard>
        </div>

        <aside className="grid content-start gap-5">
          <PremiumCard>
            <SectionHeading eyebrow="Exames" title="Exames recomendados" />
            <div className="mt-5 grid gap-3">
              {recommendedExams(data).map((exam) => (
                <ExamCard key={exam.title} {...exam} />
              ))}
            </div>
          </PremiumCard>

          <PremiumCard>
            <SectionHeading eyebrow="Rede parceira" title="Médicos parceiros" />
            <div className="mt-5 grid gap-3">
              <PartnerAction icon={HeartHandshake} title="Encontrar cardiologista" />
              <PartnerAction icon={Stethoscope} title="Encontrar clínico" />
              <PartnerAction icon={CalendarDays} title="Agendar consulta" />
            </div>
          </PremiumCard>

          <PremiumCard>
            <SectionHeading eyebrow="Próximos passos" title="Linha do tempo" />
            <div className="mt-6 space-y-1">
              {[
                ["Hoje", "Questionário concluído"],
                ["7 dias", "Próximo check-in"],
                ["30 dias", "Revisão do plano"],
                ["90 dias", "Nova avaliação"],
              ].map(([time, title], index) => (
                <TimelineItem key={title} time={time} title={title} isLast={index === 3} />
              ))}
            </div>
          </PremiumCard>
        </aside>
      </div>

      <footer className="mt-5 rounded-[1.5rem] bg-white px-5 py-4 text-xs leading-5 text-[#6B7280] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        Esta avaliação é uma ferramenta de triagem e acompanhamento. Não substitui consulta,
        diagnóstico ou prescrição médica. Em caso de sintomas ou risco elevado, procure atendimento
        profissional.
      </footer>
    </article>
  );
}

function PremiumCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">{eyebrow}</p>
      <h2 className="mt-2 font-sans text-2xl font-semibold tracking-[-0.025em] text-[#111827]">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">{description}</p>
      )}
    </div>
  );
}

function ScoreGauge({ value }: { value: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[#E5E7EB]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
        className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#16A34A]"
      />
    </div>
  );
}

function QuickMetric({
  icon: Icon,
  label,
  value,
  tone,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: RiskLevelTone;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-[1.5rem] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-34px_rgba(15,23,42,0.45)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", toneSoftClass(tone))}>
          <Icon className="h-5 w-5" />
        </span>
        <ChevronRight className="h-4 w-4 text-[#D1D5DB] transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-1 truncate font-sans text-lg font-semibold text-[#111827]">{value}</p>
    </Link>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{text}</p>
    </div>
  );
}

function PlanAction({
  index,
  title,
  progress,
}: {
  index: number;
  title: string;
  progress: number;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-[#F9FAFB] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-[#2563EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {index}
          </span>
          <p className="font-medium text-[#111827]">{title}</p>
        </div>
        <span className="text-xs font-semibold text-[#6B7280]">{progress}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#16A34A]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ExamCard({
  icon: Icon,
  title,
  reason,
}: {
  icon: LucideIcon;
  title: string;
  reason: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F9FAFB] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#2563EB]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-sans text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-[#6B7280]">
            <span className="font-medium text-[#4B5563]">Motivo: </span>
            {reason}
          </p>
        </div>
      </div>
      <Button className="mt-4 h-11 w-full rounded-2xl bg-[#2563EB] font-semibold" asChild>
        <Link to="/meu-risco">Solicitar exame</Link>
      </Button>
    </div>
  );
}

function PartnerAction({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <a
      href={`mailto:contato@htcare.com.br?subject=${encodeURIComponent(title)}`}
      className="flex items-center justify-between rounded-2xl bg-[#F9FAFB] p-4 transition hover:bg-[#EEF2FF]"
    >
      <span className="flex items-center gap-3 font-medium">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#2563EB]">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </span>
      <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
    </a>
  );
}

function TimelineItem({ time, title, isLast }: { time: string; title: string; isLast?: boolean }) {
  return (
    <div className="grid grid-cols-[72px_20px_1fr] gap-3">
      <p className="pt-0.5 text-xs font-semibold text-[#6B7280]">{time}</p>
      <div className="flex flex-col items-center">
        <span className="h-3 w-3 rounded-full bg-[#2563EB]" />
        {!isLast && <span className="mt-1 h-10 w-px bg-[#E5E7EB]" />}
      </div>
      <p className="pb-7 text-sm font-medium text-[#111827]">{title}</p>
    </div>
  );
}

type RiskLevelTone = "good" | "attention" | "risk" | "neutral";

function statusFor(score: number) {
  if (score >= 90) {
    return {
      label: "Excelente",
      summary: "Seu perfil inicial mostra poucos fatores de risco informados.",
      badgeClass: "bg-[#DCFCE7] text-[#166534]",
    };
  }
  if (score >= 80) {
    return {
      label: "Bom",
      summary: "Você está em uma faixa favorável, com pontos que ainda podem ser acompanhados.",
      badgeClass: "bg-[#DCFCE7] text-[#166534]",
    };
  }
  if (score >= 50) {
    return {
      label: "Moderado",
      summary: "Há fatores relevantes para acompanhar e melhorar nos próximos meses.",
      badgeClass: "bg-[#FEF3C7] text-[#92400E]",
    };
  }
  return {
    label: "Alto risco",
    summary: "Seu resultado merece atenção médica e acompanhamento mais estruturado.",
    badgeClass: "bg-[#FEE2E2] text-[#991B1B]",
  };
}

function quickSummaryFor(level: RiskResult["level"], factors: ReportFactor[]) {
  const mainFactor = factors[0]?.title.toLowerCase();
  if (level === "baixo") {
    return "Seu score indica baixo risco neste momento. Continue acompanhando para manter a tendência.";
  }
  if (level === "moderado") {
    return mainFactor
      ? `Seu score indica atenção moderada, principalmente por ${mainFactor}.`
      : "Seu score indica atenção moderada e merece acompanhamento preventivo.";
  }
  return mainFactor
    ? `Seu score indica risco elevado, com maior impacto de ${mainFactor}.`
    : "Seu score indica risco elevado e merece avaliação profissional.";
}

function toneSoftClass(tone: RiskLevelTone) {
  if (tone === "good") return "bg-[#DCFCE7] text-[#16A34A]";
  if (tone === "attention") return "bg-[#FEF3C7] text-[#D97706]";
  if (tone === "risk") return "bg-[#FEE2E2] text-[#DC2626]";
  return "bg-[#EEF2FF] text-[#2563EB]";
}

function factorToneClass(severity: ReportFactor["severity"], mode: "soft" | "badge") {
  if (severity === "Alto") {
    return mode === "soft" ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#FEE2E2] text-[#991B1B]";
  }
  if (severity === "Moderado") {
    return mode === "soft" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#FEF3C7] text-[#92400E]";
  }
  return mode === "soft" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#DCFCE7] text-[#166534]";
}

function pressureShortLabel(data: HealthReportData) {
  if (data.knowsBloodPressure !== "sim") return "Não informado";
  return `${data.systolic || "—"}/${data.diastolic || "—"}`;
}

function cholesterolShortLabel(data: HealthReportData) {
  if (data.knowsCholesterol !== "sim") return "Não informado";
  if (data.ldl) return `LDL ${data.ldl}`;
  if (data.totalCholesterol) return `Total ${data.totalCholesterol}`;
  return "Informado";
}

function bmiTone(bmi: number | null): RiskLevelTone {
  if (bmi == null) return "neutral";
  if (bmi < 25) return "good";
  if (bmi < 30) return "attention";
  return "risk";
}

function pressureTone(data: HealthReportData): RiskLevelTone {
  if (data.knowsBloodPressure !== "sim") return "neutral";
  const systolic = Number(data.systolic);
  const diastolic = Number(data.diastolic);
  if (systolic >= 140 || diastolic >= 90) return "risk";
  if (systolic >= 120 || diastolic >= 80) return "attention";
  return "good";
}

function cholesterolTone(data: HealthReportData): RiskLevelTone {
  if (data.knowsCholesterol !== "sim") return "neutral";
  const total = Number(data.totalCholesterol);
  const ldl = Number(data.ldl);
  const hdl = Number(data.hdl);
  if (total >= 240 || ldl >= 160 || (hdl > 0 && hdl < 35)) return "risk";
  if (total >= 200 || ldl >= 130 || (hdl > 0 && hdl < 40)) return "attention";
  return "good";
}

function activityTone(value: HealthReportData["activityLevel"]): RiskLevelTone {
  if (value === "intenso" || value === "moderado") return "good";
  if (value === "leve") return "attention";
  if (value === "sedentario") return "risk";
  return "neutral";
}

function factorIcon(title: string): LucideIcon {
  if (title.includes("Fumante")) return Cigarette;
  if (title.includes("Pressão") || title.includes("Sintomas")) return HeartPulse;
  if (title.includes("IMC")) return CircleGauge;
  if (title.includes("Sedentarismo") || title.includes("Atividade")) return Dumbbell;
  if (title.includes("Estresse") || title.includes("sono")) return Moon;
  if (title.includes("álcool")) return Wine;
  if (title.includes("Diabetes")) return TestTube2;
  return FileHeart;
}

function planForFactors(factors: ReportFactor[], data: HealthReportData) {
  const titles = factors.map((factor) => factor.title.toLowerCase()).join(" ");
  const actions = [];

  if (titles.includes("pressão")) {
    actions.push({ title: "Medir pressão duas vezes por semana", progress: 0 });
    actions.push({ title: "Reduzir sódio nas principais refeições", progress: 0 });
  }
  if (titles.includes("sedentarismo") || data.activityLevel === "sedentario") {
    actions.push({ title: "Caminhar 30 minutos, 5 vezes por semana", progress: 0 });
  }
  if (titles.includes("imc")) {
    actions.push({ title: "Trocar ultraprocessados por refeições simples", progress: 0 });
  }
  if (titles.includes("fumante")) {
    actions.push({ title: "Definir um plano para parar de fumar", progress: 0 });
  }
  if (titles.includes("sono") || titles.includes("estresse")) {
    actions.push({ title: "Dormir em horário regular por 7 dias", progress: 0 });
  }

  return [
    ...actions,
    { title: "Registrar um check-in semanal", progress: 0 },
    { title: "Solicitar exames para aprofundar a avaliação", progress: 0 },
  ].slice(0, 3);
}

function insightFor(result: RiskResult, factors: ReportFactor[]) {
  const main = factors[0]?.title.toLowerCase();
  if (main?.includes("pressão")) {
    return "Normalizar sua pressão arterial é uma das mudanças com maior potencial de reduzir risco cardiovascular. Comece medindo com regularidade e leve os registros para avaliação médica.";
  }
  if (main?.includes("fumante")) {
    return "Parar de fumar costuma ser a mudança isolada mais potente para reduzir risco cardiovascular. O primeiro passo é transformar isso em um plano acompanhado, não em força de vontade solta.";
  }
  if (main?.includes("imc") || main?.includes("sedentarismo")) {
    return "Movimento regular e pequenas mudanças alimentares podem melhorar pressão, glicemia e metabolismo ao mesmo tempo. O objetivo agora é consistência, não perfeição.";
  }
  if (result.level === "baixo") {
    return "Seu melhor próximo passo é manter acompanhamento. Um novo check-in em algumas semanas ajuda a confirmar se seu risco segue estável.";
  }
  return "O maior ganho agora vem de transformar seus principais fatores de risco em acompanhamento simples: medir, revisar e agir com orientação profissional quando necessário.";
}

function recommendedExams(data: HealthReportData) {
  const exams = [
    {
      icon: Microscope,
      title: "Perfil lipídico",
      reason:
        data.knowsCholesterol === "sim"
          ? "Atualizar colesterol informado."
          : "Ainda não informado.",
    },
    {
      icon: TestTube2,
      title: "ApoB",
      reason: "Refina a leitura de risco cardiovascular além do LDL.",
    },
    {
      icon: ClipboardCheck,
      title: "Glicemia e HbA1c",
      reason:
        data.diabetes === "nao"
          ? "Rastreio metabólico preventivo."
          : "Acompanhar risco metabólico.",
    },
  ];

  return exams;
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
      severity: "Alto",
      impact: "Alto",
      explanation:
        "O tabagismo danifica vasos sanguíneos e acelera o acúmulo de placas nas artérias.",
      recommendation:
        "Criar um plano acompanhado para parar de fumar é uma das ações de maior impacto.",
      reference: "Diretrizes de prevenção cardiovascular SBC/OMS.",
    });
  }
  if (data.knowsBloodPressure === "sim" && (systolic >= 130 || diastolic >= 85)) {
    addFactor({
      title:
        systolic >= 160 || diastolic >= 100
          ? "Pressão arterial em estágio 2"
          : "Pressão arterial elevada",
      severity: systolic >= 160 || diastolic >= 100 ? "Alto" : "Moderado",
      impact: systolic >= 160 || diastolic >= 100 ? "Alto" : "Médio",
      explanation:
        "Pressão acima do ideal aumenta o esforço sobre vasos e coração, mesmo sem sintomas.",
      recommendation: "Meça em dias diferentes e converse com um médico com os registros em mãos.",
      reference: "Classificação baseada em faixas clínicas de pressão arterial.",
    });
  }
  if (data.knowsBloodPressure !== "sim") {
    addFactor({
      title: "Pressão não informada",
      severity: "Moderado",
      impact: "Médio",
      explanation: "Sem medida recente, a estimativa fica menos precisa.",
      recommendation: "Registre uma medida de pressão no próximo check-in.",
      reference: "Pressão arterial é entrada central em calculadoras clínicas de risco.",
    });
  }
  if (bmi != null && bmi >= 25) {
    addFactor({
      title: "IMC elevado",
      severity: bmi >= 30 ? "Alto" : "Moderado",
      impact: bmi >= 30 ? "Alto" : "Médio",
      explanation:
        "Excesso de peso se associa a maior risco de hipertensão, diabetes tipo 2 e alterações metabólicas.",
      recommendation: "Reduções graduais de peso podem melhorar pressão e marcadores metabólicos.",
      reference: "OMS e diretrizes de prevenção cardiometabólica.",
    });
  }
  if (data.activityLevel === "sedentario") {
    addFactor({
      title: "Sedentarismo",
      severity: "Moderado",
      impact: "Médio",
      explanation: "Baixa atividade física reduz proteção metabólica e cardiovascular.",
      recommendation: "Comece com caminhadas curtas e avance para 150 minutos semanais.",
      reference: "Recomendação da OMS para atividade física em adultos.",
    });
  }
  if (data.diabetes === "sim") {
    addFactor({
      title: "Diabetes ou pré-diabetes",
      severity: "Alto",
      impact: "Alto",
      explanation:
        "Alterações persistentes de glicemia aumentam risco cardiovascular ao longo do tempo.",
      recommendation: "Acompanhe glicemia/HbA1c e mantenha seguimento médico regular.",
      reference: "Diretrizes de risco cardiovascular e diabetes.",
    });
  }
  if (data.familyHistory === "sim") {
    addFactor({
      title: "Histórico familiar precoce",
      severity: "Moderado",
      impact: "Médio",
      explanation:
        "Eventos cardiovasculares em familiares antes dos 60 anos elevam seu risco individual.",
      recommendation: "Use esse dado para antecipar prevenção e exames de rastreio.",
      reference: "Fator usado em estratificação clínica de risco.",
    });
  }
  if (hasSymptoms) {
    addFactor({
      title: "Sintomas relatados",
      severity: "Alto",
      impact: "Alto",
      explanation: "Sintomas como dor no peito ou falta de ar merecem investigação médica.",
      recommendation:
        "Procure avaliação profissional, especialmente se sintomas forem recentes ou intensos.",
      reference: "Triagem clínica de sintomas cardiovasculares.",
    });
  }
  if (data.stressLevel === "alto" || data.sleepHours === "menos_5" || data.sleepHours === "5_6") {
    addFactor({
      title: "Estresse alto / sono insuficiente",
      severity: "Moderado",
      impact: "Médio",
      explanation: "Sono ruim e estresse crônico podem piorar pressão e metabolismo.",
      recommendation: "Priorize rotina de sono e pausas diárias de recuperação.",
      reference: "Evidência observacional em saúde cardiometabólica.",
    });
  }
  if (data.alcoholUse === "algumas_vezes_semana" || data.alcoholUse === "diariamente") {
    addFactor({
      title: "Consumo de álcool frequente",
      severity: data.alcoholUse === "diariamente" ? "Alto" : "Moderado",
      impact: data.alcoholUse === "diariamente" ? "Alto" : "Médio",
      explanation: "Álcool frequente pode elevar pressão e triglicerídeos.",
      recommendation: "Reduzir frequência de consumo tende a beneficiar pressão e metabolismo.",
      reference: "Diretrizes de prevenção cardiovascular e saúde metabólica.",
    });
  }

  for (const factor of result.factors) {
    if (factor === "perfil inicial sem fatores críticos informados") continue;
    addFactor(copyForScoreFactor(factor));
  }

  if (!factors.length) {
    factors.push({
      title: "Perfil preventivo",
      severity: "Leve",
      impact: "Baixo",
      explanation: "Nenhum fator crítico foi identificado nas respostas informadas.",
      recommendation: "Mantenha check-ins periódicos e atualize exames quando disponíveis.",
      reference: "Acompanhamento preventivo longitudinal.",
    });
  }

  return factors;
}

function copyForScoreFactor(factor: string): ReportFactor {
  if (factor.includes("combinação de fatores graves")) {
    return {
      title: "Combinação de fatores graves",
      severity: "Alto",
      impact: "Alto",
      explanation: "Fatores simultâneos aumentam risco de forma acumulativa.",
      recommendation: "Priorize avaliação médica e acompanhamento estruturado.",
      reference: "Estratificação clínica considera carga total de risco.",
    };
  }
  if (factor.includes("colesterol")) {
    return {
      title: factor.includes("não informado") ? "Colesterol não informado" : "Colesterol alterado",
      severity: factor.includes("não informado") ? "Moderado" : "Alto",
      impact: "Médio",
      explanation: "Colesterol é um marcador importante de risco cardiovascular.",
      recommendation: "Atualize valores recentes ou solicite perfil lipídico.",
      reference: "Diretrizes SBC de dislipidemias e prevenção cardiovascular.",
    };
  }
  return {
    title: factor.charAt(0).toUpperCase() + factor.slice(1),
    severity: "Moderado",
    impact: "Médio",
    explanation: "Este item teve peso no cálculo determinístico do score.",
    recommendation: "Use este ponto como guia para acompanhar evolução e conversar com um médico.",
    reference: "Regra HTCare baseada em fatores clínicos publicados.",
  };
}

function formatActivity(value: HealthReportData["activityLevel"]) {
  if (value === "sedentario") return "Baixa";
  if (value === "leve") return "Leve";
  if (value === "moderado") return "Moderada";
  if (value === "intenso") return "Alta";
  return "Não informado";
}
