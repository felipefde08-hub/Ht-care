import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bell,
  Check,
  CreditCard,
  FileText,
  FileUp,
  FlaskConical,
  HeartPulse,
  Languages,
  Lock,
  LogOut,
  Moon,
  Pill,
  Save,
  Settings,
  ShieldCheck,
  Stethoscope,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { getChallengeStats, getWeeklyMissions } from "@/lib/challenge";
import { calculateInitialRiskScore } from "@/lib/risk-score";
import { recordUserActivity } from "@/lib/user-activity";

export const Route = createFileRoute("/perfil/$section")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Perfil — HTCare" }] }),
  component: ProfileSectionPage,
});

type YesNo = "sim" | "nao";
type YesNoUnknown = "sim" | "nao" | "nao_sei";
type Sex = "feminino" | "masculino" | "";

interface ProfileForm {
  name: string;
  age: string;
  sex: Sex;
  weight: string;
  height: string;
  knowsBloodPressure: YesNo | "";
  systolic: string;
  diastolic: string;
  knowsCholesterol: YesNo | "";
  ldl: string;
  hdl: string;
  totalCholesterol: string;
  familyHistory: YesNo | "";
  diabetes: YesNoUnknown | "";
  previousCardiacDiagnosis: YesNo | "";
  takesMedication: YesNo | "";
  medicationCategories: string[];
}

interface Medication {
  id: string;
  category: string;
  description: string;
  created_at: string;
}

interface Exam {
  id: string;
  name: string;
  exam_date: string | null;
  notes: string | null;
  file_url: string | null;
  created_at: string;
}

interface ExamRequest {
  id: string;
  status: string;
  created_at: string;
}

interface ProfileNotification {
  id: string;
  title: string;
  text: string;
  tone: string;
}

interface Preferences {
  weekly_checkin: boolean;
  weekly_summary_email: boolean;
  new_mission: boolean;
  achievement_unlocked: boolean;
}

const emptyForm: ProfileForm = {
  name: "",
  age: "",
  sex: "",
  weight: "",
  height: "",
  knowsBloodPressure: "",
  systolic: "",
  diastolic: "",
  knowsCholesterol: "",
  ldl: "",
  hdl: "",
  totalCholesterol: "",
  familyHistory: "",
  diabetes: "",
  previousCardiacDiagnosis: "",
  takesMedication: "",
  medicationCategories: [],
};

const sectionMeta = {
  conta: {
    title: "Conta e acesso",
    icon: ShieldCheck,
    tone: "bg-[#eef3f1] text-[#536b68]",
  },
  planos: {
    title: "Planos",
    icon: CreditCard,
    tone: "bg-[#e8f5ef] text-[#2f6760]",
  },
  "informacoes-pessoais": {
    title: "Informações pessoais",
    icon: UserRound,
    tone: "bg-[#e9f4fb] text-[#2f8fc8]",
  },
  "dados-saude": {
    title: "Dados de saúde",
    icon: HeartPulse,
    tone: "bg-[#e8f5ef] text-[#2f6760]",
  },
  "historico-medico": {
    title: "Histórico médico",
    icon: Stethoscope,
    tone: "bg-[#fff7dc] text-[#9a5b12]",
  },
  medicamentos: {
    title: "Medicamentos",
    icon: Pill,
    tone: "bg-[#f1ecff] text-[#6f55c8]",
  },
  "exames-resultados": {
    title: "Exames e documentos",
    icon: FileText,
    tone: "bg-[#eef3f1] text-[#536b68]",
  },
  "metas-saude": {
    title: "Metas de saúde",
    icon: Target,
    tone: "bg-[#fff7dc] text-[#9a5b12]",
  },
  configuracoes: {
    title: "Configurações",
    icon: Settings,
    tone: "bg-[#eef3f1] text-[#536b68]",
  },
  notificacoes: {
    title: "Lembretes e notificações",
    icon: Bell,
    tone: "bg-[#e9f4fb] text-[#2f8fc8]",
  },
  "privacidade-seguranca": {
    title: "Privacidade e segurança",
    icon: Lock,
    tone: "bg-[#e8f5ef] text-[#2f6760]",
  },
  idioma: {
    title: "Idioma",
    icon: Languages,
    tone: "bg-[#fff7dc] text-[#9a5b12]",
  },
  aparencia: {
    title: "Aparência",
    icon: Moon,
    tone: "bg-[#eef3f1] text-[#536b68]",
  },
  "central-ajuda": {
    title: "Central de ajuda",
    icon: ShieldCheck,
    tone: "bg-[#e9f4fb] text-[#2f8fc8]",
  },
} as const;

type SectionKey = keyof typeof sectionMeta;

function ProfileSectionPage() {
  const { user } = Route.useRouteContext();
  const { section } = Route.useParams();
  const navigate = useNavigate();
  const key = isSectionKey(section) ? section : "informacoes-pessoais";
  const meta = sectionMeta[key];
  const Icon = meta.icon;
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [newMedication, setNewMedication] = useState({ name: "", dose: "", time: "" });
  const [exams, setExams] = useState<Exam[]>([]);
  const [examFile, setExamFile] = useState<File | null>(null);
  const [examForm, setExamForm] = useState({ name: "", date: "", notes: "" });
  const [notifications, setNotifications] = useState<ProfileNotification[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    weekly_checkin: true,
    weekly_summary_email: false,
    new_mission: true,
    achievement_unlocked: true,
  });
  const bmi = useMemo(() => calculateBmi(form.weight, form.height), [form.height, form.weight]);

  useEffect(() => {
    async function load() {
      const raw = window.localStorage.getItem("htcare:onboarding");
      const local = raw ? JSON.parse(raw) : {};
      const { data: profile } = await supabase.from("profiles").select("*").maybeSingle();
      setForm({
        ...emptyForm,
        name:
          profile?.nome ||
          (user.user_metadata?.name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          "",
        age: profile?.idade ? String(profile.idade) : local.age || "",
        sex:
          profile?.sexo === "feminino" || profile?.sexo === "masculino"
            ? profile.sexo
            : local.biologicalSex || "",
        weight: profile?.peso_kg ? String(profile.peso_kg) : local.weight || "",
        height: profile?.altura_cm ? String(profile.altura_cm) : local.height || "",
        knowsBloodPressure: local.knowsBloodPressure || "",
        systolic: local.systolic || "",
        diastolic: local.diastolic || "",
        knowsCholesterol: local.knowsCholesterol || "",
        ldl: local.ldl || "",
        hdl: local.hdl || "",
        totalCholesterol: local.totalCholesterol || "",
        familyHistory:
          profile?.historico_familiar == null
            ? local.familyHistory || ""
            : profile.historico_familiar
              ? "sim"
              : "nao",
        diabetes:
          mapProfileDiabetesStatus(profile?.diabetes_status ?? null) || local.diabetes || "",
        previousCardiacDiagnosis: local.previousCardiacDiagnosis || "",
        takesMedication: local.takesMedication || "",
        medicationCategories: local.medicationCategories || [],
      });

      const { data: meds } = await supabase
        .from("medications")
        .select("id,category,description,created_at")
        .order("created_at", { ascending: false });
      setMedications(meds ?? []);

      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .maybeSingle();
      if (prefs) {
        setPreferences({
          weekly_checkin: prefs.weekly_checkin,
          weekly_summary_email: prefs.weekly_summary_email,
          new_mission: prefs.new_mission,
          achievement_unlocked: prefs.achievement_unlocked,
        });
      }

      const [{ data: examData }, { data: requestData }] = await Promise.all([
        supabase
          .from("exams")
          .select("id,name,exam_date,notes,file_url,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("exam_requests")
          .select("id,status,created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setExams(examData ?? []);
      setNotifications(buildNotifications(local, isExamRequest(requestData) ? requestData : null));
    }

    void load();
  }, [user.user_metadata]);

  function update<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(kind: "personal" | "health" | "medical") {
    if (kind === "personal" && !form.sex) {
      toast.error("Selecione masculino ou feminino antes de salvar.");
      return;
    }
    const raw = window.localStorage.getItem("htcare:onboarding");
    const local = raw ? JSON.parse(raw) : {};
    const nextLocal = {
      ...local,
      age: form.age,
      biologicalSex: form.sex,
      weight: form.weight,
      height: form.height,
      knowsBloodPressure: form.knowsBloodPressure,
      systolic: form.systolic,
      diastolic: form.diastolic,
      knowsCholesterol: form.knowsCholesterol,
      ldl: form.ldl,
      hdl: form.hdl,
      totalCholesterol: form.totalCholesterol,
      familyHistory: form.familyHistory,
      diabetes: form.diabetes,
      previousCardiacDiagnosis: form.previousCardiacDiagnosis,
      takesMedication: form.takesMedication,
      medicationCategories: form.medicationCategories,
    };

    const recalculatedResult = kind !== "personal" ? calculateInitialRiskScore(nextLocal) : null;
    if (recalculatedResult) nextLocal.result = recalculatedResult;

    window.localStorage.setItem("htcare:onboarding", JSON.stringify(nextLocal));

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      nome: form.name,
      idade: toNumberOrNull(form.age),
      sexo: form.sex || null,
      peso_kg: toNumberOrNull(form.weight),
      altura_cm: toNumberOrNull(form.height),
      historico_familiar: form.familyHistory === "sim",
      diabetes_status: mapDiabetesStatus(form.diabetes),
    });

    if (error) {
      toast.error("Não foi possível salvar as alterações.");
      console.error(error);
      return;
    }

    if (recalculatedResult) {
      const previousHistory = JSON.parse(
        window.localStorage.getItem("htcare:score-history") || "[]",
      ) as Array<{ score: number; createdAt: string; source: string }>;
      window.localStorage.setItem(
        "htcare:score-history",
        JSON.stringify([
          ...previousHistory,
          {
            score: recalculatedResult.score,
            createdAt: new Date().toISOString(),
            source: kind === "health" ? "data_update" : "medical_update",
          },
        ]),
      );

      const { error: assessmentError } = await supabase.from("assessments").insert({
        user_id: user.id,
        score: recalculatedResult.score,
        categoria_risco: recalculatedResult.level,
        fatores_que_pesaram: recalculatedResult.factors,
        origem: "checkin",
      });

      if (assessmentError) {
        toast.error("Salvamos seus dados, mas não foi possível atualizar o histórico do score.");
        console.error(assessmentError);
      }
    }

    if (kind === "health") void recordUserActivity(user.id, "data_update");
    toast.success("Alterações salvas");
  }

  async function savePreferences(next: Preferences) {
    setPreferences(next);
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      ...next,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error("Não foi possível salvar preferências.");
      console.error(error);
    }
  }

  async function addMedication() {
    if (!newMedication.name.trim()) return;
    const description = [
      newMedication.name.trim(),
      newMedication.dose.trim() ? `Dose: ${newMedication.dose.trim()}` : "",
      newMedication.time.trim() ? `Horário: ${newMedication.time.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const { data, error } = await supabase
      .from("medications")
      .insert({
        user_id: user.id,
        category: "medicamento",
        description,
      })
      .select("id,category,description,created_at")
      .single();
    if (error) {
      toast.error("Não foi possível adicionar medicamento.");
      console.error(error);
      return;
    }
    setMedications((current) => [data, ...current]);
    setNewMedication({ name: "", dose: "", time: "" });
  }

  async function removeMedication(id: string) {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover medicamento.");
      console.error(error);
      return;
    }
    setMedications((current) => current.filter((item) => item.id !== id));
  }

  async function sendPasswordReset() {
    if (!user.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) toast.error("Não foi possível iniciar alteração de senha.");
    else toast.success("Enviamos um link de alteração de senha para seu e-mail.");
  }

  async function addExam() {
    if (!examForm.name.trim()) {
      toast.error("Informe o nome do exame.");
      return;
    }

    let fileUrl: string | null = null;
    let filePath: string | null = null;
    if (examFile) {
      const safeName = examFile.name.replace(/[^\w.-]+/g, "-");
      filePath = `${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("exams")
        .upload(filePath, examFile, {
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadError) {
        toast.error("Não foi possível enviar o arquivo.");
        console.error(uploadError);
        return;
      }
      fileUrl = supabase.storage.from("exams").getPublicUrl(filePath).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("exams")
      .insert({
        user_id: user.id,
        name: examForm.name.trim(),
        exam_date: examForm.date || null,
        notes: examForm.notes.trim() || null,
        file_url: fileUrl,
        file_path: filePath,
        file_type: examFile?.type ?? null,
      })
      .select("id,name,exam_date,notes,file_url,created_at")
      .single();

    if (error) {
      toast.error("Não foi possível salvar o exame.");
      console.error(error);
      return;
    }
    setExams((current) => [data, ...current]);
    setExamForm({ name: "", date: "", notes: "" });
    setExamFile(null);
    toast.success("Exame enviado.");
  }

  async function requestAccountDeletion() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    toast.success("Solicitação registrada. O suporte vai confirmar a exclusão com segurança.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-10 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ to: "/perfil" })}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#10201f]/8 bg-white shadow-soft"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link to="/">
          <Logo />
        </Link>
      </div>

      <section className="mx-auto mt-5 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft"
        >
          <span className={`grid h-12 w-12 place-items-center rounded-full ${meta.tone}`}>
            <Icon className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-sans text-3xl font-semibold">{meta.title}</h1>
        </motion.div>

        <div className="mt-4 rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft">
          {key === "informacoes-pessoais" && (
            <div className="space-y-4">
              <TextField
                label="Nome"
                value={form.name}
                onChange={(value) => update("name", value)}
              />
              <TextField
                label="Idade"
                type="number"
                value={form.age}
                onChange={(value) => update("age", value)}
              />
              <Choice
                label="Sexo"
                value={form.sex}
                options={[
                  ["feminino", "Feminino"],
                  ["masculino", "Masculino"],
                ]}
                onChange={(value) => update("sex", value as Sex)}
              />
              <SaveButton onClick={() => saveProfile("personal")} />
            </div>
          )}

          {key === "dados-saude" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Peso (kg)"
                  type="number"
                  value={form.weight}
                  onChange={(value) => update("weight", value)}
                />
                <TextField
                  label="Altura (cm)"
                  type="number"
                  value={form.height}
                  onChange={(value) => update("height", value)}
                />
              </div>
              <div className="rounded-2xl bg-[#f7faf9] p-4">
                <p className="text-sm text-[#536b68]">IMC calculado</p>
                <p className="mt-1 font-sans text-3xl font-semibold">
                  {bmi ? bmi.toFixed(1) : "—"}
                </p>
              </div>
              <Choice
                label="Sabe os números da pressão?"
                value={form.knowsBloodPressure}
                options={[
                  ["sim", "Sim"],
                  ["nao", "Não sei"],
                ]}
                onChange={(value) => update("knowsBloodPressure", value as YesNo)}
              />
              {form.knowsBloodPressure === "sim" && (
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Sistólica"
                    type="number"
                    value={form.systolic}
                    onChange={(value) => update("systolic", value)}
                  />
                  <TextField
                    label="Diastólica"
                    type="number"
                    value={form.diastolic}
                    onChange={(value) => update("diastolic", value)}
                  />
                </div>
              )}
              <Choice
                label="Sabe os números do colesterol?"
                value={form.knowsCholesterol}
                options={[
                  ["sim", "Sim"],
                  ["nao", "Não sei"],
                ]}
                onChange={(value) => update("knowsCholesterol", value as YesNo)}
              />
              {form.knowsCholesterol === "sim" && (
                <div className="grid gap-3">
                  <TextField
                    label="LDL"
                    type="number"
                    value={form.ldl}
                    onChange={(value) => update("ldl", value)}
                  />
                  <TextField
                    label="HDL"
                    type="number"
                    value={form.hdl}
                    onChange={(value) => update("hdl", value)}
                  />
                  <TextField
                    label="Colesterol total"
                    type="number"
                    value={form.totalCholesterol}
                    onChange={(value) => update("totalCholesterol", value)}
                  />
                </div>
              )}
              <SaveButton onClick={() => saveProfile("health")} />
            </div>
          )}

          {key === "historico-medico" && (
            <div className="space-y-4">
              <Choice
                label="Histórico familiar antes dos 60 anos?"
                value={form.familyHistory}
                options={[
                  ["sim", "Sim"],
                  ["nao", "Não"],
                ]}
                onChange={(value) => update("familyHistory", value as YesNo)}
              />
              <Choice
                label="Diabetes ou pré-diabetes"
                value={form.diabetes}
                options={[
                  ["sim", "Diabetes"],
                  ["nao", "Não"],
                  ["nao_sei", "Não sei"],
                ]}
                onChange={(value) => update("diabetes", value as YesNoUnknown)}
              />
              <Choice
                label="Evento ou diagnóstico cardíaco anterior?"
                value={form.previousCardiacDiagnosis}
                options={[
                  ["sim", "Sim"],
                  ["nao", "Não"],
                ]}
                onChange={(value) => update("previousCardiacDiagnosis", value as YesNo)}
              />
              <SaveButton onClick={() => saveProfile("medical")} />
            </div>
          )}

          {key === "medicamentos" && (
            <div className="space-y-4">
              {!medications.length && (
                <div className="rounded-2xl bg-[#f7faf9] p-5 text-sm text-[#536b68]">
                  Nenhum medicamento informado.
                </div>
              )}
              {medications.map((medication) => (
                <div
                  key={medication.id}
                  className="flex items-center gap-3 rounded-2xl bg-[#f7faf9] p-4"
                >
                  <Pill className="h-5 w-5 text-[#6f55c8]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{medication.description}</p>
                    <p className="text-sm text-[#78908d]">{medication.category}</p>
                  </div>
                  <button type="button" onClick={() => void removeMedication(medication.id)}>
                    <Trash2 className="h-5 w-5 text-[#9aa8a5]" />
                  </button>
                </div>
              ))}
              <TextField
                label="Nome do medicamento"
                value={newMedication.name}
                onChange={(value) => setNewMedication((current) => ({ ...current, name: value }))}
              />
              <TextField
                label="Dose"
                value={newMedication.dose}
                onChange={(value) => setNewMedication((current) => ({ ...current, dose: value }))}
              />
              <TextField
                label="Horário"
                value={newMedication.time}
                onChange={(value) => setNewMedication((current) => ({ ...current, time: value }))}
              />
              <Button
                className="w-full rounded-full bg-[#10201f]"
                onClick={() => void addMedication()}
              >
                Adicionar medicamento
              </Button>
            </div>
          )}

          {key === "exames-resultados" && (
            <div className="space-y-4">
              {!exams.length && (
                <div className="rounded-2xl bg-[#f7faf9] p-5 text-sm text-[#536b68]">
                  Nenhum exame registrado ainda.
                </div>
              )}
              {exams.map((exam) => (
                <div key={exam.id} className="rounded-2xl bg-[#f7faf9] p-4">
                  <p className="font-semibold">{exam.name}</p>
                  <p className="mt-1 text-sm text-[#78908d]">
                    {exam.exam_date
                      ? new Date(exam.exam_date).toLocaleDateString("pt-BR")
                      : "Sem data informada"}
                  </p>
                  {exam.notes && <p className="mt-2 text-sm text-[#536b68]">{exam.notes}</p>}
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
              ))}
              <div className="rounded-2xl bg-[#f7faf9] p-4">
                <p className="font-semibold">Enviar exame</p>
                <div className="mt-3 grid gap-3">
                  <TextField
                    label="Nome do exame"
                    value={examForm.name}
                    onChange={(name) => setExamForm((current) => ({ ...current, name }))}
                  />
                  <TextField
                    label="Data"
                    type="date"
                    value={examForm.date}
                    onChange={(date) => setExamForm((current) => ({ ...current, date }))}
                  />
                  <TextField
                    label="Observação"
                    value={examForm.notes}
                    onChange={(notes) => setExamForm((current) => ({ ...current, notes }))}
                  />
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#10201f]/16 bg-white px-4 text-sm font-semibold">
                    <FileUp className="h-5 w-5 text-[#2f8fc8]" />
                    {examFile ? examFile.name : "Selecionar PDF ou imagem"}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="sr-only"
                      onChange={(event) => setExamFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
              <Button
                className="min-h-12 w-full rounded-full bg-[#10201f]"
                onClick={() => void addExam()}
              >
                Enviar exame
              </Button>
            </div>
          )}

          {key === "metas-saude" && (
            <div className="space-y-3">
              {hasProtocol(form) ? (
                <>
                  <InfoCard
                    title="Protocolo de 90 dias"
                    text="Três objetivos principais para acompanhar sua evolução cardiovascular."
                  />
                  {buildProtocolGoals(form).map((goal) => (
                    <div key={goal.title} className="rounded-2xl bg-[#f7faf9] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{goal.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[#536b68]">{goal.text}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2f6760]">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#2f8fc8]"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-2xl bg-[#f7faf9] p-5 text-sm leading-6 text-[#536b68]">
                  Complete sua avaliação para receber seu protocolo personalizado.
                </div>
              )}
            </div>
          )}

          {key === "configuracoes" && (
            <div className="space-y-3">
              <ConfigLink
                icon={<Bell className="h-5 w-5" />}
                title="Notificações"
                text="Check-ins, resumo semanal, missões e conquistas."
                section="notificacoes"
              />
              <ConfigLink
                icon={<Lock className="h-5 w-5" />}
                title="Privacidade e segurança"
                text="Senha, proteção da conta e política de privacidade."
                section="privacidade-seguranca"
              />
              <ConfigLink
                icon={<Languages className="h-5 w-5" />}
                title="Idioma"
                text="Português (Brasil) e futuros idiomas."
                section="idioma"
              />
              <ConfigLink
                icon={<Moon className="h-5 w-5" />}
                title="Aparência"
                text="Modo claro hoje; modo escuro em breve."
                section="aparencia"
              />
              <ConfigLink
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Conta e acesso"
                text="E-mail, senha, sessão e exclusão de conta."
                section="conta"
              />
              <ConfigLink
                icon={<CreditCard className="h-5 w-5" />}
                title="Planos"
                text="Veja o plano atual e opções futuras."
                section="planos"
              />
            </div>
          )}

          {key === "conta" && (
            <div className="space-y-3">
              <InfoCard
                title="E-mail da conta"
                text={user.email ?? "E-mail não disponível neste login."}
              />
              <InfoCard
                title="Conta protegida"
                text="Seu acesso é autenticado com Supabase Auth. Nunca compartilhe sua senha."
              />
              <Button
                variant="outline"
                className="min-h-12 w-full rounded-full"
                onClick={() => void sendPasswordReset()}
              >
                Alterar senha
              </Button>
              <Button
                variant="outline"
                className="min-h-12 w-full rounded-full border-[#c14525]/25 text-[#c14525]"
                onClick={() => void requestAccountDeletion()}
              >
                {deleteConfirm ? "Confirmar exclusão da conta" : "Excluir conta"}
              </Button>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-[#f7faf9] p-4 text-left font-semibold text-[#536b68]"
              >
                <LogOut className="h-5 w-5" />
                Sair da conta
              </button>
            </div>
          )}

          {key === "planos" && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-[#f7faf9] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#78908d]">
                  Plano atual
                </p>
                <h2 className="mt-2 font-sans text-2xl font-semibold">Gratuito</h2>
                <p className="mt-2 text-sm leading-6 text-[#536b68]">
                  Inclui avaliação inicial, score cardiovascular e registros básicos.
                </p>
              </div>
              {[
                ["Gratuito", "R$0", "Score inicial e registros básicos."],
                ["Plus", "R$19,90/mês", "Protocolo, relatórios e acompanhamento completo."],
                ["Família", "R$34,90/mês", "Até 4 perfis acompanhando juntos."],
              ].map(([name, price, detail]) => (
                <div key={name} className="rounded-2xl border border-[#10201f]/8 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="mt-1 text-sm leading-6 text-[#536b68]">{detail}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-[#10201f]">{price}</p>
                  </div>
                </div>
              ))}
              <Button className="min-h-12 w-full rounded-full bg-[#10201f]" asChild>
                <Link to="/planos">Ver planos</Link>
              </Button>
            </div>
          )}

          {key === "notificacoes" && (
            <div className="space-y-3">
              <PreferenceRow
                label="Lembrete semanal de check-in"
                checked={preferences.weekly_checkin}
                onChange={(checked) =>
                  void savePreferences({
                    ...preferences,
                    weekly_checkin: checked,
                  })
                }
              />
              <PreferenceRow
                label="E-mail semanal de resumo"
                checked={preferences.weekly_summary_email}
                onChange={(checked) =>
                  void savePreferences({
                    ...preferences,
                    weekly_summary_email: checked,
                  })
                }
              />
              <PreferenceRow
                label="Nova missão disponível"
                checked={preferences.new_mission}
                onChange={(checked) =>
                  void savePreferences({
                    ...preferences,
                    new_mission: checked,
                  })
                }
              />
              <PreferenceRow
                label="Conquista desbloqueada"
                checked={preferences.achievement_unlocked}
                onChange={(checked) =>
                  void savePreferences({
                    ...preferences,
                    achievement_unlocked: checked,
                  })
                }
              />
              <div className="pt-2">
                <p className="mb-2 text-sm font-semibold text-[#536b68]">Recentes</p>
              </div>
              {notifications.length ? (
                notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl bg-[#f7faf9] p-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${notification.tone}`}
                    >
                      Novo
                    </span>
                    <p className="mt-3 font-semibold">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#536b68]">{notification.text}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-[#f7faf9] p-5 text-sm text-[#536b68]">
                  Nenhuma notificação por enquanto.
                </div>
              )}
            </div>
          )}

          {key === "privacidade-seguranca" && (
            <div className="space-y-3">
              <InfoCard
                title="Conta protegida"
                text="Sua autenticação é protegida pelo Supabase Auth."
              />
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => void sendPasswordReset()}
              >
                Alterar senha por e-mail
              </Button>
              <InfoCard
                title="Exclusão de conta"
                text="Esta ação é permanente. Nesta fase, fale com o suporte para concluir a exclusão com segurança."
              />
              <a
                href="/privacidade"
                className="block rounded-2xl bg-[#f7faf9] p-4 font-semibold text-[#2f8fc8]"
              >
                Política de privacidade
              </a>
            </div>
          )}

          {key === "idioma" && (
            <InfoCard title="Português (Brasil)" text="Outros idiomas em breve." />
          )}
          {key === "aparencia" && <InfoCard title="Modo claro" text="Modo escuro em breve." />}

          {key === "central-ajuda" && (
            <div className="space-y-3">
              <Faq
                question="O que é o score de risco?"
                answer="É uma estimativa simplificada baseada nas informações que você informou no app."
              />
              <Faq
                question="Como funciona o exame?"
                answer="Você solicita pelo app, o médico parceiro revisa remotamente e libera a requisição digital para o laboratório."
              />
              <Faq
                question="Meus dados estão seguros?"
                answer="A conta usa Supabase Auth e os dados são vinculados ao seu usuário."
              />
              <a
                href="mailto:suporte@htcare.com.br"
                className="block rounded-full bg-[#10201f] px-5 py-3 text-center font-semibold text-white"
              >
                suporte@htcare.com.br
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function TextField({
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

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#536b68]">{label}</p>
      <div className="grid gap-2">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
              value === optionValue
                ? "border-[#10201f] bg-[#10201f] text-white"
                : "border-[#10201f]/10 bg-white text-[#10201f]"
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="w-full rounded-full bg-[#10201f]" onClick={() => void onClick()}>
      <Save className="h-4 w-4" />
      Salvar alterações
    </Button>
  );
}

function PreferenceRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7faf9] p-4">
      <p className="font-semibold">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ConfigLink({
  icon,
  title,
  text,
  section,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  section: SectionKey;
}) {
  return (
    <Link
      to="/perfil/$section"
      params={{ section }}
      className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#f7faf9] p-4"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#2f8fc8]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-[#536b68]">{text}</span>
      </span>
    </Link>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[#f7faf9] p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#536b68]">{text}</p>
    </div>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-2xl bg-[#f7faf9] p-4">
      <p className="font-semibold">{question}</p>
      <p className="mt-1 text-sm leading-6 text-[#536b68]">{answer}</p>
    </div>
  );
}

function buildNotifications(local: Record<string, unknown>, examRequest: ExamRequest | null) {
  const notifications: ProfileNotification[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const dailyCheckinDone =
    typeof window !== "undefined" &&
    window.localStorage.getItem("htcare:daily-checkin-date") === today;

  if (!dailyCheckinDone) {
    notifications.push({
      id: "checkin-pendente",
      title: "Check-in pendente",
      text: "Registre pressão, peso, sono ou glicemia para manter seu histórico atualizado.",
      tone: "bg-[#fff7dc] text-[#9a5b12]",
    });
  }

  if (examRequest?.status === "concluido") {
    notifications.push({
      id: "resultado-disponivel",
      title: "Resultado de exame disponível",
      text: "Sua interpretação já foi liberada pelo médico parceiro.",
      tone: "bg-[#e8f5ef] text-[#2f6760]",
    });
  }

  if (examRequest?.status === "autorizado") {
    notifications.push({
      id: "requisicao-pronta",
      title: "Requisição pronta",
      text: "Baixe sua requisição e leve ao laboratório parceiro.",
      tone: "bg-[#e9f4fb] text-[#2f8fc8]",
    });
  }

  const missions = getWeeklyMissions(getLocalFactors(local));
  const stats = getChallengeStats(missions);
  if (stats.pendingThisWeek > 0) {
    notifications.push({
      id: "missao-nova",
      title: "Missão nova disponível",
      text: `${stats.pendingThisWeek} ação${stats.pendingThisWeek > 1 ? "ões" : ""} desta semana ainda aguardando conclusão.`,
      tone: "bg-[#e9f4fb] text-[#2f8fc8]",
    });
  }

  const milestone = stats.points >= 100 ? Math.floor(stats.points / 100) * 100 : 0;
  if (milestone > 0) {
    notifications.push({
      id: `conquista-${milestone}`,
      title: "Conquista desbloqueada",
      text: `Você alcançou ${milestone} Pontos do Coração.`,
      tone: "bg-[#e8f5ef] text-[#2f6760]",
    });
  }

  return notifications.slice(0, 5);
}

function getLocalFactors(local: Record<string, unknown>) {
  const result = local.result;
  if (!result || typeof result !== "object") return [];
  const factors = (result as { factors?: unknown }).factors;
  return Array.isArray(factors)
    ? factors.filter((item): item is string => typeof item === "string")
    : [];
}

function isExamRequest(data: unknown): data is ExamRequest {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamRequest>;
  return typeof record.id === "string" && typeof record.status === "string";
}

function hasProtocol(form: ProfileForm) {
  return Boolean(form.age && form.weight && form.height);
}

function buildProtocolGoals(form: ProfileForm) {
  const hasHighPressure = Number(form.systolic) >= 130 || Number(form.diastolic) >= 85;
  const bmi = calculateBmi(form.weight, form.height);
  const goals = [
    hasHighPressure
      ? {
          title: "Registrar pressão 3x por semana",
          text: "Acompanhe tendência real para discutir com seu médico.",
          progress: 33,
        }
      : {
          title: "Manter pressão acompanhada",
          text: "Registre ao menos uma medida por semana para criar histórico.",
          progress: 25,
        },
    bmi && bmi >= 25
      ? {
          title: "Reduzir risco metabólico",
          text: "Priorize caminhada após refeições e evolução gradual do peso.",
          progress: 20,
        }
      : {
          title: "Preservar bons indicadores",
          text: "Mantenha rotina de sono, movimento e alimentação consistente.",
          progress: 45,
        },
    {
      title: "Revisar score em 90 dias",
      text: "Atualize dados ou envie exame para comparar sua evolução.",
      progress: 10,
    },
  ];
  return goals;
}

function isSectionKey(value: string): value is SectionKey {
  return value in sectionMeta;
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

function mapDiabetesStatus(value: YesNoUnknown | "") {
  if (value === "sim") return "diabetes";
  if (value === "nao") return "nao";
  return "nao_sei";
}

function mapProfileDiabetesStatus(
  value: "nao" | "pre_diabetes" | "diabetes" | "nao_sei" | null,
): YesNoUnknown | "" {
  if (value === "diabetes" || value === "pre_diabetes") return "sim";
  if (value === "nao") return "nao";
  if (value === "nao_sei") return "nao_sei";
  return "";
}
