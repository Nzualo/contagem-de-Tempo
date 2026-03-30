import { Document, Packer, Paragraph, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, TextRun, Header, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';

export interface DadosWordExportacao {
  nomeFunc: string;
  categoria: string;
  classe: string;
  escalao: string;
  dataInicio: string;
  dataFim: string;
  salarioBase: number;
  
  // Tempos
  anosTotais: number;
  mesesTotais: number;
  diasTotais: number;
  
  anoNaoDescontado: number;
  mesNaoDescontado: number;
  diaNaoDescontado: number;
  
  // Encargos e Prestações
  encargoMensal: number;
  encargoDiario: number;
  dividaTotal: number;
  numeroPrestacoes: number;
  primeiraPrestacao: number;
  valorRestantes: number;
}

/**
 * Helper para criar parágrafo com bold
 */
function criarParagrafoComBold(
  texto: string,
  bold: boolean = false,
  alignment: any = AlignmentType.LEFT,
  spacing: any = {}
): Paragraph {
  return new Paragraph({
    alignment,
    spacing,
    children: [
      new TextRun({
        text: texto,
        bold,
        size: 22,
      }),
    ],
  });
}

/**
 * Cria célula de tabela com formatação padrão
 */
function criarCelula(
  conteudo: string,
  opcoes?: {
    bold?: boolean;
    align?: string;
    width?: number;
    shading?: { fill: string };
  }
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        text: conteudo,
        alignment: (opcoes?.align || AlignmentType.CENTER) as any,
        children: [
          new TextRun({
            text: conteudo,
            bold: opcoes?.bold || false,
            size: 20,
          }),
        ],
      }),
    ],
    width: { size: opcoes?.width || 1000, type: WidthType.DXA },
    shading: opcoes?.shading,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
}

/**
 * Cria parágrafo com linhas pontilhadas para demonstração
 */
function criarLinhaDemonstracao(esquerda: string, direita: string): Paragraph {
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

/**
 * Gera documento Word (.docx) com todas as demonstrações
 */
export async function gerarDocumentoWord(dados: DadosWordExportacao): Promise<void> {
  // Calcular valores derivados
  const totalMesesNaoDescontado = dados.anoNaoDescontado * 12 + dados.mesNaoDescontado;
  const valorTotalMeses = dados.encargoMensal * totalMesesNaoDescontado;
  const valorTotalDias = dados.encargoDiario * dados.diaNaoDescontado;

  const doc = new Document({
    sections: [
      {
        children: [
          // CABEÇALHO
          criarParagrafoComBold('REPÚBLICA DE MOÇAMBIQUE', true, AlignmentType.CENTER, { after: 100 }),
          criarParagrafoComBold('GOVERNO DO DISTRITO DE INHASSORO', false, AlignmentType.CENTER, { after: 100 }),
          criarParagrafoComBold('SERVIÇO DISTRITAL DE EDUCAÇÃO JUVENTUDE E TECNOLOGIA', true, AlignmentType.CENTER, { after: 200 }),

          // DADOS DO FUNCIONÁRIO
          criarParagrafoComBold(`Nome: ${dados.nomeFunc}`, false, AlignmentType.LEFT, { after: 100 }),
          criarParagrafoComBold(`Categoria: ${dados.categoria}`, false, AlignmentType.LEFT, { after: 100 }),
          criarParagrafoComBold(`Classe: ${dados.classe} | Escalão: ${dados.escalao}`, false, AlignmentType.LEFT, { after: 200 }),

          // TABELA 1: CONTAGEM DE TEMPO
          criarParagrafoComBold('CONTAGEM DE TEMPO', true, AlignmentType.CENTER, { after: 200 }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  criarCelula('OBSERVAÇÃO', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('DATA', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('A', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('M', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('D', { bold: true, shading: { fill: 'D3D3D3' } }),
                ],
              }),
              new TableRow({
                children: [
                  criarCelula('Início de Funções'),
                  criarCelula(dados.dataInicio),
                  criarCelula(''),
                  criarCelula(''),
                  criarCelula(''),
                ],
              }),
              new TableRow({
                children: [
                  criarCelula('Fim de Funções'),
                  criarCelula(dados.dataFim),
                  criarCelula(''),
                  criarCelula(''),
                  criarCelula(''),
                ],
              }),
              new TableRow({
                children: [
                  criarCelula('TOTAL', { bold: true, shading: { fill: 'E8F4F8' } }),
                  criarCelula(''),
                  criarCelula(dados.anosTotais.toString()),
                  criarCelula(dados.mesesTotais.toString()),
                  criarCelula(dados.diasTotais.toString()),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // TABELA 2: ENCARGOS
          criarParagrafoComBold('ENCARGOS', true, AlignmentType.CENTER, { after: 200 }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  criarCelula('OBSERVAÇÃO', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('DATA', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('A', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('M', { bold: true, shading: { fill: 'D3D3D3' } }),
                  criarCelula('D', { bold: true, shading: { fill: 'D3D3D3' } }),
                ],
              }),
              new TableRow({
                children: [
                  criarCelula('Período Não Descontado'),
                  criarCelula(''),
                  criarCelula(dados.anoNaoDescontado.toString()),
                  criarCelula(dados.mesNaoDescontado.toString()),
                  criarCelula(dados.diaNaoDescontado.toString()),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 300 } }),

          // SECÇÃO DEMONSTRAÇÃO
          criarParagrafoComBold('DEMONSTRAÇÃO', true, AlignmentType.CENTER, { after: 200 }),

          // Linha 1: Conversão do tempo
          criarLinhaDemonstracao(
            `A ${dados.anoNaoDescontado} M ${dados.mesNaoDescontado} D ${dados.diaNaoDescontado}`,
            `${dados.anoNaoDescontado} × 12 + ${dados.mesNaoDescontado} = ${totalMesesNaoDescontado} meses e ${dados.diaNaoDescontado} dias`
          ),

          // Linha 2: Cálculo financeiro dos meses
          criarLinhaDemonstracao(
            `${dados.salarioBase.toFixed(2)}Mt × 7% = ${dados.encargoMensal.toFixed(2)}Mt × ${totalMesesNaoDescontado}M`,
            `${valorTotalMeses.toFixed(2)}Mt`
          ),

          // Linha 3: Cálculo financeiro dos dias
          criarLinhaDemonstracao(
            `${dados.encargoMensal.toFixed(2)}Mt ÷ 30 = ${dados.encargoDiario.toFixed(2)}Mt × ${dados.diaNaoDescontado}d`,
            `${valorTotalDias.toFixed(2)}Mt`
          ),

          // Linha 4: Soma para a Dívida Total
          criarLinhaDemonstracao(
            `${valorTotalMeses.toFixed(2)}Mt + ${valorTotalDias.toFixed(2)}Mt`,
            `${dados.dividaTotal.toFixed(2)}Mt`
          ),

          new Paragraph({ text: '', spacing: { after: 100 } }),

          // Linha 5: Cálculo das Prestações
          criarLinhaDemonstracao(
            `${dados.dividaTotal.toFixed(2)}Mt ÷ ${dados.numeroPrestacoes} Prestações`,
            ''
          ),

          // Linha 6: 1ª Prestação
          criarLinhaDemonstracao(
            `1ª`,
            `${dados.primeiraPrestacao.toFixed(2)}Mt`
          ),

          // Linha 7: Restantes Prestações
          criarLinhaDemonstracao(
            `Rests (${dados.numeroPrestacoes - 1})`,
            `${dados.valorRestantes.toFixed(2)}Mt`
          ),

          new Paragraph({ text: '', spacing: { after: 300 } }),

          // RODAPÉ
          new Paragraph({
            text: 'O Informante',
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          criarParagrafoComBold('O Informante', false, AlignmentType.CENTER, { after: 100 }),
          criarParagrafoComBold('________________', false, AlignmentType.CENTER, { after: 300 }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Gerado automaticamente pelo Sistema de Contagem de Tempo e Fixação de Encargos',
                size: 18,
                color: '999999',
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Gera e baixa o documento
  const blob = await Packer.toBlob(doc);
  const nomeArquivo = `Fixacao_Encargos_${dados.nomeFunc}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, nomeArquivo);
}
