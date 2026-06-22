import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCardioLogs, fetchPatients, needsFollowUp, type CardioLog } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  head: () => ({ meta: [{ title: "Pacientes — HTCare" }] }),
  component: PatientsList,
});

const patientSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  age: z.coerce.number().int().min(0).max(130).optional(),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(700).optional(),
});

function PatientsList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });
  const { data: logs } = useQuery({ queryKey: ["cardio-logs"], queryFn: fetchCardioLogs });

  const lastByPatient = new Map<string, CardioLog>();
  for (const item of logs ?? []) {
    const current = lastByPatient.get(item.patient_id);
    if (!current || new Date(item.created_at) > new Date(current.created_at)) {
      lastByPatient.set(item.patient_id, item);
    }
  }

  const filtered = (patients ?? []).filter((patient) =>
    patient.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe risco cardiovascular, pressão, adesão e alertas entre consultas.
          </p>
        </div>
        <Button variant="hero" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova paciente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar paciente..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} hasPatients={(patients ?? []).length > 0} />
      ) : (
        <div className="space-y-3">
          {filtered.map((patient, index) => {
            const last = lastByPatient.get(patient.id);
            const pending = needsFollowUp(last?.created_at ?? null);
            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index, 8) * 0.04 }}
              >
                <Link
                  to="/pacientes/$id"
                  params={{ id: patient.id }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-card"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground font-display font-bold">
                    {patient.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{patient.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[patient.age ? `${patient.age} anos` : null, patient.phone]
                        .filter(Boolean)
                        .join(" · ") || "Sem dados adicionais"}
                    </p>
                  </div>
                  <div className="hidden min-w-40 text-right sm:block">
                    {last ? (
                      <>
                        <p className="font-display text-lg font-bold text-foreground">
                          {Math.round(last.heart_score)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          PA {last.systolic}/{last.diastolic} · adesão {last.medication_adherence}
                          /10
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem registro</span>
                    )}
                  </div>
                  {pending && (
                    <span className="hidden rounded-full border border-warning/30 bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground sm:inline">
                      Registro pendente
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <NewPatientDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["patients"] })}
      />
    </div>
  );
}

function NewPatientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", age: "", phone: "", notes: "" });
  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = patientSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("patients").insert({
        user_id: userData.user!.id,
        name: parsed.data.name,
        age: form.age ? Number(form.age) : null,
        sex: "Feminino",
        phone: form.phone || null,
        guardian: null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente cadastrada.");
      setForm({ name: "", age: "", phone: "", notes: "" });
      onOpenChange(false);
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao cadastrar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova paciente</DialogTitle>
          <DialogDescription>
            Cadastre os dados iniciais para iniciar o acompanhamento cardiovascular.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nome completo</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Maria Souza"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-age">Idade</Label>
              <Input
                id="p-age"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="58"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Telefone</Label>
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 90000-0000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-notes">Observações clínicas</Label>
            <Textarea
              id="p-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Histórico relevante, medicações em uso, metas de cuidado e pontos de atenção."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="hero" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onAdd, hasPatients }: { onAdd: () => void; hasPatients: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Users className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-foreground">
        {hasPatients ? "Nenhuma paciente encontrada" : "Comece cadastrando uma paciente"}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {hasPatients
          ? "Tente buscar por outro nome."
          : "Crie a base para acompanhar pressão, adesão, sintomas e evolução."}
      </p>
      {!hasPatients && (
        <Button variant="hero" className="mt-5" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Nova paciente
        </Button>
      )}
    </div>
  );
}
