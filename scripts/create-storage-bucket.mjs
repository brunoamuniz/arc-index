/**
 * Script para criar o storage bucket no Supabase
 * Execute: node scripts/create-storage-bucket.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env.local manualmente
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    console.error('Erro ao carregar .env.local:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

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
      console.log(`   - ID: ${existingBucket.id}`);
      console.log(`   - Público: ${existingBucket.public ? 'Sim' : 'Não'}`);
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

