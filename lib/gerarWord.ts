import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, TabStopType } from 'docx';
import { saveAs } from 'file-saver';
import { calcularTempoDetalhado } from './calculos';

type AnyDados = any;

function criarParagrafoComBold(texto: string, bold = false, alignment = AlignmentType.LEFT, spacing: any = {}) {
  return new Paragraph({
    alignment,
    spacing,
    children: [
      new TextRun({
        text: texto,
        bold,
      }),
    ],
  });
}

function criarCelula(conteudo: string, opcoes?: { bold?: boolean; align?: any; width?: number; shading?: { fill: string } }) {
  return new TableCell({
    children: [
      new Paragraph({
        text: conteudo,
        alignment: opcoes?.align ?? AlignmentType.CENTER,
        children: [new TextRun({ text: conteudo, bold: !!opcoes?.bold })],
      }),
    ],
    width: { size: opcoes?.width ?? 1000, type: WidthType.DXA },
    shading: opcoes?.shading,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
}

function criarCelulaObservacaoComFormulas(linhas: string[]): TableCell {
  const paragrafos = linhas.map(linha => new Paragraph({
    children: [new TextRun({ text: linha })],
    spacing: { line: 240, lineRule: 'auto' }
  }));
  return new TableCell({
    children: paragrafos,
    width: { size: 2000, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
}

function criarLinhaDemonstracao(esquerda: string, direita: string) {
  const tamanhoTotal = 80;
  const tamanhoEsquerda = esquerda.length;
  const tamanhoDireita = direita.length;
  const pontilhos = Math.max(1, tamanhoTotal - tamanhoEsquerda - tamanhoDireita);
  return new Paragraph({
    text: `${esquerda}${'.'.repeat(pontilhos)}${direita}`,
    alignment: AlignmentType.LEFT,
    spacing: { line: 240, lineRule: 'auto' },
  });
}

export default async function gerarDocumentoWord(dados: AnyDados): Promise<void> {
  // Tenta carregar emblema (não falha se não existir)
  let imageData: Uint8Array | undefined;
  try {
    const resp = await fetch('/emblema.png');
    if (resp.ok) {
      const ab = await resp.arrayBuffer();
      imageData = new Uint8Array(ab);
    }
  } catch (err) {
    // ignore
  }

  // Extrai campos com tolerância ao formato que o componente envia
  const nome = dados.nome || dados.nomeFunc || '';
  const categoria = dados.categoria || '';
  const classe = dados.classe || '';
  const escalao = dados.escalao || '';

  const nao = dados.tempoNaoDescontado || dados;
  const anos = nao.anos ?? nao.anoNaoDescontado ?? 0;
  const meses = nao.meses ?? nao.mesNaoDescontado ?? 0;
  const dias = nao.dias ?? nao.diaNaoDescontado ?? 0;

  const encargos = dados.encargos || {};
  const encargoMensal = encargos.encargoMensal ?? 0;
  const encargoDiario = encargos.encargoDiario ?? 0;
  const salarioBase = encargos.salarioBase ?? 0;

  const prest = dados.prestacoes || {};
  const numeroPrestacoes = prest.numeroPrestacoes ?? 1;
  const primeiraPrestacao = prest.primeiraPrestacao ?? 0;
  const valorRestantes = prest.valorRestantes ?? 0;
  const dividaTotal = prest.dividaTotal ?? 0;

  const totalMeses = anos * 12 + meses;
  const valorTotalMeses = Number((encargoMensal * totalMeses).toFixed(2));
  const valorTotalDias = Number((encargoDiario * dias).toFixed(2));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [],
      },
    ],
  });

  const children: any[] = [];

  if (imageData) {
    children.push(
      new Paragraph({
        children: [new ImageRun(({ data: imageData, transformation: { width: 80, height: 80 } }) as any)],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  // Cabeçalho oficial (3 linhas, bold, centralizadas)
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'REPÚBLICA DE MOÇAMBIQUE', bold: true })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: 'GOVERNO DO DISTRITO DE INHASSORO', bold: true })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: 'SERVIÇO DISTRITAL DE EDUCAÇÃO JUVENTUDE E TECNOLOGIA', bold: true })], alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' })
  );

  const linhaFuncionario = `Nome: ${nome}    Categoria: ${categoria}    Classe: ${classe}    Escalão: ${escalao}`;
  children.push(new Paragraph({ children: [new TextRun({ text: linhaFuncionario })], alignment: AlignmentType.LEFT }));
  children.push(new Paragraph({ text: '' }));

  // Calcular tempo detalhado para a tabela CONTAGEM DE TEMPO (tempo total)
  const inicioNaoDescontado = dados?.datas?.inicioNaoDescontado || dados?.dataInicio || '';
  const fimNaoDescontado = dados?.datas?.fimNaoDescontado || dados?.dataFim || '';
  
  // Uso dataInicio e dataFim do top-level para gerar a tabela principal
  const dataInicio = dados?.dataInicio || inicioNaoDescontado;
  const dataFim = dados?.dataFim || fimNaoDescontado;
  
  const tempoDetalhado = calcularTempoDetalhado(dataInicio, dataFim);

  // TABELA: CONTAGEM DE TEMPO (com desdobramento em 4 linhas)
  children.push(new Paragraph({ children: [new TextRun({ text: 'CONTAGEM DE TEMPO', bold: true })], alignment: AlignmentType.CENTER }));
  const cabecalhos = ['OBSERVAÇÃO', 'DATA', 'A','M','D','A','M','D','A','M','D','A','M','D','A','M','D'];
  const headerCells = cabecalhos.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], width: { size: Math.floor(100/ cabecalhos.length), type: WidthType.PERCENTAGE } }));
  
  const rowsContagemTempo: TableRow[] = [new TableRow({ children: headerCells })];
  
  if (tempoDetalhado) {
    const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
    const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
    
    // Linha 1: Tempo trabalhado nesse ano (ano de ingresso)
    const linha1Obs = criarCelulaObservacaoComFormulas([
      `Tempo trabalhado nesse ano (${anoInicio})`,
      `Dias: 30 - ${diaInicio} + 1 = ${tempoDetalhado.bloco1.dias}`,
      `Meses: 12 - ${mesInicio} = ${tempoDetalhado.bloco1.meses}`,
      `Anos: ${anoInicio} - ${anoInicio} = 0`
    ]);
    const linha1Data = `${dataInicio} a 30/12/${anoInicio}`;
    const linha1Row = [
      linha1Obs,
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: linha1Data })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '0' })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.bloco1.meses) })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.bloco1.dias) })] })] }),
    ];
    for (let i = 0; i < (cabecalhos.length - 5); i++) {
      linha1Row.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
    }
    rowsContagemTempo.push(new TableRow({ children: linha1Row }));
    
    // Linha 2: Tempo trabalhado a partir do ano seguinte
    const linha2Obs = criarCelulaObservacaoComFormulas([
      `Tempo trabalhado a partir de ${anoInicio + 1} ao último dia`,
      `Dias: ${diaFim}`,
      `Meses: ${mesFim} - 1 = ${tempoDetalhado.bloco2.meses}`,
      `Anos: ${anoFim} - ${anoInicio + 1} = ${tempoDetalhado.bloco2.anos}`
    ]);
    const linha2Data = `01/01/${anoInicio + 1} a ${dataFim}`;
    const linha2Row = [
      linha2Obs,
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: linha2Data })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.bloco2.anos) })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.bloco2.meses) })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.bloco2.dias) })] })] }),
    ];
    for (let i = 0; i < (cabecalhos.length - 5); i++) {
      linha2Row.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
    }
    rowsContagemTempo.push(new TableRow({ children: linha2Row }));
    
    // Linha 3: TOTAL de Tempo (bruto)
    const linha3Obs = criarCelulaObservacaoComFormulas([
      'TOTAL de Tempo que o FAE trabalhou',
      `Soma Dias: ${tempoDetalhado.bloco1.dias} + ${tempoDetalhado.bloco2.dias} = ${tempoDetalhado.somaBruta.dias}`,
      `Soma Meses: ${tempoDetalhado.bloco1.meses} + ${tempoDetalhado.bloco2.meses} = ${tempoDetalhado.somaBruta.meses}`,
      `Soma Anos: 0 + ${tempoDetalhado.bloco2.anos} = ${tempoDetalhado.somaBruta.anos}`
    ]);
    const linha3Row = [
      linha3Obs,
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.somaBruta.anos) })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.somaBruta.meses) })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.somaBruta.dias) })] })] }),
    ];
    for (let i = 0; i < (cabecalhos.length - 5); i++) {
      linha3Row.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
    }
    rowsContagemTempo.push(new TableRow({ children: linha3Row }));
    
    // Linha 4: Tempo de Serviço (Convertido)
    const linha4Obs = criarCelulaObservacaoComFormulas([
      'Tempo de Serviço (Convertido)',
      'Conversão: 12 meses = 1 ano / 30 dias = 1 mês'
    ]);
    const linha4Row = [
      linha4Obs,
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.somaConvertida.anos) })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.somaConvertida.meses) })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoDetalhado.somaConvertida.dias) })] })] }),
    ];
    for (let i = 0; i < (cabecalhos.length - 5); i++) {
      linha4Row.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
    }
    rowsContagemTempo.push(new TableRow({ children: linha4Row }));
  }
  
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsContagemTempo }));

  children.push(new Paragraph({ text: '' }));

  // TABELA: ENCARGOS (mesma estrutura de 4 linhas, usando tempo não descontado)
  children.push(new Paragraph({ children: [new TextRun({ text: 'ENCARGOS', bold: true })], alignment: AlignmentType.CENTER }));
  const headerCellsEnc = cabecalhos.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], width: { size: Math.floor(100/ cabecalhos.length), type: WidthType.PERCENTAGE } }));
  
  const rowsEncargos: TableRow[] = [new TableRow({ children: headerCellsEnc })];
  
  // Se há tempo não descontado definido, calcula e insere as 4 linhas
  if (inicioNaoDescontado && fimNaoDescontado) {
    const tempoNaoDescontadoDetalhado = calcularTempoDetalhado(inicioNaoDescontado, fimNaoDescontado);
    if (tempoNaoDescontadoDetalhado) {
      const [anoInicioNao, mesInicioNao, diaInicioNao] = inicioNaoDescontado.split('-').map(Number);
      const [anoFimNao, mesFimNao, diaFimNao] = fimNaoDescontado.split('-').map(Number);
      
      // Linha 1: Tempo trabalhado nesse ano
      const linha1ObsEnc = criarCelulaObservacaoComFormulas([
        `Tempo trabalhado nesse ano (${anoInicioNao})`,
        `Dias: 30 - ${diaInicioNao} + 1 = ${tempoNaoDescontadoDetalhado.bloco1.dias}`,
        `Meses: 12 - ${mesInicioNao} = ${tempoNaoDescontadoDetalhado.bloco1.meses}`,
        `Anos: ${anoInicioNao} - ${anoInicioNao} = 0`
      ]);
      const linha1DataEnc = `${inicioNaoDescontado} a 30/12/${anoInicioNao}`;
      const linha1RowEnc = [
        linha1ObsEnc,
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: linha1DataEnc })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '0' })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.bloco1.meses) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.bloco1.dias) })] })] }),
      ];
      for (let i = 0; i < (cabecalhos.length - 5); i++) {
        linha1RowEnc.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
      }
      rowsEncargos.push(new TableRow({ children: linha1RowEnc }));
      
      // Linha 2: Tempo trabalhado a partir do ano seguinte
      const linha2ObsEnc = criarCelulaObservacaoComFormulas([
        `Tempo trabalhado a partir de ${anoInicioNao + 1} ao último dia`,
        `Dias: ${diaFimNao}`,
        `Meses: ${mesFimNao} - 1 = ${tempoNaoDescontadoDetalhado.bloco2.meses}`,
        `Anos: ${anoFimNao} - ${anoInicioNao + 1} = ${tempoNaoDescontadoDetalhado.bloco2.anos}`
      ]);
      const linha2DataEnc = `01/01/${anoInicioNao + 1} a ${fimNaoDescontado}`;
      const linha2RowEnc = [
        linha2ObsEnc,
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: linha2DataEnc })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.bloco2.anos) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.bloco2.meses) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.bloco2.dias) })] })] }),
      ];
      for (let i = 0; i < (cabecalhos.length - 5); i++) {
        linha2RowEnc.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
      }
      rowsEncargos.push(new TableRow({ children: linha2RowEnc }));
      
      // Linha 3: TOTAL (bruto)
      const linha3ObsEnc = criarCelulaObservacaoComFormulas([
        'TOTAL de Tempo que o FAE trabalhou',
        `Soma Dias: ${tempoNaoDescontadoDetalhado.bloco1.dias} + ${tempoNaoDescontadoDetalhado.bloco2.dias} = ${tempoNaoDescontadoDetalhado.somaBruta.dias}`,
        `Soma Meses: ${tempoNaoDescontadoDetalhado.bloco1.meses} + ${tempoNaoDescontadoDetalhado.bloco2.meses} = ${tempoNaoDescontadoDetalhado.somaBruta.meses}`,
        `Soma Anos: 0 + ${tempoNaoDescontadoDetalhado.bloco2.anos} = ${tempoNaoDescontadoDetalhado.somaBruta.anos}`
      ]);
      const linha3RowEnc = [
        linha3ObsEnc,
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.somaBruta.anos) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.somaBruta.meses) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.somaBruta.dias) })] })] }),
      ];
      for (let i = 0; i < (cabecalhos.length - 5); i++) {
        linha3RowEnc.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
      }
      rowsEncargos.push(new TableRow({ children: linha3RowEnc }));
      
      // Linha 4: Tempo de Serviço (Convertido)
      const linha4ObsEnc = criarCelulaObservacaoComFormulas([
        'Tempo de Serviço (Convertido)',
        'Conversão: 12 meses = 1 ano / 30 dias = 1 mês'
      ]);
      const linha4RowEnc = [
        linha4ObsEnc,
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.somaConvertida.anos) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.somaConvertida.meses) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(tempoNaoDescontadoDetalhado.somaConvertida.dias) })] })] }),
      ];
      for (let i = 0; i < (cabecalhos.length - 5); i++) {
        linha4RowEnc.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }));
      }
      rowsEncargos.push(new TableRow({ children: linha4RowEnc }));
    }
  }
  
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsEncargos }));

  children.push(new Paragraph({ text: '' }));

  // SECÇÃO DEMONSTRAÇÃO com TabStops (dots)
  const tabStop = { type: TabStopType.RIGHT as any, position: 9000, leader: 'dot' as any };
  children.push(new Paragraph({ children: [new TextRun({ text: 'DEMONSTRAÇÃO', bold: true })], alignment: AlignmentType.CENTER }));

  // Linha 1
  children.push(new Paragraph({
    children: [new TextRun({ text: `A ${anos} M ${meses} D ${dias}\t${anos} x 12 + ${meses} = ${totalMeses} meses e ${dias} dias` })],
    tabStops: [tabStop]
  }));

  // Linha 2
  children.push(new Paragraph({
    children: [new TextRun({ text: `${salarioBase.toFixed(2)}Mt x 7% = ${encargoMensal.toFixed(2)}Mt x ${totalMeses}M\t${valorTotalMeses.toFixed(2)}Mt` })],
    tabStops: [tabStop]
  }));

  // Linha 3
  children.push(new Paragraph({
    children: [new TextRun({ text: `${encargoMensal.toFixed(2)}Mt ÷ 30 = ${encargoDiario.toFixed(2)}Mt x ${dias}d\t${valorTotalDias.toFixed(2)}Mt` })],
    tabStops: [tabStop]
  }));

  // Linha 4
  children.push(new Paragraph({
    children: [new TextRun({ text: `${valorTotalMeses.toFixed(2)}Mt + ${valorTotalDias.toFixed(2)}Mt\t${dividaTotal.toFixed(2)}Mt` })],
    tabStops: [tabStop]
  }));

  // Linha 5
  children.push(new Paragraph({
    children: [new TextRun({ text: `${dividaTotal.toFixed(2)}Mt ÷ ${numeroPrestacoes} Prestações` })],
    tabStops: [tabStop]
  }));

  // Linha 6
  children.push(new Paragraph({
    children: [new TextRun({ text: `1ª\t${primeiraPrestacao.toFixed(2)}Mt` })],
    tabStops: [tabStop]
  }));

  // Linha 7
  children.push(new Paragraph({
    children: [new TextRun({ text: `Rests\t${valorRestantes.toFixed(2)}Mt` })],
    tabStops: [tabStop]
  }));

  children.push(new Paragraph({ text: '' }));
  // Linha 8: O Informante alinhado à direita
  children.push(new Paragraph({ children: [new TextRun({ text: '\tO Informante' })], tabStops: [tabStop], alignment: AlignmentType.RIGHT }));

  const finalDoc = new Document({ sections: [{ properties: {}, children }] });

  const blob = await Packer.toBlob(finalDoc);
  const nomeArquivo = `Fixacao_Encargos_${(nome || 'documento').replace(/\s+/g, '_')}.docx`;
  saveAs(blob, nomeArquivo);
}
