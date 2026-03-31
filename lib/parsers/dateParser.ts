/**
 * Parser de datas em português para formato ISO (AAAA-MM-DD)
 * Converte datas extensas como "treze de Fevereiro de mil novecentos oitenta e sete"
 * para formato padrão ISO
 */

// Mapas para conversão
const MESES: Record<string, number> = {
  'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
  'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
  'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
};

const NUMEROS_PALAVRAS: Record<string, number> = {
  'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'quatro': 4,
  'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
  'onze': 11, 'doze': 12, 'treze': 13, 'catorze': 14, 'quinze': 15,
  'dezasseis': 16, 'dezassete': 17, 'dezoito': 18, 'dezanove': 19,
  'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
  'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90
};

const MILHARES: Record<string, number> = {
  'cem': 100, 'cento': 100, 'mil': 1000, 'milhão': 1000000
};

/**
 * Converte numero por extenso para número
 * Exemplo: "vinte e três" -> 23
 */
function parseNumeroPalavra(texto: string): number {
  if (!texto) return 0;
  
  const palavras = texto
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(p => p.length > 0);

  let resultado = 0;
  let acumulador = 0;

  for (const palavra of palavras) {
    if (palavra === 'e') continue;
    
    if (NUMEROS_PALAVRAS[palavra]) {
      acumulador += NUMEROS_PALAVRAS[palavra];
    } else if (palavra === 'cento') {
      acumulador = 100;
    } else if (palavra === 'mil') {
      acumulador *= 1000;
      resultado += acumulador;
      acumulador = 0;
    } else if (palavra === 'milhão') {
      acumulador *= 1000000;
      resultado += acumulador;
      acumulador = 0;
    }
  }

  return resultado + acumulador;
}

/**
 * Extrai componentes de data (dia, mês, ano) do texto
 * Retorna objeto com os componentes ou null se não conseguir parser
 */
function extrairComponentesData(texto: string): {
  dia: number;
  mes: number;
  ano: number;
} | null {
  // Normaliza o texto
  const textNorm = texto
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '')
    .replace(/à/g, 'a');

  // Padrão: número-palavra [e número-palavra]* de mês de ano
  // Exemplo: "treze de Fevereiro de mil novecentos oitenta e sete"
  
  // Split por "de" para extrair componentes
  const partes = textNorm.split(' de ');
  
  if (partes.length < 3) return null;

  try {
    // Primeiro parte: dia
    const diaTexto = partes[0].trim();
    const dia = parseNumeroPalavra(diaTexto);

    // Segunda parte: mês
    const mesTexto = partes[1].trim().split(' ')[0];
    const mes = MESES[mesTexto];

    // Terceira parte e depois: ano
    const anoTexto = partes.slice(2).join(' de ').trim();
    const ano = parseNumeroPalavra(anoTexto);

    // Validações
    if (dia < 1 || dia > 31 || !mes || ano < 1800 || ano > 2100) {
      return null;
    }

    return { dia, mes, ano };
  } catch {
    return null;
  }
}

/**
 * Converte data em português para formato ISO
 * Exemplo: "treze de Fevereiro de mil novecentos oitenta e sete" -> "1987-02-13"
 */
export function parseDataPortugues(texto: string): string | null {
  const componentes = extrairComponentesData(texto);
  
  if (!componentes) {
    return null;
  }

  const { dia, mes, ano } = componentes;
  
  // Formata para ISO (AAAA-MM-DD)
  const diaStr = String(dia).padStart(2, '0');
  const mesStr = String(mes).padStart(2, '0');
  
  return `${ano}-${mesStr}-${diaStr}`;
}

/**
 * Extrai nome do funcionário e datas do texto de um PDF
 * Retorna objeto com nome, dataInicio e dataFim
 */
export function extrairDadosCertidao(texto: string): {
  nome: string | null;
  dataInicio: string | null;
  dataFim: string | null;
} {
  // Tenta extrair nome (geralmente vem depois de "Nome:" ou no inicio)
  const linhas = texto.split('\n');
  let nome: string | null = null;
  let dataInicio: string | null = null;
  let dataFim: string | null = null;

  // Procura padrões
  for (const linha of linhas) {
    const linhaNorm = linha.trim();
    
    // Tenta extrair nome
    if (!nome && (linhaNorm.toLowerCase().includes('nome') || linhaNorm.length > 20)) {
      const match = linhaNorm.match(/(?:Nome\s*[:]*\s*)?([A-ZÃÇ][a-záàâãéèêíïóôõöúçñ\s]+)/i);
      if (match) {
        nome = match[1].trim();
      }
    }

    // Tenta extrair datas (padrão: "de DD de MMMM de AAAA")
    const palavrasData = linhaNorm.toLowerCase().split(' ');
    
    for (let i = 0; i < palavrasData.length - 2; i++) {
      if ((palavrasData[i] === 'de' || palavrasData[i] === 'a' || palavrasData[i] === 'á') &&
          NUMEROS_PALAVRAS[palavrasData[i + 1]] && 
          MESES[palavrasData[i + 2]]) {
        
        // Encontrou possível data
        let dataPart = '';
        let j = i;
        while (j < palavrasData.length && j < i + 8) {
          dataPart += (dataPart ? ' ' : '') + palavrasData[j];
          j++;
        }
        
        const dataParsed = parseDataPortugues(dataPart);
        if (dataParsed) {
          if (!dataInicio) {
            dataInicio = dataParsed;
          } else if (!dataFim && dataInicio !== dataParsed) {
            dataFim = dataParsed;
            break; // Encontrou ambas as datas
          }
        }
      }
    }

    if (nome && dataInicio && dataFim) {
      break; // Extraiu tudo o que precisava
    }
  }

  return { nome, dataInicio, dataFim };
}

/**
 * Valida se a data está em formato ISO válido
 */
export function validarDataISO(data: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(data)) return false;
  
  const d = new Date(data + 'T00:00:00Z');
  return d instanceof Date && !isNaN(d.getTime());
}
