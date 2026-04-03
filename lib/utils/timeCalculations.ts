/**
 * Lógica de cálculo de tempo de serviço
 * Regra: O primeiro e último dia são INCLUSIVOS (+1 dia no total)
 * Conversão: 30 dias = 1 mês; 12 meses = 1 ano
 */

export interface CalculoTempo {
  anos: number;
  meses: number;
  dias: number;
  totalDias: number;
  totalMeses: number;
  totalAnos: number;
}

/**
 * Calcula a diferença entre duas datas em anos, meses e dias
 * Incluindo o primeiro e último dia (+1 no total)
 * 
 * @param dataInicio Data de início (inclusive)
 * @param dataFim Data de fim (inclusive)
 * @returns Objeto com anos, meses, dias e totais
 */
export function calcularTempoServico(dataInicio: Date, dataFim: Date): CalculoTempo {
  // Valida datas
  if (dataInicio > dataFim) {
    throw new Error('Data de início não pode ser posterior à data de fim');
  }
  
  // Cria cópias das datas para não modificar originas
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  
  // Inicializa contadores
  let anos = 0;
  let meses = 0;
  let dias = 0;
  
  // Calcula anos completos
  while (
    new Date(inicio.getFullYear() + anos + 1, inicio.getMonth(), inicio.getDate()) <= fim
  ) {
    anos++;
  }
  
  // Move para o próximo ponto de referência após anos
  const dataPosAnos = new Date(inicio.getFullYear() + anos, inicio.getMonth(), inicio.getDate());
  
  // Calcula meses completos
  while (
    new Date(dataPosAnos.getFullYear(), dataPosAnos.getMonth() + meses + 1, dataPosAnos.getDate()) <=
    fim
  ) {
    meses++;
  }
  
  // Move para o próximo ponto de referência após meses
  const dataPosAnos_Meses = new Date(
    dataPosAnos.getFullYear(),
    dataPosAnos.getMonth() + meses,
    dataPosAnos.getDate()
  );
  
  // Calcula dias (inclusive do primeiro e último dia)
  // Adiciona 1 para incluir ambos os dias
  dias = Math.floor((fim.getTime() - dataPosAnos_Meses.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Conversão de 30 dias em 1 mês
  if (dias >= 30) {
    const mesesAdicionais = Math.floor(dias / 30);
    meses += mesesAdicionais;
    dias = dias % 30;
  }
  
  // Conversão de 12 meses em 1 ano
  if (meses >= 12) {
    const anosAdicionais = Math.floor(meses / 12);
    anos += anosAdicionais;
    meses = meses % 12;
  }
  
  // Calcula totais
  const totalDias = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalMeses = anos * 12 + meses + Math.floor(dias / 30);
  const totalAnos = anos + meses / 12 + dias / 360;
  
  return {
    anos,
    meses,
    dias,
    totalDias,
    totalMeses,
    totalAnos: Math.floor(totalAnos * 100) / 100, // Duas casas decimais
  };
}

/**
 * Calcula a diferença em dias apenas
 */
export function calcularTotalDias(dataInicio: Date, dataFim: Date): number {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  return Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Converte dias em meses (considerando 30 dias por mês)
 */
export function diasEmMeses(dias: number): { meses: number; diasRestantes: number } {
  return {
    meses: Math.floor(dias / 30),
    diasRestantes: dias % 30,
  };
}

/**
 * Converte meses em anos (considerando 12 meses por ano)
 */
export function mesesEmAnos(meses: number): { anos: number; mesesRestantes: number } {
  return {
    anos: Math.floor(meses / 12),
    mesesRestantes: meses % 12,
  };
}

/**
 * Formata resultado do cálculo para apresentação
 */
export function formatarCalculoTempo(calculo: CalculoTempo): string {
  return `${calculo.anos}a ${calculo.meses}m ${calculo.dias}d`;
}

/**
 * Calcula valor de encargos baseado em tempo de serviço
 * Aplicando regra: (Anos x 12 + Meses) x 7% = Encargos
 */
export function calcularEncargos(
  anos: number,
  meses: number,
  percentualBase: number = 7
): number {
  const totalMeses = anos * 12 + meses;
  const percentagem = percentualBase / 100;
  return totalMeses * percentagem;
}

/**
 * Valida se as datas são válidas para cálculo de tempo
 */
export function validarDatas(dataInicio: Date, dataFim: Date): { valida: boolean; erro?: string } {
  if (!(dataInicio instanceof Date) || isNaN(dataInicio.getTime())) {
    return { valida: false, erro: 'Data de início inválida' };
  }
  
  if (!(dataFim instanceof Date) || isNaN(dataFim.getTime())) {
    return { valida: false, erro: 'Data de fim inválida' };
  }
  
  if (dataInicio > dataFim) {
    return { valida: false, erro: 'Data de início não pode ser posterior à data de fim' };
  }
  
  const hoje = new Date();
  if (dataFim > hoje) {
    return { valida: false, erro: 'Data de fim não pode ser no futuro' };
  }
  
  return { valida: true };
}
