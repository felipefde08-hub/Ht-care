import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, ChartLine, HeartPulse, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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

interface DynamicSupabaseTable {
  insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

function MeuRiscoPage() {
  const { user } = Route.useRouteContext();
  const [history, setHistory] = useState<HubScorePoint[]>([]);
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
    }
    void load();
  }, []);

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

        <LabInterestCard
          userId={user.id}
          defaultName={
            (user.user_metadata?.name as string | undefined) ??
            (user.user_metadata?.full_name as string | undefined) ??
            ""
          }
        />

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

function LabInterestCard({ userId, defaultName }: { userId: string; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: defaultName, phone: "", city: "", healthPlan: "" });

  async function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim() || !form.healthPlan.trim()) {
      toast.error("Preencha nome, telefone, cidade e plano de saúde.");
      return;
    }
    setSaving(true);
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } = await dynamicSupabase.from("lab_exam_interests").insert({
      user_id: userId,
      nome: form.name.trim(),
      telefone: form.phone.trim(),
      cidade: form.city.trim(),
      plano_saude: form.healthPlan.trim(),
      source: "meu-risco",
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível registrar o interesse. Verifique a tabela no Supabase.");
      console.error(error);
      return;
    }
    toast.success("Interesse registrado. Entraremos em contato.");
    setOpen(false);
    setForm({ name: defaultName, phone: "", city: "", healthPlan: "" });
  }

  return (
    <Card>
      <SectionTitle icon={ShieldCheck} title="Próximo passo" />
      <h2 className="mt-4 font-sans text-2xl font-semibold">Aprofunde com exame de sangue</h2>
      <p className="mt-2 text-sm leading-6 text-[#536b68]">
        Com um exame de sangue, conseguimos analisar biomarcadores reais como ApoB, resistência à
        insulina e inflamação para uma visão mais precisa do seu risco.
      </p>
      {!open ? (
        <Button className="mt-4 w-full rounded-full bg-[#10201f]" onClick={() => setOpen(true)}>
          Solicitar exame em laboratório parceiro
        </Button>
      ) : (
        <div className="mt-4 space-y-3 rounded-[1.25rem] bg-[#f7faf9] p-3">
          <FormField
            label="Nome"
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
            placeholder="Seu nome"
          />
          <FormField
            label="Telefone"
            value={form.phone}
            onChange={(phone) => setForm((current) => ({ ...current, phone }))}
            placeholder="(11) 99999-9999"
          />
          <FormField
            label="Cidade"
            value={form.city}
            onChange={(city) => setForm((current) => ({ ...current, city }))}
            placeholder="São Paulo"
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
              {saving ? "Salvando..." : "Enviar interesse"}
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
    </Card>
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
