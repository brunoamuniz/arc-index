# 🔧 Troubleshooting - Internal Server Error

## Erro: "Internal Server Error" ao acessar o site

### Possíveis Causas e Soluções:

#### 1. ❌ Variáveis de Ambiente Não Configuradas

**Sintoma:** Erro ao iniciar o servidor ou ao acessar qualquer página

**Solução:**
```bash
# Verificar se .env.local existe
ls -la .env.local

# Se não existir, criar:
./setup-env.sh

# Ou criar manualmente com as variáveis do Supabase
```

**Verificar:**
- `SUPABASE_URL` está configurado?
- `SUPABASE_SERVICE_ROLE_KEY` está configurado?
- `NEXT_PUBLIC_SUPABASE_URL` está configurado?
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurado?

---

#### 2. ❌ Migrações Não Aplicadas no Supabase

**Sintoma:** Erro "relation does not exist" ou "table does not exist"

**Solução:**
1. Acesse: https://supabase.com/dashboard
2. Projeto: `ivikuadpgtutuqbhodcr`
3. SQL Editor → Execute `supabase/migrations/001_initial_schema.sql`
4. SQL Editor → Execute `supabase/migrations/002_rls_policies.sql`
5. Storage → Criar bucket `arc-index-projects` (público)

**Ver guia completo:** `supabase/APPLY_MIGRATIONS.md` (neste diretório)

---

#### 3. ❌ Cache do Next.js Corrompido

**Sintoma:** Erros estranhos ou módulos não encontrados

**Solução:**
```bash
# Limpar cache
rm -rf .next
npm run dev
```

---

#### 4. ❌ Dependências Não Instaladas

**Sintoma:** "Module not found" para viem, @supabase/supabase-js, etc.

**Solução:**
```bash
npm install
```

---

#### 5. ❌ Porta 3000 Já em Uso

**Sintoma:** Erro ao iniciar servidor

**Solução:**
```bash
# Verificar processos na porta 3000
lsof -ti:3000

# Matar processo (se necessário)
kill -9 $(lsof -ti:3000)

# Ou usar outra porta
PORT=3001 npm run dev
```

---

## 🔍 Como Diagnosticar

### 1. Verificar Logs do Servidor
```bash
npm run dev
# Olhar os erros no terminal
```

### 2. Verificar Console do Navegador
- Abrir DevTools (F12)
- Ver aba "Console" para erros do cliente
- Ver aba "Network" para erros de requisições

### 3. Testar API Diretamente
```bash
# Testar endpoint de nonce
curl http://localhost:3000/api/auth/nonce

# Se retornar erro, verificar:
# - Servidor está rodando?
# - Variáveis de ambiente estão configuradas?
# - Migrações foram aplicadas?
```

### 4. Verificar Variáveis de Ambiente
```bash
# Verificar se .env.local existe e tem as variáveis
cat .env.local | grep SUPABASE
```

---

## ✅ Checklist de Verificação

- [ ] `.env.local` existe e tem todas as variáveis
- [ ] `npm install` foi executado
- [ ] Migrações foram aplicadas no Supabase
- [ ] Bucket `arc-index-projects` foi criado no Supabase Storage
- [ ] Cache `.next` foi limpo (se necessário)
- [ ] Porta 3000 está livre
- [ ] Servidor inicia sem erros

---

## 🆘 Se Nada Funcionar

1. **Verificar logs completos:**
   ```bash
   npm run dev 2>&1 | tee server.log
   ```

2. **Verificar se é problema de build:**
   ```bash
   npm run build
   ```

3. **Verificar versão do Node:**
   ```bash
   node --version  # Deve ser 20+
   ```

4. **Recriar do zero:**
   ```bash
   rm -rf node_modules .next
   npm install
   npm run dev
   ```

---

## 📞 Informações para Debug

Se precisar de ajuda, forneça:
- Versão do Node: `node --version`
- Erro completo do terminal
- Erro completo do console do navegador
- Conteúdo de `.env.local` (sem valores sensíveis)
- Status das migrações no Supabase
