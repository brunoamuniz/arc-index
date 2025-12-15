# 📋 Prefixo de Tabelas: `arcindex_`

## ✅ Implementado

Todas as tabelas do Arc Index agora usam o prefixo `arcindex_` para evitar conflitos em banco compartilhado.

## 📊 Tabelas Renomeadas

| Tabela Antiga | Tabela Nova |
|---------------|-------------|
| `profiles` | `arcindex_profiles` |
| `projects` | `arcindex_projects` |
| `submissions` | `arcindex_submissions` |
| `ratings` | `arcindex_ratings` |
| `ratings_agg` | `arcindex_ratings_agg` |
| `fundings` | `arcindex_fundings` |
| `funding_agg` | `arcindex_funding_agg` |
| `chain_events` | `arcindex_chain_events` |

## 🔄 Arquivos Atualizados

### Migrações SQL
- ✅ `001_initial_schema.sql` - Todas as tabelas, índices, triggers
- ✅ `002_rls_policies.sql` - Todas as políticas RLS

### Código TypeScript
- ✅ `app/api/**/*.ts` - Todas as rotas API
- ✅ `lib/supabase/auth.ts` - Funções de autenticação
- ✅ `lib/supabase/server.ts` - Cliente Supabase
- ✅ `indexer/index.ts` - Worker de indexação

## ⚠️ IMPORTANTE

Se você já aplicou as migrações ANTES desta mudança:

1. **Opção 1: Recriar tabelas (se não há dados importantes)**
   ```sql
   -- Dropar tabelas antigas
   DROP TABLE IF EXISTS profiles CASCADE;
   DROP TABLE IF EXISTS projects CASCADE;
   -- ... etc
   
   -- Aplicar novas migrações
   ```

2. **Opção 2: Renomear tabelas existentes**
   ```sql
   ALTER TABLE profiles RENAME TO arcindex_profiles;
   ALTER TABLE projects RENAME TO arcindex_projects;
   ALTER TABLE submissions RENAME TO arcindex_submissions;
   ALTER TABLE ratings RENAME TO arcindex_ratings;
   ALTER TABLE ratings_agg RENAME TO arcindex_ratings_agg;
   ALTER TABLE fundings RENAME TO arcindex_fundings;
   ALTER TABLE funding_agg RENAME TO arcindex_funding_agg;
   ALTER TABLE chain_events RENAME TO arcindex_chain_events;
   ```

## ✅ Benefícios

1. **Isolamento** - Não conflita com tabelas de outros projetos
2. **Segurança** - Evita sobrescrever dados de outros projetos
3. **Organização** - Fácil identificar tabelas do Arc Index
4. **Manutenção** - Mais fácil gerenciar em banco compartilhado

