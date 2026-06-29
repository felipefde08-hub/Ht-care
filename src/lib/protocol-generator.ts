import { addDays } from "date-fns";

export interface ProtocolAction {
  area: string;
  titulo: string;
  descricao: string;
  impacto_esperado: string;
  progresso?: number;
}

export interface Protocol90Days {
  duracao_dias: 90;
  acoes: ProtocolAction[];
  proxima_avaliacao: string;
}

export function gerarProtocolo(fatores: string[]): Protocol90Days {
  const normalized = fatores.map((factor) => factor.toLowerCase());
  const acoes: ProtocolAction[] = [];

  function has(...needles: string[]) {
    return normalized.some((factor) => needles.some((needle) => factor.includes(needle)));
  }

  if (has("apob", "ldl", "colesterol")) {
    acoes.push({
      area: "Alimentação",
      titulo: "Reduzir gordura saturada",
      descricao: "Trocar manteiga por azeite. Reduzir carne vermelha para até 2x por semana.",
      impacto_esperado: "ApoB pode reduzir 10-15% em 60 dias",
      progresso: 0,
    });
  }

  if (has("homa", "insulina", "hba1c", "glicemia", "pré-diabetes", "diabetes")) {
    acoes.push({
      area: "Atividade física",
      titulo: "Caminhar após as refeições",
      descricao: "10-20 minutos após almoço e jantar, quando possível.",
      impacto_esperado: "Pode melhorar resistência à insulina nas próximas semanas",
      progresso: 0,
    });
  }

  if (has("hipertensão", "pressão")) {
    acoes.push({
      area: "Monitoramento",
      titulo: "Registrar pressão 3x por semana",
      descricao: "Medir pela manhã, antes de comer, e registrar no app.",
      impacto_esperado: "Ajuda o médico a decidir o melhor acompanhamento",
      progresso: 0,
    });
  }

  if (has("tabagismo", "fumante")) {
    acoes.push({
      area: "Cessação",
      titulo: "Conversar com médico sobre parar de fumar",
      descricao: "Existem programas gratuitos no SUS e opções de apoio profissional.",
      impacto_esperado: "Uma das maiores reduções possíveis de risco cardiovascular",
      progresso: 0,
    });
  }

  if (has("inflamação", "pcr")) {
    acoes.push({
      area: "Inflamação",
      titulo: "Reduzir ultraprocessados e açúcar",
      descricao: "Priorizar refeições simples, sono regular e discutir PCR-us alta com médico.",
      impacto_esperado: "PCR-us pode melhorar quando a causa de inflamação é controlada",
      progresso: 0,
    });
  }

  if (!acoes.length) {
    acoes.push(
      {
        area: "Monitoramento",
        titulo: "Registrar pressão semanalmente",
        descricao: "Manter histórico mesmo quando está tudo bem ajuda a identificar mudanças cedo.",
        impacto_esperado: "Mais clareza sobre sua tendência cardiovascular",
        progresso: 0,
      },
      {
        area: "Rotina",
        titulo: "Manter movimento regular",
        descricao: "Caminhar pelo menos 20-30 minutos em dias alternados.",
        impacto_esperado: "Ajuda pressão, metabolismo e bem-estar",
        progresso: 0,
      },
      {
        area: "Reavaliação",
        titulo: "Repetir avaliação em 90 dias",
        descricao: "Comparar seus indicadores ao longo do tempo é o que mostra evolução real.",
        impacto_esperado: "Transforma exame isolado em acompanhamento",
        progresso: 0,
      },
    );
  }

  return {
    duracao_dias: 90,
    acoes: acoes.slice(0, 3),
    proxima_avaliacao: addDays(new Date(), 90).toISOString(),
  };
}
