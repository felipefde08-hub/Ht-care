import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, FileUp, FlaskConical, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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

function ExamsPage() {
  const { user } = Route.useRouteContext();
  const [exams, setExams] = useState<Exam[]>([]);
  const [form, setForm] = useState({ name: "", examDate: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadExams();
  }, []);

  async function loadExams() {
    const { data, error } = await supabase
      .from("exams")
      .select("id,name,exam_date,notes,file_url,file_path,file_type,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setExams(data ?? []);
  }

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
