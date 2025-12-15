# 🧪 Testing Checklist - Arc Index

## ✅ O que JÁ está implementado:

### Backend/API
- ✅ Todas as rotas API criadas (`/api/auth/*`, `/api/projects/*`, `/api/review/*`, `/api/metadata/*`)
- ✅ Schema do banco de dados (migrações SQL criadas)
- ✅ RLS policies configuradas
- ✅ Autenticação SIWE implementada
- ✅ Processamento de imagens com Sharp
- ✅ Cliente Supabase configurado

### Smart Contracts
- ✅ Contratos Solidity criados (ProjectRegistry, ApprovalNFT, Ratings, Funding)
- ✅ Scripts de deploy criados
- ✅ Hardhat configurado

### Frontend
- ✅ UI completa de todas as páginas
- ✅ Componentes UI prontos
- ✅ API client TypeScript criado (`lib/api/client.ts`)

### Infrastructure
- ✅ Indexer worker criado
- ✅ .gitignore configurado
- ✅ Favicon e Open Graph configurados

---

## ❌ O que FALTA para testar completamente:

### 1. 🗄️ Banco de Dados (Supabase) - **CRÍTICO**

**Status:** Migrações criadas, mas **NÃO aplicadas no Supabase**

**Ação necessária:**
```bash
# Opção 1: Via Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em SQL Editor
4. Execute os arquivos em ordem:
   - supabase/migrations/001_initial_schema.sql
   - supabase/migrations/002_rls_policies.sql

# Opção 2: Via Supabase CLI
supabase db push
```

**Verificar:**
- [ ] Tabelas criadas (profiles, projects, submissions, ratings, etc.)
- [ ] RLS habilitado em todas as tabelas
- [ ] Storage bucket `arc-index-projects` criado e público
- [ ] Funções auxiliares criadas (`auth.wallet_address()`, `auth.is_curator_or_admin()`)

---

### 2. 🔐 Variáveis de Ambiente - **CRÍTICO**

**Status:** `.env.example` criado, mas `.env.local` precisa ser configurado

**Ação necessária:**
```bash
# Criar .env.local com:
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
SUPABASE_STORAGE_BUCKET=arc-index-projects

CHAIN_ID=5042002  # Arc Testnet Chain ID
RPC_URL=http://localhost:8545  # ou RPC da Arc Network
PROJECT_REGISTRY_ADDRESS=  # preencher após deploy
APPROVAL_NFT_ADDRESS=  # preencher após deploy
RATINGS_ADDRESS=  # preencher após deploy
FUNDING_ADDRESS=  # preencher após deploy
USDC_ADDRESS=  # endereço do USDC na rede

CURATOR_WALLETS=0xseu_endereco,0xoutro_endereco
ADMIN_PRIVATE_KEY=  # opcional, só se server vai assinar txs

NEXT_PUBLIC_APP_URL=http://arcindex.xyz
```

---

### 3. 📜 Smart Contracts - **CRÍTICO**

**Status:** Contratos criados, mas **NÃO compilados nem deployados**

**Ação necessária:**
```bash
# 1. Instalar dependências dos contratos
cd packages/contracts
npm install

# 2. Compilar contratos
npm run compile
# ou
npx hardhat compile

# 3. Deploy (local ou Arc Network)
# Para local (Hardhat node):
npx hardhat node  # Terminal 1
npm run deploy -- --network localhost  # Terminal 2

# Para Arc Network:
npm run deploy -- --network arc

# 4. Copiar endereços dos contratos para .env.local
```

**Verificar:**
- [ ] Contratos compilados sem erros
- [ ] Contratos deployados
- [ ] Endereços salvos no `.env.local`
- [ ] Curators adicionados ao ProjectRegistry

---

### 4. 🔌 Conexão com Carteira (Frontend) - **CRÍTICO**

**Status:** API de auth pronta, mas frontend ainda usa **MOCK**

**Ação necessária:**
- [ ] Instalar `viem` e `wagmi` (ou `@tanstack/react-query` + `viem`)
- [ ] Criar hook `useWallet()` para conectar MetaMask
- [ ] Implementar fluxo SIWE completo:
  1. Usuário clica "Connect Wallet"
  2. Conecta MetaMask
  3. Chama `/api/auth/nonce`
  4. Usuário assina mensagem
  5. Chama `/api/auth/verify`
  6. Sessão criada

**Arquivo a modificar:** `components/navigation.tsx`

---

### 5. 🔗 Integração Frontend ↔ API - **CRÍTICO**

**Status:** API client criado, mas páginas ainda usam **dados mock**

**Páginas que precisam ser conectadas:**

#### `app/explore/page.tsx`
- [ ] Substituir mock `projects` por `projectsAPI.list()`
- [ ] Implementar loading states
- [ ] Implementar error handling

#### `app/submit/page.tsx`
- [ ] Conectar `handleSubmit` para chamar `projectsAPI.create()`
- [ ] Conectar upload de imagem para `projectsAPI.uploadImage()`
- [ ] Conectar submit para `projectsAPI.submit()`
- [ ] Validar wallet conectado antes de permitir submit

#### `app/my-projects/page.tsx`
- [ ] Substituir `mockProjects` por `myProjectsAPI.list()`
- [ ] Implementar filtros por status
- [ ] Conectar ações (edit, resubmit)

#### `app/project/[id]/page.tsx`
- [ ] Substituir `projectData` mock por `projectsAPI.get(id)`
- [ ] Conectar rating para contrato on-chain
- [ ] Conectar funding para contrato on-chain

#### `app/page.tsx` (Landing)
- [ ] Substituir `featuredProjects` mock por API

---

### 6. ⛓️ Integração On-Chain (Rating & Funding) - **IMPORTANTE**

**Status:** Contratos prontos, mas UI não conectada

**Ação necessária:**
- [ ] Criar hooks para interagir com contratos:
  - `useRateProject()` - chama `Ratings.rate()`
  - `useFundProject()` - aprova USDC + chama `Funding.fund()`
- [ ] Conectar botões de rating em `app/project/[id]/page.tsx`
- [ ] Conectar botão de funding em `app/project/[id]/page.tsx`
- [ ] Mostrar transações pendentes
- [ ] Mostrar confirmações

---

### 7. 👨‍💼 Dashboard de Curadoria - **IMPORTANTE**

**Status:** API pronta, mas **UI não existe**

**Ação necessária:**
- [ ] Criar página `/review` ou `/admin/review`
- [ ] Listar submissões pendentes usando `reviewAPI.listSubmissions()`
- [ ] Implementar UI de aprovação/rejeição
- [ ] Conectar aprovação para assinar tx on-chain
- [ ] Mostrar feedback de rejeição

---

### 8. 🔄 Indexer Worker - **OPCIONAL (para produção)**

**Status:** Código criado, mas não está rodando

**Ação necessária:**
- [ ] Configurar `.env` no diretório `indexer/`
- [ ] Rodar `npm run indexer:dev`
- [ ] Verificar se eventos estão sendo indexados
- [ ] Verificar se agregados estão sendo atualizados

**Nota:** Para testes iniciais, pode rodar manualmente ou pular

---

### 9. 📦 Dependências Faltantes

**Verificar se estão instaladas:**
```bash
npm install
```

**Dependências que podem faltar:**
- [ ] `@supabase/supabase-js` - já no package.json
- [ ] `viem` - já no package.json
- [ ] `wagmi` ou `@tanstack/react-query` - **FALTA** (para wallet connection)
- [ ] `sharp` - já no package.json
- [ ] `tsx` - já no package.json

---

## 🚀 Ordem de Prioridade para Testar:

### Fase 1: Setup Básico (Fazer primeiro)
1. ✅ Configurar Supabase (criar projeto, aplicar migrações)
2. ✅ Configurar `.env.local` com credenciais Supabase
3. ✅ Testar API endpoints manualmente (Postman/Thunder Client)

### Fase 2: Frontend Básico (Sem blockchain)
4. ✅ Conectar wallet (MetaMask)
5. ✅ Implementar autenticação SIWE
6. ✅ Conectar páginas à API (explore, submit, my-projects)
7. ✅ Testar fluxo completo: criar projeto → upload imagem → submit

### Fase 3: Blockchain (Contratos)
8. ✅ Compilar e deployar contratos
9. ✅ Atualizar `.env.local` com endereços
10. ✅ Conectar rating e funding on-chain
11. ✅ Testar fluxo: submit → curator aprova → NFT minted

### Fase 4: Curadoria
12. ✅ Criar UI de review
13. ✅ Testar aprovação/rejeição
14. ✅ Testar mint de NFT após aprovação

### Fase 5: Indexer (Opcional)
15. ✅ Rodar indexer
16. ✅ Verificar sincronização on-chain ↔ off-chain

---

## 🧪 Como Testar Cada Parte:

### Teste 1: API de Autenticação
```bash
# Terminal 1: Rodar servidor
npm run dev

# Terminal 2: Testar endpoints
curl http://localhost:3000/api/auth/nonce
# Deve retornar: {"nonce": "..."}
```

### Teste 2: Banco de Dados
```sql
-- No Supabase SQL Editor
SELECT * FROM profiles LIMIT 1;
SELECT * FROM projects LIMIT 1;
-- Deve retornar sem erros
```

### Teste 3: Contratos
```bash
cd packages/contracts
npx hardhat compile
# Deve compilar sem erros
```

### Teste 4: Frontend
```bash
npm run dev
# Acessar http://localhost:3000
# Tentar conectar wallet
# Verificar se aparece erro ou funciona
```

---

## 📝 Resumo Rápido:

**Para testar AGORA (sem blockchain):**
1. ✅ Aplicar migrações no Supabase
2. ✅ Configurar `.env.local`
3. ✅ Conectar frontend à API (substituir mocks)
4. ✅ Implementar wallet connection

**Para testar COMPLETO (com blockchain):**
5. ✅ Deployar contratos
6. ✅ Conectar rating/funding on-chain
7. ✅ Criar UI de curadoria
8. ✅ Rodar indexer

---

## ⚠️ Problemas Comuns:

1. **"Missing Supabase environment variables"**
   → Verificar `.env.local` está criado e tem todas as variáveis

2. **"Table does not exist"**
   → Migrações não foram aplicadas no Supabase

3. **"Contract not deployed"**
   → Contratos não foram deployados ou endereços errados no `.env`

4. **"Unauthorized"**
   → Wallet não conectado ou sessão expirada

5. **"RLS policy violation"**
   → Verificar se RLS policies foram aplicadas corretamente

