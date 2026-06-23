import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Activity, LineChart, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar ou criar conta — HTCare" }],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{11}$|^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "Informe um CPF válido"),
  birthDate: z.string().min(1, "Informe sua data de nascimento"),
  phone: z.string().trim().min(8, "Informe seu telefone").max(30),
  city: z.string().trim().min(2, "Informe sua cidade").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(() =>
    typeof window !== "undefined" && window.location.search.includes("mode=signup")
      ? "signup"
      : "login",
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    phone: "",
    city: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/onboarding", replace: true });
    });
  }, [navigate]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAuthMessage(null);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: {
              name: parsed.data.name,
              full_name: parsed.data.name,
              professional_name: parsed.data.name,
              cpf: parsed.data.cpf.replace(/\D/g, ""),
              birth_date: parsed.data.birthDate,
              phone: parsed.data.phone,
              city: parsed.data.city,
            },
          },
        });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          const message = "Este e-mail já está cadastrado. Faça login para continuar.";
          setAuthMessage(message);
          toast.error(message);
          setMode("login");
          update("password", "");
          return;
        }
        if (!data.session) {
          const message =
            "Conta criada. Confirme seu e-mail para ativar o acesso e depois faça login.";
          setAuthMessage(message);
          toast.success(message);
          setMode("login");
          update("password", "");
          return;
        }
        toast.success("Conta criada com sucesso.");
        navigate({ to: "/onboarding", replace: true });
      } else {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        if (!data.session) {
          const message = "Não foi possível iniciar a sessão. Confirme seu e-mail e tente de novo.";
          setAuthMessage(message);
          toast.error(message);
          return;
        }
        toast.success("Bem-vindo de volta.");
        navigate({ to: "/onboarding", replace: true });
      }
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setAuthMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setAuthMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const message = getAuthErrorMessage(err, "Erro ao entrar com Google");
      setAuthMessage(message);
      toast.error(message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative hidden flex-col justify-between bg-foreground p-12 text-background lg:flex"
      >
        <Link to="/">
          <Logo className="rounded-full bg-white/95 px-3 py-2 shadow-soft" />
        </Link>
        <div className="max-w-md space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">
            Saúde cardiovascular contínua
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Entenda seu risco e acompanhe sua evolução com mais clareza.
          </h2>
          <ul className="space-y-4 text-background/80">
            <li className="flex items-center gap-3">
              <Activity className="h-5 w-5" /> Questionário rápido para começar sem exames
            </li>
            <li className="flex items-center gap-3">
              <LineChart className="h-5 w-5" /> Score de risco cardiovascular e metabólico
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" /> Dados organizados para decisões mais conscientes
            </li>
          </ul>
        </div>
        <p className="text-xs text-background/55">
          HTCare para prevenção, cuidado e acompanhamento.
        </p>
      </motion.div>

      <div className="flex items-center justify-center bg-background px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            {mode === "login" ? "Entrar na HTCare" : "Criar conta gratuita"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Acesse sua conta para continuar acompanhando sua evolução."
              : "Crie sua conta para salvar seu relatório e acompanhar sua evolução."}
          </p>
          {authMessage && (
            <div className="mt-5 rounded-2xl border border-[#10201f]/10 bg-[#f7faf9] px-4 py-3 text-sm font-medium leading-6 text-[#536b68]">
              {authMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={form.cpf}
                      onChange={(e) => update("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="birthDate">Data de nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => update("birthDate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Sua cidade"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              ou
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-3"
            onClick={signInWithGoogle}
            disabled={googleLoading}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
              G
            </span>
            {googleLoading ? "Redirecionando..." : "Continuar com Google"}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Ainda não tem conta?" : "Já possui conta?"}{" "}
            <button
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setAuthMessage(null);
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Criar conta gratuita" : "Fazer login"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function getAuthErrorMessage(error: unknown, fallback = "Erro ao autenticar") {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : isRecord(error) && typeof error.message === "string"
          ? error.message
          : "";
  const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
  const status = isRecord(error) && typeof error.status === "number" ? error.status : null;
  const message = rawMessage || fallback;
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("email not confirmed")
  ) {
    return normalized.includes("email not confirmed")
      ? "Confirme seu e-mail antes de entrar."
      : "E-mail ou senha incorretos.";
  }
  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  ) {
    return "Este e-mail já está cadastrado. Faça login para continuar.";
  }
  if (normalized.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (normalized.includes("rate limit") || status === 429) {
    return "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.";
  }
  if (normalized.includes("database error")) {
    return "Não foi possível criar sua conta agora. Verifique as tabelas do Supabase e tente novamente.";
  }
  if (code) return `${message} (${code})`;
  return message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
