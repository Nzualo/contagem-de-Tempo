-- Migração Supabase: Criação de tabelas para sistema de contagem de tempo
-- Data: 30/03/2026

-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  classe VARCHAR(100),
  escalao VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca por nome
CREATE INDEX idx_funcionarios_nome ON funcionarios(nome);

-- Tabela de Cálculos de Tempo
CREATE TABLE IF NOT EXISTS calculos_tempo (
  id BIGSERIAL PRIMARY KEY,
  funcionario_id BIGINT NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  anos_servico INTEGER NOT NULL DEFAULT 0,
  meses_servico INTEGER NOT NULL DEFAULT 0,
  dias_servico INTEGER NOT NULL DEFAULT 0,
  total_dias INTEGER NOT NULL DEFAULT 0,
  tempo_nao_contribuido_anos INTEGER DEFAULT 0,
  tempo_nao_contribuido_meses INTEGER DEFAULT 0,
  tempo_nao_contribuido_dias INTEGER DEFAULT 0,
  encargos_valor DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  salario_base DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  taxa_percentual DECIMAL(5, 2) NOT NULL DEFAULT 7.00,
  pdf_url VARCHAR(1024),
  status VARCHAR(50) DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para queries comuns
CREATE INDEX idx_calculos_tempo_funcionario_id ON calculos_tempo(funcionario_id);
CREATE INDEX idx_calculos_tempo_data_inicio ON calculos_tempo(data_inicio);
CREATE INDEX idx_calculos_tempo_status ON calculos_tempo(status);

-- Tabela de Logs de Geração de PDFs
CREATE TABLE IF NOT EXISTS pdf_logs (
  id BIGSERIAL PRIMARY KEY,
  calculo_id BIGINT NOT NULL REFERENCES calculos_tempo(id) ON DELETE CASCADE,
  pdf_filename VARCHAR(255),
  pdf_size_bytes INTEGER,
  pdf_url VARCHAR(1024),
  status VARCHAR(50) DEFAULT 'gerado',
  erro_mensagem TEXT,
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para logs
CREATE INDEX idx_pdf_logs_calculo_id ON pdf_logs(calculo_id);
CREATE INDEX idx_pdf_logs_created_at ON pdf_logs(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_funcionarios_updated_at
BEFORE UPDATE ON funcionarios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calculos_tempo_updated_at
BEFORE UPDATE ON calculos_tempo
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários das tabelas
COMMENT ON TABLE funcionarios IS 'Registro de funcionários para contagem de tempo';
COMMENT ON TABLE calculos_tempo IS 'Cálculos de tempo de serviço e encargos';
COMMENT ON TABLE pdf_logs IS 'Log de geração de PDFs';

-- Comentários das colunas
COMMENT ON COLUMN calculos_tempo.total_dias IS 'Total de dias (primeiro e último dia inclusivos)';
COMMENT ON COLUMN calculos_tempo.encargos_valor IS 'Valor total de encargos calculado';
COMMENT ON COLUMN calculos_tempo.taxa_percentual IS 'Taxa percentual utilizada no cálculo (7% por padrão)';
COMMENT ON COLUMN calculos_tempo.status IS 'Status do cálculo: pendente, processado, erro';
