import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { acceptChallenge } from "@/lib/challenge";

export const Route = createFileRoute("/desafio")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Desafio — HTCare" }] }),
  component: ChallengeInvitePage,
});

function ChallengeInvitePage() {
  const navigate = useNavigate();
  const score = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("htcare:onboarding");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.result?.score ?? null;
    } catch {
      return null;
    }
  }, []);

  function startChallenge() {
    acceptChallenge();
    navigate({ to: "/missoes" });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#081916] px-4 pb-28 pt-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <Logo className="rounded-full bg-white/95 px-3 py-2 shadow-soft" />
        </Link>
      </div>

      <section className="relative mx-auto mt-4 flex min-h-[calc(100vh-88px)] max-w-5xl items-center justify-center py-6 sm:mt-0 sm:min-h-[calc(100vh-96px)] sm:py-12">
        <div className="absolute inset-0 -z-0 rounded-[2rem] bg-[radial-gradient(circle_at_30%_24%,rgba(255,183,77,0.32),transparent_34%),radial-gradient(circle_at_70%_44%,rgba(48,216,178,0.34),transparent_38%),linear-gradient(135deg,#0b231f,#10201f_42%,#193f37)] sm:rounded-[3rem]" />
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -14, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-6 top-14 hidden h-32 w-32 rounded-[2rem] border border-white/15 bg-white/10 backdrop-blur-xl sm:grid sm:place-items-center"
        >
          <Trophy className="h-14 w-14 text-[#ffd36a]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative z-10 max-w-3xl px-4 text-center sm:px-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "backOut", delay: 0.12 }}
            className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#10201f] shadow-[0_24px_80px_-38px_rgba(255,211,106,0.9)] sm:h-20 sm:w-20"
          >
            <Sparkles className="h-7 w-7 text-[#ff9f43] sm:h-9 sm:w-9" />
          </motion.div>
          <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/60 sm:mt-8 sm:text-xs sm:tracking-[0.24em]">
            Seu próximo passo
          </p>
          <h1 className="mt-4 font-sans text-[clamp(2.6rem,13vw,4rem)] font-semibold leading-[0.96] sm:mt-5 sm:text-[clamp(3rem,7vw,6.5rem)]">
            Vamos baixar esse número juntos?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/72 sm:mt-7 sm:text-xl sm:leading-8">
            Seu score hoje é{" "}
            <motion.span
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex rounded-full bg-white px-3 py-0.5 font-sans text-xl font-semibold text-[#10201f] sm:px-4 sm:py-1 sm:text-2xl"
            >
              {score ?? "—"}
            </motion.span>
            . Com pequenas mudanças nos pontos que identificamos, você pode melhorar isso.
          </p>
          <Button
            size="xl"
            className="mt-8 w-full rounded-full bg-[#ffd36a] px-8 font-semibold text-[#10201f] shadow-[0_22px_80px_-42px_rgba(255,211,106,0.95)] hover:bg-[#ffe096] sm:mt-10 sm:w-auto"
            onClick={startChallenge}
          >
            Aceitar o desafio <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>
      <MobileAppNav />
    </main>
  );
}
