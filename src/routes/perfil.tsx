import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Bell,
  Camera,
  ChevronRight,
  FileText,
  Globe2,
  HeartPulse,
  Languages,
  Lock,
  LogOut,
  Moon,
  Pill,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { challengeMilestones, getChallengeStats, getWeeklyMissions } from "@/lib/challenge";
import { getActiveDaysThisMonth, recordUserActivity } from "@/lib/user-activity";

export const Route = createFileRoute("/perfil")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Perfil e configurações — HTCare" }] }),
  component: ProfilePage,
});

type YesNo = "sim" | "nao";
type YesNoUnknown = "sim" | "nao" | "nao_sei";

interface OnboardingData {
  age: string;
  biologicalSex: "feminino" | "masculino" | "";
  smokes: YesNo | "";
  diabetes: YesNoUnknown | "";
  knowsBloodPressure: YesNo | "";
  systolic: string;
  diastolic: string;
  knowsCholesterol: YesNo | "";
  ldl: string;
  hdl: string;
  totalCholesterol: string;
  familyHistory: YesNo | "";
  weight: string;
  height: string;
  activityLevel: "sedentario" | "leve" | "moderado" | "intenso" | "";
  previousCardiacDiagnosis: YesNo | "";
  frequentSymptoms: string[];
  stressLevel: "baixo" | "moderado" | "alto" | "";
  sleepHours: "menos_5" | "5_6" | "7_8" | "mais_8" | "";
  alcoholUse: "nao_bebo" | "socialmente" | "algumas_vezes_semana" | "diariamente" | "";
  waistCircumference: string;
  highCholesterolDiagnosis: YesNoUnknown | "";
  sleepApnea: YesNoUnknown | "";
  pregnancyHypertensionOrDiabetes: "sim" | "nao" | "nao_se_aplica" | "";
  takesMedication: YesNo | "";
  medicationCategories: string[];
  mainReason: string[];
  bmi?: number | null;
  result?: {
    score: number;
    label: string;
    factors: string[];
  };
}

interface ReminderSettings {
  weeklyEmail: boolean;
}

const initialData: OnboardingData = {
  age: "",
  biologicalSex: "",
  smokes: "",
  diabetes: "",
  knowsBloodPressure: "",
  systolic: "",
  diastolic: "",
  knowsCholesterol: "",
  ldl: "",
  hdl: "",
  totalCholesterol: "",
  familyHistory: "",
  weight: "",
  height: "",
  activityLevel: "",
  previousCardiacDiagnosis: "",
  frequentSymptoms: [],
  stressLevel: "",
  sleepHours: "",
  alcoholUse: "",
  waistCircumference: "",
  highCholesterolDiagnosis: "",
  sleepApnea: "",
  pregnancyHypertensionOrDiabetes: "",
  takesMedication: "",
  medicationCategories: [],
  mainReason: [],
  bmi: null,
};

const symptomOptions = [
  "falta de ar ao fazer esforço leve",
  "dor ou aperto no peito",
  "palpitação/coração acelerado sem motivo",
  "inchaço nas pernas/tornozelos",
  "nenhum desses",
];

const medicationCategories = ["pressão", "colesterol", "diabetes"];

const reasons = [
  "tenho diabetes/pré-diabetes",
  "tenho medo por histórico familiar",
  "só quero acompanhar minha saúde",
  "meu médico recomendou",
  "já tive algum evento cardíaco e quero acompanhar",
];

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData>(initialData);
  const [reminders, setReminders] = useState<ReminderSettings>({ weeklyEmail: false });
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [activeDaysThisMonth, setActiveDaysThisMonth] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const bmi = useMemo(() => calculateBmi(data.weight, data.height), [data.height, data.weight]);
  const weeklyMissions = useMemo(
    () => getWeeklyMissions(data.result?.factors ?? []),
    [data.result],
  );
  const challengeStats = getChallengeStats(weeklyMissions);
  const achievements = challengeMilestones.filter(
    (milestone) => challengeStats.points >= milestone.points,
  ).length;
  const healthIndex = latestScore ?? data.result?.score ?? null;
  const profileLevel = getProfileLevel(challengeStats.points);
  const firstName = getFirstName(
    (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email,
  );
  const fullName =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    data.result?.label ??
    user.email ??
    "HT";
  const initials = getInitials(fullName);

  useEffect(() => {
    async function loadData() {
      const rawOnboarding = window.localStorage.getItem("htcare:onboarding");
      const rawReminders = window.localStorage.getItem("htcare:reminders");
      if (rawOnboarding) {
        const parsed = { ...initialData, ...(JSON.parse(rawOnboarding) as OnboardingData) };
        setData(parsed);
        setLatestScore(parsed.result?.score ?? null);
      }
      if (rawReminders) {
        setReminders(JSON.parse(rawReminders) as ReminderSettings);
      }

      await recordUserActivity(user.id, "app_open");
      setActiveDaysThisMonth(await getActiveDaysThisMonth(user.id));

      const [{ data: profile, error }, { data: assessment, error: assessmentError }] =
        await Promise.all([
          supabase.from("profiles").select("*").maybeSingle(),
          supabase
            .from("assessments")
            .select("score,categoria_risco,fatores_que_pesaram")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
      if (error) console.error(error);
      if (assessmentError) console.error(assessmentError);

      if (assessment) {
        setLatestScore(Number(assessment.score));
        setData((current) => ({
          ...current,
          result: {
            score: Number(assessment.score),
            label: riskLabel(assessment.categoria_risco),
            factors: assessment.fatores_que_pesaram ?? [],
          },
        }));
      }
      if (!profile) return;
      setAvatarUrl(profile.avatar_url);

      setData((current) => ({
        ...current,
        age: profile.idade ? String(profile.idade) : current.age,
        biologicalSex:
          profile.sexo === "feminino" || profile.sexo === "masculino"
            ? profile.sexo
            : current.biologicalSex,
        smokes: profile.fumante == null ? current.smokes : profile.fumante ? "sim" : "nao",
        diabetes: mapProfileDiabetesStatus(profile.diabetes_status),
        familyHistory:
          profile.historico_familiar == null
            ? current.familyHistory
            : profile.historico_familiar
              ? "sim"
              : "nao",
        weight: profile.peso_kg ? String(profile.peso_kg) : current.weight,
        height: profile.altura_cm ? String(profile.altura_cm) : current.height,
        activityLevel: profile.nivel_atividade ?? current.activityLevel,
        mainReason: profile.motivo_principal ?? current.mainReason,
      }));
    }

    void loadData();
  }, [user.id]);

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleArrayItem(
    key: "frequentSymptoms" | "medicationCategories" | "mainReason",
    value: string,
  ) {
    setData((current) => {
      const values = current[key];
      const next =
        key === "frequentSymptoms" && value === "nenhum desses"
          ? values.includes(value)
            ? []
            : [value]
          : values.includes(value)
            ? values.filter((item) => item !== value)
            : [...values.filter((item) => item !== "nenhum desses"), value];
      return { ...current, [key]: next };
    });
  }

  async function save() {
    window.localStorage.setItem("htcare:onboarding", JSON.stringify({ ...data, bmi }));
    window.localStorage.setItem("htcare:reminders", JSON.stringify(reminders));
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (user) {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        nome:
          (user.user_metadata?.name as string | undefined) ??
          (user.user_metadata?.full_name as string | undefined) ??
          "",
        idade: toNumberOrNull(data.age),
        sexo: data.biologicalSex || null,
        fumante: data.smokes === "sim",
        diabetes_status: mapDiabetesStatus(data.diabetes),
        historico_familiar: data.familyHistory === "sim",
        peso_kg: toNumberOrNull(data.weight),
        altura_cm: toNumberOrNull(data.height),
        nivel_atividade: data.activityLevel || null,
        motivo_principal: data.mainReason,
      });
      if (error) {
        toast.error("Não foi possível salvar o perfil no Supabase.");
        console.error(error);
        return;
      }
    }
    if (user) void recordUserActivity(user.id, "data_update");
    toast.success("Perfil atualizado");
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    const extension = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (uploadError) {
      toast.error("Não foi possível enviar a foto.");
      console.error(uploadError);
      setUploadingAvatar(false);
      return;
    }
    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    const nextUrl = publicUrl.publicUrl;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: nextUrl })
      .eq("id", user.id);
    if (error) {
      toast.error("Foto enviada, mas não foi possível atualizar o perfil.");
      console.error(error);
    } else {
      setAvatarUrl(nextUrl);
      toast.success("Foto de perfil atualizada");
    }
    setUploadingAvatar(false);
  }

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            to="/perfil/$section"
            params={{ section: "notificacoes" }}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-[#10201f]/8 bg-white text-[#10201f] shadow-soft"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {challengeStats.pendingThisWeek > 0 && (
              <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff9f43] px-1 text-[0.62rem] font-bold leading-none text-white">
                {challengeStats.pendingThisWeek}
              </span>
            )}
          </Link>
          <Link
            to="/perfil/$section"
            params={{ section: "privacidade-seguranca" }}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#10201f]/8 bg-white text-[#10201f] shadow-soft"
            aria-label="Configurações"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
        <nav className="hidden items-center gap-2 sm:flex">
          <Button variant="ghost" asChild>
            <Link to="/perfil/$section" params={{ section: "notificacoes" }}>
              Notificações
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/historico">Histórico</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/painel">Voltar ao painel</Link>
          </Button>
        </nav>
      </div>

      <section className="mx-auto mt-4 max-w-md sm:hidden">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="rounded-[1.7rem] border border-[#10201f]/8 bg-white p-4 shadow-[0_24px_90px_-66px_rgba(16,32,31,0.62)]"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-[1.25rem] object-cover shadow-inner"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-[linear-gradient(135deg,#e8f5ef,#dceeff)] font-sans text-xl font-semibold text-[#10201f] shadow-inner">
                  {initials}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-4 border-white bg-[#10201f] text-white shadow-soft">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="sr-only"
                  disabled={uploadingAvatar}
                  onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)}
                />
                <Camera className="h-3.5 w-3.5" />
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="min-w-0 truncate font-sans text-xl font-semibold leading-tight">
                  Olá, {firstName}!
                </p>
                <span className="rounded-full bg-[#e8f5ef] px-3 py-1 text-xs font-bold text-[#2f6760]">
                  Nível {profileLevel.level}
                </span>
                <Link to="/planos" className="text-xs font-bold text-[#2f8fc8]">
                  Plano Gratuito
                </Link>
              </div>
              <p className="mt-1 text-xs leading-4 text-[#536b68]">🏆 {profileLevel.title}</p>
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#10201f]">
                <span className="rounded-full bg-[#e9f4fb] px-2.5 py-1 text-[#2f8fc8]">
                  {healthIndex == null ? "—" : `${Math.round(healthIndex)}%`} ·{" "}
                  {scoreQualityLabel(healthIndex)}
                </span>
                <span className="rounded-full bg-[#fff7dc] px-2.5 py-1">
                  🔥 {challengeStats.streakWeeks}
                </span>
                <span className="rounded-full bg-[#f1ecff] px-2.5 py-1 text-[#6f55c8]">
                  {profileLevel.currentXp}/1000 XP
                </span>
                <span className="rounded-full bg-[#e8f5ef] px-2.5 py-1 text-[#2f6760]">
                  🏅 {achievements}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#eef3f1]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${profileLevel.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-[linear-gradient(90deg,#2f8fc8,#49c7ae,#ffd36a)]"
            />
          </div>
        </motion.div>

        <MobileProfileCard title="Meus dados" className="mt-3">
          <div className="grid grid-cols-2 gap-2.5">
            <MobileGridCard
              icon={<UserRound className="h-5 w-5" />}
              title="Informações pessoais"
              detail={formatPersonalSummary(data)}
              tone="bg-[#e9f4fb] text-[#2f8fc8]"
              to="/perfil/$section"
              params={{ section: "informacoes-pessoais" }}
            />
            <MobileGridCard
              icon={<HeartPulse className="h-5 w-5" />}
              title="Dados de saúde"
              detail={formatHealthSummary(data)}
              tone="bg-[#e8f5ef] text-[#2f6760]"
              to="/perfil/$section"
              params={{ section: "dados-saude" }}
            />
            <MobileGridCard
              icon={<Stethoscope className="h-5 w-5" />}
              title="Histórico médico"
              detail={formatMedicalSummary(data)}
              tone="bg-[#fff7dc] text-[#9a5b12]"
              to="/perfil/$section"
              params={{ section: "historico-medico" }}
            />
            <MobileGridCard
              icon={<Pill className="h-5 w-5" />}
              title="Medicamentos"
              detail={formatMedicationSummary(data)}
              tone="bg-[#f1ecff] text-[#6f55c8]"
              to="/perfil/$section"
              params={{ section: "medicamentos" }}
            />
            <MobileGridCard
              icon={<FileText className="h-5 w-5" />}
              title="Exames"
              detail="Em breve: laboratórios parceiros."
              tone="bg-[#eef3f1] text-[#536b68]"
              to="/perfil/$section"
              params={{ section: "exames-resultados" }}
              className="col-span-2"
            />
          </div>
        </MobileProfileCard>

        <MobileProfileCard title="Preferências" className="mt-3">
          <div className="divide-y divide-[#10201f]/6 rounded-[1.25rem] bg-[#f7faf9] px-2">
            <CompactPreferenceItem
              icon={<Bell className="h-5 w-5" />}
              title="Lembretes"
              detail={reminders.weeklyEmail ? "E-mail semanal ativo" : "E-mail semanal inativo"}
              tone="bg-[#e9f4fb] text-[#2f8fc8]"
              to="/perfil/$section"
              params={{ section: "notificacoes" }}
            />
            <CompactPreferenceItem
              icon={<Lock className="h-5 w-5" />}
              title="Privacidade"
              detail="Conta protegida pelo Supabase Auth"
              tone="bg-[#e8f5ef] text-[#2f6760]"
              to="/perfil/$section"
              params={{ section: "privacidade-seguranca" }}
            />
            <CompactPreferenceItem
              icon={<Languages className="h-5 w-5" />}
              title="Idioma"
              detail="Português"
              tone="bg-[#fff7dc] text-[#9a5b12]"
              to="/perfil/$section"
              params={{ section: "idioma" }}
            />
            <CompactPreferenceItem
              icon={<Moon className="h-5 w-5" />}
              title="Aparência"
              detail="Claro"
              tone="bg-[#eef3f1] text-[#536b68]"
              to="/perfil/$section"
              params={{ section: "aparencia" }}
            />
          </div>
        </MobileProfileCard>

        <MobileProfileCard title="Suporte" className="mt-3">
          <CompactPreferenceItem
            icon={<Globe2 className="h-5 w-5" />}
            title="Central de ajuda"
            detail="Dúvidas, privacidade e próximos passos"
            tone="bg-[#e9f4fb] text-[#2f8fc8]"
            to="/perfil/$section"
            params={{ section: "central-ajuda" }}
          />
        </MobileProfileCard>

        <button
          type="button"
          onClick={logout}
          className="mx-auto mt-4 flex min-h-10 w-full max-w-[220px] items-center justify-center gap-2 rounded-full border border-[#10201f]/10 bg-white text-sm font-semibold text-[#536b68] shadow-soft"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </section>

      <section className="mx-auto mt-14 hidden max-w-6xl sm:block">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]"
        >
          Perfil e configurações
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <h1 className="max-w-4xl font-sans text-5xl font-semibold leading-tight sm:text-7xl">
              Seus dados de acompanhamento.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#536b68]">
              Edite as respostas do questionário inicial, configure lembretes e gerencie sua sessão.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="rounded-full bg-[#10201f] px-6 font-semibold" onClick={save}>
              <Save className="h-4 w-4" /> Salvar alterações
            </Button>
            <Button variant="outline" className="rounded-full px-6" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <DesktopProfileItem
            icon={<UserRound className="h-5 w-5" />}
            title="Informações pessoais"
            detail="Nome, idade e sexo"
            tone="bg-[#e9f4fb] text-[#2f8fc8]"
            section="informacoes-pessoais"
          />
          <DesktopProfileItem
            icon={<HeartPulse className="h-5 w-5" />}
            title="Dados de saúde"
            detail="Peso, altura, pressão e colesterol"
            tone="bg-[#e8f5ef] text-[#2f6760]"
            section="dados-saude"
          />
          <DesktopProfileItem
            icon={<Stethoscope className="h-5 w-5" />}
            title="Histórico médico"
            detail="Histórico familiar e diagnósticos"
            tone="bg-[#fff7dc] text-[#9a5b12]"
            section="historico-medico"
          />
          <DesktopProfileItem
            icon={<Pill className="h-5 w-5" />}
            title="Medicamentos"
            detail="Adicionar ou remover usos"
            tone="bg-[#f1ecff] text-[#6f55c8]"
            section="medicamentos"
          />
          <DesktopProfileItem
            icon={<FileText className="h-5 w-5" />}
            title="Exames"
            detail="Resultados futuros"
            tone="bg-[#eef3f1] text-[#536b68]"
            section="exames-resultados"
          />
          <DesktopProfileItem
            icon={<Bell className="h-5 w-5" />}
            title="Notificações"
            detail="Lembretes e e-mails"
            tone="bg-[#e9f4fb] text-[#2f8fc8]"
            section="notificacoes"
          />
          <DesktopProfileItem
            icon={<Lock className="h-5 w-5" />}
            title="Privacidade"
            detail="Senha, segurança e conta"
            tone="bg-[#e8f5ef] text-[#2f6760]"
            section="privacidade-seguranca"
          />
          <DesktopProfileItem
            icon={<Languages className="h-5 w-5" />}
            title="Idioma"
            detail="Português Brasil"
            tone="bg-[#fff7dc] text-[#9a5b12]"
            section="idioma"
          />
          <DesktopProfileItem
            icon={<Moon className="h-5 w-5" />}
            title="Aparência"
            detail="Modo claro"
            tone="bg-[#eef3f1] text-[#536b68]"
            section="aparencia"
          />
          <DesktopProfileItem
            icon={<Globe2 className="h-5 w-5" />}
            title="Central de ajuda"
            detail="FAQ e suporte"
            tone="bg-[#e9f4fb] text-[#2f8fc8]"
            section="central-ajuda"
          />
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Section title="Dados básicos">
              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField
                  label="Idade"
                  value={data.age}
                  onChange={(value) => update("age", value)}
                />
                <NumberField
                  label="Peso (kg)"
                  value={data.weight}
                  onChange={(value) => update("weight", value)}
                />
                <NumberField
                  label="Altura (cm)"
                  value={data.height}
                  onChange={(value) => update("height", value)}
                />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ChoiceGroup
                  label="Sexo biológico"
                  value={data.biologicalSex}
                  options={[
                    ["feminino", "Feminino"],
                    ["masculino", "Masculino"],
                  ]}
                  onChange={(value) =>
                    update("biologicalSex", value as OnboardingData["biologicalSex"])
                  }
                />
                <div className="rounded-2xl bg-[#f4f8f6] p-5">
                  <p className="text-sm font-medium text-[#536b68]">IMC calculado</p>
                  <p className="mt-2 font-sans text-4xl font-semibold">
                    {bmi == null ? "—" : bmi.toFixed(1)}
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Marcadores de risco">
              <div className="grid gap-5 sm:grid-cols-2">
                <ChoiceGroup
                  label="Você fuma?"
                  value={data.smokes}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                  ]}
                  onChange={(value) => update("smokes", value as YesNo)}
                />
                <ChoiceGroup
                  label="Diabetes ou pré-diabetes diagnosticada?"
                  value={data.diabetes}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                    ["nao_sei", "Não sei"],
                  ]}
                  onChange={(value) => update("diabetes", value as YesNoUnknown)}
                />
                <ChoiceGroup
                  label="Histórico familiar antes dos 60 anos?"
                  value={data.familyHistory}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                  ]}
                  onChange={(value) => update("familyHistory", value as YesNo)}
                />
                <ChoiceGroup
                  label="Diagnóstico cardíaco anterior?"
                  value={data.previousCardiacDiagnosis}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                  ]}
                  onChange={(value) => update("previousCardiacDiagnosis", value as YesNo)}
                />
              </div>
            </Section>

            <Section title="Pressão, colesterol e metabolismo">
              <div className="grid gap-5 sm:grid-cols-2">
                <ChoiceGroup
                  label="Sabe os números da pressão?"
                  value={data.knowsBloodPressure}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não sei"],
                  ]}
                  onChange={(value) => update("knowsBloodPressure", value as YesNo)}
                />
                <ChoiceGroup
                  label="Sabe os números do colesterol?"
                  value={data.knowsCholesterol}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não sei"],
                  ]}
                  onChange={(value) => update("knowsCholesterol", value as YesNo)}
                />
              </div>
              {data.knowsBloodPressure === "sim" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Sistólica"
                    value={data.systolic}
                    onChange={(value) => update("systolic", value)}
                  />
                  <NumberField
                    label="Diastólica"
                    value={data.diastolic}
                    onChange={(value) => update("diastolic", value)}
                  />
                </div>
              )}
              {data.knowsCholesterol === "sim" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <NumberField
                    label="LDL"
                    value={data.ldl}
                    onChange={(value) => update("ldl", value)}
                  />
                  <NumberField
                    label="HDL"
                    value={data.hdl}
                    onChange={(value) => update("hdl", value)}
                  />
                  <NumberField
                    label="Colesterol total"
                    value={data.totalCholesterol}
                    onChange={(value) => update("totalCholesterol", value)}
                  />
                </div>
              )}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <NumberField
                  label="Circunferência da cintura (cm)"
                  value={data.waistCircumference}
                  onChange={(value) => update("waistCircumference", value)}
                />
                <ChoiceGroup
                  label="Colesterol ou triglicerídeos altos?"
                  value={data.highCholesterolDiagnosis}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                    ["nao_sei", "Não sei"],
                  ]}
                  onChange={(value) => update("highCholesterolDiagnosis", value as YesNoUnknown)}
                />
              </div>
            </Section>

            <Section title="Hábitos e contexto">
              <div className="grid gap-5 sm:grid-cols-2">
                <ChoiceGroup
                  label="Atividade física"
                  value={data.activityLevel}
                  options={[
                    ["sedentario", "Sedentário"],
                    ["leve", "Leve"],
                    ["moderado", "Moderado"],
                    ["intenso", "Intenso"],
                  ]}
                  onChange={(value) =>
                    update("activityLevel", value as OnboardingData["activityLevel"])
                  }
                />
                <ChoiceGroup
                  label="Estresse"
                  value={data.stressLevel}
                  options={[
                    ["baixo", "Baixo"],
                    ["moderado", "Moderado"],
                    ["alto", "Alto"],
                  ]}
                  onChange={(value) =>
                    update("stressLevel", value as OnboardingData["stressLevel"])
                  }
                />
                <ChoiceGroup
                  label="Sono médio por noite"
                  value={data.sleepHours}
                  options={[
                    ["menos_5", "Menos de 5h"],
                    ["5_6", "5-6h"],
                    ["7_8", "7-8h"],
                    ["mais_8", "Mais de 8h"],
                  ]}
                  onChange={(value) => update("sleepHours", value as OnboardingData["sleepHours"])}
                />
                <ChoiceGroup
                  label="Álcool"
                  value={data.alcoholUse}
                  options={[
                    ["nao_bebo", "Não bebo"],
                    ["socialmente", "Socialmente"],
                    ["algumas_vezes_semana", "Algumas vezes por semana"],
                    ["diariamente", "Diariamente"],
                  ]}
                  onChange={(value) => update("alcoholUse", value as OnboardingData["alcoholUse"])}
                />
                <ChoiceGroup
                  label="Apneia do sono ou ronco importante?"
                  value={data.sleepApnea}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                    ["nao_sei", "Não sei"],
                  ]}
                  onChange={(value) => update("sleepApnea", value as YesNoUnknown)}
                />
                <ChoiceGroup
                  label="Pressão alta na gravidez ou diabetes gestacional?"
                  value={data.pregnancyHypertensionOrDiabetes}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                    ["nao_se_aplica", "Não se aplica"],
                  ]}
                  onChange={(value) =>
                    update(
                      "pregnancyHypertensionOrDiabetes",
                      value as OnboardingData["pregnancyHypertensionOrDiabetes"],
                    )
                  }
                />
              </div>
            </Section>

            <Section title="Sintomas, medicações e motivo">
              <MultiChoice
                label="Sintomas frequentes"
                values={data.frequentSymptoms}
                options={symptomOptions}
                onToggle={(value) => toggleArrayItem("frequentSymptoms", value)}
              />
              <div className="mt-6">
                <ChoiceGroup
                  label="Toma remédio para pressão, colesterol ou diabetes?"
                  value={data.takesMedication}
                  options={[
                    ["sim", "Sim"],
                    ["nao", "Não"],
                  ]}
                  onChange={(value) => update("takesMedication", value as YesNo)}
                />
              </div>
              {data.takesMedication === "sim" && (
                <div className="mt-6">
                  <MultiChoice
                    label="Categorias de medicação"
                    values={data.medicationCategories}
                    options={medicationCategories}
                    onToggle={(value) => toggleArrayItem("medicationCategories", value)}
                  />
                </div>
              )}
              <div className="mt-6">
                <MultiChoice
                  label="Motivo principal"
                  values={data.mainReason}
                  options={reasons}
                  onToggle={(value) => toggleArrayItem("mainReason", value)}
                />
              </div>
            </Section>
          </div>

          <aside className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef6f3] text-[#2f6760]">
                  <Bell className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-sans text-2xl font-semibold">Lembrete semanal</h2>
                  <p className="mt-2 text-sm leading-6 text-[#536b68]">
                    Fase 1: preferência local para o lembrete "faça seu check-in semanal".
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#f7faf9] p-4">
                <div>
                  <p className="font-semibold">Receber por e-mail</p>
                  <p className="text-sm text-[#536b68]">Check-in semanal</p>
                </div>
                <Switch
                  checked={reminders.weeklyEmail}
                  onCheckedChange={(checked) => setReminders({ weeklyEmail: checked })}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-[#10201f] p-6 text-white shadow-soft"
            >
              <p className="text-sm font-medium text-white/58">Score atual</p>
              <p className="mt-4 font-sans text-6xl font-semibold">{data.result?.score ?? "—"}</p>
              <p className="mt-3 text-base text-white/72">
                {data.result?.label ?? "Sem score salvo"}
              </p>
              <Button variant="secondary" className="mt-6 w-full rounded-full" asChild>
                <Link to="/onboarding">Refazer avaliação</Link>
              </Button>
            </motion.div>
          </aside>
        </div>
      </section>
      <MobileAppNav />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft sm:p-7"
    >
      <h2 className="font-sans text-2xl font-semibold">{title}</h2>
      <div className="mt-6">{children}</div>
    </motion.div>
  );
}

function MobileProfileCard({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      className={`rounded-[1.55rem] border border-[#10201f]/8 bg-white p-3.5 shadow-soft ${className}`}
    >
      <h2 className="font-sans text-base font-semibold">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </motion.div>
  );
}

function MobileGridCard({
  icon,
  title,
  detail,
  tone,
  to,
  params,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
  to: "/perfil/$section";
  params: { section: string };
  className?: string;
}) {
  return (
    <Link
      to={to}
      params={params}
      className={`group min-h-[116px] rounded-[1.25rem] bg-[#f7faf9] p-3 text-left transition active:scale-[0.98] ${className}`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}>{icon}</span>
      <span className="mt-3 flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight text-[#10201f]">{title}</span>
          <span className="mt-1 line-clamp-2 block text-xs leading-4 text-[#78908d]">{detail}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#9aa8a5] transition group-active:translate-x-0.5" />
      </span>
    </Link>
  );
}

function CompactPreferenceItem({
  icon,
  title,
  detail,
  tone,
  to,
  params,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
  to: "/perfil/$section";
  params: { section: string };
}) {
  return (
    <Link
      to={to}
      params={params}
      className="flex min-h-14 items-center gap-3 py-2.5 text-left transition active:scale-[0.99]"
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-[#10201f]">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[#78908d]">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9aa8a5]" />
    </Link>
  );
}

function ProgressMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "gold" | "dark";
}) {
  const toneClasses = {
    blue: "bg-[#e9f4fb] text-[#2f8fc8]",
    green: "bg-[#e8f5ef] text-[#2f6760]",
    gold: "bg-[#fff7dc] text-[#9a5b12]",
    dark: "bg-[#10201f] text-white",
  };
  return (
    <div className={`rounded-[1.25rem] p-2.5 text-center ${toneClasses[tone]}`}>
      <p className="font-sans text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
      <p className="mt-1 truncate text-[0.68rem] font-semibold opacity-78">{detail}</p>
    </div>
  );
}

function MobileListItem({
  icon,
  title,
  detail,
  tone,
  disabled = false,
  to,
  params,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
  disabled?: boolean;
  to?: "/perfil/$section";
  params?: { section: string };
}) {
  const content = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-4 text-[#78908d]">{detail}</span>
      </span>
      {!disabled && <ChevronRight className="h-4 w-4 shrink-0 text-[#9aa8a5]" />}
    </>
  );

  const className =
    "flex min-h-16 w-full items-center gap-3 rounded-[1.25rem] bg-[#f7faf9] p-3 text-left transition active:scale-[0.99] disabled:cursor-default";

  if (to && params && !disabled) {
    return (
      <Link to={to} params={params} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled} className={className}>
      {content}
    </button>
  );
}

function DesktopProfileItem({
  icon,
  title,
  detail,
  tone,
  section,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
  section: string;
}) {
  return (
    <Link
      to="/perfil/$section"
      params={{ section }}
      className="group rounded-[1.4rem] border border-[#10201f]/8 bg-white p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_-54px_rgba(16,32,31,0.5)]"
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-full transition duration-300 group-hover:scale-105 ${tone}`}
      >
        {icon}
      </span>
      <span className="mt-4 block font-sans text-lg font-semibold leading-tight">{title}</span>
      <span className="mt-1 block text-sm leading-5 text-[#78908d]">{detail}</span>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#2f8fc8]">
        Abrir <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 rounded-2xl"
      />
    </div>
  );
}

function ChoiceGroup({
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
      <p className="mb-3 text-sm font-medium text-[#536b68]">{label}</p>
      <div className="grid gap-2">
        {options.map(([optionValue, optionLabel]) => (
          <ChoiceButton
            key={optionValue}
            selected={value === optionValue}
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}

function MultiChoice({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: string[];
  options: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-[#536b68]">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <ChoiceButton
            key={option}
            selected={values.includes(option)}
            onClick={() => onToggle(option)}
          >
            {option}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-2xl border border-[#10201f] bg-[#10201f] px-4 py-3 text-left text-sm font-semibold text-white transition"
          : "rounded-2xl border border-[#10201f]/10 bg-white px-4 py-3 text-left text-sm font-semibold text-[#10201f] transition hover:border-[#10201f]/28 hover:bg-[#f7faf9]"
      }
    >
      {children}
    </button>
  );
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

function getFirstName(name?: string | null) {
  if (!name) return "vamos lá";
  return name.split("@")[0]?.split(" ")[0] || "vamos lá";
}

function getInitials(name: string) {
  const parts = name.replace(/@.*/, "").split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "H";
  const second = parts[1]?.[0] ?? "T";
  return `${first}${second}`.toUpperCase();
}

function riskLabel(category?: "baixo" | "moderado" | "alto") {
  if (category === "baixo") return "Risco baixo";
  if (category === "moderado") return "Risco moderado";
  if (category === "alto") return "Risco alto";
  return "Sem score salvo";
}

function scoreQualityLabel(score: number | null) {
  if (score == null) return "sem score";
  if (score >= 80) return "Bom";
  if (score >= 50) return "Regular";
  return "Atenção";
}

function getProfileLevel(points: number) {
  const level = Math.floor(points / 1000) + 1;
  const currentXp = points % 1000;
  const titles = [
    "Primeiros passos",
    "Cuidando de mim",
    "Rotina ativa",
    "Guardião do Coração",
    "Especialista HTCARE",
  ];
  return {
    level,
    currentXp,
    progress: (currentXp / 1000) * 100,
    title: titles[Math.min(level - 1, titles.length - 1)] ?? "Especialista HTCARE",
  };
}

function formatPersonalSummary(data: OnboardingData) {
  const age = data.age ? `${data.age} anos` : "idade pendente";
  const sex = data.biologicalSex || "sexo pendente";
  return `${age} · ${sex}`;
}

function formatHealthSummary(data: OnboardingData) {
  const weight = data.weight ? `${data.weight} kg` : "peso pendente";
  const height = data.height ? `${data.height} cm` : "altura pendente";
  const pressure =
    data.knowsBloodPressure === "sim" && data.systolic && data.diastolic
      ? `PA ${data.systolic}/${data.diastolic}`
      : "pressão pendente";
  return `${weight} · ${height} · ${pressure}`;
}

function formatMedicalSummary(data: OnboardingData) {
  const family = data.familyHistory === "sim" ? "histórico familiar" : "sem histórico familiar";
  const diagnosis =
    data.previousCardiacDiagnosis === "sim"
      ? "diagnóstico cardíaco anterior"
      : "sem diagnóstico anterior";
  return `${family} · ${diagnosis}`;
}

function formatMedicationSummary(data: OnboardingData) {
  if (data.takesMedication !== "sim") return "Nenhum uso informado";
  if (!data.medicationCategories.length) return "Uso informado, categoria pendente";
  return data.medicationCategories.join(", ");
}
