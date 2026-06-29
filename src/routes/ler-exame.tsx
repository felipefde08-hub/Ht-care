import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Carelito } from "@/components/HeartMascot";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { readExamValues } from "@/lib/api/exam-reader";
import {
  buildExamInterpretation,
  calculateHomaIr,
  parseExamNumber,
  type BiomarkerInterpretation,
  type ExamBiomarkers,
  type RiskLevel,
} from "@/lib/exam-interpretation";
import { gerarProtocolo } from "@/lib/protocol-generator";

export const Route = createFileRoute("/ler-exame")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Ler exame — HTCare" }] }),
  component: ReadExamPage,
});

type Stage = "choose" | "uploading" | "processing" | "confirm";
type BiomarkerField =
  | "apob"
  | "ldl"
  | "hdl"
  | "triglicerideos"
  | "hba1c"
  | "glicemiaJejum"
  | "insulinaJejum"
  | "pcrUs";

interface UploadedExam {
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileType: string;
  fileBase64: string;
}

interface AssessmentRecord {
  score: number | null;
}

interface ProfileRecord {
  nome: string | null;
}

interface DynamicQueryBuilder {
  eq: (column: string, value: string) => DynamicQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQueryBuilder;
  limit: (count: number) => DynamicQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
}

interface DynamicInsertBuilder {
  select: (columns: string) => {
    single: () => Promise<{ data: unknown; error: unknown }>;
  };
}

interface DynamicSupabaseTable {
  select: (columns: string) => DynamicQueryBuilder;
  insert: (values: Record<string, unknown>) => DynamicInsertBuilder;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

interface AiExamInterpretation {
  score: number;
  category: RiskLevel;
  factors: string[];
  cards: BiomarkerInterpretation[];
  summary: string;
  next90Days?: string[];
  source?: string;
  model?: string;
}

const BIOMARKER_FIELDS: Array<{
  key: BiomarkerField;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  { key: "apob", label: "ApoB", hint: "mg/dL", placeholder: "Ex: 92" },
  { key: "ldl", label: "LDL", hint: "mg/dL", placeholder: "Ex: 118" },
  { key: "hdl", label: "HDL", hint: "mg/dL", placeholder: "Ex: 52" },
  { key: "triglicerideos", label: "Triglicerídeos", hint: "mg/dL", placeholder: "Ex: 140" },
  { key: "hba1c", label: "HbA1c", hint: "%", placeholder: "Ex: 5,6" },
  { key: "glicemiaJejum", label: "Glicemia de jejum", hint: "mg/dL", placeholder: "Ex: 92" },
  { key: "insulinaJejum", label: "Insulina de jejum", hint: "µUI/mL", placeholder: "Ex: 8" },
  { key: "pcrUs", label: "PCR-us", hint: "mg/L", placeholder: "Ex: 1,2" },
];

function ReadExamPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<Stage>("choose");
  const [uploaded, setUploaded] = useState<UploadedExam | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [estimatedScore, setEstimatedScore] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("você");
  const [form, setForm] = useState<Record<BiomarkerField, string>>({
    apob: "",
    ldl: "",
    hdl: "",
    triglicerideos: "",
    hba1c: "",
    glicemiaJejum: "",
    insulinaJejum: "",
    pcrUs: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadContext() {
      const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
      const [{ data: assessmentData }, { data: profileData }] = await Promise.all([
        dynamicSupabase
          .from("assessments")
          .select("score")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        dynamicSupabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
      ]);
      const assessment = isAssessmentRecord(assessmentData) ? assessmentData : null;
      const profile = isProfileRecord(profileData) ? profileData : null;
      setEstimatedScore(assessment?.score ?? null);
      setFirstName(profile?.nome?.split(" ")[0] || user.email?.split("@")[0] || "você");
    }
    void loadContext();
  }, [user.email, user.id]);

  const hasAnyValue = useMemo(
    () => Object.values(form).some((value) => parseExamNumber(value) != null),
    [form],
  );

  async function handleSelectedFile(file: File | null) {
    if (!file) return;
    setReadError(null);
    setStage("uploading");
    const safeName = file.name.replace(/[^\w.-]+/g, "-");
    const filePath = `${user.id}/carelito-read-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("resultados_exames").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      console.error(error);
      toast.error("Não foi possível enviar o exame.");
      setStage("choose");
      return;
    }

    const fileUrl = supabase.storage.from("resultados_exames").getPublicUrl(filePath)
      .data.publicUrl;
    const uploadedExam = {
      fileName: file.name,
      fileUrl,
      filePath,
      fileType: file.type || "application/octet-stream",
      fileBase64: await fileToBase64(file),
    };
    setUploaded(uploadedExam);
    setStage("processing");

    try {
      const extracted = await readExamWithCarelito(uploadedExam);
      setForm((current) => ({ ...current, ...extracted.values }));

      if (extracted.confidence === "high" && hasExtractedValue(extracted.values)) {
        await saveAndOpenResult(uploadedExam, extracted.values);
        return;
      }

      if (!hasExtractedValue(extracted.values)) {
        setReadError("Não conseguimos ler automaticamente. Digite os valores manualmente.");
      }
    } catch (error) {
      console.error("read-exam failed", error);
      setReadError(
        `Não conseguimos ler automaticamente. Digite os valores manualmente. Detalhe técnico: ${formatReadableError(error)}`,
      );
    }
    setStage("confirm");
  }

  async function saveAndOpenResult(
    source = uploaded,
    values: Partial<Record<BiomarkerField, string>> = form,
  ) {
    if (!source) return;
    const biomarkers: ExamBiomarkers = {
      apob: parseExamNumber(values.apob),
      ldl: parseExamNumber(values.ldl),
      hdl: parseExamNumber(values.hdl),
      triglicerideos: parseExamNumber(values.triglicerideos),
      hba1c: parseExamNumber(values.hba1c),
      glicemiaJejum: parseExamNumber(values.glicemiaJejum),
      insulinaJejum: parseExamNumber(values.insulinaJejum),
      pcrUs: parseExamNumber(values.pcrUs),
    };

    if (!Object.values(biomarkers).some((value) => value != null)) {
      toast.error("Confirme pelo menos um valor para o Carelito interpretar.");
      return;
    }

    setSaving(true);
    const homaIr = calculateHomaIr(biomarkers.glicemiaJejum, biomarkers.insulinaJejum);
    const interpretation = await interpretExamWithCarelito(
      { ...biomarkers, homaIr },
      estimatedScore,
      firstName,
    );
    const protocol = gerarProtocolo(interpretation.factors);

    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { data, error } = await dynamicSupabase
      .from("exam_results")
      .insert({
        user_id: user.id,
        exam_request_id: null,
        laboratorio_nome: "Exame enviado pelo app",
        data_exame: new Date().toISOString().slice(0, 10),
        arquivo_url: source.fileUrl,
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
          source: "carelito_upload",
          file_name: source.fileName,
          file_path: source.filePath,
          cards: interpretation.cards,
          factors: interpretation.factors,
          next90Days: interpretation.next90Days ?? protocol.acoes.map((action) => action.titulo),
          protocol,
          score: interpretation.score,
          category: interpretation.category,
          interpretation_source: interpretation.source ?? "local",
          interpretation_model: interpretation.model ?? "local",
        },
        resumo_carelito: interpretation.summary,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Não foi possível salvar a interpretação do exame.");
      return;
    }

    const id = isInsertResult(data) ? data.id : null;
    if (!id) {
      toast.error("Resultado salvo sem identificador. Tente abrir pelo histórico.");
      return;
    }
    toast.success("Exame lido. Abrindo interpretação do Carelito.");
    await navigate({ to: "/exame-resultado/$id", params: { id } });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#EBF5FF] to-[#F0FDF4] px-4 pb-28 pt-5 text-[#111827]">
      <input
        ref={cameraInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => void handleSelectedFile(event.target.files?.[0] ?? null)}
      />
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="application/pdf,image/*"
        onChange={(event) => void handleSelectedFile(event.target.files?.[0] ?? null)}
      />

      <header className="mx-auto flex max-w-md items-center justify-between">
        <Link
          to="/painel"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/75 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Logo className="h-9" />
        <span className="h-10 w-10" />
      </header>

      <section className="mx-auto mt-7 max-w-md">
        {stage === "choose" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[calc(100vh-9rem)] flex-col justify-center"
          >
            <div className="mb-7 flex flex-col items-center text-center">
              <Carelito className="h-28 w-28" expression="confident" />
              <div className="relative mt-3 max-w-[19rem] rounded-[1.6rem] bg-white/88 px-5 py-4 text-sm font-semibold leading-5 text-[#111827] shadow-[0_18px_70px_-42px_rgba(37,99,235,0.38)] backdrop-blur">
                <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white/88" />
                Me mostre seu exame que eu explico tudo em linguagem simples.
              </div>
            </div>

            <div className="grid gap-3">
              <ChoiceCard
                icon={Camera}
                title="Fotografar exame"
                text="Aponte a câmera para qualquer exame de sangue."
                onClick={() => cameraInputRef.current?.click()}
              />
              <ChoiceCard
                icon={FileText}
                title="Enviar PDF ou imagem"
                text="Selecione um arquivo do seu celular."
                onClick={() => fileInputRef.current?.click()}
              />
            </div>
            <p className="mt-5 text-center text-xs font-medium text-[#6B7280]">
              Funciona com exames do SUS e laboratórios particulares.
            </p>
          </motion.div>
        )}

        {stage === "uploading" && (
          <LoadingCard
            title="Enviando seu exame..."
            text="Estamos guardando o arquivo com segurança antes da leitura."
          />
        )}

        {stage === "processing" && (
          <LoadingCard
            title="Lendo seu exame"
            text="Carelito está procurando os principais biomarcadores no arquivo."
            scanning
          />
        )}

        {stage === "confirm" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-[2rem] bg-white p-5 shadow-[0_18px_70px_-45px_rgba(16,32,31,0.32)]">
              <div className="flex items-start gap-3">
                <Carelito className="h-16 w-16 shrink-0" expression="confident" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#16A34A]">
                    Confirmação rápida
                  </p>
                  <h1 className="mt-1 font-sans text-2xl font-bold">O que consegui ler</h1>
                  <p className="mt-2 text-sm leading-5 text-[#6B7280]">
                    Confirme os valores visíveis no exame. Pode preencher só o que tiver no arquivo.
                  </p>
                </div>
              </div>

              {readError && (
                <div className="mt-5 flex gap-3 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-4 text-left">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#EA580C]" />
                  <p className="text-sm leading-5 text-[#7C2D12]">{readError}</p>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                {BIOMARKER_FIELDS.map((field) => (
                  <div key={field.key} className="rounded-2xl bg-[#F9FAFB] p-3">
                    <Label className="text-xs font-bold text-[#111827]">{field.label}</Label>
                    <Input
                      inputMode="decimal"
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      placeholder={field.placeholder}
                      className="mt-2 h-11 rounded-xl border-[#E5E7EB] bg-white text-sm"
                    />
                    <p className="mt-1 text-[0.68rem] font-semibold text-[#6B7280]">
                      {field.hint}
                    </p>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                disabled={!hasAnyValue || saving}
                onClick={() => void saveAndOpenResult()}
                className="mt-5 h-12 w-full rounded-2xl bg-[#2563EB] text-base font-bold text-white hover:bg-[#1d4ed8]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando relatório
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar interpretação
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </section>
      <MobileAppNav />
    </main>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  icon: typeof Camera;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[132px] w-full items-center gap-5 rounded-[1.8rem] bg-white p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition active:scale-[0.985]"
    >
      <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.35rem] bg-[#EBF5FF] text-[#2563EB] transition group-active:scale-95">
        <Icon className="h-10 w-10" />
      </span>
      <span>
        <span className="block font-sans text-xl font-bold text-[#111827]">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-[#6B7280]">{text}</span>
      </span>
    </button>
  );
}

function LoadingCard({
  title,
  text,
  scanning = false,
}: {
  title: string;
  text: string;
  scanning?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center text-center"
    >
      <div className="relative mx-auto h-44 w-44">
        <Carelito className="h-44 w-44" expression="thoughtful" />
        <motion.span
          className="absolute right-1 top-4 grid h-14 w-14 place-items-center rounded-full bg-white text-[#2563EB] shadow-[0_10px_30px_rgba(37,99,235,0.22)]"
          animate={scanning ? { rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] } : undefined}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          {scanning ? <Search className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
        </motion.span>
      </div>
      <h1 className="mt-4 flex items-center justify-center gap-1 font-sans text-3xl font-bold text-[#111827]">
        {title}
        {scanning && <PulsingDots />}
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#6B7280]">{text}</p>
      <div className="mx-auto mt-5 h-2 w-44 overflow-hidden rounded-full bg-[#E5E7EB]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#16A34A]"
          initial={{ width: "18%" }}
          animate={{ width: scanning ? ["18%", "78%", "92%"] : "45%" }}
          transition={{ duration: scanning ? 5.2 : 1.2, repeat: scanning ? Infinity : 0 }}
        />
      </div>
    </motion.div>
  );
}

async function readExamWithCarelito(uploaded: UploadedExam) {
  const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 5200));
  const invocation = readExamValues({
    fileUrl: uploaded.fileUrl,
    filePath: uploaded.filePath,
    fileName: uploaded.fileName,
    fileType: uploaded.fileType,
    fileBase64: uploaded.fileBase64,
  });
  const [result] = await Promise.allSettled([invocation, minimumDelay]).then((results) => [
    results[0],
  ]);
  if (result.status === "rejected") throw result.reason;
  const values = normalizeExtractedValues(result.value);
  return {
    confidence: getConfidence(result.value),
    values,
  };
}

function PulsingDots() {
  return (
    <span className="inline-flex translate-y-1 gap-1" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-[#2563EB]"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: index * 0.16 }}
        />
      ))}
    </span>
  );
}

function formatReadableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "erro desconhecido";
  }
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function normalizeExtractedValues(data: unknown): Partial<Record<BiomarkerField, string>> {
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  const source =
    record.values && typeof record.values === "object"
      ? (record.values as Record<string, unknown>)
      : record;
  return Object.fromEntries(
    BIOMARKER_FIELDS.map((field) => [field.key, source[field.key] ?? source[toSnake(field.key)]])
      .filter(([, value]) => value != null && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ) as Partial<Record<BiomarkerField, string>>;
}

function getConfidence(data: unknown): "high" | "low" {
  if (!data || typeof data !== "object") return "low";
  const confidence = (data as Record<string, unknown>).confidence;
  return confidence === "high" ? "high" : "low";
}

function toSnake(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function hasExtractedValue(values: Partial<Record<BiomarkerField, string>>) {
  return Object.values(values).some((value) => parseExamNumber(value) != null);
}

async function interpretExamWithCarelito(
  biomarkers: ExamBiomarkers,
  estimatedScore: number | null,
  firstName: string,
): Promise<AiExamInterpretation> {
  try {
    const { data, error } = await supabase.functions.invoke("interpret-exam", {
      body: { biomarkers, estimatedScore, firstName },
    });
    if (error) throw error;
    if (isAiExamInterpretation(data)) return data;
  } catch (error) {
    console.info("Interpretação por IA indisponível, usando fallback local.", error);
  }
  return {
    ...buildExamInterpretation(biomarkers, estimatedScore, firstName),
    source: "local",
    model: "local",
  };
}

function isAssessmentRecord(value: unknown): value is AssessmentRecord {
  return Boolean(value && typeof value === "object" && "score" in value);
}

function isProfileRecord(value: unknown): value is ProfileRecord {
  return Boolean(value && typeof value === "object" && "nome" in value);
}

function isInsertResult(value: unknown): value is { id: string } {
  return Boolean(
    value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string",
  );
}

function isAiExamInterpretation(value: unknown): value is AiExamInterpretation {
  if (!value || typeof value !== "object") return false;
  const record = value as { score?: unknown; category?: unknown; cards?: unknown; summary?: unknown };
  return (
    typeof record.score === "number" &&
    (record.category === "baixo" || record.category === "moderado" || record.category === "alto") &&
    Array.isArray(record.cards) &&
    typeof record.summary === "string"
  );
}
