# 📋 Como Aplicar Migrações no Supabase (Banco Compartilhado)

## ⚠️ IMPORTANTE: Banco Compartilhado

Este banco é **compartilhado com outros projetos**. As migrações foram criadas com segurança:
- ✅ Usam `CREATE TABLE IF NOT EXISTS` (não apaga tabelas existentes)
- ✅ Usam `CREATE INDEX IF NOT EXISTS` (não duplica índices)
- ✅ Verificam existência antes de habilitar RLS
- ✅ Usam `CREATE OR REPLACE` para funções (atualiza se existir)

## 🚀 Passo a Passo

### 1. Acessar Supabase Dashboard

1. Vá para https://supabase.com/dashboard
2. Selecione o projeto: `ivikuadpgtutuqbhodcr`
3. Clique em **SQL Editor** no menu lateral

### 2. Aplicar Migração 001 (Schema)

1. No SQL Editor, clique em **New Query**
2. Abra o arquivo `supabase/migrations/001_initial_schema.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run** (ou pressione Cmd/Ctrl + Enter)
6. Verifique se não há erros

**O que esta migração faz:**
- Cria enums (user_role, project_status, submission_status)
- Cria tabelas: arcindex_profiles, arcindex_projects, arcindex_submissions, arcindex_ratings, arcindex_ratings_agg, arcindex_fundings, arcindex_funding_agg, arcindex_chain_events
- Cria índices
- Cria função `update_updated_at_column()`
- Cria triggers para atualizar `updated_at`

### 3. Aplicar Migração 002 (RLS Policies)

1. No SQL Editor, clique em **New Query** novamente
2. Abra o arquivo `supabase/migrations/002_rls_policies.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run**
6. Verifique se não há erros

**O que esta migração faz:**
- Habilita Row Level Security nas tabelas
- Cria funções auxiliares: `wallet_address()`, `is_curator_or_admin()`
- Cria políticas RLS para cada tabela

### 4. Criar Storage Bucket

1. No menu lateral, clique em **Storage**
2. Clique em **New bucket**
3. Nome: `arc-index-projects`
4. Marque como **Public bucket**
5. Clique em **Create bucket**

### 5. Verificar se Tudo Funcionou

Execute no SQL Editor:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('arcindex_profiles', 'arcindex_projects', 'arcindex_submissions', 'arcindex_ratings', 'arcindex_ratings_agg', 'arcindex_fundings', 'arcindex_funding_agg', 'arcindex_chain_events')
ORDER BY table_name;

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('arcindex_profiles', 'arcindex_projects', 'arcindex_submissions', 'arcindex_ratings', 'arcindex_ratings_agg', 'arcindex_fundings', 'arcindex_funding_agg', 'arcindex_chain_events');

-- Verificar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('wallet_address', 'is_curator_or_admin', 'update_updated_at_column');
```

**Resultado esperado:**
- 8 tabelas listadas
- Todas com `rowsecurity = true`
- 3 funções listadas

## 🔍 Troubleshooting

### Erro: "relation already exists"
- ✅ **OK** - Significa que a tabela já existe (de outro projeto ou execução anterior)
- As migrações usam `IF NOT EXISTS`, então são seguras

### Erro: "type already exists"
- ✅ **OK** - O enum já existe
- As migrações verificam isso antes de criar

### Erro: "function already exists"
- ✅ **OK** - A função já existe
- Usamos `CREATE OR REPLACE`, então atualiza se necessário

### Erro: "permission denied"
- ❌ **Problema** - Você precisa de permissões de admin no Supabase
- Verifique se está usando a conta correta

## ✅ Próximos Passos Após Aplicar Migrações

1. Testar conexão: `npm run dev` deve rodar sem erros
2. Testar API: `curl http://localhost:3000/api/auth/nonce`
3. Verificar no Supabase se dados estão sendo salvos

