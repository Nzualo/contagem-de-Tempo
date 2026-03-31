/**
 * Gerador de PDF - Fixação de Encargos
 * Template visual baseado no modelo fornecido
 */

import jsPDF from 'jspdf';
import { TempoCalculado, gerarDemonstracao } from '../calculators/timeCalculator';

export interface DadosFixacaoEncargos {
  nomeFunc: string;
  categoria: string;
  classe: string;
  escalao: string;
  dataInicio: string;
  dataFim: string;
  tempo: TempoCalculado;
  salarioBase: number;
  encargosValor: number;
}

/**
 * Gera PDF da Fixação de Encargos conforme modelo oficial
 */
export async function gerarPDFFixacaoEncargos(
  dados: DadosFixacaoEncargos
): Promise<Blob> {
  // Cria documento A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  let yPos = margin;

  // Cabeçalho oficial
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  const cabecalho = [
    'REPÚBLICA DE MOÇAMBIQUE',
    'GOVERNO DO DISTRITO DE INHASSORO',
    'SERVIÇO DISTRITAL DE EDUCAÇÃO JUVENTUDE E TECNOLOGIA'
  ];

  for (const linha of cabecalho) {
    doc.text(linha, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  // Linha divisória
  yPos += 2;
  doc.setDrawColor(0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Título
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FIXAÇÃO DE ENCARGOS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Seção de dados do funcionário
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO FUNCIONÁRIO', margin, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const dadosFunc = [
    [`Nome: ${dados.nomeFunc}`],
    [`Categoria: ${dados.categoria}`, `Classe: ${dados.classe}`, `Escalão: ${dados.escalao}`]
  ];

  for (const linha of dadosFunc) {
    let xOffset = margin;
    for (const texto of linha) {
      doc.text(texto, xOffset, yPos);
      xOffset += contentWidth / linha.length;
    }
    yPos += 5;
  }

  yPos += 3;

  // Tabela de contagem de tempo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTAGEM DE TEMPO', margin, yPos);
  yPos += 6;

  // Cabeçalhos da tabela
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  const colWidths = contentWidth / 4;
  const headers = ['Data Início', 'Data Fim', 'Tempo Total', 'Demonstração'];
  let xOffset = margin;

  for (const header of headers) {
    doc.text(header, xOffset, yPos, { maxWidth: colWidths - 1 });
    xOffset += colWidths;
  }

  yPos += 6;

  // Conteúdo da tabela
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  xOffset = margin;
  doc.text(dados.dataInicio, xOffset, yPos);
  xOffset += colWidths;

  doc.text(dados.dataFim, xOffset, yPos);
  xOffset += colWidths;

  const tempoFormat = `${dados.tempo.anos}a ${dados.tempo.meses}m ${dados.tempo.dias}d`;
  doc.text(tempoFormat, xOffset, yPos);
  xOffset += colWidths;

  const demonstracao = gerarDemonstracao(dados.tempo);
  doc.text(demonstracao.formula1, xOffset, yPos, { maxWidth: colWidths - 1 });
  
  yPos += 10;

  // Tabela de encargos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CÁLCULO E ENCARGOS', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Fórmula principal
  const mesesTotais = dados.tempo.anos * 12 + dados.tempo.meses;
  doc.text(`Meses Totais: (${dados.tempo.anos} × 12) + ${dados.tempo.meses} = ${mesesTotais}`, margin, yPos);
  yPos += 5;

  // Cálculo de encargos
  doc.text(`Taxa de Encargos: ${mesesTotais} meses × 7% = ${dados.encargosValor.toFixed(2)} MZN`, margin, yPos);
  yPos += 8;

  // Tabela de resumo com colunas A, M, D
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  const colWidth = contentWidth / 3;
  doc.text('Anos (A)', margin, yPos);
  doc.text('Meses (M)', margin + colWidth, yPos);
  doc.text('Dias (D)', margin + 2 * colWidth, yPos);
  
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Valores
  doc.text(String(dados.tempo.anos), margin + colWidth / 2, yPos, { align: 'center' });
  doc.text(String(dados.tempo.meses), margin + colWidth + colWidth / 2, yPos, { align: 'center' });
  doc.text(String(dados.tempo.dias), margin + 2 * colWidth + colWidth / 2, yPos, { align: 'center' });

  yPos += 10;

  // Rodapé
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const data = new Date();
  const dataHoje = `${data.getDate()}/${data.getMonth() + 1}/${data.getFullYear()}`;
  
  doc.text(`Documento gerado em: ${dataHoje}`, margin, pageHeight - margin - 5);
  doc.text('Sistema de Contagem de Tempo e Fixação de Encargos', margin, pageHeight - margin);

  // Converte para blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Download do PDF gerado
 */
export function downloadPDF(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Valida dados antes de gerar PDF
 */
export function validarDados(dados: DadosFixacaoEncargos): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!dados.nomeFunc || dados.nomeFunc.trim().length === 0) {
    erros.push('Nome do funcionário é obrigatório');
  }

  if (!dados.categoria || dados.categoria.trim().length === 0) {
    erros.push('Categoria é obrigatória');
  }

  if (!dados.dataInicio || !dados.dataFim) {
    erros.push('Datas de início e fim são obrigatórias');
  }

  if (dados.salarioBase <= 0) {
    erros.push('Salário base deve ser maior que zero');
  }

  if (dados.tempo.totalDias < 0) {
    erros.push('Período de tempo inválido');
  }

  return {
    valido: erros.length === 0,
    erros
  };
}
