import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, FileUp, FlaskConical, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/exames")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Exames — HTCare" }] }),
  component: ExamsPage,
});

interface Exam {
  id: string;
  name: string;
  exam_date: string | null;
  notes: string | null;
  file_url: string | null;
  file_path: string | null;
  file_type: string | null;
  created_at: string;
}

interface AuthorizedExamRequest {
  id: string;
  status: string;
  resultado_url: string | null;
}

interface DynamicQueryBuilder {
  eq: (column: string, value: string) => DynamicQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQueryBuilder;
  limit: (count: number) => DynamicQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
}

interface DynamicUpdateBuilder {
  eq: (column: string, value: string) => Promise<{ error: unknown }>;
}

interface DynamicSupabaseTable {
  select: (columns: string) => DynamicQueryBuilder;
  update: (values: Record<string, unknown>) => DynamicUpdateBuilder;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

function ExamsPage() {
  const { user } = Route.useRouteContext();
  const [exams, setExams] = useState<Exam[]>([]);
  const [form, setForm] = useState({ name: "", examDate: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [authorizedRequest, setAuthorizedRequest] = useState<AuthorizedExamRequest | null>(null);
  const [uploadingResult, setUploadingResult] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadExams = useCallback(async () => {
    const { data, error } = await supabase
      .from("exams")
      .select("id,name,exam_date,notes,file_url,file_path,file_type,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setExams(data ?? []);
  }, []);

  const loadAuthorizedRequest = useCallback(async () => {
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { data, error } = await dynamicSupabase
      .from("exam_requests")
      .select("id,status,resultado_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    setAuthorizedRequest(isAuthorizedExamRequest(data) ? data : null);
  }, [user.id]);

  useEffect(() => {
    void loadExams();
    void loadAuthorizedRequest();
  }, [loadAuthorizedRequest, loadExams]);

  async function addExam() {
    if (!form.name.trim()) return;
    setSaving(true);
    let fileUrl: string | null = null;
    let filePath: string | null = null;
    if (file) {
      filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("exams").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) {
        toast.error("Não foi possível enviar o arquivo.");
        console.error(error);
        setSaving(false);
        return;
      }
      fileUrl = supabase.storage.from("exams").getPublicUrl(filePath).data.publicUrl;
    }

    const { error } = await supabase.from("exams").insert({
      user_id: user.id,
      name: form.name.trim(),
      exam_date: form.examDate || null,
      notes: form.notes.trim() || null,
      file_url: fileUrl,
      file_path: filePath,
      file_type: file?.type ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o exame.");
      console.error(error);
      return;
    }
    setForm({ name: "", examDate: "", notes: "" });
    setFile(null);
    await loadExams();
  }

  async function removeExam(id: string) {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover o exame.");
      return;
    }
    setExams((current) => current.filter((item) => item.id !== id));
  }

  async function uploadExamResult(file: File | null) {
    if (!file || !authorizedRequest) return;
    setUploadingResult(true);
    const safeName = file.name.replace(/[^\w.-]+/g, "-");
    const filePath = `${user.id}/exam-request-${authorizedRequest.id}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("resultados_exames")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) {
      setUploadingResult(false);
      toast.error("Não foi possível enviar o resultado.");
      console.error(uploadError);
      return;
    }

    const publicUrl = supabase.storage.from("resultados_exames").getPublicUrl(filePath)
      .data.publicUrl;
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } = await dynamicSupabase
      .from("exam_requests")
      .update({
        status: "resultado_recebido",
        resultado_url: publicUrl,
        resultado_path: filePath,
        resultado_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authorizedRequest.id);
    setUploadingResult(false);

    if (error) {
      toast.error("Arquivo enviado, mas não foi possível atualizar o status.");
      console.error(error);
      return;
    }
    toast.success("Resultado enviado. O médico parceiro será avisado para revisar.");
    await loadAuthorizedRequest();
  }

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <Header />
      <section className="mx-auto mt-5 max-w-3xl space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f1ecff] text-[#6f55c8]">
              <FlaskConical className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-sans text-2xl font-semibold">Exames e resultados</h1>
              <p className="mt-1 text-sm text-[#78908d]">Guarde PDFs, imagens e observações.</p>
            </div>
          </div>
        </Card>

        {authorizedRequest?.status === "autorizado" && (
          <Card>
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e8f5ef] text-[#2f6760]">
                <FileUp className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-sans text-xl font-semibold">Enviar resultado do exame</h2>
                <p className="mt-1 text-sm leading-6 text-[#78908d]">
                  Após receber o resultado do laboratório, envie aqui para o Carelito interpretar.
                </p>
                <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#10201f] px-5 text-sm font-bold text-white">
                  <FileUp className="h-4 w-4" />
                  {uploadingResult ? "Enviando..." : "Enviar resultado"}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    disabled={uploadingResult}
                    className="sr-only"
                    onChange={(event) => void uploadExamResult(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          </Card>
        )}

        {authorizedRequest?.status === "resultado_recebido" && (
          <Card>
            <p className="text-sm leading-6 text-[#536b68]">
              Resultado recebido. O médico parceiro vai revisar e deixar uma nota antes de liberar
              sua interpretação.
            </p>
          </Card>
        )}

        <Card>
          <div className="grid gap-4">
            <Field
              label="Nome do exame"
              value={form.name}
              onChange={(name) => setForm((current) => ({ ...current, name }))}
            />
            <Field
              label="Data"
              type="date"
              value={form.examDate}
              onChange={(examDate) => setForm((current) => ({ ...current, examDate }))}
            />
            <div>
              <Label>Observação</Label>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="mt-2 min-h-24 w-full rounded-2xl border border-[#10201f]/10 bg-white px-4 py-3 outline-none focus:border-[#2f8fc8]"
              />
            </div>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#10201f]/16 bg-[#f7faf9] px-4 text-sm font-semibold">
              <FileUp className="h-5 w-5 text-[#2f8fc8]" />
              {file ? file.name : "Adicionar PDF ou imagem"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              disabled={saving}
              className="rounded-full bg-[#10201f]"
              onClick={() => void addExam()}
            >
              Adicionar exame
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3 rounded-2xl bg-[#f7faf9] p-4">
            <Sparkles className="mt-0.5 h-5 w-5 text-[#49c7ae]" />
            <p className="text-sm leading-6 text-[#536b68]">
              Em breve: Carelito vai interpretar seu exame em linguagem simples.
            </p>
          </div>
        </Card>

        {exams.length ? (
          exams.map((exam) => (
            <Card key={exam.id}>
              <div className="flex items-start gap-3">
                <FlaskConical className="mt-1 h-5 w-5 text-[#6f55c8]" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-lg font-semibold">{exam.name}</p>
                  <p className="mt-1 text-sm text-[#78908d]">
                    {exam.exam_date
                      ? new Date(exam.exam_date).toLocaleDateString("pt-BR")
                      : "Sem data informada"}
                  </p>
                  {exam.notes && (
                    <p className="mt-3 text-sm leading-6 text-[#536b68]">{exam.notes}</p>
                  )}
                  {exam.file_url && (
                    <a
                      href={exam.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex font-bold text-[#2f8fc8]"
                    >
                      Ver arquivo
                    </a>
                  )}
                </div>
                <button type="button" onClick={() => void removeExam(exam.id)}>
                  <Trash2 className="h-5 w-5 text-[#9aa8a5]" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-center text-sm leading-6 text-[#536b68]">
              Nenhum exame registrado ainda.
            </p>
          </Card>
        )}
      </section>
      <MobileAppNav />
    </main>
  );
}

function isAuthorizedExamRequest(data: unknown): data is AuthorizedExamRequest {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<AuthorizedExamRequest>;
  return typeof record.id === "string" && typeof record.status === "string";
}

function Header() {
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft"
    >
      {children}
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 rounded-2xl"
      />
    </div>
  );
}
