/**
 * Calculadora de tempo de serviço
 * Implementa regra: 30 dias = 1 mês; 12 meses = 1 ano
 * Primeiro e último dia são INCLUSIVOS (+1 dia no total)
 */

export interface TempoCalculado {
  // Tempo total de serviço (dataInicio até dataFim)
  anos: number;
  meses: number;
  dias: number;
  totalDias: number;
  
  // Tempo não descontado (dataInicio até dataInicioEncargos)
  tempoNaoDescontado?: {
    anos: number;
    meses: number;
    dias: number;
    totalDias: number;
  };
  
  // Tempo descontado (usado para calcular encargos)
  tempoDescontado?: {
    anos: number;
    meses: number;
    dias: number;
    totalDias: number;
  };
}

/**
 * Calcula diferença entre duas datas em anos, meses e dias
 * Ambas as datas são inclusivas
 */
export function calcularTempo(dataInicio: string, dataFim: string): TempoCalculado | null {
  try {
    const inicio = new Date(dataInicio + 'T00:00:00Z');
    const fim = new Date(dataFim + 'T00:00:00Z');

    // Validações
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      return null;
    }

    if (fim < inicio) {
      return null; // Data fim menor que data início
    }

    // Calcula total de dias (inclusivo no primeiro e último dia = +1)
    const diffMs = fim.getTime() - inicio.getTime();
    const totalDias = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Conversão: 30 dias = 1 mês; 12 meses = 1 ano
    let diasRestantes = totalDias;
    let anos = 0;
    let meses = 0;
    let dias = 0;

    // Calcula anos (assumindo 360 dias por ano = 12 * 30)
    const diasPorAno = 360;
    anos = Math.floor(diasRestantes / diasPorAno);
    diasRestantes = diasRestantes % diasPorAno;

    // Calcula meses
    const diasPorMes = 30;
    meses = Math.floor(diasRestantes / diasPorMes);
    dias = diasRestantes % diasPorMes;

    return {
      anos,
      meses,
      dias,
      totalDias
    };
  } catch {
    return null;
  }
}

/**
 * Calcula encargos financeiros baseado em diferentes categorias
 * Fórmula: (Anos x 12 + Meses) x 7% = valor encargos
 */
export function calcularEncargos(
  tempoCalculado: TempoCalculado,
  salarioBase: number,
  taxaPercentual: number = 7
): number {
  // Fórmula: (Anos x 12 + Meses)
  const mesesTotais = tempoCalculado.anos * 12 + tempoCalculado.meses;
  
  // Aplica percentual sobre o salário base
  const encargos = (mesesTotais * salarioBase * taxaPercentual) / 100;
  
  return Math.round(encargos * 100) / 100; // Arredonda a 2 casas decimais
}

/**
 * Formata tempo calculado para exibição
 */
export function formatarTempo(tempo: TempoCalculado): string {
  const partes: string[] = [];
  
  if (tempo.anos > 0) {
    partes.push(`${tempo.anos} ano${tempo.anos > 1 ? 's' : ''}`);
  }
  if (tempo.meses > 0) {
    partes.push(`${tempo.meses} mês${tempo.meses > 1 ? 'es' : ''}`);
  }
  if (tempo.dias > 0 || partes.length === 0) {
    partes.push(`${tempo.dias} dia${tempo.dias > 1 ? 's' : ''}`);
  }
  
  return partes.join(', ');
}

/**
 * Demonstração de cálculo para o PDF
 * Retorna fórmulas legíveis para o documento
 */
export function gerarDemonstracao(tempo: TempoCalculado): {
  formula1: string;
  resultado1: number;
  formula2: string;
  resultado2: string;
} {
  const mesesTotais = tempo.anos * 12 + tempo.meses;
  const diasEmMeses = Math.floor(tempo.dias / 30);
  
  return {
    formula1: `${tempo.anos} × 12 + ${tempo.meses} = ${mesesTotais}`,
    resultado1: mesesTotais,
    formula2: `${tempo.dias} ÷ 30 = ${diasEmMeses}`,
    resultado2: `${diasEmMeses} dia${diasEmMeses === 1 ? '' : 's'}`
  };
}

/**
 * Converte dias em componentes para exibição formatada
 * Useful para conversões adicionais
 */
export function converteDiasParaMesesDias(totalDias: number): { meses: number; dias: number } {
  const meses = Math.floor(totalDias / 30);
  const dias = totalDias % 30;
  return { meses, dias };
}

/**
 * Calcula data de referência para cálculos de tempo não contribuído
 */
export function calcularDataReferencia(dataFim: string, diasRecuados: number): string {
  const fim = new Date(dataFim + 'T00:00:00Z');
  const referencia = new Date(fim.getTime() - diasRecuados * 24 * 60 * 60 * 1000);
  
  const ano = referencia.getUTCFullYear();
  const mes = String(referencia.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(referencia.getUTCDate()).padStart(2, '0');
  
  return `${ano}-${mes}-${dia}`;
}
