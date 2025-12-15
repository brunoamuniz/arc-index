# 🚀 Quick Start Guide - Arc Index

## ⚡ Início Rápido (3 passos)

### Passo 1: Aplicar Migrações do Supabase (5-10 min) ⚠️ **CRÍTICO**

**Sem isso, a API não funciona!**

1. **Acesse o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard
   - Projeto: `ivikuadpgtutuqbhodcr`

2. **Execute a Migração 001 (Schema):**
   - Clique em **SQL Editor** no menu lateral
   - Clique em **New Query**
   - Abra o arquivo: `supabase/migrations/001_initial_schema.sql`
   - Copie TODO o conteúdo e cole no SQL Editor
   - Clique em **Run** (ou Cmd/Ctrl + Enter)
   - ✅ Deve executar sem erros

3. **Execute a Migração 002 (RLS Policies):**
   - No SQL Editor, clique em **New Query** novamente
   - Abra o arquivo: `supabase/migrations/002_rls_policies.sql`
   - Copie TODO o conteúdo e cole no SQL Editor
   - Clique em **Run**
   - ✅ Deve executar sem erros

4. **Criar Storage Bucket:**
   - No menu lateral, clique em **Storage**
   - Clique em **New bucket**
   - Nome: `arc-index-projects`
   - Marque como **Public bucket**
   - Clique em **Create bucket**

5. **Verificar se funcionou:**
   - Execute no SQL Editor:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'arcindex_%'
   ORDER BY table_name;
   ```
   - ✅ Deve retornar 8 tabelas

**✅ Pronto!** Agora a API está funcional.

---

### Passo 2: Testar a Aplicação (2 min)

1. **Iniciar o servidor:**
   ```bash
   npm run dev
   ```

2. **Testar a API:**
   - Abra: http://localhost:3000/api/auth/nonce
   - ✅ Deve retornar: `{"nonce": "..."}`

3. **Acessar o site:**
   - Abra: http://localhost:3000
   - ✅ Deve carregar sem erros

**✅ Pronto!** A aplicação básica está funcionando.

---

### Passo 3: Deployar Contratos (30 min) - Opcional para funcionalidades on-chain

**Nota:** Sem os contratos, você ainda pode:
- ✅ Criar projetos
- ✅ Listar projetos
- ✅ Fazer upload de imagens
- ✅ Submeter para revisão
- ❌ Rating on-chain (não funciona)
- ❌ Funding on-chain (não funciona)
- ❌ Aprovação on-chain (não funciona)

**Para habilitar funcionalidades on-chain:**

1. **Compilar contratos:**
   ```bash
   cd packages/contracts
   npm install  # Se ainda não instalou
   npm run compile
   ```

2. **Deployar na Arc Network:**
   ```bash
   npm run deploy:arc
   ```

3. **Copiar endereços dos contratos:**
   - O deploy vai mostrar os endereços dos contratos
   - Copie e cole no `.env.local`:
     ```bash
     PROJECT_REGISTRY_ADDRESS=0x...
     APPROVAL_NFT_ADDRESS=0x...
     RATINGS_ADDRESS=0x...
     FUNDING_ADDRESS=0x...
     ```

4. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

**✅ Pronto!** Agora todas as funcionalidades on-chain estão habilitadas.

---

## 🧪 Testar Funcionalidades Completas

### 1. Criar um Projeto
- Acesse: http://localhost:3000/submit
- Conecte sua wallet (MetaMask)
- Preencha o formulário
- Faça upload de uma imagem
- Submeta para revisão

### 2. Aprovar como Curador
- Acesse: http://localhost:3000/review
- Conecte uma wallet de curador (definida em `CURATOR_WALLETS`)
- Aprove um projeto
- ✅ Transações on-chain serão enviadas automaticamente

### 3. Rating e Funding
- Acesse: http://localhost:3000/project/[id]
- Dê uma avaliação (1-5 estrelas)
- Faça uma doação USDC
- ✅ Transações on-chain serão enviadas automaticamente

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor de desenvolvimento
npm run build            # Build de produção
npm run start            # Servidor de produção

# Contratos
npm run contracts:compile    # Compilar contratos
npm run contracts:deploy     # Deploy (usa .env)
npm run contracts:test       # Testar contratos

# Indexer (opcional)
npm run indexer:dev      # Iniciar indexer de eventos on-chain
```

---

## 🐛 Troubleshooting

### Erro: "Database not configured"
- ✅ Verifique se `.env.local` existe e tem as variáveis corretas
- ✅ Verifique se as migrações foram aplicadas

### Erro: "relation does not exist"
- ✅ Execute as migrações do Supabase (Passo 1)

### Erro: "Internal Server Error"
- ✅ Verifique os logs do servidor (`npm run dev`)
- ✅ Verifique se as migrações foram aplicadas
- ✅ Verifique se `.env.local` está correto

### Contratos não compilam
- ✅ Execute `cd packages/contracts && npm install`
- ✅ Verifique se `hardhat.config.ts` está configurado corretamente

---

## 📚 Documentação Completa

- **Setup detalhado:** `../README.md`
- **Roadmap:** `ROADMAP.md`
- **Checklist de testes:** `TESTING_CHECKLIST.md`
- **Como aplicar migrações:** `supabase/APPLY_MIGRATIONS.md`

---

## ✅ Checklist Rápido

- [ ] Migrações do Supabase aplicadas
- [ ] Storage bucket criado
- [ ] Servidor inicia sem erros (`npm run dev`)
- [ ] API responde (`/api/auth/nonce`)
- [ ] Site carrega (http://localhost:3000)
- [ ] (Opcional) Contratos compilados
- [ ] (Opcional) Contratos deployados
- [ ] (Opcional) Endereços dos contratos no `.env.local`

---

**🎉 Pronto para começar!** Siga os 3 passos acima e você estará rodando a aplicação completa.

