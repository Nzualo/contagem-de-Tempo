/**
 * MOTOR DE CÁLCULO - REGRAS LESSSOFE
 * Implementa fórmulas exactas para Contagem de Tempo e Fixação de Encargos
 */

export interface ResultadoTempo {
  anos: number;
  meses: number;
  dias: number;
  totalDias: number;
}

export interface DemonstracaoEncargos {
  salarioBase: number;
  encargoMensal: number;
  encargoDiario: number;
  diasEmFalta: number;
  totalDias: number;
  mesesmFalta: number;
  totalMeses: number;
  dividaTotal: number;
  linhas: string[];
}

export interface DemonstracaoPrestacoes {
  dividaTotal: number;
  numeroPrestacoes: number;
  valorRestantes: number;
  primeiraP: number;
  totalRestantes: number;
  linhas: string[];
  fraseF: string;
}

export interface DemonstracaoTempo {
  dataInicio: string;
  dataFim: string;
  anos: number;
  meses: number;
  dias: number;
  totalDias: number;
  descricao: string;
  linhas: string[];
}

/**
 * Calcula diferença entre duas datas em anos, meses e dias
 * Usando a lógica de "pedir emprestado" (como na subtração manual)
 * Regra: 30 dias = 1 mês; 12 meses = 1 ano
 * INCLUSIVO: Primeiro e último dia contam (+1 dia)
 */
export function calcularTempo(dataInicio: string, dataFim: string): ResultadoTempo | null {
  try {
    const [anoI, mesI, diaI] = dataInicio.split('-').map(Number);
    const [anoF, mesF, diaF] = dataFim.split('-').map(Number);

    // Validação básica
    if (isNaN(anoI) || isNaN(mesI) || isNaN(diaI) || isNaN(anoF) || isNaN(mesF) || isNaN(diaF)) {
      return null;
    }

    // Calcula total de dias para validar (data fim >= data inicio)
    const dataInicioMs = new Date(anoI, mesI - 1, diaI).getTime();
    const dataFimMs = new Date(anoF, mesF - 1, diaF).getTime();
    
    if (dataFimMs < dataInicioMs) {
      return null;
    }

    // Subtração usando "pedir emprestado"
    let anos = anoF - anoI;
    let meses = mesF - mesI;
    let dias = diaF - diaI;

    // Se dias negativo, pedir emprestado 1 mês (30 dias)
    if (dias < 0) {
      meses -= 1;
      dias += 30;
    }

    // Se meses negativo, pedir emprestado 1 ano (12 meses)
    if (meses < 0) {
      anos -= 1;
      meses += 12;
    }

    // Adiciona 1 dia porque ambas as datas são inclusivas
    dias += 1;

    // Se dias passar de 30, converte para meses
    if (dias > 30) {
      meses += Math.floor(dias / 30);
      dias = dias % 30;
    }

    // Se meses passar de 12, converte para anos
    if (meses > 12) {
      anos += Math.floor(meses / 12);
      meses = meses % 12;
    }

    // Calcula total de dias: (anos * 360) + (meses * 30) + dias
    const totalDias = anos * 360 + meses * 30 + dias;

    return { anos, meses, dias, totalDias };
  } catch {
    return null;
  }
}

/**
 * Calcula ENCARGOS com demonstração detalhada
 * Fórmula LESSSOFE:
 * - Encargo Mensal = Salário Base × 7%
 * - Encargo Diário = Encargo Mensal ÷ 30
 * - Total = (Encargo Mensal × Meses em falta) + (Encargo Diário × Dias em falta)
 */
export function calcularEncargos(
  tempo: ResultadoTempo,
  salarioBase: number
): DemonstracaoEncargos {
  const taxaPercentual = 7;
  
  // Passo 1: Encargo Mensal (Salário Base x 7%)
  const encargoMensal = Number((salarioBase * taxaPercentual / 100).toFixed(2));
  
  // Passo 2: Encargo Diário (Encargo Mensal / 30)
  const encargoDiario = Number((encargoMensal / 30).toFixed(2));
  
  // Passo 3: Total de días em falta (dos meses + anos)
  const diasEmFalta = tempo.dias;
  const mesesmFalta = tempo.meses;
  
  // Passo 4: Total de Meses (Anos × 12 + Meses)
  const totalMesesD = tempo.anos * 12 + tempo.meses;
  
  // Passo 5: Calcular valores parciais
  const totalMeses = Number((encargoMensal * mesesmFalta).toFixed(2));
  const totalDias = Number((encargoDiario * diasEmFalta).toFixed(2));
  
  // Passo 6: Dívida Total
  const dividaTotal = Number((totalMeses + totalDias).toFixed(2));

  // Gera as linhas de demonstração no formato exacto pedido
  const linhas: string[] = [
    `${salarioBase.toFixed(2)} x 7% = ${encargoMensal.toFixed(2)}Mt`,
    `${encargoMensal.toFixed(2)} : 30d = ${encargoDiario.toFixed(2)} x ${diasEmFalta}d = ${totalDias.toFixed(2)}Mt`,
    `${encargoMensal.toFixed(2)} x ${mesesmFalta}M = ${totalMeses.toFixed(2)}Mt`,
    `Total ${totalMeses.toFixed(2)} + ${totalDias.toFixed(2)} = ${dividaTotal.toFixed(2)}Mt`
  ];

  return {
    salarioBase,
    encargoMensal,
    encargoDiario,
    diasEmFalta,
    totalDias,
    mesesmFalta,
    totalMeses,
    dividaTotal,
    linhas
  };
}

/**
 * Calcula PRESTAÇÕES com ajuste de dízimas
 * Garante que a 1ª prestação absorve a diferença dos arredondamentos
 * Caso de teste: 14684.79 em 10 meses = 1ª: 1468.47, restantes: 1468.48
 */
export function calcularPrestacoes(
  dividaTotal: number,
  numeroPrestacoes: number
): DemonstracaoPrestacoes {
  
  // Passo 1: Valor base (Dívida Total / Nº Prestações), arredondado a 2 casas
  const valorRestantes = Number((dividaTotal / numeroPrestacoes).toFixed(2));
  
  // Passo 2: Total das restantes prestações
  const totalRestantes = Number((valorRestantes * (numeroPrestacoes - 1)).toFixed(2));
  
  // Passo 3: 1ª Prestação = Dívida Total - Total Restantes
  const primeiraP = Number((dividaTotal - totalRestantes).toFixed(2));

  // Gera as linhas de demonstração
  const linhas: string[] = [
    `${dividaTotal.toFixed(2)} : ${numeroPrestacoes}M = ${valorRestantes.toFixed(2)}Mt x ${numeroPrestacoes - 1} = ${totalRestantes.toFixed(2)}Mt`,
    `${dividaTotal.toFixed(2)} - ${totalRestantes.toFixed(2)}Mt = ${primeiraP.toFixed(2)}Mt`
  ];

  const fraseF = `primeira prestação no valor de ${primeiraP.toFixed(2)}Mt e as restantes de ${valorRestantes.toFixed(2)}Mt, cada.`;

  return {
    dividaTotal,
    numeroPrestacoes,
    valorRestantes,
    primeiraP,
    totalRestantes,
    linhas,
    fraseF
  };
}

/**
 * Gera demonstração de contagem de tempo
 * Mostra o período e o resultado em AAAA, MM, DD
 */
export function gerarDemonstracaoTempo(
  dataInicio: string,
  dataFim: string,
  resultado: ResultadoTempo,
  descricao: string = 'Contagem de Tempo'
): DemonstracaoTempo {
  const linhas: string[] = [
    `De: ${dataInicio}`,
    `Até: ${dataFim}`,
    `Resultado: ${resultado.anos} Anos, ${resultado.meses} Meses, ${resultado.dias} Dias`,
    `Total de Dias: ${resultado.totalDias}`
  ];

  return {
    dataInicio,
    dataFim,
    anos: resultado.anos,
    meses: resultado.meses,
    dias: resultado.dias,
    totalDias: resultado.totalDias,
    descricao,
    linhas
  };
}

/**
 * CORRIGIDO: Gera demonstração completa com os três períodos correctamente separados
 * 
 * Recebe:
 * - tempoTotal, tempoNaoDescontado, tempoDescontado: resultados CORRECTOS já calculados por calcularPeriods
 * - Datas dos períodos
 * - salarioBase e numeroPrestacoes para os cálculos de encargos e prestações
 */
export function gerarDemonstracaoCompleta(
  tempoTotal: ResultadoTempo,
  tempoNaoDescontado: ResultadoTempo,
  tempoDescontado: ResultadoTempo,
  inicioNaoDescontado: string,
  fimNaoDescontado: string,
  inicioDescontado: string,
  fimDescontado: string,
  salarioBase: number,
  numeroPrestacoes: number
): {
  tempoTotal: DemonstracaoTempo;
  tempoNaoDescontado: DemonstracaoTempo;
  tempoDescontado: DemonstracaoTempo;
  encargos: DemonstracaoEncargos;
  prestacoes: DemonstracaoPrestacoes;
  textoCompleto: string;
} {
  // Gera as três demonstrações de tempo COM AS DATAS CORRECTAS
  const demoTempoTotal = gerarDemonstracaoTempo(
    inicioNaoDescontado || inicioDescontado,
    fimDescontado,
    tempoTotal,
    'Contagem de Tempo de Serviço (Total)'
  );

  const demoTempoNaoDescontado = gerarDemonstracaoTempo(
    inicioNaoDescontado,
    fimNaoDescontado,
    tempoNaoDescontado,
    'Tempo Não Descontado (Base para Encargos)'
  );

  const demoTempoDescontado = gerarDemonstracaoTempo(
    inicioDescontado,
    fimDescontado,
    tempoDescontado,
    'Tempo Descontado (Sem Dívida)'
  );

  // IMPORTANTE: Os encargos são calculados EXCLUSIVAMENTE sobre o Tempo Não Descontado
  const encargos = calcularEncargos(tempoNaoDescontado, salarioBase);
  const prestacoes = calcularPrestacoes(encargos.dividaTotal, numeroPrestacoes);

  const textoCompleto = [
    'DEMONSTRAÇÃO DE CÁLCULO',
    '='.repeat(50),
    '',
    'CONTAGEM DE TEMPO DE SERVIÇO (TOTAL):',
    ...demoTempoTotal.linhas,
    '',
    'TEMPO NÃO DESCONTADO (PERÍODO DA DÍVIDA):',
    ...demoTempoNaoDescontado.linhas,
    '',
    'TEMPO DESCONTADO (SEM CÁLCULO DE ENCARGOS):',
    ...demoTempoDescontado.linhas,
    '',
    'CÁLCULO DE ENCARGOS (SOBRE TEMPO NÃO DESCONTADO):',
    ...encargos.linhas,
    '',
    'CÁLCULO DE PRESTAÇÕES:',
    ...prestacoes.linhas,
    '',
    `Resultado: ${prestacoes.fraseF}`
  ].join('\n');

  return {
    tempoTotal: demoTempoTotal,
    tempoNaoDescontado: demoTempoNaoDescontado,
    tempoDescontado: demoTempoDescontado,
    encargos,
    prestacoes,
    textoCompleto
  };
}

/**
 * DEPRECATED: Use gerarDemonstracaoCompleta com todos os tempos
 * Mantido para compatibilidade
 */
export function gerarDemonstracaoCompleta_old(
  tempo: ResultadoTempo,
  salarioBase: number,
  numeroPrestacoes: number
): {
  encargos: DemonstracaoEncargos;
  prestacoes: DemonstracaoPrestacoes;
  textoCompleto: string;
} {
  const encargos = calcularEncargos(tempo, salarioBase);
  const prestacoes = calcularPrestacoes(encargos.dividaTotal, numeroPrestacoes);

  const textoCompleto = [
    'DEMONSTRAÇÃO DE CÁLCULO',
    '='.repeat(50),
    '',
    'CÁLCULO DE ENCARGOS:',
    ...encargos.linhas,
    '',
    'CÁLCULO DE PRESTAÇÕES:',
    ...prestacoes.linhas,
    '',
    `Resultado: ${prestacoes.fraseF}`
  ].join('\n');

  return { encargos, prestacoes, textoCompleto };
}

/**
 * Formata decimal para string com validação
 */
export function formatarDecimal(valor: number, casas: number = 2): string {
  return valor.toFixed(casas);
}

/**
 * Subtrai 1 dia de uma data no formato YYYY-MM-DD
 * Utilizado para calcular o fim do período não descontado
 * Ex: 2017-06-30 - 1 dia = 2017-06-29
 */
export function subtrairUmDia(data: string): string {
  try {
    const [ano, mes, dia] = data.split('-').map(Number);
    const date = new Date(ano, mes - 1, dia);
    date.setDate(date.getDate() - 1);
    
    const novoAno = date.getFullYear();
    const novoMes = String(date.getMonth() + 1).padStart(2, '0');
    const novoDia = String(date.getDate()).padStart(2, '0');
    
    return `${novoAno}-${novoMes}-${novoDia}`;
  } catch {
    return data; // Retorna a data original em caso de erro
  }
}

/**
 * CORRIGIDO: Calcula os três períodos de tempo correctamente
 * 
 * Período 1 (Não Descontado - Base para Encargos): dataInicioFuncoes até (dataInicioDescontos - 1 dia)
 * Período 2 (Descontado): dataInicioDescontos até dataFimFuncoes
 * Período 3 (Total): dataInicioFuncoes até dataFimFuncoes
 * 
 * IMPORTANTE: Os encargos são calculados EXCLUSIVAMENTE sobre o Período 1
 */
export function calcularPeriods(
  dataInicioFuncoes: string,
  dataFimFuncoes: string,
  dataInicioDescontos: string | null
): {
  tempoTotal: ResultadoTempo;
  tempoNaoDescontado: ResultadoTempo;
  tempoDescontado: ResultadoTempo;
  datas: {
    inicioNaoDescontado: string;
    fimNaoDescontado: string;
    inicioDescontado: string;
    fimDescontado: string;
  };
} {
  // Período 3: Tempo Total (do início até o fim)
  const tempoTotal = calcularTempo(dataInicioFuncoes, dataFimFuncoes);
  if (!tempoTotal) {
    throw new Error('Erro ao calcular tempo total');
  }

  // Se não há data de início de descontos, não há período não descontado
  if (!dataInicioDescontos) {
    return {
      tempoTotal,
      tempoNaoDescontado: { anos: 0, meses: 0, dias: 0, totalDias: 0 },
      tempoDescontado: tempoTotal,
      datas: {
        inicioNaoDescontado: '',
        fimNaoDescontado: '',
        inicioDescontado: dataInicioFuncoes,
        fimDescontado: dataFimFuncoes,
      }
    };
  }

  // Período 1: Tempo Não Descontado (do início até um dia ANTES de dataInicioDescontos)
  const fimNaoDescontado = subtrairUmDia(dataInicioDescontos);
  const tempoNaoDescontado = calcularTempo(dataInicioFuncoes, fimNaoDescontado);
  if (!tempoNaoDescontado) {
    throw new Error('Erro ao calcular tempo não descontado');
  }

  // Período 2: Tempo Descontado (de dataInicioDescontos até o fim)
  const tempoDescontado = calcularTempo(dataInicioDescontos, dataFimFuncoes);
  if (!tempoDescontado) {
    throw new Error('Erro ao calcular tempo descontado');
  }

  return {
    tempoTotal,
    tempoNaoDescontado,
    tempoDescontado,
    datas: {
      inicioNaoDescontado: dataInicioFuncoes,
      fimNaoDescontado,
      inicioDescontado: dataInicioDescontos,
      fimDescontado: dataFimFuncoes,
    }
  };
}
