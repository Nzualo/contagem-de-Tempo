# 🚀 Guia de Deploy - Contagem de Tempo

## Pré-requisitos para Deploy

✅ Repositório GitHub em `Nzualo/contagem-de-Tempo`
✅ Projeto Supabase criado e configurado
✅ Conta Vercel ativa
✅ Variáveis de ambiente prontas

## 📋 Checklist de Configuração

### 1. Supabase - Configuração

- [ ] Criar projeto em [supabase.com](https://supabase.com)
- [ ] Obter `NEXT_PUBLIC_SUPABASE_URL` (Settings → API)
- [ ] Obter `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
- [ ] Executar migrações SQL:

```sql
-- Copiar conteúdo de: lib/supabase-migrations/001_initial_schema.sql
-- Colar no SQL Editor do Supabase e executar
```

- [ ] Testar conexão no console JavaScript:
```javascript
import { supabase } from '@supabase/supabase-js';
const { data } = await supabase.from('funcionarios').select('*');
console.log(data);
```

### 2. GitHub - Configuração

- [ ] Repositório `Nzualo/contagem-de-Tempo` públicamente acessível
- [ ] Branch `main` com código mais recente
- [ ] Verificar commits mais recentes:
```bash
git status
git log --oneline | head -5
```

### 3. Variáveis de Ambiente

Ter prontas as seguintes variáveis:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 🔧 Opção 1: Deploy via GitHub Integration (RECOMENDADO)

### Passo 1: Aceda a Vercel

1. Vá para [vercel.com](https://vercel.com)
2. Faça login ou crie conta
3. Clique "New Project"

### Passo 2: Importe Repositório

```
1. Selecione "GitHub"
2. Autorize Vercel a aceder seu GitHub
3. Procure e selecione "Nzualo/contagem-de-Tempo"
4. Clique "Import"
```

### Passo 3: Configure Variáveis

Na página de configuração:

```
Framework Preset:     Next.js ✓ (detectado automaticamente)
Project Name:         contagem-de-tempo
Root Directory:       ./
Environment Variables:
  - NEXT_PUBLIC_SUPABASE_URL    = [seu valor]
  - NEXT_PUBLIC_SUPABASE_ANON_KEY = [seu valor]
```

### Passo 4: Deploy

1. Clique "Deploy"
2. Aguarde 2-5 minutos
3. Verá "Congratulations! Your project has been successfully deployed"

### URL Resultado

```
https://contagem-de-tempo.vercel.app
```

---

## 🔧 Opção 2: Deploy via Vercel CLI

### Passo 1: Instale Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Faça Login

```bash
vercel login
# Escolha "Continue with GitHub" (recomendado)
```

### Passo 3: Link ao Projeto Vercel

```bash
cd "E:\Programas\Certidao de Efectividade\contagem-tempo"
vercel link

# Responda:
# ? Set up "contagem-de-tempo" in "E:\..." as your platform? (Y/n) → Y
# ? Which scope should your project be added to? → Seu username/organização
# ? Found project "contagem-de-tempo". Link to it? (Y/n) → Y
```

### Passo 4: Configure Variáveis de Ambiente

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Colar: https://your-project.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Colar: eyJhbGc...

# Verificar variáveis adicionadas
vercel env list
```

### Passo 5: Deploy em Produção

```bash
vercel deploy --prod
```

Resultado esperado:
```
✓ Production: https://contagem-de-tempo.vercel.app
```

---

## 🔧 Opção 3: Deploy Manual com GitHub Actions

### Passo 1: Crie Secret no GitHub

1. Vá para repositório GitHub
2. Settings → Secrets and variables → Actions
3. Adicione "New repository secret"

Segredos:
- `VERCEL_TOKEN` - Obter em [vercel.com/account/settings/tokens](https://vercel.com/account/settings/tokens)
- `VERCEL_PROJECT_ID` - Encontrar em Vercel Project Settings
- `VERCEL_ORG_ID` - Encontrar em Vercel Team Settings

### Passo 2: Crie Workflow

Ficheiro: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

### Passo 3: Commit e Push

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: adicione workflow de deploy automático"
git push origin main
```

---

## ✅ Validação Pós-Deploy

### 1. Acesse a URL

```
https://contagem-de-tempo.vercel.app
```

### 2. Teste as Funcionalidades

- [ ] Upload de PDF funciona
- [ ] Parser extrai dados corretamente
- [ ] Cálculo de tempo está correto
- [ ] PDF é gerado e faz download
- [ ] Sem erros no console
- [ ] Interface responsiva no mobile

### 3. Verifique Logs

```bash
vercel logs                    # Ver logs recentes
vercel logs --follow           # Em tempo real
```

### 4. Teste Variáveis de Ambiente

```bash
vercel env list                # Listar variáveis
vercel env pull               # Puxar para .env.local
```

---

## 🔄 Atualizar Deploy Após Mudanças

### Auto-deploy com GitHub (Recomendado)

```bash
# Faça mudanças localmente
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# Vercel faz deploy automaticamente via GitHub integration
# Status em: vercel.com → Dashboard → "contagem-de-tempo"
```

### Deploy Manual

```bash
vercel deploy --prod
```

---

## 🐛 Troubleshooting

### Erro: "Build failed"

```
Solução: Verifique variáveis de ambiente
vercel env list
vercel env pull
vercel deploy --prod
```

### Erro: "Cannot find module"

```
Solução: Limpe cache e rebuild
npm ci
npm run build
vercel deploy --prod
```

### Erro de Conexão Supabase

```
Verificar:
1. NEXT_PUBLIC_SUPABASE_URL está correto?
2. NEXT_PUBLIC_SUPABASE_ANON_KEY está correto?
3. Supabase projeto está ativo?

vercel env list  # Confirmar variáveis
```

### Performance Lenta

```
Solução:
1. Vercel → Project Settings → Caching
2. Limpar cache: vercel cache clear
3. Redeploy: vercel deploy --prod
```

---

## 🔐 Segurança

### Boas Práticas

- ✅ Nunca commitar `.env.local` ou segredos
- ✅ Usar `NEXT_PUBLIC_*` apenas para dados públicos
- ✅ Chaves sensíveis em Environment Variables do Vercel
- ✅ Revisar logs para exposição de dados
- ✅ Atualizar dependências regularmente

```bash
npm audit              # Verificar vulnerabilidades
npm update            # Atualizar pacotes
```

---

## 📊 Monitoramento

### Analytics no Vercel

```
Dashboard → Project → Analytics
- Web Vitals (Lighthouse scores)
- Response times
- Error rates
- Request count
```

### Logs

```bash
# Últimas 20 linhas
vercel logs -n 20

# Filtrar por tipo
vercel logs --source=api
vercel logs --source=static
```

---

## 📞 Suporte Vercel

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)
- [GitHub Issues](https://github.com/Nzualo/contagem-de-Tempo/issues)

---

## ⏱️ Timeline Típica

| Etapa | Tempo |
|-------|-------|
| Configurar Supabase | 5-10 min |
| Setup GitHub | 2-3 min |
| Deploy Vercel | 2-5 min |
| Validação | 5-10 min |
| **Total** | **15-30 min** |

---

## 🎉 Próximo Passo

Após deploy bem-sucedido:

1. ✅ Acesse [https://contagem-de-tempo.vercel.app](https://contagem-de-tempo.vercel.app)
2. ✅ Teste uploading um PDF
3. ✅ Valide cálculos
4. ✅ Compartilhe URL com utilizadores
5. ✅ Configure domínio personalizado (opcional)

---

**Versão**: 1.0
**Data**: 30/03/2026
**Status**: ✅ Pronto para Deploy
