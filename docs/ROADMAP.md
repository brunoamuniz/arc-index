# 🗺️ Roadmap - Próximos Passos para Conclusão

## ✅ O que já está feito

### Backend & API
- ✅ Next.js API routes implementadas
- ✅ Integração com Supabase (Postgres, Auth, Storage)
- ✅ Row Level Security (RLS) policies
- ✅ SIWE (Sign-In With Ethereum) authentication
- ✅ Frontend API client integrado
- ✅ Tratamento de erros robusto
- ✅ Validação de dados (Zod schemas)

### Frontend
- ✅ Landing page
- ✅ Página de exploração de projetos (`/explore`)
- ✅ Página de submissão (`/submit`)
- ✅ Página de meus projetos (`/my-projects`)
- ✅ Página de detalhes do projeto (`/project/[id]`)
- ✅ Navegação com wallet connection
- ✅ Toast notifications
- ✅ Favicon e Open Graph metadata

### Infraestrutura
- ✅ Estrutura de pastas organizada
- ✅ TypeScript configurado
- ✅ Variáveis de ambiente configuradas
- ✅ `.gitignore` configurado

---

## 🚧 O que falta fazer

### 1. **CRÍTICO: Aplicar Migrações do Supabase** (5-10 min)
**Status:** ⚠️ Pendente  
**Prioridade:** 🔴 ALTA

Sem isso, a aplicação não funciona completamente.

**Passos:**
1. Acesse: https://supabase.com/dashboard
2. Projeto: `ivikuadpgtutuqbhodcr`
3. SQL Editor → Execute `supabase/migrations/001_initial_schema.sql`
4. SQL Editor → Execute `supabase/migrations/002_rls_policies.sql`
5. Storage → Criar bucket `arc-index-projects` (público)

**Ver detalhes:** `supabase/APPLY_MIGRATIONS.md` (neste diretório)

---

### 2. **Smart Contracts** (2-4 horas)
**Status:** ✅ Implementado (precisa compilar e deployar)  
**Prioridade:** 🟡 MÉDIA

#### 2.1. Contratos Solidity ✅
- ✅ `ProjectRegistry.sol` - Registro de projetos on-chain
- ✅ `ApprovalNFT.sol` - NFT de certificação (ERC-721)
- ✅ `Ratings.sol` - Sistema de ratings on-chain
- ✅ `Funding.sol` - Sistema de doações USDC

**Localização:** `packages/contracts/contracts/`

#### 2.2. Testes dos Contratos
- [ ] Testes unitários com Hardhat
- [ ] Testes de integração
- [ ] Testes de gas optimization

**Localização:** `packages/contracts/test/`

#### 2.3. Deploy dos Contratos ⚠️ Pendente
- [ ] Compilar contratos
- [ ] Deploy na Arc Testnet (Chain ID: 5042002)
- [ ] Salvar endereços dos contratos
- [ ] Atualizar `.env.local` com endereços

**Comando:**
```bash
cd packages/contracts
npm run compile
npm run deploy:arc
```

---

### 3. **Indexer Worker** (1-2 horas)
**Status:** ✅ Implementado (precisa testar)  
**Prioridade:** 🟡 MÉDIA

#### 3.1. Implementação Completa
- ✅ Conexão com RPC configurada
- ✅ Sincronização de eventos implementada
- ✅ Retry logic implementado
- ✅ Processamento de eventos em lote implementado

**Arquivo:** `indexer/index.ts`

#### 3.2. Executar Indexer
```bash
npm run indexer
```

**Configurar como serviço:**
- PM2 (recomendado)
- Docker container
- Systemd service

---

### 4. **Funcionalidades On-chain** ✅ 100% Implementado
**Status:** ✅ Completo  
**Prioridade:** ✅ Concluído

#### 4.1. Sistema de Ratings ✅
- ✅ Frontend: Componente de rating interativo (`components/star-rating.tsx`)
- ✅ API: Endpoint `/api/projects/[id]/rate`
- ✅ Integração: Chamar contrato `Ratings.sol` via viem
- ✅ Exibir ratings agregados

#### 4.2. Sistema de Funding ✅
- ✅ Frontend: Botão de doação USDC (`app/project/[id]/page.tsx`)
- ✅ API: Endpoint `/api/projects/[id]/fund`
- ✅ Integração: Chamar contrato `Funding.sol` com USDC via viem
- ✅ Exibir total arrecadado

#### 4.3. Fluxo de Aprovação On-chain ✅
- ✅ Frontend: Interface para curadores aprovarem (`app/review/page.tsx`)
- ✅ API: Preparar transação de aprovação (`/api/review/[submissionId]/approve`)
- ✅ Integração: Chamar `ProjectRegistry.approve()` e `ApprovalNFT.mint()` via viem
- ✅ Atualizar status do projeto após confirmação

#### 4.4. Dashboard de Curador ✅
- ✅ Página `/review` para listar submissões
- ✅ Interface de aprovação/rejeição on-chain
- ✅ Histórico de revisões

---

### 5. **Melhorias e Polimento** (2-3 horas)
**Status:** ⚠️ Pendente  
**Prioridade:** 🟢 BAIXA

#### 5.1. UX/UI
- [ ] Loading states em todas as páginas
- [ ] Skeleton loaders
- [ ] Animações de transição
- [ ] Responsividade mobile completa
- [ ] Dark mode toggle (se necessário)

#### 5.2. Performance
- [ ] Otimização de imagens (next/image)
- [ ] Cache de queries (React Query ou SWR)
- [ ] Lazy loading de componentes
- [ ] Code splitting

#### 5.3. Segurança
- [ ] Rate limiting nas APIs
- [ ] Validação de URLs
- [ ] Sanitização de inputs
- [ ] CORS configurado
- [ ] Headers de segurança

#### 5.4. Testes
- [ ] Testes E2E (Playwright/Cypress)
- [ ] Testes de integração das APIs
- [ ] Testes de componentes React

---

### 6. **Deploy e Produção** (1-2 horas)
**Status:** ⚠️ Pendente  
**Prioridade:** 🟡 MÉDIA

#### 6.1. Preparação
- [ ] Variáveis de ambiente de produção
- [ ] Build de produção testado
- [ ] Verificação de performance
- [ ] SEO otimizado

#### 6.2. Deploy
- [ ] Deploy do frontend (Vercel/Netlify)
- [ ] Deploy do indexer (Railway/Render)
- [ ] Configurar domínio `arcindex.xyz`
- [ ] SSL/HTTPS configurado

#### 6.3. Monitoramento
- [ ] Error tracking (Sentry)
- [ ] Analytics (Vercel Analytics já configurado)
- [ ] Logs centralizados
- [ ] Alertas de erro

---

## 📊 Priorização Recomendada

### Fase 1: MVP Funcional (1-2 dias)
1. ⚠️ Aplicar migrações Supabase (CRÍTICO - pendente)
2. ⚠️ Testar fluxo básico (criar projeto, listar) - após migrações
3. ⚠️ Deploy dos contratos básicos (precisa compilar e deployar)
4. ⚠️ Indexer funcionando (precisa testar após deploy dos contratos)

### Fase 2: Funcionalidades Core ✅ COMPLETO
1. ✅ Sistema de ratings completo
2. ✅ Sistema de funding completo
3. ✅ Fluxo de aprovação on-chain
4. ✅ Dashboard de curador

### Fase 3: Polimento (1-2 dias)
1. ✅ Melhorias de UX/UI
2. ✅ Performance
3. ✅ Testes
4. ✅ Deploy produção

---

## 🎯 Próximo Passo Imediato

**Aplicar migrações do Supabase** - Sem isso, nada funciona!

```bash
# 1. Acesse Supabase Dashboard
# 2. Execute as migrações (ver supabase/APPLY_MIGRATIONS.md neste diretório)
# 3. Crie o bucket de storage
# 4. Teste o site novamente
```

---

## 📝 Notas

- **Tempo total estimado:** 8-12 horas de desenvolvimento
- **Dependências externas:** Supabase, Arc Testnet RPC, MetaMask
- **Blockers conhecidos:** Nenhum (após aplicar migrações)

---

## 🔗 Links Úteis

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ivikuadpgtutuqbhodcr
- **Arc Testnet Explorer:** (verificar URL)
- **Documentação:** `../README.md`, `TESTING_CHECKLIST.md`

