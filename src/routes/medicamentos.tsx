import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Pill, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/medicamentos")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Medicamentos — HTCare" }] }),
  component: MedicationsPage,
});

interface Medication {
  id: string;
  category: string;
  description: string;
  dose: string | null;
  schedule_times: string[];
  reminder_enabled: boolean;
  created_at: string;
}

interface AdherenceLog {
  medication_id: string;
  log_date: string;
}

function MedicationsPage() {
  const { user } = Route.useRouteContext();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [form, setForm] = useState({
    description: "",
    dose: "",
    times: "",
    reminder: true,
    category: "outro",
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const [{ data: meds }, { data: adherence }] = await Promise.all([
      supabase
        .from("medications")
        .select("id,category,description,dose,schedule_times,reminder_enabled,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("medication_adherence_logs")
        .select("medication_id,log_date")
        .gte("log_date", monthStart()),
    ]);
    setMedications(meds ?? []);
    setLogs(adherence ?? []);
  }

  async function addMedication() {
    if (!form.description.trim()) return;
    const { error } = await supabase.from("medications").insert({
      user_id: user.id,
      category: form.category,
      description: form.description.trim(),
      dose: form.dose.trim() || null,
      schedule_times: form.times
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      reminder_enabled: form.reminder,
    });
    if (error) {
      toast.error("Não foi possível adicionar medicamento.");
      console.error(error);
      return;
    }
    setForm({ description: "", dose: "", times: "", reminder: true, category: "outro" });
    await loadData();
  }

  async function removeMedication(id: string) {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover medicamento.");
      return;
    }
    await loadData();
  }

  async function markTaken(medicationId: string) {
    const { error } = await supabase.from("medication_adherence_logs").upsert({
      user_id: user.id,
      medication_id: medicationId,
      log_date: todayKey(),
      taken_at: new Date().toISOString(),
    });
    if (error) {
      toast.error("Não foi possível confirmar uso.");
      console.error(error);
      return;
    }
    await loadData();
  }

  const adherence = useMemo(() => {
    const confirmed = new Set(logs.map((item) => `${item.medication_id}:${item.log_date}`)).size;
    const days = new Date().getDate();
    const possible = Math.max(1, days * Math.max(1, medications.length));
    return { confirmed, possible };
  }, [logs, medications.length]);

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:py-6">
      <Header />
      <section className="mx-auto mt-5 max-w-3xl space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#fff7dc] text-[#9a5b12]">
              <Pill className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-sans text-2xl font-semibold">Medicamentos</h1>
              <p className="mt-1 text-sm text-[#78908d]">
                Confirmado {adherence.confirmed} de {adherence.possible} dias este mês.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4">
            <Field
              label="Nome"
              value={form.description}
              onChange={(description) => setForm((current) => ({ ...current, description }))}
            />
            <Field
              label="Dose"
              value={form.dose}
              onChange={(dose) => setForm((current) => ({ ...current, dose }))}
            />
            <Field
              label="Horários do dia"
              value={form.times}
              onChange={(times) => setForm((current) => ({ ...current, times }))}
              placeholder="Ex: 08:00, 20:00"
            />
            <div className="flex items-center justify-between rounded-2xl bg-[#f7faf9] p-4">
              <p className="font-semibold">Lembrete ativo</p>
              <Switch
                checked={form.reminder}
                onCheckedChange={(reminder) => setForm((current) => ({ ...current, reminder }))}
              />
            </div>
            <Button className="rounded-full bg-[#10201f]" onClick={() => void addMedication()}>
              Adicionar medicamento
            </Button>
          </div>
        </Card>

        {medications.length ? (
          medications.map((medication) => {
            const takenToday = logs.some(
              (item) => item.medication_id === medication.id && item.log_date === todayKey(),
            );
            return (
              <Card key={medication.id}>
                <div className="flex gap-3">
                  <Pill className="mt-1 h-5 w-5 shrink-0 text-[#9a5b12]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-lg font-semibold">{medication.description}</p>
                    <p className="mt-1 text-sm text-[#78908d]">
                      {[medication.dose, medication.schedule_times?.join(", ")]
                        .filter(Boolean)
                        .join(" · ") || "Sem dose/horário informado"}
                    </p>
                    <p className="mt-2 text-xs font-bold text-[#78908d]">
                      Lembrete {medication.reminder_enabled ? "ativo" : "inativo"}
                    </p>
                    <Button
                      size="sm"
                      disabled={takenToday}
                      className="mt-4 rounded-full bg-[#10201f]"
                      onClick={() => void markTaken(medication.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {takenToday ? "Confirmado hoje" : "Tomei hoje"}
                    </Button>
                  </div>
                  <button type="button" onClick={() => void removeMedication(medication.id)}>
                    <Trash2 className="h-5 w-5 text-[#9aa8a5]" />
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card>
            <p className="text-center text-sm text-[#536b68]">Nenhum uso informado.</p>
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
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 rounded-2xl"
      />
    </div>
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}
