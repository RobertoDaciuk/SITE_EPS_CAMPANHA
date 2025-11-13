# 📋 COMANDOS PARA SETUP DO BANCO DE DADOS V7.0

## 🎯 PASSO A PASSO COMPLETO

### 1️⃣ Navegar para a pasta backend
```powershell
cd c:\Users\Roberto\Desktop\Nova pasta\backend
```

---

### 2️⃣ Gerar o cliente Prisma atualizado (com novos campos V7)
```powershell
npx prisma generate
```

**O que faz:** Atualiza o cliente TypeScript do Prisma com as alterações do schema (saldoPontos, pontosLiquidados, etc.)

---

### 3️⃣ Criar migration para as mudanças V7 (se ainda não existe)
```powershell
npx prisma migrate dev --name sistema_saldo_pagamentos_v7
```

**O que faz:** 
- Cria uma nova migration com as alterações do schema.prisma
- Aplica as mudanças no banco de dados
- Adiciona os novos campos:
  - `Usuario.saldoPontos`
  - `EnvioVenda.pontosAdicionadosAoSaldo`
  - `EnvioVenda.multiplicadorAplicado`
  - `EnvioVenda.valorFinalComEvento`
  - `EnvioVenda.pontosLiquidados`
  - `RelatorioFinanceiro.dataCorte`
  - `RelatorioFinanceiro.enviosIncluidos`

---

### 4️⃣ ZERAR O BANCO + RODAR TODAS MIGRATIONS + EXECUTAR SEED
```powershell
npx prisma migrate reset
```

**O que faz:**
1. ⚠️ **APAGA TODO O BANCO DE DADOS**
2. Cria o banco novamente do zero
3. Roda TODAS as migrations na ordem correta
4. Executa automaticamente o arquivo `seed.ts`
5. Cria:
   - ✅ 2 Óticas (Visão Clara e Bom Ver)
   - ✅ 5 Usuários (1 Admin + 2 Gerentes + 2 Vendedores)
   - ✅ SEM campanhas ou outros dados

**⚠️ ATENÇÃO:** Este comando é DESTRUTIVO! Todos os dados serão perdidos.

---

### 5️⃣ (ALTERNATIVA) Executar apenas o seed (sem zerar)
```powershell
npx ts-node prisma/seed.ts
```

**O que faz:** Executa apenas o seed sem apagar o banco (útil para testes)

---

## 📊 ESTRUTURA CRIADA PELO SEED

### 🏢 Óticas Criadas:
1. **Ótica Visão Clara** (São Paulo/SP)
   - CNPJ: 11111111000111
   
2. **Ótica Bom Ver** (Rio de Janeiro/RJ)
   - CNPJ: 22222222000122

---

### 👥 Usuários Criados:

#### 🔐 ADMIN (sem ótica vinculada)
- **Email:** admin@eps.com.br
- **Senha:** Senha@123
- **CPF:** 00000000001

---

#### 🏢 ÓTICA VISÃO CLARA:

**Gerente:**
- **Nome:** Carlos Silva
- **Email:** carlos.gerente@visaoclara.com
- **Senha:** Senha@123
- **CPF:** 11111111111

**Vendedor:**
- **Nome:** João Pedro
- **Email:** joao.vendedor@visaoclara.com
- **Senha:** Senha@123
- **CPF:** 33333333333
- **Subordinado a:** Carlos Silva

---

#### 🏢 ÓTICA BOM VER:

**Gerente:**
- **Nome:** Maria Santos
- **Email:** maria.gerente@bomver.com
- **Senha:** Senha@123
- **CPF:** 22222222222

**Vendedor:**
- **Nome:** Ana Costa
- **Email:** ana.vendedor@bomver.com
- **Senha:** Senha@123
- **CPF:** 44444444444
- **Subordinado a:** Maria Santos

---

## ✅ RESUMO DOS COMANDOS (ORDEM RECOMENDADA)

```powershell
# 1. Entrar na pasta backend
cd c:\Users\Roberto\Desktop\Nova pasta\backend

# 2. Gerar cliente Prisma atualizado
npx prisma generate

# 3. Criar migration V7 (se necessário)
npx prisma migrate dev --name sistema_saldo_pagamentos_v7

# 4. ZERAR banco + criar estrutura + seed
npx prisma migrate reset
```

---

## 🔍 VERIFICAR SE DEU CERTO

### Abrir Prisma Studio para visualizar os dados:
```powershell
npx prisma studio
```

Isso abre uma interface web em `http://localhost:5555` onde você pode ver:
- ✅ 2 óticas cadastradas
- ✅ 5 usuários (todos com status ATIVO)
- ✅ Relacionamentos corretos (vendedores → gerentes → óticas)
- ✅ Campos novos (saldoPontos = 0 para todos)

---

## 🚀 PRÓXIMOS PASSOS

Após executar os comandos:

1. **Iniciar o backend:**
   ```powershell
   npm run start:dev
   ```

2. **Testar login com uma das credenciais acima**

3. **Criar campanhas via interface web** (não mais via seed)

---

## 🆘 PROBLEMAS COMUNS

### Erro: "saldoPontos does not exist"
**Solução:** Execute `npx prisma generate` novamente

### Erro: Migration conflicts
**Solução:** Delete a pasta `prisma/migrations` e rode `npx prisma migrate dev` novamente

### Erro ao rodar seed
**Solução:** Verifique se o bcrypt está instalado: `npm install bcrypt @types/bcrypt`

---

## 📝 NOTAS IMPORTANTES

- ⚠️ Todos os usuários têm a mesma senha: **Senha@123**
- ⚠️ `npx prisma migrate reset` é DESTRUTIVO - apaga todos os dados
- ✅ O seed está configurado para limpar dados antigos antes de criar novos
- ✅ Não cria campanhas, produtos ou outros dados - apenas estrutura básica
- ✅ Todos os usuários já vêm com `saldoPontos = 0` (pronto para V7.0)

---

## 🎉 FIM

Após executar esses comandos, seu banco estará zerado e pronto para testes com a estrutura V7.0 implementada!
