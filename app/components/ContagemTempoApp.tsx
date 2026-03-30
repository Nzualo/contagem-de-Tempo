'use client';

import React, { useState, useRef } from 'react';
import { parseDataPortugues, extrairDadosCertidao, validarDataISO } from '@/lib/parsers/dateParser';
import { calcularTempo, calcularEncargos, formatarTempo, TempoCalculado } from '@/lib/calculators/timeCalculator';
import { gerarPDFFixacaoEncargos, DadosFixacaoEncargos, validarDados } from '@/lib/pdf-generator/fixacaoEncargosGenerator';
import { inserirFuncionario, inserirCalculoTempo, atualizarURLPDF } from '@/lib/supabase';

interface FormData {
  nomeFunc: string;
  categoria: string;
  classe: string;
  escalao: string;
  dataInicio: string;
  dataFim: string;
  salarioBase: number;
  taxaPercentual: number;
}

export default function ContagemTempoApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'formulario' | 'resultado'>('upload');
  const [pdfText, setPdfText] = useState('');
  const [tempoCalculado, setTempoCalculado] = useState<TempoCalculado | null>(null);
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
    salarioBase: 0,
    taxaPercentual: 7
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
   * Handler para calcular tempo
   */
  const handleCalcular = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validações
      if (!formData.nomeFunc) throw new Error('Nome do funcionário é obrigatório');
      if (!formData.dataInicio) throw new Error('Data de início é obrigatória');
      if (!formData.dataFim) throw new Error('Data de fim é obrigatória');
      if (formData.salarioBase <= 0) throw new Error('Salário base deve ser maior que zero');

      // Valida datas
      if (!validarDataISO(formData.dataInicio)) {
        throw new Error('Data de início em formato inválido');
      }
      if (!validarDataISO(formData.dataFim)) {
        throw new Error('Data de fim em formato inválido');
      }

      // Calcula tempo
      const tempo = calcularTempo(formData.dataInicio, formData.dataFim);
      if (!tempo) throw new Error('Erro ao calcular tempo');

      setTempoCalculado(tempo);

      // Calcula encargos
      const encargos = calcularEncargos(tempo, formData.salarioBase, formData.taxaPercentual);

      // Prepara dados para PDF
      const dadosPDF: DadosFixacaoEncargos = {
        nomeFunc: formData.nomeFunc,
        categoria: formData.categoria,
        classe: formData.classe,
        escalao: formData.escalao,
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim,
        tempo,
        salarioBase: formData.salarioBase,
        encargosValor: encargos
      };

      // Valida dados
      const validacao = validarDados(dadosPDF);
      if (!validacao.valido) {
        throw new Error(validacao.erros.join('; '));
      }

      // Gera PDF
      const pdfBlob = await gerarPDFFixacaoEncargos(dadosPDF);

      // Salva em Supabase (simulado para agora)
      // TODO: Integrar com Supabase quando estiver configurado
      
      // Trigger download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fixacao_Encargos_${formData.nomeFunc}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(`PDF gerado com sucesso! Encargos: ${encargos.toFixed(2)} MZN`);
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
    setStep('upload');
    setPdfText('');
    setTempoCalculado(null);
    setDadosExtraidos({ nome: '', dataInicio: '', dataFim: '' });
    setFormData({
      nomeFunc: '',
      categoria: '',
      classe: '',
      escalao: '',
      dataInicio: '',
      dataFim: '',
      salarioBase: 0,
      taxaPercentual: 7
    });
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Contagem de Tempo
          </h1>
          <p className="text-gray-600">
            Sistema de Fixação de Encargos - SDEJT Inhassoro
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Alertas */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-semibold">❌ Erro</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-semibold">✅ Sucesso</p>
              <p className="text-green-600">{success}</p>
            </div>
          )}

          {/* STEP 1: Upload PDF */}
          {step === 'upload' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Passo 1: Upload da Certidão</h2>
              
              <div className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition"
                   onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                />
                
                <div className="space-y-2">
                  <p className="text-4xl">📄</p>
                  <p className="text-lg font-semibold text-gray-700">
                    Arraste ou clique para carregar PDF
                  </p>
                  <p className="text-sm text-gray-500">
                    Ficheiro: Cert. Efect. Joao Candido.pdf
                  </p>
                </div>
              </div>

              {loading && (
                <div className="text-center">
                  <p className="text-gray-600">Processando PDF...</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Formulário de Dados */}
          {step === 'formulario' && (
            <form onSubmit={handleCalcular} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Passo 2: Dados do Funcionário</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nomeFunc}
                    onChange={e => handleFormChange('nomeFunc', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={e => handleFormChange('categoria', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe
                  </label>
                  <input
                    type="text"
                    value={formData.classe}
                    onChange={e => handleFormChange('classe', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Escalão
                  </label>
                  <input
                    type="text"
                    value={formData.escalao}
                    onChange={e => handleFormChange('escalao', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início (ISO) *
                  </label>
                  <input
                    type="date"
                    value={formData.dataInicio}
                    onChange={e => handleFormChange('dataInicio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fim (ISO) *
                  </label>
                  <input
                    type="date"
                    value={formData.dataFim}
                    onChange={e => handleFormChange('dataFim', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salário Base (MZN) *
                  </label>
                  <input
                    type="number"
                    value={formData.salarioBase}
                    onChange={e => handleFormChange('salarioBase', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxa de Encargos (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.taxaPercentual}
                    onChange={e => handleFormChange('taxaPercentual', parseFloat(e.target.value) || 7)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Calcular e Gerar PDF'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Resultado */}
          {step === 'resultado' && tempoCalculado && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Passo 3: Resultado</h2>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Tempo Calculado</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded p-4 text-center">
                    <p className="text-gray-600 text-sm">Anos</p>
                    <p className="text-3xl font-bold text-indigo-600">{tempoCalculado.anos}</p>
                  </div>
                  <div className="bg-white rounded p-4 text-center">
                    <p className="text-gray-600 text-sm">Meses</p>
                    <p className="text-3xl font-bold text-indigo-600">{tempoCalculado.meses}</p>
                  </div>
                  <div className="bg-white rounded p-4 text-center">
                    <p className="text-gray-600 text-sm">Dias</p>
                    <p className="text-3xl font-bold text-indigo-600">{tempoCalculado.dias}</p>
                  </div>
                </div>

                <p className="text-gray-700">
                  <strong>Total:</strong> {formatarTempo(tempoCalculado)}
                </p>
                <p className="text-gray-700">
                  <strong>Total de Dias:</strong> {tempoCalculado.totalDias}
                </p>
              </div>

              <button
                onClick={handleReset}
                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Novo Cálculo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Sistema de Contagem de Tempo e Fixação de Encargos</p>
          <p>© 2026 SDEJT Inhassoro</p>
        </div>
      </div>
    </div>
  );
}
