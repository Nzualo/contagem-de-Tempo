# 📊 Contagem de Tempo e Fixação de Encargos

Sistema web para cálculo de tempo de serviço e geração de documentos de fixação de encargos. Desenvolvido para o Serviço Distrital de Educação, Juventude e Tecnologia (SDEJT) do Distrito de Inhassoro, Moçambique.

## 🎯 Características Principais

- ✅ **Upload de Certidão em PDF** - Suporta carregamento de certidões de efectividade
- ✅ **Parser de Datas em Português** - Extrai e converte datas escritas por extenso (ex: "treze de Fevereiro de mil novecentos oitenta e sete" → "1987-02-13")
- ✅ **Calculadora de Tempo** - Calcula tempo de serviço com regras específicas:
  - 30 dias = 1 mês
  - 12 meses = 1 ano
  - Primeiro e último dia são inclusivos (+1 dia no total)
- ✅ **Gerador de PDF** - Cria documento "Fixação de Encargos" com:
  - Cabeçalho oficial da República de Moçambique
  - Tabelas de contagem de tempo (Anos, Meses, Dias)
  - Cálculo de encargos (taxa de 7% padrão)
  - Demonstração das fórmulas de cálculo
- ✅ **Integração com Supabase** - Armazenamento seguro de dados e PDFs
- ✅ **Interface Responsiva** - Design moderno com Tailwind CSS

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Node.js/API Routes (Next.js)
- **Banco de Dados**: PostgreSQL (via Supabase)
- **Geração de PDF**: jsPDF + html2canvas
- **Parsing de PDF**: pdf-parse
- **Datas**: date-fns
- **Deployment**: Vercel + GitHub

## 📋 Pré-requisitos

- Node.js 20+
- npm 11+
- Conta GitHub (para deploy)
- Conta Supabase (para base de dados)
- Conta Vercel (para hosting)

## ⚙️ Instalação e Setup Local

### 1. Clone o repositório

```bash
git clone https://github.com/Nzualo/contagem-de-Tempo.git
cd contagem-de-Tempo
```

### 2. Instale dependências

```bash
npm install
```

### 3. Configure variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha as suas credenciais:

```bash
cp .env.example .env.local
```

**Variáveis necessárias:**
- `NEXT_PUBLIC_SUPABASE_URL` - URL da sua instância Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave pública anon do Supabase
- `DATABASE_URL` - Connection string do PostgreSQL

### 4. Setup Supabase

#### 4.1 Crie um novo projeto em [supabase.com](https://supabase.com)

#### 4.2 Execute as migrações SQL

Vá para SQL Editor no Supabase e execute o script:
```sql
-- Localizado em: lib/supabase-migrations/001_initial_schema.sql
```

Ou use Supabase CLI:
```bash
supabase link  # Conecta ao seu projeto
supabase db push  # Envia migrações
```

### 5. Rode localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🚀 Como Usar

### Passo 1: Upload da Certidão
1. Clique em "Arraste ou clique para carregar PDF"
2. Selecione a certidão de efectividade (exemplo: "Cert. Efect. Joao Candido.pdf")
3. O sistema extrai automaticamente:
   - Nome do funcionário
   - Data de início do serviço
   - Data de fim/actualidade do serviço

### Passo 2: Revise os Dados
1. Verifique os dados extraídos automaticamente
2. Complete informações faltantes:
   - Categoria profissional
   - Classe
   - Escalão
   - Salário base (em MZN)
   - Taxa de encargos (% - padrão 7%)

### Passo 3: Gere o PDF
1. Clique em "Calcular e Gerar PDF"
2. Revise o tempo calculado:
   - Anos, Meses, Dias
   - Total de dias
3. O PDF "Fixação de Encargos" é gerado automaticamente
4. Uma cópia é salva no Supabase

## 📐 Regras de Negócio

### Cálculo de Tempo
```
Total de dias (incluindo primeiro e último dia)
↓
Converte em anos/meses/dias (30 dias = 1 mês; 12 meses = 1 ano)
↓
Resultado em formato: XX anos, YY meses, ZZ dias
```

### Cálculo de Encargos
```
Fórmula: (Anos × 12 + Meses) × Taxa% × Salário Base ÷ 100
Exemplo: (5 × 12 + 3) × 7% × 15,000 = 60,075 MZN
```

## 🔌 API Endpoints (Futuros)

```
POST   /api/upload-pdf       - Upload e parsing de certidão
GET    /api/calculos/:id     - Busca cálculo específico
POST   /api/calculos         - Cria novo cálculo
GET    /api/funcionarios     - Lista funcionários
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas

#### `funcionarios`
- `id` - ID único
- `nome` - Nome completo
- `categoria` - Categoria profissional
- `classe` - Classe/Nível
- `escalao` - Escalão salarial
- `created_at`, `updated_at` - Timestamps

#### `calculos_tempo`
- `id` - ID único
- `funcionario_id` - Referência ao funcionário
- `data_inicio`, `data_fim` - Período
- `anos_servico`, `meses_servico`, `dias_servico` - Tempo calculado
- `total_dias` - Total de dias
- `encargos_valor` - Valor dos encargos
- `pdf_url` - URL do PDF gerado
- `status` - Status do cálculo (pendente, processado, erro)
- Timestamps e observações

#### `pdf_logs`
- Log de geração de PDFs para auditoria

## 📝 Exemplo de Uso

### Parser de Datas
```typescript
import { parseDataPortugues } from '@/lib/parsers/dateParser';

const dataISO = parseDataPortugues("treze de Fevereiro de mil novecentos oitenta e sete");
// Resultado: "1987-02-13"
```

### Cálculo de Tempo
```typescript
import { calcularTempo, calcularEncargos } from '@/lib/calculators/timeCalculator';

const tempo = calcularTempo("1987-02-13", "2023-04-30");
// { anos: 36, meses: 2, dias: 17, totalDias: 13224 }

const encargos = calcularEncargos(tempo, 15000, 7);
// 4,548.00 MZN
```

### Geração de PDF
```typescript
import { gerarPDFFixacaoEncargos } from '@/lib/pdf-generator/fixacaoEncargosGenerator';

const pdf = await gerarPDFFixacaoEncargos({
  nomeFunc: "João Cândido",
  categoria: "Professor",
  classe: "Classe 1",
  escalao: "A",
  dataInicio: "1987-02-13",
  dataFim: "2023-04-30",
  tempo: { anos: 36, meses: 2, dias: 17, totalDias: 13224 },
  salarioBase: 15000,
  encargosValor: 4548.00
});

// Download
downloadPDF(pdf, "Fixacao_Encargos_JoaoCandido_2023-04-30.pdf");
```

## 🚀 Deploy no Vercel

### Opção 1: Via GitHub Integration (Recomendado)

1. Vá para [vercel.com](https://vercel.com)
2. Clique "New Project"
3. Selecione o repositório `Nzualo/contagem-de-Tempo`
4. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique "Deploy"

### Opção 2: Via Vercel CLI

```bash
npm install -g vercel
vercel link                    # Conecta ao projeto Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel deploy --prod           # Deploy em produção
```

### Variáveis de Ambiente (Vercel Settings)

Adicione em "Settings" → "Environment Variables":

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 📦 Build e Produção

```bash
# Build de produção
npm run build

# Testa o build localmente
npm start
```

## 🧪 Testes (Futuros)

```bash
# Rodar testes
npm test

# Cobertura
npm run test:coverage
```

## 📚 Documentação Adicional

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade da SDEJT Inhassoro, Moçambique.

## 👥 Autores

- **Desenvolvedor**: Nzualo Development Team
- **Projeto**: Contagem de Tempo e Fixação de Encargos
- **Instituição**: Serviço Distrital de Educação, Juventude e Tecnologia
- **Distrito**: Inhassoro, Moçambique
- **Data**: 30 de Março de 2026

## 📞 Suporte

Para questões e suporte, contacte:
- Email: dev@nzualo.mz
- GitHub Issues: [contagem-de-Tempo/issues](https://github.com/Nzualo/contagem-de-Tempo/issues)

## 🎯 Próximas Funcionalidades

- [ ] Validação de datas com calendário
- [ ] Relatórios em massa
- [ ] Exportação em Excel
- [ ] Integração com email para envio de PDFs
- [ ] Dashboard de estatísticas
- [ ] Sistema de permissões por utilizador
- [ ] Histórico de versões de cálculos
- [ ] Assinatura digital de PDFs
- [ ] API REST completa
- [ ] Autenticação com OAuth2

---

**Status**: ✅ em desenvolvimento

**Última actualização**: 30/03/2026
