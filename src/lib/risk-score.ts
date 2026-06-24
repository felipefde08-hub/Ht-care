export type RiskLevel = "baixo" | "moderado" | "alto";

export interface RiskResult {
  score: number;
  level: RiskLevel;
  color: string;
  label: string;
  factors: string[];
}

export interface InitialRiskInput {
  age: string | number;
  biologicalSex: "feminino" | "masculino" | "";
  smokes: "sim" | "ex_fumante_menos_5" | "ex_fumante_mais_5" | "nao" | "";
  diabetes: "sim" | "diabetes_tipo_1" | "diabetes_tipo_2" | "pre_diabetes" | "nao" | "nao_sei" | "";
  knowsBloodPressure: "sim" | "nao" | "";
  systolic: string | number;
  diastolic?: string | number;
  knowsCholesterol: "sim" | "nao" | "";
  ldl: string | number;
  hdl: string | number;
  totalCholesterol: string | number;
  familyHistory?: "sim" | "nao" | "nao_sei" | "";
  weight?: string | number;
  height?: string | number;
  activityLevel?: "sedentario" | "leve" | "moderado" | "intenso" | "";
  previousCardiacDiagnosis?: "sim" | "nao" | "";
  frequentSymptoms?: string[];
  stressLevel?: "baixo" | "moderado" | "alto" | "";
  sleepHours?: "menos_5" | "5_6" | "7_8" | "mais_8" | "";
  alcoholUse?: "nao_bebo" | "socialmente" | "algumas_vezes_semana" | "diariamente" | "";
  waistCircumference?: string | number;
  sleepApnea?: "sim" | "nao" | "nao_sei" | "";
}

export interface CheckInRiskInput {
  feeling: "bem" | "cansado" | "mal" | "";
  symptoms: string[];
  measuredBloodPressure: "sim" | "nao" | "";
  systolic: string | number;
  diastolic: string | number;
  measuredGlucose: "sim" | "nao" | "";
  glucose: string | number;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toNumber(value: string | number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function riskCategoryFromScore(score: number): RiskLevel {
  if (score >= 80) return "baixo";
  if (score >= 50) return "moderado";
  return "alto";
}

export function riskLabel(level: RiskLevel) {
  if (level === "baixo") return "Risco baixo";
  if (level === "moderado") return "Risco moderado";
  return "Risco alto";
}

export function riskColor(level: RiskLevel) {
  if (level === "baixo") return "#2f9e72";
  if (level === "moderado") return "#d89a1d";
  return "#c4413a";
}

export function buildRiskResult(score: number, factors: string[]): RiskResult {
  const safeScore = clampScore(score);
  const level = riskCategoryFromScore(safeScore);
  return {
    score: safeScore,
    level,
    color: riskColor(level),
    label: riskLabel(level),
    factors: factors.length
      ? factors.slice(0, 5)
      : ["perfil inicial sem fatores críticos informados"],
  };
}

export function calculateInitialRiskScore(input: InitialRiskInput): RiskResult {
  const factors: string[] = [];
  const systolic = toNumber(input.systolic);
  const diastolic = toNumber(input.diastolic ?? 0);
  const totalCholesterol = toNumber(input.totalCholesterol);
  const ldl = toNumber(input.ldl);
  const hdl = toNumber(input.hdl);
  const bmi = calculateBmi(input.weight, input.height);
  const waist = toNumber(input.waistCircumference ?? 0);
  let riskPoints = 0;
  let hasCurrentSmoker = false;
  let hasStage2Hypertension = false;
  let hasObesity = false;

  function add(points: number, factor: string) {
    riskPoints += points;
    if (!factors.includes(factor)) factors.push(factor);
  }

  if (input.smokes === "sim") {
    hasCurrentSmoker = true;
    add(25, "tabagismo");
  }
  if (input.smokes === "ex_fumante_menos_5") add(12, "ex-tabagismo recente");
  if (input.smokes === "ex_fumante_mais_5") add(8, "histórico de tabagismo");
  if (input.diabetes === "sim" || input.diabetes === "diabetes_tipo_2")
    add(20, "diabetes tipo 2 diagnosticado");
  if (input.diabetes === "diabetes_tipo_1") add(15, "diabetes tipo 1 diagnosticado");
  if (input.diabetes === "pre_diabetes") add(12, "pré-diabetes diagnosticado");
  if (input.diabetes === "nao_sei") add(5, "status de diabetes desconhecido");

  if (input.knowsBloodPressure === "sim") {
    if (systolic >= 160 || diastolic >= 100) {
      hasStage2Hypertension = true;
      add(28, "hipertensão estágio 2");
    } else if (systolic >= 140 || diastolic >= 90) add(15, "hipertensão estágio 1");
    else if (systolic >= 120 || diastolic >= 80) add(8, "pressão arterial elevada");
  } else {
    add(5, "pressão arterial não informada");
  }

  if (bmi != null) {
    if (bmi >= 35) {
      hasObesity = true;
      add(22, "IMC em faixa de obesidade grau 2/3");
    } else if (bmi >= 30) {
      hasObesity = true;
      add(15, "IMC em faixa de obesidade grau 1");
    } else if (bmi >= 25) add(8, "IMC em faixa de sobrepeso");
  }

  if (input.knowsCholesterol === "sim") {
    if (totalCholesterol >= 240 || ldl >= 160 || (hdl > 0 && hdl < 35)) {
      add(12, "colesterol alto");
    } else if (totalCholesterol >= 200 || ldl >= 130 || (hdl > 0 && hdl < 40)) {
      add(6, "colesterol levemente alterado");
    }
  } else {
    add(4, "colesterol não informado");
  }

  if (input.familyHistory === "sim") add(10, "histórico familiar de infarto ou AVC precoce");
  if (input.familyHistory === "nao_sei") add(3, "histórico familiar desconhecido");

  if (input.activityLevel === "sedentario") add(12, "baixo nível de atividade física");
  if (input.activityLevel === "leve") add(6, "atividade física 1-2x por semana");
  if (input.activityLevel === "moderado") add(2, "atividade física abaixo do ideal");

  if (input.previousCardiacDiagnosis === "sim") add(15, "diagnóstico cardíaco anterior");

  for (const symptom of input.frequentSymptoms ?? []) {
    if (symptom === "dor ou aperto no peito") add(10, "dor ou aperto no peito");
    if (symptom === "falta de ar ao fazer esforço leve")
      add(8, "falta de ar ao fazer esforço leve");
    if (symptom === "palpitação/coração acelerado sem motivo") add(6, "palpitação sem motivo");
    if (symptom === "inchaço nas pernas/tornozelos") add(6, "inchaço nas pernas ou tornozelos");
  }

  if (input.stressLevel === "alto") add(6, "estresse elevado");
  if (input.stressLevel === "moderado") add(3, "estresse moderado");

  if (input.sleepHours === "menos_5") add(8, "sono insuficiente");
  if (input.sleepHours === "5_6") add(4, "sono abaixo do recomendado");
  if (input.sleepHours === "mais_8") add(2, "sono acima de 8 horas");

  if (input.alcoholUse === "diariamente") add(10, "consumo diário de álcool");
  if (input.alcoholUse === "algumas_vezes_semana") add(5, "consumo frequente de álcool");
  if (input.alcoholUse === "socialmente") add(2, "consumo social de álcool");

  if (isWaistElevated(waist, input.biologicalSex)) add(8, "circunferência abdominal elevada");

  if (input.sleepApnea === "sim") add(6, "apneia do sono ou ronco importante");
  if (input.sleepApnea === "nao_sei") add(2, "apneia do sono desconhecida");

  if (hasCurrentSmoker && hasStage2Hypertension && hasObesity) {
    add(10, "combinação de fatores graves simultâneos");
  }

  return buildRiskResult(100 - riskPoints, factors);
}

export function updateRiskScoreFromCheckIn(baseScore: number, input: CheckInRiskInput): RiskResult {
  const factors: string[] = [];
  const systolic = toNumber(input.systolic);
  const diastolic = toNumber(input.diastolic);
  const glucose = toNumber(input.glucose);
  const hasSymptoms = input.symptoms.some((item) => item !== "nenhum");
  let delta = 0;

  function adjust(points: number, factor: string) {
    delta += points;
    if (points < 0 && !factors.includes(factor)) factors.push(factor);
  }

  if (input.feeling === "bem") delta += 1;
  if (input.feeling === "cansado") adjust(-2, "cansaço no check-in");
  if (input.feeling === "mal") adjust(-5, "mal-estar no check-in");
  if (hasSymptoms)
    adjust(-Math.min(12, input.symptoms.length * 4), "sintomas relatados na última semana");

  if (input.measuredBloodPressure === "sim") {
    if (systolic >= 160 || diastolic >= 100) adjust(-12, "pressão muito elevada no check-in");
    else if (systolic >= 140 || diastolic >= 90) adjust(-7, "pressão elevada no check-in");
    else if (systolic < 130 && diastolic < 85) delta += 2;
  }

  if (input.measuredGlucose === "sim") {
    if (glucose >= 126) adjust(-5, "glicemia elevada no check-in");
    else if (glucose >= 100) adjust(-2, "glicemia limítrofe no check-in");
    else if (glucose > 0) delta += 1;
  }

  return buildRiskResult(baseScore + delta, factors);
}

function calculateBmi(weight?: string | number, height?: string | number) {
  const weightValue = toNumber(weight ?? 0);
  const heightValue = toNumber(height ?? 0) / 100;
  if (!weightValue || !heightValue) return null;
  return weightValue / (heightValue * heightValue);
}

function isWaistElevated(waist: number, sex: InitialRiskInput["biologicalSex"]) {
  if (!waist) return false;
  if (sex === "feminino") return waist >= 88;
  if (sex === "masculino") return waist >= 102;
  return waist >= 94;
}
