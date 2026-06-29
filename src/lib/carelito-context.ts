import { buildBiomarkerCards, type ExamBiomarkers } from "@/lib/exam-interpretation";
import type { RiskLevel } from "@/lib/risk-score";

export interface CarelitoContext {
  usuario: {
    nome: string;
    idade: number | null;
    sexo: string | null;
  };
  score: {
    valor: number | null;
    categoria: RiskLevel | null;
    tipo: "estimado" | "baseado_em_exame";
    fatores_que_pesaram: string[];
  };
  exame?: {
    data: string;
    biomarcadores: Record<string, number | null>;
    interpretacoes: string[];
  };
  medicamentos?: string[];
}

export function buildCarelitoContext(input: {
  nome?: string | null;
  idade?: number | null;
  sexo?: string | null;
  score?: number | null;
  categoria?: RiskLevel | null;
  tipoScore?: "estimado" | "baseado_em_exame";
  fatores?: string[];
  exame?: {
    data: string;
    biomarcadores: ExamBiomarkers;
  };
  medicamentos?: string[];
}): CarelitoContext {
  const context: CarelitoContext = {
    usuario: {
      nome: input.nome || "você",
      idade: input.idade ?? null,
      sexo: input.sexo ?? null,
    },
    score: {
      valor: input.score ?? null,
      categoria: input.categoria ?? null,
      tipo: input.tipoScore ?? "estimado",
      fatores_que_pesaram: input.fatores ?? [],
    },
    medicamentos: input.medicamentos ?? [],
  };

  if (input.exame) {
    context.exame = {
      data: input.exame.data,
      biomarcadores: {
        apob: input.exame.biomarcadores.apob ?? null,
        ldl: input.exame.biomarcadores.ldl ?? null,
        hdl: input.exame.biomarcadores.hdl ?? null,
        triglicerideos: input.exame.biomarcadores.triglicerideos ?? null,
        hba1c: input.exame.biomarcadores.hba1c ?? null,
        glicemiaJejum: input.exame.biomarcadores.glicemiaJejum ?? null,
        insulinaJejum: input.exame.biomarcadores.insulinaJejum ?? null,
        homaIr: input.exame.biomarcadores.homaIr ?? null,
        pcrUs: input.exame.biomarcadores.pcrUs ?? null,
      },
      interpretacoes: buildBiomarkerCards(input.exame.biomarcadores)
        .filter((card) => !card.valueLabel.includes("—"))
        .map((card) => `${card.title}: ${card.explanation}`),
    };
  }

  return context;
}

export const CARELITO_SYSTEM_PROMPT = `Você é o Carelito, assistente de saúde cardiovascular da HTCare.

IDENTIDADE:
- Acolhedor, claro, nunca alarmista
- Português brasileiro simples
- Nunca usa jargão médico sem explicar

REGRAS ABSOLUTAS:
- NUNCA diagnosticar doenças
- NUNCA prescrever ou sugerir medicamentos específicos
- NUNCA inventar valores ou dados não fornecidos no contexto
- SEMPRE orientar consulta médica para decisões clínicas
- SEMPRE usar apenas os dados fornecidos

SINTOMAS GRAVES:
Se houver dor no peito, falta de ar intensa, desmaio, fraqueza súbita, confusão ou piora intensa, responda: "Esses sintomas merecem atenção médica urgente. Procure um pronto-socorro ou ligue para o SAMU (192)."

BASE DE CONHECIMENTO:
Toda explicação de biomarcador deve vir da base HTCare fornecida no contexto, não de conhecimento próprio do modelo.`;
