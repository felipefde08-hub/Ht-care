import { AnimatePresence, motion } from "motion/react";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Carelito } from "@/components/HeartMascot";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { askCarelito } from "@/lib/api/carelito.functions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
}

export function CarelitoChat({
  userId,
  score,
  factors,
}: {
  userId: string;
  score: number | null;
  factors: string[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      message:
        "Olá! Sou o Carelito, seu assistente de saúde. Pode me perguntar sobre seus dados, exames ou dúvidas de saúde — responderei de forma simples e sempre te direi quando for melhor falar com seu médico.",
      created_at: new Date().toISOString(),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const { data } = await supabase
        .from("carelito_conversations")
        .select("id,role,message,created_at")
        .order("created_at", { ascending: true })
        .limit(50);
      if (data?.length) setMessages((current) => [current[0], ...data]);
    }
    void load();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    await supabase.from("carelito_conversations").insert({
      user_id: userId,
      role: "user",
      message: text,
    });

    const result = await askCarelito({ data: { message: text, context: { score, factors } } });
    const assistantMessage: ChatMessage = {
      id: `local-assistant-${Date.now()}`,
      role: "assistant",
      message: result.answer,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, assistantMessage]);
    await supabase.from("carelito_conversations").insert({
      user_id: userId,
      role: "assistant",
      message: result.answer,
      metadata: { source: result.source },
    });
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.4rem)] right-4 z-40 grid h-16 w-16 place-items-center rounded-full border border-white/80 bg-white shadow-[0_18px_55px_-24px_rgba(47,143,200,0.85)] sm:hidden"
        aria-label="Abrir Carelito"
      >
        <Carelito className="h-14 w-14" expression="happy" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] bg-[#10201f]/26 backdrop-blur-sm sm:hidden">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] top-10 mx-auto flex max-w-md flex-col overflow-hidden rounded-[2rem] bg-[#f7faf9] shadow-[0_28px_130px_-56px_rgba(16,32,31,0.82)]"
            >
              <header className="flex items-center gap-3 border-b border-[#10201f]/8 bg-white p-4">
                <Carelito className="h-12 w-12" expression="confident" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-lg font-semibold">Carelito</p>
                  <p className="text-xs font-semibold text-[#49a37f]">online para te orientar</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#f7faf9]"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[86%] rounded-[1.25rem] px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-auto bg-[#10201f] text-white"
                        : "bg-white text-[#10201f] shadow-soft"
                    }`}
                  >
                    {message.message}
                  </div>
                ))}
                {loading && (
                  <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#78908d] shadow-soft">
                    Carelito está pensando...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-[#10201f]/8 bg-white p-3">
                <div className="flex items-center gap-2 rounded-full bg-[#f7faf9] p-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void send();
                    }}
                    placeholder="Pergunte ao Carelito"
                    className="min-h-11 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                  <Button
                    size="icon"
                    className="rounded-full bg-[#2f8fc8]"
                    disabled={loading}
                    onClick={() => void send()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
