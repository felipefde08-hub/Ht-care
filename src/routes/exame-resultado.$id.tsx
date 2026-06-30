import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  FlaskConical,
  HeartPulse,
  MessageCircle,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { CarelitoChat } from "@/components/CarelitoChat";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  buildExamInterpretation,
  type BiomarkerInterpretation,
  type BiomarkerTone,
  type ExamBiomarkers,
} from "@/lib/exam-interpretation";
import { HTCARE_BIOMARKERS, type BiomarkerId } from "@/lib/htcare-knowledge";

export const Route = createFileRoute("/exame-resultado/$id")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Resultado do exame — HTCare" }] }),
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
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
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
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMarker, setOpenMarker] = useState<string | null>("apob");
  const [carelitoOpenSignal, setCarelitoOpenSignal] = useState(0);

  useEffect(() => {
    async function load() {
      if (id === "demo") {
        setResult(buildDemoExamResult(user.id));
        setProfile({ nome: "Felipe", idade: 44, sexo: "masculino" });
        setLoading(false);
        return;
      }

      const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
      const [{ data: examData, error }, { data: profileData }] = await Promise.all([
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
      ]);

      if (error) console.error(error);
      setResult(isExamResult(examData) ? examData : null);
      setProfile(isProfile(profileData) ? profileData : null);
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
    return buildExamInterpretation(resultToBiomarkers(result), result.score_estimado, firstName);
  }, [firstName, result]);

  const markerRows = useMemo(() => {
    if (!interpretation) return [];
    return interpretation.cards.map((card) => buildMarkerRow(card));
  }, [interpretation]);

  if (loading) {
    return (
      <Shell>
        <TopBar />
        <Card className="mt-5">
          <p className="text-sm font-semibold text-[#6B7280]">Carregando resultado...</p>
        </Card>
      </Shell>
    );
  }

  if (!result || !interpretation) {
    return (
      <Shell>
        <TopBar />
        <Card className="mt-5 text-center">
          <img
            src="/brand/carelito-main.png"
            alt="Carelito"
            className="mx-auto h-28 w-28 object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold text-[#111827]">Resultado não encontrado</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Não encontramos esse exame na sua conta.
          </p>
          <Button asChild className="mt-5 min-h-12 rounded-xl bg-[#2563EB]">
            <Link to="/meu-risco">Voltar para Meu Risco</Link>
          </Button>
        </Card>
      </Shell>
    );
  }

  const counters = buildStatusCounters(markerRows);

  return (
    <Shell>
      <TopBar />

      <section className="mt-5 space-y-3">
        <ExamCard result={result} />
        <ScoreCard score={interpretation.score} category={interpretation.category} />
        <StatusCounters counters={counters} />
        <CarelitoSummary summary={result.resumo_carelito || interpretation.summary} />

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[16px] font-semibold text-[#111827]">Marcadores do exame</h2>
            <span className="text-xs font-medium text-[#6B7280]">
              {markerRows.length} analisados
            </span>
          </div>

          {markerRows.map((marker) => (
            <MarkerRow
              key={marker.id}
              marker={marker}
              open={openMarker === marker.id}
              onToggle={() => setOpenMarker((current) => (current === marker.id ? null : marker.id))}
            />
          ))}
        </section>

        <CarelitoCta onClick={() => setCarelitoOpenSignal((current) => current + 1)} />

        <p className="px-2 pb-4 text-center text-[11px] leading-5 text-[#6B7280]">
          A HTCare é uma ferramenta de triagem e acompanhamento. Esta interpretação não substitui
          consulta médica.
        </p>
      </section>

      <CarelitoChat
        userId={user.id}
        score={interpretation.score}
        factors={interpretation.factors}
        openSignal={carelitoOpenSignal}
      />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F9FAFB] px-4 pb-8 pt-4 text-[#111827]">
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="flex h-12 items-center justify-between">
      <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" asChild>
        <Link to="/meu-risco" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <h1 className="text-[17px] font-bold text-[#111827]">Resultado do exame</h1>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-full"
        onClick={() => window.print()}
        aria-label="Opções"
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </header>
  );
}

function ExamCard({ result }: { result: ExamResultRecord }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          <FileText className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-[#111827]">Exame de sangue</p>
          <p className="mt-1 text-sm text-[#6B7280]">Coleta em {formatLongDate(result.data_exame)}</p>
          <p className="mt-1 truncate text-xs font-medium text-[#6B7280]">
            {result.laboratorio_nome ?? "Laboratório não informado"}
          </p>
        </div>
        {result.arquivo_url && (
          <a
            href={result.arquivo_url}
            target="_blank"
            rel="noreferrer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3F4F6] text-[#6B7280]"
            aria-label="Abrir arquivo original"
          >
            <Share2 className="h-4 w-4" />
          </a>
        )}
      </div>
    </Card>
  );
}

function ScoreCard({
  score,
  category,
}: {
  score: number;
  category: "baixo" | "moderado" | "alto";
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
            Score recalculado
          </p>
          <h2 className="mt-3 text-[42px] font-bold leading-none text-[#111827]">
            {score}
            <span className="text-xl text-[#6B7280]">/100</span>
          </h2>
          <span
            className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${riskBadgeClass(
              category,
            )}`}
          >
            {categoryLabel(category)}
          </span>
          <p className="mt-3 text-sm leading-5 text-[#6B7280]">
            Seu risco atual é {categoryLabel(category).toLowerCase()}.
          </p>
        </div>
        <ScoreRing score={score} category={category} />
      </div>
    </Card>
  );
}

function ScoreRing({
  score,
  category,
}: {
  score: number;
  category: "baixo" | "moderado" | "alto";
}) {
  const color = category === "baixo" ? "#16A34A" : category === "moderado" ? "#F59E0B" : "#DC2626";
  return (
    <div
      className="grid h-32 w-32 shrink-0 place-items-center rounded-full p-3"
      style={
        {
          background: `conic-gradient(${color} ${score}%, #E5E7EB ${score}% 100%)`,
        } as CSSProperties
      }
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]">
        <HeartPulse className="h-9 w-9" style={{ color }} />
      </div>
    </div>
  );
}

function StatusCounters({ counters }: { counters: StatusCounter[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {counters.map((counter) => (
        <div key={counter.label} className={`rounded-2xl p-3 text-center ${counter.className}`}>
          <p className="text-2xl font-bold leading-none">{counter.count}</p>
          <p className="mt-2 text-[10px] font-semibold leading-3">{counter.label}</p>
        </div>
      ))}
    </div>
  );
}

function CarelitoSummary({ summary }: { summary: string }) {
  return (
    <Card className="overflow-visible">
      <div className="flex items-start gap-3">
        <img
          src="/brand/carelito-main.png"
          alt="Carelito"
          className="h-20 w-20 shrink-0 object-contain"
        />
        <div className="relative flex-1 rounded-3xl bg-[#EFF6FF] p-4">
          <span className="absolute left-[-8px] top-7 h-4 w-4 rotate-45 bg-[#EFF6FF]" />
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">
            Análise do Carelito
          </p>
          <p className="mt-2 text-sm leading-6 text-[#374151]">{trimSummary(summary)}</p>
        </div>
      </div>
    </Card>
  );
}

interface MarkerView {
  id: string;
  icon: ReactNode;
  name: string;
  valueLabel: string;
  reference: string;
  statusLabel: "Ideal" | "Atenção" | "Elevado" | "Muito elevado";
  tone: BiomarkerTone;
  progress: number;
  explanation: string;
  recommendation?: string;
  source?: string;
}

function MarkerRow({
  marker,
  open,
  onToggle,
}: {
  marker: MarkerView;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          {marker.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-[15px] font-semibold text-[#111827]">{marker.name}</span>
              <span className="mt-1 block text-xs text-[#6B7280]">
                {marker.valueLabel} · Ref. {marker.reference}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${tonePill(marker.statusLabel)}`}>
              {marker.statusLabel}
            </span>
          </span>
          <span className="mt-3 block h-2 overflow-hidden rounded-full bg-gradient-to-r from-[#16A34A] via-[#F59E0B] to-[#DC2626]">
            <span
              className="block h-full w-1 rounded-full bg-[#111827] shadow-[0_0_0_3px_rgba(255,255,255,0.9)]"
              style={{ marginLeft: `calc(${marker.progress}% - 2px)` }}
            />
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#9CA3AF] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-[#E5E7EB] px-4 pb-4 pt-3">
          <p className="text-sm leading-6 text-[#374151]">{marker.explanation}</p>
          {marker.recommendation && (
            <p className="mt-3 rounded-2xl bg-[#F9FAFB] p-3 text-xs leading-5 text-[#6B7280]">
              <strong className="text-[#111827]">Recomendação: </strong>
              {marker.recommendation}
            </p>
          )}
          {marker.source && (
            <p className="mt-2 text-[11px] font-medium text-[#9CA3AF]">{marker.source}</p>
          )}
        </div>
      )}
    </Card>
  );
}

function CarelitoCta({ onClick }: { onClick: () => void }) {
  return (
    <Card className="bg-[#F0FDF4]">
      <div className="flex items-center gap-4">
        <img
          src="/brand/carelito-main.png"
          alt="Carelito"
          className="h-16 w-16 shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-[#111827]">
            Quer entender mais? Converse com o Carelito
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#6B7280]">
            Tire dúvidas sobre seus marcadores em linguagem simples.
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={onClick}
        className="mt-4 min-h-12 w-full rounded-xl bg-[#2563EB] text-white"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Abrir conversa
      </Button>
    </Card>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface StatusCounter {
  label: string;
  count: number;
  className: string;
}

function buildStatusCounters(markers: MarkerView[]): StatusCounter[] {
  return [
    {
      label: "Ideal",
      count: markers.filter((marker) => marker.statusLabel === "Ideal").length,
      className: "bg-[#DCFCE7] text-[#166534]",
    },
    {
      label: "Atenção",
      count: markers.filter((marker) => marker.statusLabel === "Atenção").length,
      className: "bg-[#FEF3C7] text-[#92400E]",
    },
    {
      label: "Elevado",
      count: markers.filter((marker) => marker.statusLabel === "Elevado").length,
      className: "bg-[#FFEDD5] text-[#9A3412]",
    },
    {
      label: "Muito elevado",
      count: markers.filter((marker) => marker.statusLabel === "Muito elevado").length,
      className: "bg-[#FEE2E2] text-[#991B1B]",
    },
  ];
}

function buildMarkerRow(card: BiomarkerInterpretation): MarkerView {
  const id = String(card.key) as BiomarkerId;
  const knowledge = HTCARE_BIOMARKERS[id];
  const rawValue = parseValue(card.valueLabel);
  return {
    id,
    icon: markerIcon(id),
    name: card.title,
    valueLabel: card.valueLabel,
    reference: referenceLabel(id),
    statusLabel: normalizeStatus(card),
    tone: card.tone,
    progress: valueProgress(id, rawValue),
    explanation: card.explanation,
    recommendation: card.recommendation ?? knowledge?.recomendacao_geral,
    source: card.source ?? knowledge?.fonte,
  };
}

function markerIcon(id: BiomarkerId) {
  if (id === "homaIr" || id === "hba1c" || id === "glicemiaJejum" || id === "insulinaJejum") {
    return <FlaskConical className="h-5 w-5" />;
  }
  if (id === "pcrUs") return <HeartPulse className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function normalizeStatus(card: BiomarkerInterpretation): MarkerView["statusLabel"] {
  if (card.valueLabel === "—") return "Atenção";
  if (card.tone === "good") return "Ideal";
  if (card.tone === "attention") return "Atenção";
  if (card.title === "ApoB" || card.title === "LDL" || card.title === "Triglicerídeos") {
    return "Muito elevado";
  }
  return "Elevado";
}

function referenceLabel(id: BiomarkerId) {
  const range = HTCARE_BIOMARKERS[id]?.faixas.ideal;
  const unit = HTCARE_BIOMARKERS[id]?.unidade ?? "";
  const suffix = unit ? ` ${unit}` : "";
  if (!range) return "individual";
  if (range.min != null && range.max != null) return `${range.min}-${range.max}${suffix}`;
  if (range.max != null) return `< ${range.max}${suffix}`;
  if (range.min != null) return `> ${range.min}${suffix}`;
  return "individual";
}

function valueProgress(id: BiomarkerId, value: number | null) {
  if (value == null) return 50;
  const scale: Partial<Record<BiomarkerId, { min: number; max: number; reverse?: boolean }>> = {
    apob: { min: 50, max: 160 },
    ldl: { min: 50, max: 190 },
    hdl: { min: 30, max: 80, reverse: true },
    triglicerideos: { min: 70, max: 250 },
    hba1c: { min: 4.8, max: 7.2 },
    glicemiaJejum: { min: 70, max: 150 },
    insulinaJejum: { min: 3, max: 22 },
    homaIr: { min: 0.6, max: 4 },
    pcrUs: { min: 0.2, max: 5 },
  };
  const item = scale[id] ?? { min: 0, max: 100 };
  const ratio = (value - item.min) / (item.max - item.min);
  const normalized = item.reverse ? 1 - ratio : ratio;
  return Math.max(3, Math.min(97, Math.round(normalized * 100)));
}

function parseValue(valueLabel: string) {
  if (valueLabel === "—") return null;
  const value = Number(valueLabel.replace(",", ".").match(/-?\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(value) ? value : null;
}

function riskBadgeClass(category: "baixo" | "moderado" | "alto") {
  if (category === "baixo") return "bg-[#DCFCE7] text-[#166534]";
  if (category === "moderado") return "bg-[#FEF3C7] text-[#92400E]";
  return "bg-[#FEE2E2] text-[#991B1B]";
}

function categoryLabel(category: "baixo" | "moderado" | "alto") {
  if (category === "baixo") return "Baixo risco";
  if (category === "moderado") return "Risco moderado";
  return "Alto risco";
}

function tonePill(status: MarkerView["statusLabel"]) {
  if (status === "Ideal") return "bg-[#DCFCE7] text-[#166534]";
  if (status === "Atenção") return "bg-[#FEF3C7] text-[#92400E]";
  if (status === "Elevado") return "bg-[#FFEDD5] text-[#9A3412]";
  return "bg-[#FEE2E2] text-[#991B1B]";
}

function trimSummary(summary: string) {
  const sentences = summary.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return summary;
  return sentences.slice(0, 3).join(" ").trim();
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

function buildDemoExamResult(userId: string): ExamResultRecord {
  return {
    id: "demo-atual",
    user_id: userId,
    exam_request_id: null,
    laboratorio_nome: "Laboratório parceiro HTCare",
    data_exame: new Date().toISOString().slice(0, 10),
    arquivo_url: null,
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
    categoria_risco: "moderado",
    interpretacao_gerada: {},
    resumo_carelito: null,
    created_at: new Date().toISOString(),
  };
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
