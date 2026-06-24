import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ChartLine,
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  FlaskConical,
  HeartPulse,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  buildExamInterpretation,
  calculateHomaIr,
  parseExamNumber,
  type ExamBiomarkers,
} from "@/lib/exam-interpretation";
import {
  populationReference,
  readStoredHubData,
  readStoredScoreHistory,
  recommendationsForFactors,
  riskLabelFromScore,
  riskToneFromScore,
  type HubScorePoint,
} from "@/lib/patient-hub";

export const Route = createFileRoute("/meu-risco")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Meu Risco — HTCare" }] }),
  component: MeuRiscoPage,
});

type ExamRequestStatus =
  | "aguardando_autorizacao"
  | "autorizado"
  | "recusado"
  | "resultado_recebido"
  | "concluido";

interface ExamRequest {
  id: string;
  user_id: string;
  status: ExamRequestStatus;
  cidade: string;
  telefone_whatsapp: string;
  plano_saude: string | null;
  medico_id: string | null;
  observacao_medico: string | null;
  resultado_url: string | null;
  resultado_path: string | null;
  laboratorio_nome: string | null;
  laboratorio_endereco: string | null;
  laboratorio_telefone: string | null;
  created_at: string;
  updated_at: string;
}

interface ClinicalCheckin {
  created_at: string;
  pressao_sistolica: number | null;
  pressao_diastolica: number | null;
  glicemia: number | null;
  peso_kg: number | null;
}

interface DynamicQueryBuilder extends PromiseLike<{ data: unknown; error: unknown }> {
  eq: (column: string, value: string) => DynamicQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQueryBuilder;
  limit: (count: number) => DynamicQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
}

interface DynamicUpdateBuilder {
  eq: (column: string, value: string) => Promise<{ error: unknown }>;
}

interface DynamicInsertReturningBuilder {
  select: (columns: string) => {
    single: () => Promise<{ data: unknown; error: unknown }>;
  };
}

interface DynamicSupabaseTable {
  select: (columns: string) => DynamicQueryBuilder;
  insert: (
    values: Record<string, unknown>,
  ) => Promise<{ error: unknown }> | DynamicInsertReturningBuilder;
  update: (values: Record<string, unknown>) => DynamicUpdateBuilder;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

interface ExamResultSummary {
  id: string;
  exam_request_id: string | null;
}

interface ExamResultListItem {
  id: string;
  laboratorio_nome: string | null;
  data_exame: string;
  score_estimado: number | null;
  score_calculado: number;
  categoria_risco: "baixo" | "moderado" | "alto";
}

const DEFAULT_LAB = {
  name: "Laboratório parceiro HTCare",
  address: "Endereço confirmado pelo WhatsApp após a autorização",
  phone: "Contato enviado pela equipe HTCare",
};

function MeuRiscoPage() {
  const { user } = Route.useRouteContext();
  const [history, setHistory] = useState<HubScorePoint[]>([]);
  const [checkins, setCheckins] = useState<ClinicalCheckin[]>([]);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const [examRequest, setExamRequest] = useState<ExamRequest | null>(null);
  const [examResults, setExamResults] = useState<ExamResultListItem[]>([]);
  const [stored] = useState(() => readStoredHubData());

  useEffect(() => {
    async function load() {
      const localHistory = readStoredScoreHistory();
      setHistory(localHistory);
      const { data } = await supabase
        .from("assessments")
        .select("score,categoria_risco,fatores_que_pesaram,origem,created_at")
        .order("created_at", { ascending: true });
      if (data?.length) {
        setHistory(
          data.map((item) => ({
            score: Number(item.score),
            createdAt: item.created_at,
            source: item.origem,
            category: item.categoria_risco,
            factors: item.fatores_que_pesaram ?? [],
          })),
        );
      }
      const { data: checkinData } = await supabase
        .from("checkins")
        .select("created_at,pressao_sistolica,pressao_diastolica,glicemia,peso_kg")
        .order("created_at", { ascending: true });
      setCheckins(checkinData ?? []);
    }
    void load();
  }, []);

  useEffect(() => {
    void loadLatestExamRequest(user.id, setExamRequest);
    void loadExamResults(user.id, setExamResults);
  }, [user.id]);

  const latest = history.at(-1);
  const score = latest?.score ?? stored?.result?.score ?? null;
  const factors = latest?.factors ?? stored?.result?.factors ?? [];
  const chartData = useMemo(
    () =>
      history.map((item) => ({
        date: new Date(item.createdAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        score: item.score,
      })),
    [history],
  );
  const clinicalData = useMemo(() => buildClinicalCharts(checkins, period), [checkins, period]);

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <Header title="Meu Risco" />
      <section className="mx-auto mt-5 max-w-3xl space-y-4">
        <Card className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#78908d]">Score atual</p>
          <div
            className="mx-auto mt-5 grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#2f8fc8_var(--score),#e6eeec_var(--score)_100%)] p-3 [--score:0%]"
            style={{ "--score": `${score ?? 0}%` } as React.CSSProperties}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-white">
              <div>
                <p className="font-sans text-5xl font-semibold">{score ?? "—"}</p>
                <p className="text-sm font-semibold text-[#78908d]">/ 100</p>
              </div>
            </div>
          </div>
          <span
            className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-bold ${riskToneFromScore(score)}`}
          >
            Risco {riskLabelFromScore(score)}
          </span>
        </Card>

        <Card>
          <SectionTitle icon={ChartLine} title="Evolução do risco" />
          {chartData.length >= 2 ? (
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#2f8fc8" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#f7faf9] p-4 text-sm text-[#536b68]">
              Disponível após sua próxima reavaliação.
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle icon={HeartPulse} title="Fatores identificados" />
          <div className="mt-4 grid gap-2">
            {(factors.length ? factors : ["Nenhum fator crítico salvo ainda."]).map((factor) => (
              <div key={factor} className="rounded-2xl bg-[#f7faf9] p-4 text-sm font-semibold">
                {factor}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle icon={ChartLine} title="Tendência dos indicadores" />
            <div className="grid grid-cols-3 gap-1 rounded-full bg-[#f7faf9] p-1 text-xs font-bold">
              {[
                ["week", "Semana"],
                ["month", "Mês"],
                ["quarter", "3 meses"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value as typeof period)}
                  className={`rounded-full px-3 py-2 ${
                    period === value ? "bg-white text-[#10201f] shadow-soft" : "text-[#78908d]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <ClinicalChart
              title="Pressão arterial"
              data={clinicalData.pressure}
              lines={[
                { key: "sistolica", color: "#2f8fc8", label: "Sistólica" },
                { key: "diastolica", color: "#49c7ae", label: "Diastólica" },
              ]}
              reference={130}
              empty="Registre pressão no check-in para ver a tendência."
            />
            <ClinicalChart
              title="Peso"
              data={clinicalData.weight}
              lines={[{ key: "peso", color: "#2f6760", label: "Peso" }]}
              empty="Registre peso no check-in para ver a tendência."
            />
            <ClinicalChart
              title="Glicemia"
              data={clinicalData.glucose}
              lines={[{ key: "glicemia", color: "#d89a1d", label: "Glicemia" }]}
              reference={100}
              empty="Registre glicemia no check-in para ver a tendência."
            />
          </div>
        </Card>

        <ExamResultPreviewCard />

        <ExamRequestCard
          userId={user.id}
          request={examRequest}
          estimatedScore={score}
          onRequestChange={(nextRequest) => {
            setExamRequest(nextRequest);
            void loadExamResults(user.id, setExamResults);
          }}
        />

        <ExamResultsHistoryCard results={examResults} />

        <Card>
          <SectionTitle icon={ShieldCheck} title="O que fazer para reduzir 10% do risco" />
          <ul className="mt-4 space-y-2">
            {recommendationsForFactors(factors).map((item) => (
              <li
                key={item}
                className="rounded-2xl bg-[#f7faf9] p-4 text-sm leading-6 text-[#536b68]"
              >
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle icon={ChartLine} title="Comparação populacional" />
          <p className="mt-4 text-sm leading-6 text-[#536b68]">
            {populationReference(stored?.age, stored?.biologicalSex)}
          </p>
        </Card>
      </section>
      <MobileAppNav />
    </main>
  );
}

async function loadLatestExamRequest(
  userId: string,
  setExamRequest: (request: ExamRequest | null) => void,
) {
  const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
  const { data, error } = await dynamicSupabase
    .from("exam_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }
  setExamRequest(isExamRequest(data) ? data : null);
}

async function loadExamResults(
  userId: string,
  setExamResults: (results: ExamResultListItem[]) => void,
) {
  const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
  const { data, error } = await dynamicSupabase
    .from("exam_results")
    .select("id,laboratorio_nome,data_exame,score_estimado,score_calculado,categoria_risco")
    .eq("user_id", userId)
    .order("data_exame", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  setExamResults(Array.isArray(data) ? data.filter(isExamResultListItem) : []);
}

function isExamRequest(data: unknown): data is ExamRequest {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamRequest>;
  return typeof record.id === "string" && typeof record.status === "string";
}

function isExamResultListItem(data: unknown): data is ExamResultListItem {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamResultListItem>;
  return (
    typeof record.id === "string" &&
    typeof record.data_exame === "string" &&
    typeof record.score_calculado === "number"
  );
}

function ExamRequestCard({
  userId,
  request,
  estimatedScore,
  onRequestChange,
}: {
  userId: string;
  request: ExamRequest | null;
  estimatedScore: number | null;
  onRequestChange: (request: ExamRequest | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingBiomarkers, setSavingBiomarkers] = useState(false);
  const [examResultId, setExamResultId] = useState<string | null>(null);
  const [biomarkerForm, setBiomarkerForm] = useState({
    examDate: new Date().toISOString().slice(0, 10),
    labName: request?.laboratorio_nome ?? DEFAULT_LAB.name,
    apob: "",
    ldl: "",
    hdl: "",
    triglicerideos: "",
    hba1c: "",
    glicemiaJejum: "",
    insulinaJejum: "",
    pcrUs: "",
  });
  const [form, setForm] = useState({
    phone: request?.telefone_whatsapp ?? "",
    city: request?.cidade ?? "",
    healthPlan: request?.plano_saude ?? "",
  });
  const requestStatus = request?.status;

  useEffect(() => {
    setBiomarkerForm((current) => ({
      ...current,
      labName: request?.laboratorio_nome ?? current.labName ?? DEFAULT_LAB.name,
    }));
  }, [request?.laboratorio_nome]);

  useEffect(() => {
    async function loadExamResult() {
      if (!request?.id) {
        setExamResultId(null);
        return;
      }
      const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
      const { data, error } = await dynamicSupabase
        .from("exam_results")
        .select("id,exam_request_id")
        .eq("exam_request_id", request.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error(error);
        return;
      }
      setExamResultId(isExamResultSummary(data) ? data.id : null);
    }
    void loadExamResult();
  }, [request?.id]);

  async function submit() {
    if (!form.phone.trim() || !form.city.trim() || !form.healthPlan.trim()) {
      toast.error("Preencha cidade, WhatsApp e plano de saúde.");
      return;
    }
    setSaving(true);
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } = await dynamicSupabase.from("exam_requests").insert({
      user_id: userId,
      cidade: form.city.trim(),
      telefone_whatsapp: form.phone.trim(),
      plano_saude: form.healthPlan.trim(),
      status: "aguardando_autorizacao",
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível enviar a solicitação. Verifique a tabela exam_requests.");
      console.error(error);
      return;
    }
    toast.success(
      "Solicitação enviada! O médico parceiro vai analisar seu perfil e você receberá a autorização em até 24 horas pelo WhatsApp.",
    );
    setOpen(false);
    await loadLatestExamRequest(userId, onRequestChange);
  }

  async function uploadResult(file: File | null) {
    if (!request || !file) return;
    setUploading(true);
    const safeName = file.name.replace(/[^\w.-]+/g, "-");
    const filePath = `${userId}/exam-request-${request.id}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("exams").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (uploadError) {
      toast.error("Não foi possível enviar o resultado.");
      console.error(uploadError);
      setUploading(false);
      return;
    }

    const publicUrl = supabase.storage.from("exams").getPublicUrl(filePath).data.publicUrl;
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } = await dynamicSupabase
      .from("exam_requests")
      .update({
        status: "resultado_recebido",
        resultado_url: publicUrl,
        resultado_path: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    setUploading(false);

    if (error) {
      toast.error("Arquivo enviado, mas não conseguimos atualizar o status.");
      console.error(error);
      return;
    }
    toast.success("Recebemos seu resultado! O Carelito vai interpretar em breve.");
    await loadLatestExamRequest(userId, onRequestChange);
  }

  async function saveBiomarkers() {
    if (!request) return;
    const biomarkers: ExamBiomarkers = {
      apob: parseExamNumber(biomarkerForm.apob),
      ldl: parseExamNumber(biomarkerForm.ldl),
      hdl: parseExamNumber(biomarkerForm.hdl),
      triglicerideos: parseExamNumber(biomarkerForm.triglicerideos),
      hba1c: parseExamNumber(biomarkerForm.hba1c),
      glicemiaJejum: parseExamNumber(biomarkerForm.glicemiaJejum),
      insulinaJejum: parseExamNumber(biomarkerForm.insulinaJejum),
      pcrUs: parseExamNumber(biomarkerForm.pcrUs),
    };
    const hasAnyValue = Object.values(biomarkers).some((value) => value != null);
    if (!hasAnyValue) {
      toast.error("Preencha pelo menos um biomarcador do exame.");
      return;
    }
    const homaIr = calculateHomaIr(biomarkers.glicemiaJejum, biomarkers.insulinaJejum);
    const interpretation = buildExamInterpretation(
      { ...biomarkers, homaIr },
      estimatedScore,
      "você",
    );
    setSavingBiomarkers(true);
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const insertBuilder = dynamicSupabase.from("exam_results").insert({
      user_id: userId,
      exam_request_id: request.id,
      laboratorio_nome:
        biomarkerForm.labName.trim() || request.laboratorio_nome || DEFAULT_LAB.name,
      data_exame: biomarkerForm.examDate || new Date().toISOString().slice(0, 10),
      arquivo_url: request.resultado_url,
      apob: biomarkers.apob,
      ldl: biomarkers.ldl,
      hdl: biomarkers.hdl,
      triglicerideos: biomarkers.triglicerideos,
      hba1c: biomarkers.hba1c,
      glicemia_jejum: biomarkers.glicemiaJejum,
      insulina_jejum: biomarkers.insulinaJejum,
      homa_ir: homaIr,
      pcr_us: biomarkers.pcrUs,
      score_estimado: estimatedScore,
      score_calculado: interpretation.score,
      categoria_risco: interpretation.category,
      interpretacao_gerada: {
        cards: interpretation.cards,
        factors: interpretation.factors,
        score: interpretation.score,
        category: interpretation.category,
      },
      resumo_carelito: interpretation.summary,
    }) as DynamicInsertReturningBuilder;
    const { data, error } = await insertBuilder.select("id").single();

    if (error) {
      setSavingBiomarkers(false);
      toast.error("Não foi possível salvar a interpretação. Verifique a tabela exam_results.");
      console.error(error);
      return;
    }

    await dynamicSupabase
      .from("exam_requests")
      .update({ status: "concluido", updated_at: new Date().toISOString() })
      .eq("id", request.id);
    setSavingBiomarkers(false);

    if (isExamResultSummary(data)) {
      setExamResultId(data.id);
      toast.success("Interpretação pronta. Seu score foi atualizado com os exames reais.");
      await loadLatestExamRequest(userId, onRequestChange);
      window.location.assign(`/exame-resultado/${data.id}`);
    }
  }

  return (
    <Card>
      <SectionTitle icon={ShieldCheck} title="Próximo passo" />
      {!request || requestStatus === "recusado" ? (
        <>
          <h2 className="mt-4 font-sans text-2xl font-semibold">
            Aprofunde sua avaliação com exame de sangue
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#536b68]">
            Com seus biomarcadores reais (ApoB, resistência à insulina, inflamação), seu score fica
            muito mais preciso.
          </p>
          {requestStatus === "recusado" && request?.observacao_medico && (
            <div className="mt-4 rounded-2xl bg-[#fff7dc] p-4 text-sm leading-6 text-[#76501d]">
              Recado médico: {request.observacao_medico}
            </div>
          )}
          {!open ? (
            <Button className="mt-4 w-full rounded-full bg-[#10201f]" onClick={() => setOpen(true)}>
              Solicitar exame
            </Button>
          ) : (
            <div className="mt-4 space-y-3 rounded-[1.25rem] bg-[#f7faf9] p-3">
              <p className="rounded-2xl bg-white p-4 text-sm leading-6 text-[#536b68]">
                Vamos solicitar autorização médica para o seu exame. Assim que o médico aprovar,
                você receberá as instruções para agendar no laboratório parceiro.
              </p>
              <FormField
                label="Cidade"
                value={form.city}
                onChange={(city) => setForm((current) => ({ ...current, city }))}
                placeholder="São Paulo"
              />
              <FormField
                label="Telefone para contato (WhatsApp)"
                value={form.phone}
                onChange={(phone) => setForm((current) => ({ ...current, phone }))}
                placeholder="(11) 99999-9999"
              />
              <FormField
                label="Plano de saúde"
                value={form.healthPlan}
                onChange={(healthPlan) => setForm((current) => ({ ...current, healthPlan }))}
                placeholder="Ex: Unimed, Bradesco, SulAmérica ou Particular"
              />
              <div className="flex gap-2">
                <Button
                  className="min-h-12 flex-1 rounded-full bg-[#10201f]"
                  disabled={saving}
                  onClick={() => void submit()}
                >
                  {saving ? "Enviando..." : "Enviar solicitação"}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-12 rounded-full"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {requestStatus === "aguardando_autorizacao" && (
        <StatusBlock
          icon={Clock3}
          title="Solicitação enviada"
          text="O médico parceiro vai analisar seu perfil e você receberá a autorização em até 24 horas pelo WhatsApp."
          tone="warning"
        />
      )}

      {requestStatus === "autorizado" && (
        <div className="mt-4 space-y-4">
          <StatusBlock
            icon={CheckCircle2}
            title="Exame autorizado"
            text="Agende agora no laboratório parceiro e informe que vem pela HTCare."
            tone="success"
          />
          <div className="grid gap-3 rounded-[1.25rem] bg-[#f7faf9] p-4 text-sm">
            <InfoLine
              icon={FlaskConical}
              label="Laboratório"
              value={request.laboratorio_nome ?? DEFAULT_LAB.name}
            />
            <InfoLine
              icon={MapPin}
              label="Endereço"
              value={request.laboratorio_endereco ?? DEFAULT_LAB.address}
            />
            <InfoLine
              icon={Phone}
              label="Telefone"
              value={request.laboratorio_telefone ?? DEFAULT_LAB.phone}
            />
            <p className="rounded-2xl bg-white p-3 font-semibold text-[#2f6760]">
              Informe que vem pela HTCare.
            </p>
          </div>
          <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#10201f] px-5 text-sm font-bold text-white">
            <FileUp className="h-4 w-4" />
            {uploading ? "Enviando..." : "Enviar resultado do exame"}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => void uploadResult(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}

      {requestStatus === "resultado_recebido" && (
        <div className="mt-4 space-y-4">
          <StatusBlock
            icon={CheckCircle2}
            title="Resultado recebido"
            text="Agora digite os valores principais do exame para o Carelito interpretar com dados reais."
            tone="success"
          />
          {examResultId ? (
            <Button asChild className="min-h-12 w-full rounded-full bg-[#10201f]">
              <Link to="/exame-resultado/$id" params={{ id: examResultId }}>
                <FileText className="mr-2 h-4 w-4" />
                Ver interpretação do exame
              </Link>
            </Button>
          ) : (
            <BiomarkerForm
              form={biomarkerForm}
              saving={savingBiomarkers}
              onChange={(field, value) =>
                setBiomarkerForm((current) => ({ ...current, [field]: value }))
              }
              onSubmit={() => void saveBiomarkers()}
            />
          )}
        </div>
      )}

      {requestStatus === "concluido" && (
        <div className="mt-4 space-y-4">
          <StatusBlock
            icon={CheckCircle2}
            title="Exame interpretado"
            text="Seu relatório com biomarcadores reais já está disponível."
            tone="success"
          />
          {examResultId && (
            <Button asChild className="min-h-12 w-full rounded-full bg-[#10201f]">
              <Link to="/exame-resultado/$id" params={{ id: examResultId }}>
                <FileText className="mr-2 h-4 w-4" />
                Ver interpretação do exame
              </Link>
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function ExamResultPreviewCard() {
  return (
    <Card className="border-[#2f8fc8]/20 bg-[#f2faf9]">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#2f8fc8] shadow-soft">
          <FileText className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f6760]">
            Nova tela de exame
          </p>
          <h2 className="mt-2 font-sans text-2xl font-semibold">
            Veja a prévia do relatório interpretado
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#536b68]">
            Abre a experiência completa com comparação populacional, evolução dos biomarcadores,
            plano de 90 dias, nota médica e próximo exame recomendado.
          </p>
          <Button asChild className="mt-4 min-h-12 rounded-full bg-[#10201f]">
            <Link to="/exame-resultado/$id" params={{ id: "demo" }}>
              Ver prévia do relatório
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function isExamResultSummary(data: unknown): data is ExamResultSummary {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamResultSummary>;
  return typeof record.id === "string";
}

function BiomarkerForm({
  form,
  saving,
  onChange,
  onSubmit,
}: {
  form: {
    examDate: string;
    labName: string;
    apob: string;
    ldl: string;
    hdl: string;
    triglicerideos: string;
    hba1c: string;
    glicemiaJejum: string;
    insulinaJejum: string;
    pcrUs: string;
  };
  saving: boolean;
  onChange: (field: keyof typeof form, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 rounded-[1.25rem] bg-[#f7faf9] p-4">
      <p className="text-sm leading-6 text-[#536b68]">
        A leitura automática do PDF vem depois. Por enquanto, envie o arquivo e digite os valores
        abaixo para gerar a interpretação.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ExamInput
          label="Data do exame"
          value={form.examDate}
          type="date"
          onChange={(value) => onChange("examDate", value)}
        />
        <ExamInput
          label="Laboratório"
          value={form.labName}
          onChange={(value) => onChange("labName", value)}
          placeholder="Laboratório parceiro HTCare"
        />
        <ExamInput
          label="ApoB (mg/dL)"
          value={form.apob}
          onChange={(value) => onChange("apob", value)}
        />
        <ExamInput
          label="LDL (mg/dL)"
          value={form.ldl}
          onChange={(value) => onChange("ldl", value)}
        />
        <ExamInput
          label="HDL (mg/dL)"
          value={form.hdl}
          onChange={(value) => onChange("hdl", value)}
        />
        <ExamInput
          label="Triglicerídeos (mg/dL)"
          value={form.triglicerideos}
          onChange={(value) => onChange("triglicerideos", value)}
        />
        <ExamInput
          label="HbA1c (%)"
          value={form.hba1c}
          onChange={(value) => onChange("hba1c", value)}
        />
        <ExamInput
          label="Glicemia de jejum (mg/dL)"
          value={form.glicemiaJejum}
          onChange={(value) => onChange("glicemiaJejum", value)}
        />
        <ExamInput
          label="Insulina de jejum"
          value={form.insulinaJejum}
          onChange={(value) => onChange("insulinaJejum", value)}
        />
        <ExamInput
          label="PCR-us (mg/L)"
          value={form.pcrUs}
          onChange={(value) => onChange("pcrUs", value)}
        />
      </div>
      <Button
        className="min-h-12 w-full rounded-full bg-[#10201f]"
        disabled={saving}
        onClick={onSubmit}
      >
        {saving ? "Gerando interpretação..." : "Gerar interpretação do Carelito"}
      </Button>
    </div>
  );
}

function ExamInput({
  label,
  value,
  onChange,
  placeholder = "Digite o valor",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">
        {label}
      </Label>
      <Input
        type={type}
        inputMode={type === "date" ? undefined : "decimal"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 rounded-2xl bg-white"
      />
    </div>
  );
}

function ExamResultsHistoryCard({ results }: { results: ExamResultListItem[] }) {
  if (!results.length) return null;
  return (
    <Card>
      <SectionTitle icon={FileText} title="Exames interpretados" />
      <div className="mt-4 grid gap-3">
        {results.map((result) => {
          const difference =
            result.score_estimado == null ? null : result.score_calculado - result.score_estimado;
          return (
            <Link
              key={result.id}
              to="/exame-resultado/$id"
              params={{ id: result.id }}
              className="rounded-[1.25rem] bg-[#f7faf9] p-4 transition hover:-translate-y-0.5 hover:bg-[#eef7f5]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">
                    {formatShortDate(result.data_exame)} ·{" "}
                    {result.laboratorio_nome ?? "Laboratório parceiro"}
                  </p>
                  <p className="mt-1 font-sans text-xl font-semibold">
                    Score real: {result.score_calculado}/100
                  </p>
                  {difference != null && (
                    <p className="mt-1 text-sm text-[#536b68]">
                      Estimado: {result.score_estimado}/100 · {difference > 0 ? "+" : ""}
                      {difference} pontos com biomarcadores reais
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${riskToneFromScore(result.score_calculado)}`}
                >
                  {riskLabelFromScore(result.score_calculado)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function StatusBlock({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: typeof Clock3;
  title: string;
  text: string;
  tone: "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "bg-[#e8f5ef] text-[#2f6760]" : "bg-[#fff7dc] text-[#9a5b12]";
  return (
    <div className="mt-4 flex items-start gap-3 rounded-[1.25rem] bg-[#f7faf9] p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-sans text-lg font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#536b68]">{text}</p>
      </div>
    </div>
  );
}

function ClinicalChart({
  title,
  data,
  lines,
  reference,
  empty,
}: {
  title: string;
  data: Array<Record<string, number | string>>;
  lines: Array<{ key: string; color: string; label: string }>;
  reference?: number;
  empty: string;
}) {
  return (
    <div className="rounded-[1.25rem] bg-[#f7faf9] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-lg font-semibold">{title}</h2>
        <div className="flex gap-2">
          {lines.map((line) => (
            <span
              key={line.key}
              className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#78908d]"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: line.color }} />
              {line.label}
            </span>
          ))}
        </div>
      </div>
      {data.length >= 2 ? (
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={32} />
              <Tooltip />
              {reference && (
                <ReferenceLine
                  y={reference}
                  stroke="#dc3f35"
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                />
              )}
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  stroke={line.color}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm leading-6 text-[#536b68]">{empty}</p>
      )}
    </div>
  );
}

function buildClinicalCharts(checkins: ClinicalCheckin[], period: "week" | "month" | "quarter") {
  const days = period === "week" ? 7 : period === "month" ? 30 : 90;
  const since = Date.now() - days * 86_400_000;
  const filtered = checkins.filter((item) => new Date(item.created_at).getTime() >= since);
  return {
    pressure: filtered
      .filter((item) => item.pressao_sistolica || item.pressao_diastolica)
      .map((item) => ({
        date: formatShortDate(item.created_at),
        sistolica: item.pressao_sistolica ?? undefined,
        diastolica: item.pressao_diastolica ?? undefined,
      })),
    weight: filtered
      .filter((item) => item.peso_kg)
      .map((item) => ({
        date: formatShortDate(item.created_at),
        peso: item.peso_kg ?? undefined,
      })),
    glucose: filtered
      .filter((item) => item.glicemia)
      .map((item) => ({
        date: formatShortDate(item.created_at),
        glicemia: item.glicemia ?? undefined,
      })),
  };
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FlaskConical;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-3">
      <Icon className="mt-0.5 h-5 w-5 text-[#2f8fc8]" />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">{label}</p>
        <p className="mt-1 font-semibold text-[#10201f]">{value}</p>
      </div>
    </div>
  );
}

function FormField({
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
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-[#78908d]">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 rounded-2xl bg-white"
      />
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between">
      <Button variant="ghost" size="icon" className="rounded-full" asChild>
        <Link to="/painel">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <Logo />
      <div className="h-10 w-10" />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof HeartPulse; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e9f4fb] text-[#2f8fc8]">
        <Icon className="h-5 w-5" />
      </span>
      <h1 className="font-sans text-xl font-semibold">{title}</h1>
    </div>
  );
}
