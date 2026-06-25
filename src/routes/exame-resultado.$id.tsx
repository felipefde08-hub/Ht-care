import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  CalendarDays,
  Download,
  FlaskConical,
  HeartPulse,
  Share2,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  buildExamInterpretation,
  type BiomarkerInterpretation,
  type BiomarkerTone,
  type ExamBiomarkers,
} from "@/lib/exam-interpretation";

export const Route = createFileRoute("/exame-resultado/$id")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Interpretação do exame — HTCare" }] }),
  component: ExamResultPage,
});

interface ExamResultRecord {
  id: string;
  user_id: string;
  exam_request_id: string | null;
  laboratorio_nome: string | null;
  data_exame: string;
  arquivo_url: string | null;
  apob: number | null;
  ldl: number | null;
  hdl: number | null;
  triglicerideos: number | null;
  hba1c: number | null;
  glicemia_jejum: number | null;
  insulina_jejum: number | null;
  homa_ir: number | null;
  pcr_us: number | null;
  score_estimado: number | null;
  score_calculado: number;
  categoria_risco: "baixo" | "moderado" | "alto";
  interpretacao_gerada: unknown;
  resumo_carelito: string | null;
  created_at: string;
}

interface ProfileRecord {
  nome: string | null;
  idade: number | null;
  sexo: string | null;
}

interface DynamicQueryBuilder {
  eq: (column: string, value: string) => DynamicQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  then: PromiseLike<{ data: unknown; error: unknown }>["then"];
}

interface DynamicSupabaseTable {
  select: (columns: string) => DynamicQueryBuilder;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

function ExamResultPage() {
  const { user } = Route.useRouteContext();
  const { id } = Route.useParams();
  const [result, setResult] = useState<ExamResultRecord | null>(null);
  const [allResults, setAllResults] = useState<ExamResultRecord[]>([]);
  const [doctorNote, setDoctorNote] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (id === "demo") {
        const demo = buildDemoExamResult(user.id);
        setResult(demo.current);
        setAllResults(demo.history);
        setProfile({ nome: "Felipe", idade: 44, sexo: "masculino" });
        setDoctorNote(
          "Prévia demonstrativa: revisar ApoB e resistência à insulina com o paciente, orientar mudança de rotina por 90 dias e repetir exames para medir resposta.",
        );
        setLoading(false);
        return;
      }

      const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
      const [{ data: examData, error }, { data: profileData }, { data: historyData }] =
        await Promise.all([
          dynamicSupabase
            .from("exam_results")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle(),
          dynamicSupabase
            .from("profiles")
            .select("nome,idade,sexo")
            .eq("id", user.id)
            .maybeSingle(),
          dynamicSupabase
            .from("exam_results")
            .select("*")
            .eq("user_id", user.id)
            .order("data_exame", { ascending: true }),
        ]);
      if (error) console.error(error);
      const currentResult = isExamResult(examData) ? examData : null;
      setResult(currentResult);
      setAllResults(Array.isArray(historyData) ? historyData.filter(isExamResult) : []);
      setProfile(isProfile(profileData) ? profileData : null);

      if (currentResult?.exam_request_id) {
        const { data: requestData } = await dynamicSupabase
          .from("exam_requests")
          .select("nota_medico")
          .eq("id", currentResult.exam_request_id)
          .maybeSingle();
        setDoctorNote(isDoctorNote(requestData) ? requestData.nota_medico : null);
      }
      setLoading(false);
    }
    void load();
  }, [id, user.id]);

  const firstName = useMemo(() => {
    const name = profile?.nome?.trim() || user.email?.split("@")[0] || "você";
    return name.split(" ")[0] || "você";
  }, [profile?.nome, user.email]);

  const interpretation = useMemo(() => {
    if (!result) return null;
    return buildExamInterpretation(
      {
        apob: result.apob,
        ldl: result.ldl,
        hdl: result.hdl,
        triglicerideos: result.triglicerideos,
        hba1c: result.hba1c,
        glicemiaJejum: result.glicemia_jejum,
        insulinaJejum: result.insulina_jejum,
        homaIr: result.homa_ir,
        pcrUs: result.pcr_us,
      },
      result.score_estimado,
      firstName,
    );
  }, [firstName, result]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fbfcfc] px-4 py-6 text-[#10201f]">
        <Header />
        <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] bg-white p-6 shadow-soft">
          Carregando interpretação...
        </div>
      </main>
    );
  }

  if (!result || !interpretation) {
    return (
      <main className="min-h-screen bg-[#fbfcfc] px-4 py-6 text-[#10201f]">
        <Header />
        <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] bg-white p-6 text-center shadow-soft">
          <Carelito className="mx-auto h-24 w-24" expression="thoughtful" />
          <h1 className="mt-4 font-sans text-2xl font-semibold">Resultado não encontrado</h1>
          <p className="mt-2 text-sm leading-6 text-[#536b68]">
            Não encontramos esse exame na sua conta.
          </p>
          <Button asChild className="mt-5 rounded-full bg-[#10201f]">
            <Link to="/meu-risco">Voltar para Meu Risco</Link>
          </Button>
        </div>
      </main>
    );
  }

  const difference =
    result.score_estimado == null ? null : interpretation.score - Number(result.score_estimado);
  const realBiomarkers = resultToBiomarkers(result);
  const timeline = buildTimeline(allResults);
  const ninetyDayPlan = buildNinetyDayPlan(interpretation.cards);
  const nextExam = buildNextExamRecommendation(interpretation.cards, result.data_exame);

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] print:bg-white print:px-0 print:pb-0">
      <Header />
      <section className="mx-auto mt-5 max-w-4xl space-y-4 print:mt-0 print:max-w-none">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">
                Relatório de exame
              </p>
              <h1 className="mt-2 font-sans text-3xl font-semibold">Interpretação do Carelito</h1>
            </div>
            <Carelito className="h-20 w-20" variant="doctor" expression="confident" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoPill
              icon={<CalendarDays className="h-4 w-4" />}
              label="Data do exame"
              value={formatLongDate(result.data_exame)}
            />
            <InfoPill
              icon={<FlaskConical className="h-4 w-4" />}
              label="Laboratório"
              value={result.laboratorio_nome ?? "Laboratório parceiro HTCare"}
            />
          </div>
        </Card>

        <Card className="bg-[#10201f] text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9adbd1]">
            Score atualizado com seus exames reais.
          </p>
          <div className="mt-5 flex items-center justify-between gap-5">
            <div>
              <p className="font-sans text-6xl font-semibold leading-none">
                {interpretation.score}
                <span className="text-2xl text-white/55">/100</span>
              </p>
              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-bold ${scoreBadge(interpretation.category)}`}
              >
                {categoryLabel(interpretation.category)}
              </span>
            </div>
            <ScoreGauge score={interpretation.score} />
          </div>
          {result.score_estimado != null && (
            <p className="mt-5 rounded-2xl bg-white/8 p-4 text-sm leading-6 text-white/82">
              Seu score estimado era <strong>{Number(result.score_estimado)}</strong>. Com seus
              exames reais, seu score é <strong>{interpretation.score}</strong>
              {difference != null && difference !== 0
                ? ` (${difference > 0 ? "+" : ""}${difference} pontos).`
                : "."}
            </p>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {interpretation.cards.map((card) => (
            <BiomarkerCard key={card.key} card={card} />
          ))}
        </div>

        <PopulationComparisonCard
          biomarkers={realBiomarkers}
          age={profile?.idade ?? null}
          sex={profile?.sexo ?? null}
        />

        <ExamTimelineCard results={allResults} timeline={timeline} />

        <Card className="border-[#2f8fc8]/20 bg-[#f2faf9]">
          <div className="flex items-start gap-4">
            <Carelito className="h-20 w-20 shrink-0" variant="doctor" expression="thoughtful" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f6760]">
                Resumo do Carelito
              </p>
              <p className="mt-3 text-base leading-7 text-[#2b4542]">
                {result.resumo_carelito || interpretation.summary}
              </p>
            </div>
          </div>
        </Card>

        <NinetyDayPlanCard recommendations={ninetyDayPlan} />

        <DoctorNoteCard note={doctorNote} />

        <NextExamCard recommendation={nextExam} resultId={result.id} />

        <Card className="print:hidden">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild className="min-h-12 rounded-full bg-[#2563EB]">
              <Link to="/protocolo-90-dias/$id" params={{ id: result.id }}>
                Ver protocolo de 90 dias
              </Link>
            </Button>
            <Button className="min-h-12 rounded-full bg-[#10201f]" onClick={() => window.print()}>
              <Share2 className="mr-2 h-4 w-4" />
              Gerar relatório completo em PDF
            </Button>
            <Button asChild variant="outline" className="min-h-12 rounded-full">
              <Link to="/meu-risco">
                <Download className="mr-2 h-4 w-4" />
                Agendar próximo exame
              </Link>
            </Button>
          </div>
          {result.arquivo_url && (
            <a
              className="mt-4 inline-flex text-sm font-bold text-[#2f8fc8]"
              href={result.arquivo_url}
              target="_blank"
              rel="noreferrer"
            >
              Ver arquivo original enviado
            </a>
          )}
        </Card>
      </section>
      <MobileAppNav />
    </main>
  );
}

function BiomarkerCard({ card }: { card: BiomarkerInterpretation }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">
            {card.subtitle}
          </p>
          <h2 className="mt-2 font-sans text-2xl font-semibold">{card.title}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${tonePill(card.tone)}`}>
          {card.classification}
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <p className="font-sans text-4xl font-semibold">{card.valueLabel}</p>
        <span className={`h-3 w-16 rounded-full ${toneBar(card.tone)}`} />
      </div>
      <div className="mt-5 rounded-2xl bg-[#f7faf9] p-4">
        <div className="flex items-start gap-3">
          <Carelito className="h-12 w-12 shrink-0" variant="doctor" expression="confident" />
          <p className="text-sm leading-6 text-[#536b68]">{card.explanation}</p>
        </div>
      </div>
    </Card>
  );
}

function PopulationComparisonCard({
  biomarkers,
  age,
  sex,
}: {
  biomarkers: ExamBiomarkers;
  age: number | null;
  sex: string | null;
}) {
  const comparisons = buildPopulationComparisons(biomarkers, age, sex);
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">
            Comparação com sua faixa etária
          </p>
          <h2 className="mt-2 font-sans text-2xl font-semibold">
            Onde seus exames ficam no mundo real
          </h2>
        </div>
        <span className="rounded-full bg-[#e9f4fb] px-3 py-1 text-xs font-bold text-[#2f8fc8]">
          VIGITEL/IBGE
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {comparisons.map((item) => (
          <div key={item.label} className="rounded-[1.25rem] bg-[#f7faf9] p-4">
            <p className="font-sans text-3xl font-semibold text-[#10201f]">{item.percentile}%</p>
            <p className="mt-2 text-sm leading-6 text-[#536b68]">{item.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-[#78908d]">
        Referência populacional estimada para contexto educativo. Não substitui interpretação médica
        individual.
      </p>
    </Card>
  );
}

function ExamTimelineCard({
  results,
  timeline,
}: {
  results: ExamResultRecord[];
  timeline: TimelineSeries[];
}) {
  if (results.length < 2) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <TrendingDown className="mt-1 h-5 w-5 text-[#2f8fc8]" />
          <div>
            <h2 className="font-sans text-2xl font-semibold">Linha do tempo dos exames</h2>
            <p className="mt-2 text-sm leading-6 text-[#536b68]">
              Quando você tiver mais de um exame, vamos mostrar exatamente o que melhorou, piorou ou
              ficou estável em cada biomarcador.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">
        Linha do tempo de exames anteriores
      </p>
      <h2 className="mt-2 font-sans text-2xl font-semibold">Seu corpo evoluindo com dado real</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {timeline.map((series) => (
          <div key={series.key} className="rounded-[1.25rem] bg-[#f7faf9] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-lg font-semibold">{series.label}</p>
                <p className="mt-1 text-sm text-[#536b68]">{series.insight}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2f6760]">
                {series.points.length} exames
              </span>
            </div>
            <div className="mt-4 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series.points}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={34} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2f8fc8"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NinetyDayPlanCard({ recommendations }: { recommendations: PlanRecommendation[] }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">
        O que fazer nos próximos 90 dias
      </p>
      <h2 className="mt-2 font-sans text-2xl font-semibold">Plano específico para seus exames</h2>
      <div className="mt-5 grid gap-3">
        {recommendations.map((item) => (
          <div key={item.title} className="rounded-[1.25rem] bg-[#f7faf9] p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-sans text-lg font-semibold">{item.title}</h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2f8fc8]">
                90 dias
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#536b68]">{item.text}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">
              {item.source}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DoctorNoteCard({ note }: { note: string | null }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">
        Nota do médico parceiro
      </p>
      <p className="mt-3 rounded-[1.25rem] bg-[#f7faf9] p-4 text-sm leading-6 text-[#536b68]">
        {note?.trim() ||
          "Ainda não há uma observação médica registrada para este exame. Quando o médico parceiro revisar o caso, a nota aparece aqui e entra no PDF completo."}
      </p>
    </Card>
  );
}

function NextExamCard({
  recommendation,
  resultId,
}: {
  recommendation: NextExamRecommendation;
  resultId: string;
}) {
  function saveReminder() {
    window.localStorage.setItem(
      `htcare:exam-reminder:${resultId}`,
      JSON.stringify({ date: recommendation.date, createdAt: new Date().toISOString() }),
    );
    toast.success(`Lembrete salvo para ${formatLongDate(recommendation.date)}.`);
  }

  return (
    <Card className="print:hidden">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e8f5ef] text-[#2f6760]">
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#78908d]">
            Próximo exame recomendado
          </p>
          <h2 className="mt-2 font-sans text-2xl font-semibold">
            {formatLongDate(recommendation.date)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#536b68]">{recommendation.reason}</p>
          <Button
            variant="outline"
            className="mt-4 min-h-12 rounded-full bg-white"
            onClick={saveReminder}
          >
            <Bell className="mr-2 h-4 w-4" />
            Lembrar-me
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface PopulationComparison {
  label: string;
  percentile: number;
  text: string;
}

interface TimelineSeries {
  key: string;
  label: string;
  insight: string;
  points: Array<{ date: string; value: number }>;
}

interface PlanRecommendation {
  title: string;
  text: string;
  source: string;
}

interface NextExamRecommendation {
  date: string;
  reason: string;
}

function resultToBiomarkers(result: ExamResultRecord): ExamBiomarkers {
  return {
    apob: result.apob,
    ldl: result.ldl,
    hdl: result.hdl,
    triglicerideos: result.triglicerideos,
    hba1c: result.hba1c,
    glicemiaJejum: result.glicemia_jejum,
    insulinaJejum: result.insulina_jejum,
    homaIr: result.homa_ir,
    pcrUs: result.pcr_us,
  };
}

function buildDemoExamResult(userId: string): {
  current: ExamResultRecord;
  history: ExamResultRecord[];
} {
  const base = {
    user_id: userId,
    exam_request_id: null,
    laboratorio_nome: "Laboratório parceiro HTCare",
    arquivo_url: null,
    categoria_risco: "moderado" as const,
    interpretacao_gerada: {},
    resumo_carelito: null,
    created_at: new Date().toISOString(),
  };
  const history: ExamResultRecord[] = [
    {
      ...base,
      id: "demo-marco",
      data_exame: "2026-03-24",
      apob: 128,
      ldl: 154,
      hdl: 42,
      triglicerideos: 188,
      hba1c: 5.9,
      glicemia_jejum: 108,
      insulina_jejum: 13,
      homa_ir: 3.47,
      pcr_us: 2.8,
      score_estimado: 70,
      score_calculado: 58,
    },
    {
      ...base,
      id: "demo-atual",
      data_exame: new Date().toISOString().slice(0, 10),
      apob: 112,
      ldl: 136,
      hdl: 48,
      triglicerideos: 144,
      hba1c: 5.7,
      glicemia_jejum: 101,
      insulina_jejum: 9.8,
      homa_ir: 2.45,
      pcr_us: 1.6,
      score_estimado: 70,
      score_calculado: 64,
    },
  ];
  return { current: history[1], history };
}

function buildPopulationComparisons(
  biomarkers: ExamBiomarkers,
  age: number | null,
  sex: string | null,
): PopulationComparison[] {
  const ageBand = age
    ? `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9} anos`
    : "sua faixa etária";
  const sexLabel = sex?.toLowerCase().includes("fem")
    ? "mulheres"
    : sex?.toLowerCase().includes("masc")
      ? "homens"
      : "pessoas";
  const candidates = [
    {
      label: "ApoB",
      value: biomarkers.apob,
      percentile: percentileLowerIsBetter(biomarkers.apob, 70, 150),
    },
    {
      label: "HOMA-IR",
      value: biomarkers.homaIr,
      percentile: percentileLowerIsBetter(biomarkers.homaIr, 1, 4),
    },
    {
      label: "PCR-us",
      value: biomarkers.pcrUs,
      percentile: percentileLowerIsBetter(biomarkers.pcrUs, 0.4, 4),
    },
    {
      label: "HDL",
      value: biomarkers.hdl,
      percentile: percentileHigherIsBetter(biomarkers.hdl, 35, 70),
    },
  ].filter(
    (item): item is { label: string; value: number; percentile: number } => item.value != null,
  );

  return candidates.slice(0, 4).map((item) => ({
    label: item.label,
    percentile: item.percentile,
    text: `Seu ${item.label} está melhor que ${item.percentile}% das ${sexLabel} de ${ageBand} no Brasil, em uma comparação populacional estimada.`,
  }));
}

function percentileLowerIsBetter(value: number | null | undefined, ideal: number, high: number) {
  if (value == null) return 50;
  const ratio = (high - value) / (high - ideal);
  return clampPercent(10 + ratio * 80);
}

function percentileHigherIsBetter(value: number | null | undefined, low: number, ideal: number) {
  if (value == null) return 50;
  const ratio = (value - low) / (ideal - low);
  return clampPercent(10 + ratio * 80);
}

function clampPercent(value: number) {
  return Math.max(5, Math.min(95, Math.round(value)));
}

function buildTimeline(results: ExamResultRecord[]): TimelineSeries[] {
  const definitions: Array<{
    key: keyof ExamResultRecord;
    label: string;
    lowerIsBetter: boolean;
  }> = [
    { key: "apob", label: "ApoB", lowerIsBetter: true },
    { key: "homa_ir", label: "HOMA-IR", lowerIsBetter: true },
    { key: "pcr_us", label: "PCR-us", lowerIsBetter: true },
    { key: "ldl", label: "LDL", lowerIsBetter: true },
    { key: "hdl", label: "HDL", lowerIsBetter: false },
    { key: "triglicerideos", label: "Triglicerídeos", lowerIsBetter: true },
    { key: "hba1c", label: "HbA1c", lowerIsBetter: true },
  ];

  return definitions
    .map((definition) => {
      const points = results
        .map((result) => {
          const raw = result[definition.key];
          return typeof raw === "number"
            ? { date: formatShortDate(result.data_exame), value: raw }
            : null;
        })
        .filter((point): point is { date: string; value: number } => Boolean(point));
      return {
        key: String(definition.key),
        label: definition.label,
        points,
        insight: buildTimelineInsight(definition.label, points, definition.lowerIsBetter),
      };
    })
    .filter((series) => series.points.length >= 2)
    .slice(0, 4);
}

function buildTimelineInsight(
  label: string,
  points: Array<{ date: string; value: number }>,
  lowerIsBetter: boolean,
) {
  if (points.length < 2) return "Aguardando novo exame para comparar.";
  const first = points[0];
  const last = points.at(-1);
  if (!last || !first.value) return "Acompanhando evolução.";
  const delta = last.value - first.value;
  const percent = Math.abs(Math.round((delta / first.value) * 100));
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const direction = delta < 0 ? "caiu" : delta > 0 ? "subiu" : "ficou estável";
  const suffix = improved ? "melhora" : delta === 0 ? "estabilidade" : "atenção";
  return `Seu ${label} em ${first.date} era ${first.value}. Hoje está ${last.value}. ${direction} ${percent}% no período, sinal de ${suffix}.`;
}

function buildNinetyDayPlan(cards: BiomarkerInterpretation[]): PlanRecommendation[] {
  const flagged = cards.filter((card) => card.tone !== "good" && !card.valueLabel.includes("—"));
  const recommendations = flagged.map((card) => recommendationForCard(card)).filter(Boolean);
  if (recommendations.length) return recommendations.slice(0, 4);
  return [
    {
      title: "Manter o que está funcionando",
      text: "Seus biomarcadores principais estão dentro do esperado. O foco agora é manter rotina de pressão, sono, atividade física e repetir o exame para confirmar estabilidade.",
      source: "Baseado em prevenção cardiovascular e acompanhamento longitudinal.",
    },
  ];
}

function recommendationForCard(card: BiomarkerInterpretation): PlanRecommendation {
  if (card.title === "ApoB" || card.title === "LDL") {
    return {
      title: "Reduzir carga de colesterol aterogênico",
      text: "Reduza gordura saturada e ultraprocessados. Trocar manteiga por azeite e aumentar fibras costuma gerar diferença mensurável em 60 a 90 dias.",
      source: "Baseado em diretrizes da Sociedade Brasileira de Cardiologia.",
    };
  }
  if (card.title === "HOMA-IR" || card.title === "HbA1c") {
    return {
      title: "Melhorar sensibilidade à insulina",
      text: "Caminhar 30 minutos após o almoço e reduzir açúcar líquido ajuda a baixar resistência à insulina ainda na fase inicial.",
      source: "Baseado em diretrizes cardiometabólicas e prevenção de diabetes.",
    };
  }
  if (card.title === "PCR-us") {
    return {
      title: "Reduzir inflamação crônica",
      text: "Inflamação alta costuma responder bem à redução de açúcar processado, melhora do sono, atividade física regular e maior ingestão de alimentos ricos em ômega-3.",
      source: "Baseado em prevenção cardiovascular e manejo de fatores inflamatórios.",
    };
  }
  if (card.title === "Triglicerídeos") {
    return {
      title: "Baixar triglicerídeos",
      text: "Diminua álcool, doces e carboidratos refinados por 90 dias. Esse marcador costuma responder rápido quando açúcar e álcool entram no controle.",
      source: "Baseado em diretrizes da Sociedade Brasileira de Cardiologia.",
    };
  }
  return {
    title: `Acompanhar ${card.title}`,
    text: "Repita o marcador no próximo exame e converse com seu médico sobre metas individuais para seu perfil.",
    source: "Baseado em acompanhamento clínico individualizado.",
  };
}

function buildNextExamRecommendation(
  cards: BiomarkerInterpretation[],
  examDate: string,
): NextExamRecommendation {
  const hasOutOfRange = cards.some(
    (card) => card.tone !== "good" && !card.valueLabel.includes("—"),
  );
  const nextDate = addMonths(examDate, hasOutOfRange ? 3 : 6);
  return {
    date: nextDate,
    reason: hasOutOfRange
      ? "Como há biomarcadores fora do ideal, recomendamos repetir em 3 meses para medir resposta ao plano."
      : "Como os biomarcadores principais estão dentro do esperado, repetir em 6 meses ajuda a confirmar estabilidade.",
  };
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function isDoctorNote(data: unknown): data is { nota_medico: string | null } {
  return Boolean(data && typeof data === "object" && "nota_medico" in data);
}

function Header() {
  return (
    <div className="mx-auto flex max-w-4xl items-center justify-between print:hidden">
      <Button variant="ghost" size="icon" className="rounded-full" asChild>
        <Link to="/meu-risco">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <Logo />
      <div className="h-10 w-10" />
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft print:break-inside-avoid print:rounded-xl print:shadow-none ${className}`}
    >
      {children}
    </motion.div>
  );
}

function InfoPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#f7faf9] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e9f4fb] text-[#2f8fc8]">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">{label}</p>
        <p className="mt-1 font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  return (
    <div
      className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-[conic-gradient(#49c7ae_var(--score),rgba(255,255,255,.18)_var(--score)_100%)] p-2"
      style={{ "--score": `${score}%` } as CSSProperties}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-[#10201f]">
        <HeartPulse className="h-8 w-8 text-[#9adbd1]" />
      </div>
    </div>
  );
}

function scoreBadge(category: "baixo" | "moderado" | "alto") {
  if (category === "baixo") return "bg-[#dff8eb] text-[#1f7a53]";
  if (category === "moderado") return "bg-[#fff0ca] text-[#9a5b12]";
  return "bg-[#ffe2df] text-[#b4322d]";
}

function categoryLabel(category: "baixo" | "moderado" | "alto") {
  if (category === "baixo") return "Risco baixo";
  if (category === "moderado") return "Risco moderado";
  return "Risco alto";
}

function tonePill(tone: BiomarkerTone) {
  if (tone === "good") return "bg-[#e8f5ef] text-[#2f6760]";
  if (tone === "attention") return "bg-[#fff7dc] text-[#9a5b12]";
  return "bg-[#ffe2df] text-[#b4322d]";
}

function toneBar(tone: BiomarkerTone) {
  if (tone === "good") return "bg-[#49c7ae]";
  if (tone === "attention") return "bg-[#d89a1d]";
  return "bg-[#c4413a]";
}

function formatLongDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isExamResult(data: unknown): data is ExamResultRecord {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamResultRecord>;
  return typeof record.id === "string" && typeof record.score_calculado === "number";
}

function isProfile(data: unknown): data is ProfileRecord {
  return Boolean(data && typeof data === "object" && "nome" in data);
}
