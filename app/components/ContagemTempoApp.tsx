'use client';

import React, { useState, useRef } from 'react';
import { parseDataPortugues, extrairDadosCertidao, validarDataISO } from '@/lib/parsers/dateParser';
import { calcularTempo, calcularEncargos, formatarTempo, TempoCalculado } from '@/lib/calculators/timeCalculator';
import { gerarPDFFixacaoEncargos, DadosFixacaoEncargos, validarDados } from '@/lib/pdf-generator/fixacaoEncargosGenerator';
import { inserirFuncionario, inserirCalculoTempo, atualizarURLPDF } from '@/lib/supabase';
import { calcularTempo as calcularTempoLESSSOFE, gerarDemonstracaoCompleta, calcularPeriods } from '@/lib/calculos';
import gerarDocumentoWord from '@/lib/gerarWord';

interface FormData {
  nomeFunc: string;
  categoria: string;
  classe: string;
  escalao: string;
  dataInicio: string;
  dataFim: string;
  dataInicioEncargos: string;
  salarioBase: number;
  taxaPercentual: number;
  numeroPrestacoes: number;
}

export default function ContagemTempoApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'escolher' | 'manual' | 'upload'>('escolher');
  const [step, setStep] = useState<'step1' | 'formulario' | 'resultado'>('step1');
  const [pdfText, setPdfText] = useState('');
  const [tempoCalculado, setTempoCalculado] = useState<TempoCalculado | null>(null);
  const [demonstracao, setDemonstracao] = useState<any>(null);
  const [dadosExtraidos, setDadosExtraidos] = useState({
    nome: '',
    dataInicio: '',
    dataFim: ''
  });
  const [formData, setFormData] = useState<FormData>({
    nomeFunc: '',
    categoria: '',
    classe: '',
    escalao: '',
    dataInicio: '',
    dataFim: '',
    dataInicioEncargos: '',
    salarioBase: 0,
    taxaPercentual: 7,
    numeroPrestacoes: 10
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handler para upload e parsing do PDF
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Simula leitura de PDF (em produção, usar pdf-parse ou similar)
      const text = await file.text();
      setPdfText(text);

      // Extrai dados do texto
      const dados = extrairDadosCertidao(text);
      
      setDadosExtraidos({
        nome: dados.nome || '',
        dataInicio: dados.dataInicio || '',
        dataFim: dados.dataFim || ''
      });

      // Preenche formulário com dados extraídos
      setFormData(prev => ({
        ...prev,
        nomeFunc: dados.nome || '',
        dataInicio: dados.dataInicio || '',
        dataFim: dados.dataFim || ''
      }));

      setStep('formulario');
      setSuccess('PDF processado com sucesso! Revise os dados extraídos.');
    } catch (err) {
      setError(`Erro ao processar PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handler para mudanças no formulário
   */
  const handleFormChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handler para calcular tempo - CORRIGIDO
   * Utiliza calcularPeriods para divisão correcta dos períodos
   */
  const handleCalcular = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Normalize DD/MM/YYYY inputs to ISO (YYYY-MM-DD) if user typed them
      const ddmmyyyyToISO = (s?: string) => {
        if (!s) return s;
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
          const [_, d, mth, y] = m;
          return `${y}-${mth}-${d}`;
        }
        return s;
      };

      const normalizedDataInicio = ddmmyyyyToISO(formData.dataInicio);
      const normalizedDataFim = ddmmyyyyToISO(formData.dataFim);
      const normalizedDataInicioEncargos = ddmmyyyyToISO(formData.dataInicioEncargos);

      if (normalizedDataInicio !== formData.dataInicio || normalizedDataFim !== formData.dataFim || normalizedDataInicioEncargos !== formData.dataInicioEncargos) {
        setFormData(prev => ({
          ...prev,
          dataInicio: normalizedDataInicio || '',
          dataFim: normalizedDataFim || '',
          dataInicioEncargos: normalizedDataInicioEncargos || '',
        }));
      }

      // Validações
      if (!formData.nomeFunc) throw new Error('Nome do funcionário é obrigatório');
      if (!formData.dataInicio) throw new Error('Data de início é obrigatória');
      if (!formData.dataFim) throw new Error('Data de fim é obrigatória');
      if (formData.salarioBase <= 0) throw new Error('Salário base deve ser maior que zero');
      if (formData.numeroPrestacoes <= 0) throw new Error('Número de prestações deve ser maior que zero');

      // Valida datas
      if (!validarDataISO(formData.dataInicio)) {
        throw new Error('Data de início em formato inválido');
      }
      if (!validarDataISO(formData.dataFim)) {
        throw new Error('Data de fim em formato inválido');
      }

      if (formData.dataInicioEncargos && !validarDataISO(formData.dataInicioEncargos)) {
        throw new Error('Data de início de descontos em formato inválido');
      }

      // Se foi fornecida a data de início de descontos, assegura que está entre início e fim
      if (formData.dataInicioEncargos) {
        const inicio = new Date(formData.dataInicio);
        const fim = new Date(formData.dataFim);
        const inicioDescontos = new Date(formData.dataInicioEncargos);
        if (inicioDescontos.getTime() < inicio.getTime() || inicioDescontos.getTime() > fim.getTime()) {
          throw new Error('Data de Início de Descontos deve estar entre a Data de Início e a Data de Fim');
        }
      }

      // CORRIGIDO: Usa calcularPeriods para divisão correcta dos períodos
      const periods = calcularPeriods(
        formData.dataInicio,
        formData.dataFim,
        formData.dataInicioEncargos || null
      );

      // Armazena todos os três tempos
      const tempoCalculadoCompleto: TempoCalculado = {
        ...periods.tempoTotal,
        tempoNaoDescontado: periods.tempoNaoDescontado,
        tempoDescontado: periods.tempoDescontado
      };

      setTempoCalculado(tempoCalculadoCompleto);

      // Gera demonstração completa com dados correctamente calculados
      const demo = gerarDemonstracaoCompleta(
        periods.tempoTotal,
        periods.tempoNaoDescontado,
        periods.tempoDescontado,
        periods.datas.inicioNaoDescontado,
        periods.datas.fimNaoDescontado,
        periods.datas.inicioDescontado,
        periods.datas.fimDescontado,
        formData.salarioBase,
        formData.numeroPrestacoes
      );
      setDemonstracao(demo);

      setSuccess('Cálculos realizados com sucesso! Revise a demonstração abaixo.');
      setStep('resultado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reinicia o processo
   */
  const handleReset = () => {
    setStep('step1');
    setMode('escolher');
    setPdfText('');
    setTempoCalculado(null);
    setDemonstracao(null);
    setDadosExtraidos({ nome: '', dataInicio: '', dataFim: '' });
    setFormData({
      nomeFunc: '',
      categoria: '',
      classe: '',
      escalao: '',
      dataInicio: '',
      dataFim: '',
      dataInicioEncargos: '',
      salarioBase: 0,
      taxaPercentual: 7,
      numeroPrestacoes: 10
    });
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * Handler para exportar para Word
   */
  const handleExportarWord = async () => {
    if (!tempoCalculado || !demonstracao) {
      setError('Nenhum cálculo disponível para exportar');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dadosExportacao = {
        nome: formData.nomeFunc,
        categoria: formData.categoria,
        classe: formData.classe,
        escalao: formData.escalao,
        tempoTotal: demonstracao.tempoTotal,
        tempoNaoDescontado: demonstracao.tempoNaoDescontado,
        tempoDescontado: demonstracao.tempoDescontado,
        encargos: demonstracao.encargos,
        prestacoes: demonstracao.prestacoes,
      };

      await gerarDocumentoWord(dadosExportacao as any);
      setSuccess('Documento Word gerado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar documento Word');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Institucional Header / Flag Ribbon */}
        <div className="flex w-full h-3">
          <div className="flex-1 bg-mz-green"></div>
          <div className="flex-1 bg-mz-black"></div>
          <div className="flex-1 bg-mz-yellow"></div>
          <div className="flex-1 bg-white"></div>
          <div className="flex-1 bg-mz-red"></div>
        </div>

        {/* Card Principal - Brutalist */}
        <div className="bg-white border-4 border-mz-black shadow-[8px_8px_0px_#222222] p-0 relative">
          
          <div className="text-center p-8 border-b-4 border-mz-black bg-mz-green/5">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-mz-black uppercase tracking-wider mb-2">
              Contagem de Tempo
            </h1>
            <p className="text-mz-black font-bold tracking-widest uppercase text-sm">
              Sistema de Fixação de Encargos - SDEJT Inhassoro
            </p>
          </div>

          <div className="p-8">
            {/* Alertas Brutalistas */}
            {error && (
              <div className="mb-6 p-4 bg-mz-red border-4 border-mz-black text-white shadow-[4px_4px_0px_#222222]">
                <p className="font-bold uppercase tracking-wider mb-1">❌ Erro</p>
                <p className="font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-mz-green border-4 border-mz-black text-white shadow-[4px_4px_0px_#222222]">
                <p className="font-bold uppercase tracking-wider mb-1">✅ Sucesso</p>
                <p className="font-medium">{success}</p>
              </div>
            )}

            {/* STEP 1: Escolher Modo ou Upload/Manual */}
            {step === 'step1' && mode === 'escolher' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-serif font-bold text-mz-black uppercase tracking-wider border-b-2 border-mz-black pb-2">
                  Passo 1: Selecionar Método
                </h2>
                
                <p className="text-mz-black font-medium mb-8">
                  ESCOLHA O MÉTODO DE ENTRADA DE DADOS:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Opção 1: Manual */}
                  <button
                    onClick={() => setMode('manual')}
                    className="group p-6 bg-white border-4 border-mz-black shadow-[6px_6px_0px_#222222] hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-mz-yellow/10 transition-all text-left rounded-none"
                  >
                    <p className="text-4xl mb-4 group-hover:scale-110 transition-transform">📝</p>
                    <h3 className="text-lg font-serif font-bold text-mz-black uppercase mb-2">Entrada Manual</h3>
                    <p className="text-mz-black/80 text-sm font-medium">
                      Inserir manualmente as datas de início e fim
                    </p>
                  </button>

                  {/* Opção 2: Upload PDF */}
                  <button
                    onClick={() => setMode('upload')}
                    className="group p-6 bg-white border-4 border-mz-black shadow-[6px_6px_0px_#222222] hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-mz-green/10 transition-all text-left rounded-none"
                  >
                    <p className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</p>
                    <h3 className="text-lg font-serif font-bold text-mz-black uppercase mb-2">Upload de Certidão</h3>
                    <p className="text-mz-black/80 text-sm font-medium">
                      Carregar PDF para extração automática de dados
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Opção 1: ENTRADA MANUAL */}
            {step === 'step1' && mode === 'manual' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-serif font-bold text-mz-black uppercase tracking-wider border-b-2 border-mz-black pb-2">
                  Passo 1: Entrada Manual de Datas
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Nome do Funcionário *
                    </label>
                    <input
                      type="text"
                      value={formData.nomeFunc}
                      onChange={e => handleFormChange('nomeFunc', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:outline-none focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none transition-all bg-white text-mz-black placeholder-stone-400 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                        Data Início Funções *
                      </label>
                      <input
                        type="date"
                        value={formData.dataInicio}
                        onChange={e => handleFormChange('dataInicio', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:outline-none focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none transition-all bg-white text-mz-black font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                        Última Data Serviço *
                      </label>
                      <input
                        type="date"
                        value={formData.dataFim}
                        onChange={e => handleFormChange('dataFim', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:outline-none focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none transition-all bg-white text-mz-black font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-mz-yellow/20 border-l-4 border-mz-yellow p-4">
                    <p className="text-sm text-mz-black font-medium uppercase">
                      ℹ️ Utilize o teclado numérico ou o calendário para seleccionar as datas rigorosas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t-2 border-mz-black">
                  <button
                    type="button"
                    onClick={() => setMode('escolher')}
                    className="flex-1 px-4 py-3 border-2 border-mz-black bg-white text-mz-black font-bold uppercase tracking-wider rounded-none shadow-[4px_4px_0px_#222222] hover:bg-stone-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    Retroceder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.nomeFunc || !formData.dataInicio || !formData.dataFim) {
                        setError('Atenção: Preencha todos os campos obrigatórios rigorosamente.');
                        return;
                      }
                      setStep('formulario');
                      setError(null);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-mz-black bg-mz-green text-white font-bold uppercase tracking-wider rounded-none shadow-[4px_4px_0px_#222222] hover:bg-[#00604A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    Avançar
                  </button>
                </div>
              </div>
            )}

            {/* Opção 2: UPLOAD PDF */}
            {step === 'step1' && mode === 'upload' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-serif font-bold text-mz-black uppercase tracking-wider border-b-2 border-mz-black pb-2">
                  Passo 1: Documento PDF
                </h2>
                
                <div className="border-4 border-dashed border-mz-black bg-mz-green/5 p-12 text-center cursor-pointer hover:bg-mz-green/10 transition-colors relative"
                     onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="space-y-4">
                    <p className="text-5xl">📄</p>
                    <p className="text-xl font-bold font-serif text-mz-black uppercase tracking-wider">
                      {loading ? 'A PROCESSAR...' : 'ANEXAR CERTIDÃO DE EFECTIVIDADE'}
                    </p>
                    <p className="text-sm font-medium text-mz-black/70 uppercase tracking-widest">
                      Formato Exigido: .PDF | Sistema de Extração Automática
                    </p>
                  </div>
                </div>

                <div className="bg-mz-green/10 border-l-4 border-mz-green p-4">
                  <p className="text-sm text-mz-black font-medium uppercase">
                    ℹ️ O sistema lerá os carateres e aplicará os dados aos campos correspondentes.
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-mz-black">
                  <button
                    type="button"
                    onClick={() => setMode('escolher')}
                    className="w-full px-4 py-3 border-2 border-mz-black bg-white text-mz-black font-bold uppercase tracking-wider rounded-none shadow-[4px_4px_0px_#222222] hover:bg-stone-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    Retroceder
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Formulário de Dados */}
            {step === 'formulario' && (
              <form onSubmit={handleCalcular} className="space-y-8">
                <h2 className="text-2xl font-serif font-bold text-mz-black uppercase tracking-wider border-b-2 border-mz-black pb-2">
                  Passo 2: Dados Administrativos
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Nome do Funcionário *
                    </label>
                    <input
                      type="text"
                      value={formData.nomeFunc}
                      onChange={e => handleFormChange('nomeFunc', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Categoria / Função
                    </label>
                    <input
                      type="text"
                      value={formData.categoria}
                      onChange={e => handleFormChange('categoria', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Classe
                    </label>
                    <input
                      type="text"
                      value={formData.classe}
                      onChange={e => handleFormChange('classe', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Escalão
                    </label>
                    <input
                      type="text"
                      value={formData.escalao}
                      onChange={e => handleFormChange('escalao', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Data Início (ISO) *
                    </label>
                    <input
                      type="date"
                      value={formData.dataInicio}
                      onChange={e => handleFormChange('dataInicio', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Data Fim (ISO) *
                    </label>
                    <input
                      type="date"
                      value={formData.dataFim}
                      onChange={e => handleFormChange('dataFim', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Início de Descontos (Opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.dataInicioEncargos}
                      onChange={e => handleFormChange('dataInicioEncargos', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black bg-[#FAFAF9]"
                    />
                    <p className="text-xs text-mz-black/70 font-semibold mt-2 uppercase tracking-wide">
                      A partir daqui calculam-se os encargos.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Salário Base (MZN) *
                    </label>
                    <input
                      type="number"
                      value={formData.salarioBase}
                      onChange={e => handleFormChange('salarioBase', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Taxa de Encargos (%)
                    </label>
                    <div className="w-full px-4 py-3 border-2 border-mz-black rounded-none bg-stone-200 text-mz-black font-bold shadow-inner">
                      7.00% (TAXA FIXA DE ESTADO)
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-mz-black uppercase tracking-wide mb-2">
                      Número de Prestações * (Máx 60)
                    </label>
                    <input
                      type="number"
                      value={formData.numeroPrestacoes}
                      onChange={e => {
                        const value = parseInt(e.target.value) || 10;
                        const limitedValue = Math.min(Math.max(value, 1), 60);
                        if (value > 60) {
                          setError('LIMITE LEGAL EXCESSIVO (MAX. 60 MESES).');
                        } else {
                          setError(null);
                        }
                        handleFormChange('numeroPrestacoes', limitedValue);
                      }}
                      className="w-full px-4 py-3 border-2 border-mz-black rounded-none shadow-[2px_2px_0px_#222222] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none outline-none font-medium text-mz-black"
                      min="1"
                      max="60"
                      required
                    />
                    <p className="text-xs text-mz-red font-bold mt-2 uppercase tracking-wide">
                      LIMITE LEGAL INALTERÁVEL: 5 ANOS (LESSSOFE)
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t-2 border-mz-black">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 px-4 py-3 border-2 border-mz-black bg-mz-red text-white font-bold uppercase tracking-wider rounded-none shadow-[4px_4px_0px_#222222] hover:bg-[#AA0015] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    Anular Dados
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 border-2 border-mz-black bg-mz-green text-white font-bold uppercase tracking-wider rounded-none shadow-[4px_4px_0px_#222222] hover:bg-[#00604A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-x-1 disabled:translate-y-1"
                  >
                    {loading ? 'A PROCESSAR...' : 'EMITIR CÁLCULO ESTADUAL'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Resultado com DEMONSTRAÇÃO */}
            {step === 'resultado' && tempoCalculado && demonstracao && (
              <div className="space-y-8">
                <header className="border-b-4 border-mz-black pb-4 flex items-center justify-between">
                  <h2 className="text-3xl font-serif font-bold text-mz-black uppercase tracking-wider">
                    DOCUMENTO OFICIAL
                  </h2>
                  <div className="px-3 py-1 bg-mz-black text-white font-bold text-xs uppercase tracking-widest border border-black">
                    Nº OP-001/SDEJT
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                  
                  <div className="space-y-6 w-full">
                    {/* DEMONSTRAÇÃO - TEMPO TOTAL */}
                    <div className="bg-white border-2 border-mz-black shadow-[4px_4px_0px_#222222] w-full">
                      <div className="bg-mz-black text-white p-3 border-b-2 border-mz-black">
                        <h3 className="text-sm font-bold tracking-widest uppercase">Tempo de Serviço do FAE</h3>
                      </div>
                      <div className="p-4 space-y-2 font-mono text-sm text-mz-black">
                        {demonstracao.tempoTotal.linhas.map((linha: string, idx: number) => (
                          <div key={idx} className="border-b border-stone-200 pb-1 last:border-0">{linha}</div>
                        ))}
                      </div>
                    </div>

                    {/* DEMONSTRAÇÃO - TEMPO NÃO DESCONTADO */}
                    <div className="bg-white border-2 border-mz-black shadow-[4px_4px_0px_#222222] w-full">
                      <div className="bg-mz-yellow border-b-2 border-mz-black p-3">
                        <h3 className="text-sm font-bold text-mz-black tracking-widest uppercase">Tempo não descontado</h3>
                      </div>
                      <div className="p-4 space-y-2 font-mono text-sm text-mz-black">
                        {demonstracao.tempoNaoDescontado.linhas.map((linha: string, idx: number) => (
                          <div key={idx} className="border-b border-stone-200 pb-1 last:border-0">{linha}</div>
                        ))}
                      </div>
                    </div>

                    {/* DEMONSTRAÇÃO - TEMPO DESCONTADO */}
                    <div className="bg-white border-2 border-mz-black shadow-[4px_4px_0px_#007A5E] w-full">
                      <div className="bg-mz-green text-white border-b-2 border-mz-black p-3">
                        <h3 className="text-sm font-bold tracking-widest uppercase">Tempo descontado</h3>
                      </div>
                      <div className="p-4 space-y-2 font-mono text-sm text-mz-black">
                        {demonstracao.tempoDescontado.linhas.map((linha: string, idx: number) => (
                          <div key={idx} className="border-b border-stone-200 pb-1 last:border-0">{linha}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 w-full">
                    {/* DEMONSTRAÇÃO - ENCARGOS */}
                    <div className="bg-white border-2 border-mz-black shadow-[4px_4px_0px_#222222] w-full">
                      <div className="bg-mz-red text-white p-3 border-b-2 border-mz-black">
                        <h3 className="text-sm font-bold tracking-widest uppercase">Encargos</h3>
                      </div>
                      <div className="p-4 space-y-2 font-mono text-sm text-mz-black">
                        {demonstracao.encargos.linhas.map((linha: string, idx: number) => (
                          <div key={idx} className="border-b border-stone-200 pb-1 last:border-0">{linha}</div>
                        ))}
                        <div className="mt-4 pt-4 border-t-2 border-mz-black bg-mz-red/10 p-3">
                          <p className="font-bold text-lg text-mz-red uppercase tracking-wider flex justify-between">
                            <span>TOTAL DÍVIDA:</span> 
                            <span>{demonstracao.encargos.dividaTotal.toFixed(2)} MZN</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DEMONSTRAÇÃO - PRESTAÇÕES */}
                    <div className="bg-white border-2 border-mz-black shadow-[4px_4px_0px_#222222] w-full">
                      <div className="bg-stone-800 text-white p-3 border-b-2 border-mz-black flex justify-between content-center">
                        <h3 className="text-sm font-bold tracking-widest uppercase items-center flex">FIXAÇÃO DE PRESTAÇÕES</h3>
                      </div>
                      <div className="p-4 space-y-2 font-mono text-sm text-mz-black">
                        {demonstracao.prestacoes.linhas.map((linha: string, idx: number) => (
                          <div key={idx} className="border-b border-stone-200 pb-1 last:border-0">{linha}</div>
                        ))}
                        
                        <div className="mt-4 pt-4 border-t-2 border-mz-black p-3 bg-stone-100 border border-stone-300">
                          <p className="font-bold uppercase tracking-wider text-xs text-stone-500 mb-1">
                            Veredito Operacional:
                          </p>
                          <p className="font-bold text-mz-black uppercase leading-relaxed">
                            {demonstracao.prestacoes.fraseF}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RESUMO BRUTALISTA */}
                <div className="bg-mz-black border-4 border-black p-1 text-white shadow-[6px_6px_0px_#FCD116] mt-8">
                  <div className="border border-stone-700 p-6">
                    <h3 className="text-xl font-serif font-bold uppercase tracking-widest mb-6 border-b border-stone-700 pb-2">
                     MAPA SINÓPTICO DOS ENCARGOS
                    </h3>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] uppercase text-stone-400 font-bold tracking-widest mb-1">Tempo Total</p>
                        <p className="text-xl font-mono text-white">
                          {tempoCalculado.anos}A {tempoCalculado.meses}M {tempoCalculado.dias}D
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase text-stone-400 font-bold tracking-widest mb-1">Tempo Livre</p>
                        <p className="text-xl font-mono text-mz-yellow">
                          {tempoCalculado.tempoNaoDescontado?.anos || 0}A {tempoCalculado.tempoNaoDescontado?.meses || 0}M {tempoCalculado.tempoNaoDescontado?.dias || 0}D
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] uppercase text-stone-400 font-bold tracking-widest mb-1">Passivo Est.</p>
                        <p className="text-xl font-mono text-mz-red font-bold">
                          {demonstracao.encargos.dividaTotal.toFixed(2)}
                        </p>
                      </div>
                      
                      <div>
                         <p className="text-[10px] uppercase text-stone-400 font-bold tracking-widest mb-1">1ª Cota</p>
                         <p className="text-xl font-mono text-mz-green font-bold">
                           {demonstracao.prestacoes.primeiraP.toFixed(2)}
                         </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-8">
                  <button
                    type="button"
                    onClick={handleExportarWord}
                    className="flex-1 px-4 py-4 border-4 border-mz-black bg-mz-black text-white font-bold uppercase tracking-widest rounded-none shadow-[4px_4px_0px_#007A5E] hover:bg-stone-800 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex justify-center items-center gap-2"
                  >
                    <span>EXPORTAR AUTO WORD</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-[0.5] px-4 py-4 border-2 border-mz-black bg-white text-mz-black font-bold uppercase tracking-widest rounded-none shadow-[4px_4px_0px_#222222] hover:bg-stone-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-center"
                  >
                    NOVO
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Institucional */}
        <div className="text-center mt-6 p-4 text-xs font-bold font-mono tracking-widest uppercase text-stone-500">
          <p>REPÚBLICA DE MOÇAMBIQUE • MINISTÉRIO DA EDUCAÇÃO</p>
          <p className="mt-1">SDEJT - Inhassoro © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
