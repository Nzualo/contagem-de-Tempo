/**
 * Parser de datas em português para ISO 8601
 * Converte datas escritas por extenso (ex: "treze de Fevereiro de mil novecentos oitenta e sete")
 * para formato ISO (AAAA-MM-DD)
 */

// Mapeamento de números escritos em português
const numerosPortugues: Record<string, number> = {
  'um': 1, 'uma': 1,
  'dois': 2, 'duas': 2,
  'três': 3, 'trê': 3,
  'quatro': 4,
  'cinco': 5,
  'seis': 6,
  'sete': 7,
  'oito': 8,
  'oitocentos': 800,
  'novecentos': 900,
  'novecentas': 900,
  'nove': 9,
  'dez': 10,
  'onze': 11,
  'doze': 12,
  'treze': 13,
  'quatorze': 14,
  'quinze': 15,
  'dezasseis': 16,
  'dezassete': 17,
  'dezoito': 18,
  'dezanove': 19,
  'vinte': 20,
  'trinta': 30,
  'quarenta': 40,
  'cinquenta': 50,
  'sessenta': 60,
  'setenta': 70,
  'oitenta': 80,
  'noventa': 90,
  'cem': 100,
  'cento': 100,
  'duzentos': 200,
  'trezentos': 300,
  'quatrocentos': 400,
  'quinhentos': 500,
  'seiscentos': 600,
  'setecentos': 700,
  'mil': 1000,
  'milhão': 1000000,
};

// Mapeamento de meses
const mesesPortugues: Record<string, number> = {
  'janeiro': 1, 'jesuita': 1,
  'fevereiro': 2,
  'março': 3,
  'abril': 4,
  'maio': 5,
  'junho': 6,
  'julho': 7,
  'agosto': 8,
  'setembro': 9,
  'outubro': 10,
  'novembro': 11,
  'dezembro': 12,
};

/**
 * Converte um número escrito em português para inteiro
 * Exemplo: "vinte e cinco" -> 25
 */
export function converterNumeroPortugues(texto: string): number {
  if (!texto) return 0;
  
  // Limpa o texto
  texto = texto.toLowerCase().trim();
  texto = texto.replace(/\s+/g, ' ');
  
  // Split por "e" para processar partes
  const partes = texto.split(/\s+e\s+|\s+/);
  let total = 0;
  let valor_atual = 0;
  
  for (const parte of partes) {
    if (parte === '') continue;
    
    if (numerosPortugues[parte]) {
      const num = numerosPortugues[parte];
      if (num >= 1000) {
        valor_atual = (valor_atual || 1) * num;
        total += valor_atual;
        valor_atual = 0;
      } else if (num >= 100) {
        valor_atual = (valor_atual || 1) * num;
      } else {
        valor_atual += num;
      }
    }
  }
  
  return total + valor_atual;
}

/**
 * Extrai data de um texto em português
 * Procura por padrões como "treze de Fevereiro de mil novecentos oitenta e sete"
 */
export function extrairData(texto: string): Date | null {
  if (!texto) return null;
  
  // Normaliza o texto
  texto = texto.replace(/\s+/g, ' ').toLowerCase().trim();
  
  // Remove pontuação comum
  texto = texto.replace(/[.,;:]/g, '');
  
  // Padrão: "dia de mes de ano"
  // Exemplo: "treze de fevereiro de mil novecentos oitenta e sete"
  
  // Tenta encontrar mês
  let mes = 0;
  for (const [nomeMes, numMes] of Object.entries(mesesPortugues)) {
    if (texto.includes(nomeMes)) {
      mes = numMes;
      break;
    }
  }
  
  if (mes === 0) return null;
  
  // Divide por "de" para extrair partes
  const partes = texto.split(/\s+de\s+/);
  
  if (partes.length < 3) return null;
  
  try {
    // Extrai dia
    const dia = converterNumeroPortugues(partes[0]);
    
    // O mês já foi encontrado acima
    
    // Extrai ano (última parte)
    let anoTexto = partes[2];
    
    // Remove texto após "de" se houver
    const match = anoTexto.match(/(.+?)(?:\s+de\s+|$)/);
    if (match) {
      anoTexto = match[1];
    }
    
    const ano = converterNumeroPortugues(anoTexto);
    
    // Validações
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900 || ano > 2100) {
      return null;
    }
    
    return new Date(ano, mes - 1, dia);
  } catch (error) {
    return null;
  }
}

/**
 * Extrai Name e datas de um texto extraído de PDF
 * Retorna { nome, dataInicio, dataFim }
 */
export function extrairDadosCertidao(texto: string): {
  nome: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
} {
  // Procura por nome (geralmente após "Certificamos que" ou similar)
  let nome: string | null = null;
  
  // Padrão para nome (geralmente em maiúsculas ou após palavras específicas)
  const nomeRegex = /(?:certificamos que|nome|ficha.{0,20}?(?:de|:))\s+([A-ZÀÁÂÃÄÅ][A-Za-záàâãäéèêëíìîïóòôõöúùûüýýÿçñ\s]+)/i;
  const matchNome = texto.match(nomeRegex);
  if (matchNome) {
    nome = matchNome[1].trim();
  }
  
  // Se não encontrou, tenta a primeira linha de maiúsculas
  if (!nome) {
    const primeiraLinha = texto.split('\n')[0];
    if (primeiraLinha && /[A-Z]/.test(primeiraLinha)) {
      nome = primeiraLinha.trim();
    }
  }
  
  // Procura por datas
  let dataInicio: Date | null = null;
  let dataFim: Date | null = null;
  
  // Procura por padrões de data (múltiplas tentativas)
  const linhas = texto.split('\n');
  
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    
    if (!dataInicio && (linha.includes('início') || linha.includes('a partir') || i < 5)) {
      const data = extrairData(linha);
      if (data || (dataInicio === null && i < 10)) {
        if (data) {
          dataInicio = data;
        }
      }
    }
    
    if (dataInicio && !dataFim && (linha.includes('fim') || linha.includes('até') || linha.includes('á'))) {
      const data = extrairData(linha);
      if (data) {
        dataFim = data;
        break;
      }
    }
  }
  
  // Se ainda não encontrou dataFim, procura por "á" ou "até"
  if (dataInicio && !dataFim) {
    const regexAte = /(?:á|até)\s+([^,.\n]+(?:de\s+[^,.\n]+){2})/i;
    const matchAte = texto.match(regexAte);
    if (matchAte) {
      const data = extrairData(matchAte[1]);
      if (data) {
        dataFim = data;
      }
    }
  }
  
  return {
    nome: nome?.substring(0, 100) || null,
    dataInicio,
    dataFim,
  };
}

/**
 * Formata data para ISO 8601
 */
export function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
