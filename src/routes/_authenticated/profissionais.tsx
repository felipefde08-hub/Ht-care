import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { MailPlus, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { fetchProfessionals, inviteProfessional } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/profissionais")({
  head: () => ({ meta: [{ title: "Profissionais — HTCare" }] }),
  component: ProfessionalsPage,
});

const inviteSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(["admin", "professional"]),
});

function ProfessionalsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", role: "professional" as const });
  const { data, isLoading } = useQuery({
    queryKey: ["professionals"],
    queryFn: fetchProfessionals,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = inviteSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await inviteProfessional(parsed.data.email, parsed.data.role);
    },
    onSuccess: async () => {
      setForm({ email: "", role: "professional" });
      await qc.invalidateQueries({ queryKey: ["professionals"] });
      toast.success("Convite registrado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao convidar"),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant="outline" className="mb-3 gap-1.5">
          <UsersRound className="h-3.5 w-3.5" /> Equipe
        </Badge>
        <h1 className="font-display text-3xl font-extrabold text-foreground">Profissionais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Convide cardiologistas, enfermeiros, nutricionistas e profissionais do cuidado.
        </p>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-2xl border border-border bg-card p-5 shadow-soft"
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="profissional@clinica.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Permissão</Label>
            <Select
              value={form.role}
              onValueChange={(role: "admin" | "professional") => setForm({ ...form, role })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <MailPlus className="h-4 w-4" />
            {mutation.isPending ? "Enviando..." : "Convidar"}
          </Button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
        className="rounded-2xl border border-border bg-card p-5 shadow-soft"
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((professional) => (
                <TableRow key={`${professional.id}-${professional.email}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                        {professional.role === "admin" ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <UserRound className="h-4 w-4" />
                        )}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {professional.name || professional.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{professional.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {professional.role === "admin" ? "admin" : "profissional"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={professional.status === "active" ? "secondary" : "outline"}>
                      {professional.status === "active" ? "ativo" : "convidado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(professional.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.section>
    </div>
  );
}
