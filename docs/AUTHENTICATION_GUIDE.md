# 🔐 Guia de Autenticação - Arc Index

## ⚠️ Erro: "Failed to create project"

Este erro geralmente ocorre porque **você precisa estar autenticado** para criar um projeto.

---

## ✅ Como Resolver

### Passo 1: Conectar Wallet

1. Acesse: http://localhost:3000/submit
2. Clique no botão **"Connect Wallet"** (se aparecer)
3. Ou clique no botão de wallet no topo da página
4. MetaMask abrirá - **Aprove a conexão**

### Passo 2: Fazer Sign-In (SIWE)

Após conectar a wallet, você precisa **assinar uma mensagem** para autenticar:

1. MetaMask abrirá novamente pedindo para **assinar uma mensagem**
2. A mensagem será algo como:
   ```
   arcindex.xyz wants you to sign in with your Ethereum account:
   0x...
   
   URI: http://localhost:3000
   Version: 1
   Chain ID: 5042002
   Nonce: ...
   ```
3. **Clique em "Sign"** para assinar

### Passo 3: Criar Projeto

Após a autenticação:
1. O botão "Connect Wallet" desaparecerá
2. Você verá seu endereço no topo
3. Agora você pode preencher o formulário e criar o projeto

---

## 🔍 Verificar se Está Autenticado

### No Console do Navegador:

```javascript
// Verificar cookie de sessão
document.cookie.includes('arc-index-session')
```

### Na Interface:

- ✅ Wallet conectada: Endereço aparece no topo
- ✅ Autenticado: Pode criar projetos sem erro

---

## 🐛 Troubleshooting

### Erro: "Authentication required"

**Causa:** Você não está autenticado (não fez sign-in)

**Solução:**
1. Conecte a wallet
2. **Assine a mensagem SIWE** quando o MetaMask pedir
3. Tente criar o projeto novamente

### Erro: "Wallet not connected"

**Causa:** MetaMask não está conectado

**Solução:**
1. Instale MetaMask se não tiver
2. Clique em "Connect Wallet"
3. Aprove a conexão no MetaMask

### Erro: "Invalid signature"

**Causa:** Assinatura SIWE inválida ou expirada

**Solução:**
1. Tente conectar a wallet novamente
2. Assine a mensagem quando pedido
3. Verifique se está na rede correta (Arc Network - Chain ID: 5042002)

---

## 📋 Checklist de Autenticação

Antes de criar um projeto, verifique:

- [ ] MetaMask instalado
- [ ] Wallet conectada (endereço aparece no topo)
- [ ] Mensagem SIWE assinada (sessão criada)
- [ ] Rede correta (Arc Network - Chain ID: 5042002)
- [ ] Cookie de sessão criado (verificar no DevTools)

---

## 🎯 Fluxo Completo

```
1. Usuário → Clica "Connect Wallet"
2. MetaMask → Abre e pede conexão
3. Usuário → Aprova conexão
4. App → Gera nonce e cria mensagem SIWE
5. MetaMask → Abre novamente pedindo assinatura
6. Usuário → Assina mensagem
7. App → Envia para /api/auth/verify
8. Backend → Cria sessão (cookie)
9. Usuário → Agora pode criar projetos ✅
```

---

## ✅ Status Atual

- ✅ API retorna 401 quando não autenticado (correto)
- ✅ Frontend mostra mensagem clara de erro
- ✅ Frontend tenta conectar wallet automaticamente se não conectada
- ✅ Fluxo de autenticação SIWE implementado

**Próximo passo:** Conecte sua wallet e assine a mensagem SIWE para criar projetos!

