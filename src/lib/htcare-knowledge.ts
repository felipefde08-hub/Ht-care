export type BiomarkerId =
  | "apob"
  | "ldl"
  | "hdl"
  | "triglicerideos"
  | "hba1c"
  | "glicemiaJejum"
  | "insulinaJejum"
  | "homaIr"
  | "pcrUs"
  | "pressaoSistolica";

export type BiomarkerTone = "good" | "attention" | "risk";

export interface BiomarkerRange {
  label: string;
  tone: BiomarkerTone;
  min?: number;
  max?: number;
}

export interface BiomarkerKnowledge {
  id: BiomarkerId;
  nome_simples: string;
  unidade: string;
  o_que_e: string;
  por_que_importa: string;
  faixas: {
    ideal: BiomarkerRange;
    atencao: BiomarkerRange;
    risco: BiomarkerRange;
  };
  explicacao_usuario: string;
  recomendacao_geral: string;
  quando_buscar_medico: string;
  fonte: string;
}

export interface BiomarkerClassification {
  label: string;
  tone: BiomarkerTone;
  explanation: string;
  recommendation: string;
  source: string;
}

export const HTCARE_BIOMARKERS: Record<BiomarkerId, BiomarkerKnowledge> = {
  apob: {
    id: "apob",
    nome_simples: "ApoB",
    unidade: "mg/dL",
    o_que_e: "Mostra a quantidade de partículas aterogênicas circulando no sangue.",
    por_que_importa:
      "Ajuda a estimar o risco cardiovascular com mais precisão que olhar apenas o LDL isolado.",
    faixas: {
      ideal: { max: 90, label: "Dentro do alvo", tone: "good" },
      atencao: { min: 90, max: 130, label: "Atenção", tone: "attention" },
      risco: { min: 130, label: "Elevado", tone: "risk" },
    },
    explicacao_usuario:
      "Esse é o número real de partículas de gordura circulando no seu sangue. Quanto mais alto, maior a atenção com proteção das artérias.",
    recomendacao_geral:
      "Converse com seu médico sobre o resultado e revise alimentação, atividade física e outros fatores de risco.",
    quando_buscar_medico:
      "Procure orientação médica se o ApoB estiver elevado ou se houver histórico familiar de infarto/AVC.",
    fonte: "Diretriz SBC 2023",
  },
  ldl: {
    id: "ldl",
    nome_simples: "LDL",
    unidade: "mg/dL",
    o_que_e: "É conhecido como colesterol ruim.",
    por_que_importa:
      "Quando está alto, pode participar do acúmulo de placas nas artérias ao longo do tempo.",
    faixas: {
      ideal: { max: 100, label: "Adequado", tone: "good" },
      atencao: { min: 100, max: 160, label: "Atenção", tone: "attention" },
      risco: { min: 160, label: "Alto", tone: "risk" },
    },
    explicacao_usuario:
      "O LDL ajuda a entender gordura circulante, mas não conta tudo sozinho. Por isso a HTCare também valoriza ApoB quando disponível.",
    recomendacao_geral:
      "Acompanhe junto do ApoB e discuta metas individuais com um profissional de saúde.",
    quando_buscar_medico:
      "Procure avaliação médica se o LDL estiver alto ou se outros fatores de risco estiverem presentes.",
    fonte: "Diretriz SBC 2023",
  },
  hdl: {
    id: "hdl",
    nome_simples: "HDL",
    unidade: "mg/dL",
    o_que_e: "É conhecido como colesterol bom.",
    por_que_importa: "Níveis mais altos costumam estar associados a melhor proteção cardiovascular.",
    faixas: {
      ideal: { min: 60, label: "Protetor", tone: "good" },
      atencao: { min: 40, max: 60, label: "Atenção", tone: "attention" },
      risco: { max: 40, label: "Baixo", tone: "risk" },
    },
    explicacao_usuario:
      "O HDL participa da proteção das artérias. Quando está baixo, ele entra como ponto de atenção no conjunto do risco.",
    recomendacao_geral:
      "Movimento regular, alimentação equilibrada e parar de fumar costumam melhorar o perfil metabólico.",
    quando_buscar_medico:
      "Converse com seu médico se o HDL estiver baixo junto com LDL, ApoB ou triglicerídeos alterados.",
    fonte: "Diretriz SBC 2023",
  },
  triglicerideos: {
    id: "triglicerideos",
    nome_simples: "Triglicerídeos",
    unidade: "mg/dL",
    o_que_e: "São uma forma de gordura no sangue.",
    por_que_importa:
      "Costumam refletir metabolismo de açúcar, álcool, excesso calórico e resistência à insulina.",
    faixas: {
      ideal: { max: 150, label: "Adequados", tone: "good" },
      atencao: { min: 150, max: 200, label: "Atenção", tone: "attention" },
      risco: { min: 200, label: "Elevados", tone: "risk" },
    },
    explicacao_usuario:
      "Triglicerídeos altos conversam muito com açúcar, álcool e metabolismo. Eles ajudam a enxergar risco cardiometabólico.",
    recomendacao_geral:
      "Reduzir bebidas açucaradas, álcool frequente e ultraprocessados pode ajudar na evolução.",
    quando_buscar_medico:
      "Procure orientação se estiver elevado, principalmente junto com glicemia ou HOMA-IR alterados.",
    fonte: "Diretriz SBC 2023",
  },
  hba1c: {
    id: "hba1c",
    nome_simples: "HbA1c",
    unidade: "%",
    o_que_e: "Mostra a média aproximada do açúcar no sangue nos últimos 3 meses.",
    por_que_importa: "Ajuda a identificar risco metabólico antes ou durante o diabetes.",
    faixas: {
      ideal: { max: 5.7, label: "Normal", tone: "good" },
      atencao: { min: 5.7, max: 6.5, label: "Pré-diabetes", tone: "attention" },
      risco: { min: 6.5, label: "Faixa de diabetes", tone: "risk" },
    },
    explicacao_usuario:
      "Esse número mostra como seu açúcar se comportou nos últimos meses. Ele ajuda a enxergar risco metabólico acumulado.",
    recomendacao_geral:
      "Acompanhe alimentação, peso, sono e atividade física, e leve o resultado para avaliação profissional.",
    quando_buscar_medico:
      "Procure avaliação médica se estiver em faixa de pré-diabetes ou diabetes.",
    fonte: "OMS HEARTS",
  },
  glicemiaJejum: {
    id: "glicemiaJejum",
    nome_simples: "Glicemia de jejum",
    unidade: "mg/dL",
    o_que_e: "Mede o açúcar no sangue após um período sem comer.",
    por_que_importa: "Ajuda a identificar alterações metabólicas e risco de diabetes.",
    faixas: {
      ideal: { min: 70, max: 100, label: "Normal", tone: "good" },
      atencao: { min: 100, max: 126, label: "Alterada", tone: "attention" },
      risco: { min: 126, label: "Elevada", tone: "risk" },
    },
    explicacao_usuario:
      "A glicemia de jejum mostra como seu corpo está lidando com açúcar naquele momento.",
    recomendacao_geral:
      "Interprete junto com HbA1c e insulina de jejum para entender melhor o metabolismo.",
    quando_buscar_medico:
      "Procure orientação se estiver repetidamente alterada ou elevada.",
    fonte: "OMS HEARTS",
  },
  insulinaJejum: {
    id: "insulinaJejum",
    nome_simples: "Insulina de jejum",
    unidade: "µUI/mL",
    o_que_e: "Mostra quanta insulina seu corpo produz em jejum.",
    por_que_importa:
      "Ajuda a calcular o HOMA-IR e identificar sinais iniciais de resistência à insulina.",
    faixas: {
      ideal: { max: 10, label: "Dentro do esperado", tone: "good" },
      atencao: { min: 10, max: 15, label: "Atenção", tone: "attention" },
      risco: { min: 15, label: "Elevada", tone: "risk" },
    },
    explicacao_usuario:
      "A insulina de jejum ajuda a entender se o corpo está precisando trabalhar demais para controlar o açúcar.",
    recomendacao_geral:
      "Analise junto com glicemia e HOMA-IR, não de forma isolada.",
    quando_buscar_medico:
      "Converse com profissional de saúde se vier alta junto com glicemia, HbA1c ou HOMA-IR alterados.",
    fonte: "OMS HEARTS",
  },
  homaIr: {
    id: "homaIr",
    nome_simples: "HOMA-IR",
    unidade: "",
    o_que_e: "É um índice calculado a partir de glicemia e insulina de jejum.",
    por_que_importa:
      "Mostra se o corpo está tendo dificuldade de processar açúcar antes mesmo do diabetes aparecer.",
    faixas: {
      ideal: { max: 1.5, label: "Sensibilidade preservada", tone: "good" },
      atencao: { min: 1.5, max: 2.5, label: "Atenção", tone: "attention" },
      risco: { min: 2.5001, label: "Resistência elevada", tone: "risk" },
    },
    explicacao_usuario:
      "O HOMA-IR mostra resistência à insulina. Quando sobe, o corpo pode estar fazendo mais esforço para controlar açúcar.",
    recomendacao_geral:
      "Caminhadas após refeições, sono regular e alimentação menos refinada costumam ajudar no eixo metabólico.",
    quando_buscar_medico:
      "Procure orientação se estiver elevado, especialmente junto com HbA1c ou glicemia alteradas.",
    fonte: "OMS HEARTS",
  },
  pcrUs: {
    id: "pcrUs",
    nome_simples: "PCR-us",
    unidade: "mg/L",
    o_que_e: "É um marcador de inflamação crônica de baixa intensidade.",
    por_que_importa:
      "Inflamação persistente pode participar do desgaste silencioso das artérias.",
    faixas: {
      ideal: { max: 1, label: "Baixa", tone: "good" },
      atencao: { min: 1, max: 3, label: "Intermediária", tone: "attention" },
      risco: { min: 3.0001, label: "Elevada", tone: "risk" },
    },
    explicacao_usuario:
      "A PCR-us mede inflamação silenciosa no corpo. Ela não aponta uma causa sozinha, mas ajuda a enxergar o contexto.",
    recomendacao_geral:
      "Se vier alta, vale revisar infecções recentes, sono, peso, alimentação e discutir com seu médico.",
    quando_buscar_medico:
      "Procure avaliação se estiver elevada ou se houver sintomas, dor, febre ou piora clínica.",
    fonte: "Diretriz SBC 2023",
  },
  pressaoSistolica: {
    id: "pressaoSistolica",
    nome_simples: "Pressão sistólica",
    unidade: "mmHg",
    o_que_e: "É o número de cima da pressão arterial.",
    por_que_importa:
      "Pressão alta é um dos fatores mais importantes e modificáveis de risco cardiovascular.",
    faixas: {
      ideal: { max: 120, label: "Normal", tone: "good" },
      atencao: { min: 120, max: 140, label: "Elevada", tone: "attention" },
      risco: { min: 140, label: "Alta", tone: "risk" },
    },
    explicacao_usuario:
      "A pressão sistólica mostra a força do sangue nas artérias durante o batimento do coração.",
    recomendacao_geral:
      "Registrar a pressão com regularidade ajuda o médico a decidir o melhor acompanhamento.",
    quando_buscar_medico:
      "Procure avaliação se os valores ficarem repetidamente altos. Em sintomas fortes, busque atendimento urgente.",
    fonte: "OMS HEARTS",
  },
};

export function classifyBiomarker(
  id: BiomarkerId,
  value: number | null | undefined,
): BiomarkerClassification {
  const item = HTCARE_BIOMARKERS[id];
  if (value == null) {
    return {
      label: id === "homaIr" ? "Não calculado" : "Não informado",
      tone: "attention",
      explanation: `${item.nome_simples} não foi identificado neste exame. Quando esse valor aparecer, o relatório fica mais preciso.`,
      recommendation: item.recomendacao_geral,
      source: item.fonte,
    };
  }

  const range = selectRange(item, value);
  return {
    label: range.label,
    tone: range.tone,
    explanation: `${item.explicacao_usuario} O seu valor é ${formatBiomarkerValue(id, value)} e está em faixa: ${range.label.toLowerCase()}.`,
    recommendation: item.recomendacao_geral,
    source: item.fonte,
  };
}

export function formatBiomarkerValue(id: BiomarkerId, value: number | null | undefined) {
  if (value == null) return "—";
  const unit = HTCARE_BIOMARKERS[id].unidade;
  if (!unit) return String(value);
  return `${value}${unit === "%" ? "%" : ` ${unit}`}`;
}

function selectRange(item: BiomarkerKnowledge, value: number) {
  const { ideal, atencao, risco } = item.faixas;
  if (matchesRange(risco, value)) return risco;
  if (matchesRange(atencao, value)) return atencao;
  return ideal;
}

function matchesRange(range: BiomarkerRange, value: number) {
  const minOk = range.min == null || value >= range.min;
  const maxOk = range.max == null || value < range.max;
  return minOk && maxOk;
}
