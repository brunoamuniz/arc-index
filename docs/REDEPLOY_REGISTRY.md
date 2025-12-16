# 🔄 Guia de Redeploy do ProjectRegistry

Este guia explica como fazer o redeploy do contrato `ProjectRegistry` para incluir a função `mintApprovalNFT`.

## ⚠️ Problema

O contrato `ProjectRegistry` atual (`0xB20d601f1A56955A3C1a881c467dA2b917Eda2Af`) não possui a função `mintApprovalNFT`, que é necessária para mintar NFTs de aprovação.

## ✅ Solução

Fazer o redeploy do `ProjectRegistry` com a versão atualizada do código.

## 📋 Pré-requisitos

1. Ter o arquivo `.env.local` configurado com:
   - `APPROVAL_NFT_ADDRESS` - Endereço do contrato ApprovalNFT
   - `PROJECT_REGISTRY_ADDRESS` - Endereço atual (será atualizado após o redeploy)
   - `CURATOR_WALLETS` - Lista de endereços de curadores (opcional, separados por vírgula)

2. Ter tokens na carteira para pagar o gas do deploy

## 🚀 Passos para Redeploy

### 1. Navegue até a pasta de contratos

```bash
cd packages/contracts
```

### 2. Execute o script de redeploy

```bash
npx hardhat run scripts/redeploy-registry.ts --network arc
```

**Nota**: Certifique-se de que o arquivo `.env.local` tem as variáveis:
- `RPC_URL` - URL do RPC da Arc Network
- `CHAIN_ID` - Chain ID (5042002 para testnet)
- `ADMIN_PRIVATE_KEY` - Chave privada da carteira que fará o deploy

### 3. O que o script faz:

1. ✅ Deploya um novo contrato `ProjectRegistry` com a função `mintApprovalNFT`
2. ✅ Configura o endereço do `ApprovalNFT` no novo `ProjectRegistry`
3. ✅ Adiciona os curadores especificados em `CURATOR_WALLETS`
4. ✅ Adiciona o deployer como curador (se ainda não for)

### 4. Atualize o `.env.local`

Após o redeploy, o script mostrará o novo endereço. Atualize o arquivo `.env.local`:

```env
PROJECT_REGISTRY_ADDRESS=<novo_endereço_aqui>
```

### 5. Atualize o ApprovalNFT para apontar para o novo ProjectRegistry

O `ApprovalNFT` precisa saber qual é o novo `ProjectRegistry`. Execute:

```bash
npx hardhat run scripts/update-approval-nft-registry.ts --network arc
```

**Nota**: Você precisa ser o owner do contrato `ApprovalNFT` para executar este script.

Este script:
- Lê o novo `PROJECT_REGISTRY_ADDRESS` do `.env.local`
- Chama `updateRegistry()` no `ApprovalNFT` para atualizar a referência

## ⚠️ Importante

- **Projetos existentes**: Os projetos criados no `ProjectRegistry` antigo NÃO serão migrados automaticamente. Eles continuarão no contrato antigo.
- **Novos projetos**: Todos os novos projetos devem ser criados no novo `ProjectRegistry`.
- **Ratings e Funding**: Se esses contratos têm referências hardcoded ao `ProjectRegistry`, você pode precisar redeployá-los também ou atualizar as referências.

## 🔍 Verificação

Após o redeploy, você pode verificar se tudo está funcionando:

1. Verifique se o novo `ProjectRegistry` tem a função `mintApprovalNFT`:
   - Acesse o explorador: https://testnet.arcscan.app/address/<NOVO_ENDERECO>
   - Verifique se a função aparece na lista de funções

2. Teste criar um projeto e mintar a NFT:
   - Crie um projeto na plataforma
   - Aprove como curador
   - Tente registrar on-chain e mintar a NFT

## 📝 Notas

- O deployer será automaticamente adicionado como curador
- Certifique-se de ter tokens suficientes para o gas
- Guarde o endereço do novo contrato em local seguro

