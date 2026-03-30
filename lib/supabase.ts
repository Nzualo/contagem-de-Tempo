/**
 * Configuração do Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Variáveis de ambiente Supabase não configuradas');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Insere novo funcionário
 */
export async function inserirFuncionario(dados: {
  nome: string;
  categoria?: string;
  classe?: string;
  escalao?: string;
}) {
  const { data, error } = await supabase
    .from('funcionarios')
    .insert([dados])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Busca funcionário por ID
 */
export async function buscarFuncionario(id: number) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca funcionários por nome
 */
export async function buscarFuncionariosPorNome(nome: string) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .ilike('nome', `%${nome}%`);

  if (error) throw error;
  return data;
}

/**
 * Insere novo cálculo de tempo
 */
export async function inserirCalculoTempo(dados: {
  funcionario_id: number;
  data_inicio: string;
  data_fim: string;
  anos_servico: number;
  meses_servico: number;
  dias_servico: number;
  total_dias: number;
  encargos_valor: number;
  salario_base: number;
  taxa_percentual?: number;
  observacoes?: string;
}) {
  const { data, error } = await supabase
    .from('calculos_tempo')
    .insert([dados])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Busca cálculos de tempo por funcionário
 */
export async function buscarCalculosFuncionario(funcionario_id: number) {
  const { data, error } = await supabase
    .from('calculos_tempo')
    .select('*')
    .eq('funcionario_id', funcionario_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Busca cálculo específico
 */
export async function buscarCalculo(id: number) {
  const { data, error } = await supabase
    .from('calculos_tempo')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza URL do PDF de um cálculo
 */
export async function atualizarURLPDF(calculo_id: number, pdf_url: string, status: string = 'processado') {
  const { data, error } = await supabase
    .from('calculos_tempo')
    .update({ pdf_url, status })
    .eq('id', calculo_id)
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Insere log de geração de PDF
 */
export async function inserirLogPDF(dados: {
  calculo_id: number;
  pdf_filename: string;
  pdf_size_bytes: number;
  pdf_url: string;
  status: string;
  erro_mensagem?: string;
}) {
  const { data, error } = await supabase
    .from('pdf_logs')
    .insert([dados])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Lista todos os cálculos com status
 */
export async function listarCalculosComStatus(status?: string) {
  let query = supabase
    .from('calculos_tempo')
    .select('*, funcionarios(nome, categoria)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}
