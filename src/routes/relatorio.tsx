import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { HealthReport, type HealthReportData } from "@/components/HealthReport";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildRiskResult, calculateInitialRiskScore, type RiskResult } from "@/lib/risk-score";

export const Route = createFileRoute("/relatorio")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Meu relatório — HTCare" }] }),
  component: ReportPage,
});

type StoredOnboarding = HealthReportData & {
  bmi?: number | null;
  result?: RiskResult;
};

function ReportPage() {
  const { user } = Route.useRouteContext();
  const [stored, setStored] = useState<StoredOnboarding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      const local = readLocalReport();
      if (local) {
        setStored(local);
        setLoading(false);
        return;
      }

      const [{ data: profile, error: profileError }, { data: assessment, error: assessmentError }] =
        await Promise.all([
          supabase.from("profiles").select("*").maybeSingle(),
          supabase
            .from("assessments")
            .select("score,categoria_risco,fatores_que_pesaram,created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (profileError) console.error(profileError);
      if (assessmentError) console.error(assessmentError);

      if (profile && assessment) {
        const remoteReport = buildReportFromRemote(profile, assessment);
        setStored(remoteReport);
        window.localStorage.setItem("htcare:onboarding", JSON.stringify(remoteReport));
      }

      setLoading(false);
    }

    void loadReport();
  }, []);

  const personName =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Paciente HTCare";

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-2 sm:flex">
          <Button variant="ghost" asChild>
            <Link to="/painel">Painel</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/onboarding">Refazer avaliação</Link>
          </Button>
        </nav>
      </div>

      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl items-center justify-center py-10">
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-2xl rounded-[2rem] border border-[#10201f]/8 bg-white p-8 text-center shadow-soft"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
              Carregando relatório
            </p>
            <h1 className="mt-4 font-sans text-4xl font-semibold leading-tight">
              Buscando seu último score salvo.
            </h1>
          </motion.div>
        ) : stored ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
          >
            <HealthReport
              personName={personName}
              assessmentDate={new Date()}
              data={stored}
              bmi={stored.bmi ?? calculateBmi(stored.weight, stored.height)}
              result={stored.result ?? calculateInitialRiskScore(stored)}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-2xl rounded-[2rem] border border-[#10201f]/8 bg-white p-8 text-center shadow-soft"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
              Relatório indisponível
            </p>
            <h1 className="mt-4 font-sans text-4xl font-semibold leading-tight">
              Você ainda não tem um score salvo neste navegador.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#536b68]">
              Faça a avaliação inicial para gerar seu relatório visual com score, fatores de risco e
              próximos passos.
            </p>
            <Button size="xl" className="mt-8 rounded-full bg-[#10201f] font-semibold" asChild>
              <Link to="/onboarding">
                Fazer avaliação agora <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        )}
      </section>
      <MobileAppNav />
    </main>
  );
}

function calculateBmi(weight?: string | number, height?: string | number) {
  const weightValue = Number(weight ?? 0);
  const heightValue = Number(height ?? 0) / 100;
  if (!weightValue || !heightValue) return null;
  return weightValue / (heightValue * heightValue);
}

function readLocalReport() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("htcare:onboarding");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOnboarding;
  } catch {
    return null;
  }
}

function buildReportFromRemote(
  profile: {
    idade: number | null;
    sexo: string | null;
    fumante: boolean | null;
    diabetes_status: "nao" | "pre_diabetes" | "diabetes" | "nao_sei" | null;
    historico_familiar: boolean | null;
    peso_kg: number | null;
    altura_cm: number | null;
    nivel_atividade: "sedentario" | "leve" | "moderado" | "intenso" | null;
  },
  assessment: {
    score: number;
    fatores_que_pesaram: string[] | null;
  },
): StoredOnboarding {
  const data: StoredOnboarding = {
    age: profile.idade ? String(profile.idade) : "",
    biologicalSex: profile.sexo === "feminino" || profile.sexo === "masculino" ? profile.sexo : "",
    smokes: profile.fumante == null ? "" : profile.fumante ? "sim" : "nao",
    diabetes:
      profile.diabetes_status === "diabetes" || profile.diabetes_status === "pre_diabetes"
        ? "sim"
        : profile.diabetes_status === "nao"
          ? "nao"
          : profile.diabetes_status === "nao_sei"
            ? "nao_sei"
            : "",
    knowsBloodPressure: "",
    systolic: "",
    diastolic: "",
    knowsCholesterol: "",
    ldl: "",
    hdl: "",
    totalCholesterol: "",
    familyHistory:
      profile.historico_familiar == null ? "" : profile.historico_familiar ? "sim" : "nao",
    weight: profile.peso_kg ? String(profile.peso_kg) : "",
    height: profile.altura_cm ? String(profile.altura_cm) : "",
    activityLevel: profile.nivel_atividade ?? "",
    frequentSymptoms: [],
    stressLevel: "",
    sleepHours: "",
    alcoholUse: "",
    bmi: calculateBmi(profile.peso_kg ?? "", profile.altura_cm ?? ""),
    result: buildRiskResult(Number(assessment.score), assessment.fatores_que_pesaram ?? []),
  };

  return data;
}
