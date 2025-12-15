#!/bin/bash

# Script para atualizar os endereços dos contratos no .env.local

ENV_FILE=".env.local"

# Endereços dos contratos deployados
PROJECT_REGISTRY="0xB20d601f1A56955A3C1a881c467dA2b917Eda2Af"
APPROVAL_NFT="0xb57776A56442f111c546f90baE9206C42f4263F9"
RATINGS="0xef1AD0E604b51751c3B1d1fAB8831A62Cb8a884D"
FUNDING="0x1E0fFb43450DB3b42F3D33df955bf46280699f63"

echo "📝 Atualizando endereços dos contratos no .env.local..."

# Função para atualizar ou adicionar variável
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Atualizar variável existente
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        fi
        echo "  ✅ Atualizado: ${key}"
    else
        # Adicionar nova variável
        echo "${key}=${value}" >> "$ENV_FILE"
        echo "  ✅ Adicionado: ${key}"
    fi
}

# Atualizar endereços
update_env_var "PROJECT_REGISTRY_ADDRESS" "$PROJECT_REGISTRY"
update_env_var "APPROVAL_NFT_ADDRESS" "$APPROVAL_NFT"
update_env_var "RATINGS_ADDRESS" "$RATINGS"
update_env_var "FUNDING_ADDRESS" "$FUNDING"

# Também atualizar as versões NEXT_PUBLIC_ se existirem
update_env_var "NEXT_PUBLIC_PROJECT_REGISTRY_ADDRESS" "$PROJECT_REGISTRY"
update_env_var "NEXT_PUBLIC_APPROVAL_NFT_ADDRESS" "$APPROVAL_NFT"
update_env_var "NEXT_PUBLIC_RATINGS_ADDRESS" "$RATINGS"
update_env_var "NEXT_PUBLIC_FUNDING_ADDRESS" "$FUNDING"

echo ""
echo "✅ Endereços dos contratos atualizados com sucesso!"
echo ""
echo "📋 Endereços deployados:"
echo "  PROJECT_REGISTRY_ADDRESS=$PROJECT_REGISTRY"
echo "  APPROVAL_NFT_ADDRESS=$APPROVAL_NFT"
echo "  RATINGS_ADDRESS=$RATINGS"
echo "  FUNDING_ADDRESS=$FUNDING"

