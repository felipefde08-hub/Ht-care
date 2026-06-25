import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bell,
  Check,
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
  const [newMedication, setNewMedication] = useState({ category: "outro", description: "" });
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
    }

    void load();
  }, [user.user_metadata]);

  function update<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(kind: "personal" | "health" | "medical") {
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
    if (!newMedication.description.trim()) return;
    const { data, error } = await supabase
      .from("medications")
      .insert({
        user_id: user.id,
        category: newMedication.category,
        description: newMedication.description.trim(),
      })
      .select("id,category,description,created_at")
      .single();
    if (error) {
      toast.error("Não foi possível adicionar medicamento.");
      console.error(error);
      return;
    }
    setMedications((current) => [data, ...current]);
    setNewMedication({ category: "outro", description: "" });
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
                  Nenhum uso informado.
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
              <Choice
                label="Categoria"
                value={newMedication.category}
                options={[
                  ["pressão", "Pressão"],
                  ["diabetes", "Diabetes"],
                  ["colesterol", "Colesterol"],
                  ["outro", "Outro"],
                ]}
                onChange={(value) =>
                  setNewMedication((current) => ({ ...current, category: value }))
                }
              />
              <TextField
                label="Medicamento ou observação"
                value={newMedication.description}
                onChange={(value) =>
                  setNewMedication((current) => ({ ...current, description: value }))
                }
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
            <div className="space-y-3">
              <div className="rounded-2xl bg-[#f7faf9] p-5">
                <div className="flex items-start gap-3">
                  <FlaskConical className="mt-1 h-5 w-5 text-[#2f8fc8]" />
                  <div>
                    <p className="font-semibold">Envie ou consulte seus exames</p>
                    <p className="mt-1 text-sm leading-6 text-[#536b68]">
                      Guarde PDFs, imagens e observações. Quando houver laboratório parceiro, os
                      resultados também aparecerão aqui.
                    </p>
                  </div>
                </div>
              </div>
              <Button className="min-h-12 w-full rounded-full bg-[#10201f]" asChild>
                <Link to="/exames">
                  <FileUp className="h-4 w-4" />
                  Abrir upload e lista de exames
                </Link>
              </Button>
              <Button variant="outline" className="min-h-12 w-full rounded-full" asChild>
                <Link to="/meu-risco">Solicitar exame de sangue</Link>
              </Button>
            </div>
          )}

          {key === "metas-saude" && (
            <div className="space-y-3">
              <InfoCard
                title="Protocolo de 90 dias"
                text="Suas metas principais são definidas a partir dos biomarcadores e do score mais recente."
              />
              <div className="grid gap-3">
                {[
                  ["Caminhar 30 min após o almoço", "Ajuda resistência à insulina e pressão."],
                  [
                    "Registrar pressão 3x por semana",
                    "Mostra tendência real, não uma foto isolada.",
                  ],
                  [
                    "Repetir exame no prazo recomendado",
                    "Confirma se o plano está mudando seus biomarcadores.",
                  ],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl bg-[#f7faf9] p-4">
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#536b68]">{text}</p>
                  </div>
                ))}
              </div>
              <Button className="min-h-12 w-full rounded-full bg-[#10201f]" asChild>
                <Link to="/protocolo-90-dias/$id" params={{ id: "demo" }}>
                  Ver protocolo de 90 dias
                </Link>
              </Button>
            </div>
          )}

          {key === "configuracoes" && (
            <div className="space-y-3">
              <ConfigLink
                icon={<Bell className="h-5 w-5" />}
                title="Notificações"
                text="Lembretes, resumo semanal e novas missões."
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
                text="Português Brasil."
                section="idioma"
              />
              <ConfigLink
                icon={<Moon className="h-5 w-5" />}
                title="Aparência"
                text="Modo claro por enquanto."
                section="aparencia"
              />
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

          {key === "notificacoes" && (
            <div className="space-y-3">
              <PreferenceRow
                label="Lembrete semanal de check-in"
                checked={preferences.weekly_checkin}
                onChange={(checked) =>
                  void savePreferences({ ...preferences, weekly_checkin: checked })
                }
              />
              <PreferenceRow
                label="E-mail semanal de resumo"
                checked={preferences.weekly_summary_email}
                onChange={(checked) =>
                  void savePreferences({ ...preferences, weekly_summary_email: checked })
                }
              />
              <PreferenceRow
                label="Nova missão disponível"
                checked={preferences.new_mission}
                onChange={(checked) =>
                  void savePreferences({ ...preferences, new_mission: checked })
                }
              />
              <PreferenceRow
                label="Conquista desbloqueada"
                checked={preferences.achievement_unlocked}
                onChange={(checked) =>
                  void savePreferences({ ...preferences, achievement_unlocked: checked })
                }
              />
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
                question="Como funcionam as missões?"
                answer="São pequenas ações semanais para ajudar você a cuidar melhor do coração."
              />
              <Faq
                question="Meus dados estão seguros?"
                answer="A conta usa Supabase Auth e os dados são vinculados ao seu usuário."
              />
              <a
                href="mailto:suporte@htcare.com.br"
                className="block rounded-full bg-[#10201f] px-5 py-3 text-center font-semibold text-white"
              >
                Falar com suporte
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
