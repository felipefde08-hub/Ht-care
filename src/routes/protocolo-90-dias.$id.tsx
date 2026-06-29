import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Ban,
  ChevronRight,
  Footprints,
  Gauge,
  HeartPulse,
  Moon,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { gerarProtocolo, type ProtocolAction } from "@/lib/protocol-generator";

export const Route = createFileRoute("/protocolo-90-dias/$id")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Seu Protocolo de 90 dias — HTCare" }] }),
  component: NinetyDayProtocolPage,
});

interface ExamProtocolRecord {
  id: string;
  user_id: string;
  apob: number | null;
  ldl: number | null;
  triglicerideos: number | null;
  hba1c: number | null;
  glicemia_jejum: number | null;
  homa_ir: number | null;
  pcr_us: number | null;
  score_calculado: number;
  categoria_risco?: string | null;
  interpretacao_gerada?: { factors?: string[]; protocol?: { acoes?: ProtocolAction[] } } | null;
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

const timelineItems = [
  ["Semana 2", "você vai sentir mais energia."],
  ["Semana 6", "biomarcadores começam a mudar."],
  ["Dia 90", "refaça o exame e veja a diferença."],
];

function NinetyDayProtocolPage() {
  const { user } = Route.useRouteContext();
  const { id } = Route.useParams();
  const [exam, setExam] = useState<ExamProtocolRecord | null>(null);
  const [loading, setLoading] = useState(id !== "demo");

  useEffect(() => {
    async function load() {
      if (id === "demo") {
        setExam({
          id: "demo",
          user_id: user.id,
          apob: 112,
          ldl: 142,
          triglicerideos: 156,
          hba1c: 5.9,
          glicemia_jejum: 101,
          homa_ir: 3.1,
          pcr_us: 2.4,
          score_calculado: 64,
          categoria_risco: "moderado",
          interpretacao_gerada: null,
        });
        setLoading(false);
        return;
      }

      const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
      const { data, error } = await dynamicSupabase
        .from("exam_results")
        .select("id,user_id,apob,ldl,triglicerideos,hba1c,glicemia_jejum,homa_ir,pcr_us,score_calculado,categoria_risco,interpretacao_gerada")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error(error);
      setExam(isExamProtocolRecord(data) ? data : null);
      setLoading(false);
    }
    void load();
  }, [id, user.id]);

  const headline = useMemo(() => {
    if (!exam) return "3 mudanças que podem reduzir seu risco em 15%.";
    const target = exam.score_calculado < 50 ? 18 : exam.score_calculado < 75 ? 15 : 10;
    return `3 mudanças que podem reduzir seu risco em ${target}%.`;
  }, [exam]);

  const protocolActions = useMemo(() => {
    if (!exam) return [];
    const stored = exam.interpretacao_gerada?.protocol?.acoes;
    if (Array.isArray(stored) && stored.length) return stored.slice(0, 3);
    return gerarProtocolo(buildFactorsFromExam(exam)).acoes;
  }, [exam]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#E8F4F8_0%,#F0FAF5_100%)] px-4 py-5 text-[#111827]">
        <Header />
        <p className="mx-auto mt-12 max-w-md rounded-2xl bg-white p-4 text-sm text-[#6B7280] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          Carregando seu protocolo...
        </p>
      </main>
    );
  }

  if (!exam) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#E8F4F8_0%,#F0FAF5_100%)] px-4 py-5 text-[#111827]">
        <Header />
        <section className="mx-auto mt-12 max-w-md rounded-2xl bg-white p-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h1 className="text-[22px] font-bold">Protocolo não encontrado</h1>
          <p className="mt-2 text-sm text-[#6B7280]">Não encontramos esse exame na sua conta.</p>
          <Button asChild className="mt-5 min-h-12 rounded-xl bg-[#2563EB]">
            <Link to="/meu-risco">Voltar para Meu Risco</Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#E8F4F8_0%,#F0FAF5_100%)] px-4 pb-36 pt-5 text-[#111827]">
      <Header />

      <section className="mx-auto mt-7 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
        >
          <p className="text-xs text-[#6B7280]">Seu protocolo · 90 dias</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.02em]">
            {headline}
          </h1>
          <p className="mt-3 text-sm text-[#6B7280]">Baseado nos seus biomarcadores reais.</p>
        </motion.div>

        <ProgressMilestones />

        <div className="mt-6 space-y-3">
          {protocolActions.map((action, index) => (
            <ProtocolCard key={action.titulo} action={action} index={index} />
          ))}
        </div>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-semibold">Quando esperar resultado</h2>
          <div className="mt-4 space-y-3">
            {timelineItems.map(([date, text]) => (
              <div key={date} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <p className="text-sm text-[#6B7280]">
                  <strong className="text-[#111827]">{date}:</strong> {text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/80 bg-white/88 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-18px_50px_-36px_rgba(17,24,39,0.35)] backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <Button
            asChild
            className="min-h-12 w-full rounded-xl bg-[#2563EB] text-base font-semibold"
          >
            <Link to="/check-in">Começar hoje</Link>
          </Button>
          <p className="mt-2 text-center text-xs text-[#6B7280]">
            Lembrete diário às 8h · Pode alterar nas configurações.
          </p>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="mx-auto flex max-w-md items-center justify-between">
      <Button variant="ghost" size="icon" className="rounded-full" asChild>
        <Link to="/meu-risco">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <Logo />
      <div className="h-10 w-10" />
    </header>
  );
}

function ProgressMilestones() {
  const steps = ["Dia 1", "Dia 30", "Dia 90"];
  return (
    <div className="mt-7 flex items-center">
      {steps.map((step, index) => (
        <div key={step} className="flex flex-1 items-center last:flex-none">
          <div
            className={`grid h-20 w-20 place-items-center rounded-full text-sm font-bold ${
              index === 0
                ? "bg-[#2563EB] text-white shadow-[0_12px_30px_-18px_rgba(37,99,235,0.7)]"
                : "border-2 border-dashed border-[#9CA3AF] bg-white/55 text-[#6B7280]"
            }`}
          >
            {step}
          </div>
          {index < steps.length - 1 && (
            <div className="mx-2 h-px flex-1 border-t-2 border-dashed border-[#9CA3AF]" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProtocolCard({ action, index }: { action: ProtocolAction; index: number }) {
  const visual = protocolVisual(action.area);
  const Icon = visual.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut", delay: index * 0.06 }}
      className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${visual.tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-[#F9FAFB] px-3 py-1 text-xs font-semibold text-[#2563EB]">
          {action.impacto_esperado}
        </span>
      </div>
      <h2 className="mt-4 text-lg font-bold leading-tight">{action.titulo}</h2>
      <p className="mt-2 text-[13px] leading-5 text-[#6B7280]">{action.descricao}</p>
    </motion.article>
  );
}

function protocolVisual(area: string) {
  const normalized = area.toLowerCase();
  if (normalized.includes("atividade")) {
    return { icon: Footprints, tone: "bg-[#DCFCE7] text-[#16A34A]" };
  }
  if (normalized.includes("aliment")) {
    return { icon: Utensils, tone: "bg-[#EFF6FF] text-[#2563EB]" };
  }
  if (normalized.includes("monitor")) {
    return { icon: Gauge, tone: "bg-[#E0F2FE] text-[#0284C7]" };
  }
  if (normalized.includes("cess")) {
    return { icon: Ban, tone: "bg-[#FEF2F2] text-[#DC2626]" };
  }
  if (normalized.includes("inflama")) {
    return { icon: HeartPulse, tone: "bg-[#FFF7ED] text-[#EA580C]" };
  }
  if (normalized.includes("rotina")) {
    return { icon: Moon, tone: "bg-[#F3E8FF] text-[#7E22CE]" };
  }
  return { icon: ShieldCheck, tone: "bg-[#F9FAFB] text-[#2563EB]" };
}

function buildFactorsFromExam(exam: ExamProtocolRecord) {
  const stored = exam.interpretacao_gerada?.factors;
  if (Array.isArray(stored) && stored.length) return stored;
  const factors: string[] = [];
  if (exam.apob != null && exam.apob >= 110) factors.push("ApoB em faixa de atenção");
  if (exam.ldl != null && exam.ldl >= 100) factors.push("LDL em faixa de atenção");
  if (exam.triglicerideos != null && exam.triglicerideos >= 150) factors.push("triglicerídeos elevados");
  if (exam.hba1c != null && exam.hba1c >= 5.7) factors.push("HbA1c em faixa de pré-diabetes");
  if (exam.glicemia_jejum != null && exam.glicemia_jejum >= 100) factors.push("glicemia de jejum alterada");
  if (exam.homa_ir != null && exam.homa_ir >= 1.5) factors.push("resistência à insulina em atenção");
  if (exam.pcr_us != null && exam.pcr_us >= 1) factors.push("inflamação em faixa intermediária");
  if (!factors.length) factors.push(exam.categoria_risco || "acompanhamento cardiovascular");
  return factors;
}

function isExamProtocolRecord(data: unknown): data is ExamProtocolRecord {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamProtocolRecord>;
  return typeof record.id === "string" && typeof record.score_calculado === "number";
}
