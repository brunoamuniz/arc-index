/**
 * Script para criar o storage bucket no Supabase
 * Execute: node scripts/create-storage-bucket.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createBucket() {
  const bucketName = 'arc-index-projects';

  try {
    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw listError;
    }

    const existingBucket = buckets?.find(b => b.name === bucketName);
    
    if (existingBucket) {
      console.log(`✅ Bucket "${bucketName}" já existe!`);
      return;
    }

    // Criar o bucket
    console.log(`📦 Criando bucket "${bucketName}"...`);
    
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880, // 5MB
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Bucket "${bucketName}" criado com sucesso!`);
    console.log(`   - Público: Sim`);
    console.log(`   - Tipos permitidos: JPEG, PNG, WebP, GIF`);
    console.log(`   - Tamanho máximo: 5MB`);
  } catch (error) {
    console.error('❌ Erro ao criar bucket:', error.message);
    process.exit(1);
  }
}

createBucket();

