#!/bin/bash

# Script para testar criação de projeto via API

echo "🧪 Testando criação de projeto..."
echo ""

# 1. Obter nonce
echo "1. Obtendo nonce..."
NONCE=$(curl -s http://localhost:3000/api/auth/nonce | python3 -c "import sys, json; print(json.load(sys.stdin)['nonce'])" 2>/dev/null)
if [ -z "$NONCE" ]; then
  echo "❌ Erro ao obter nonce"
  exit 1
fi
echo "✅ Nonce obtido: $NONCE"
echo ""

# 2. Criar projeto sem autenticação (deve falhar)
echo "2. Tentando criar projeto sem autenticação (deve falhar)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "Test description",
    "category": "DeFi"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Erro de autenticação esperado (401)"
else
  echo "⚠️  Status inesperado: $HTTP_CODE"
fi

echo ""
echo "📝 Conclusão:"
echo "Para criar um projeto, você precisa:"
echo "1. Conectar sua wallet no frontend"
echo "2. Fazer sign-in (SIWE)"
echo "3. Então criar o projeto"

