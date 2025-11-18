# 🚀 Guia Completo de Implantação no Jelastic SaveInCloud

## 📋 Índice
1. [Visão Geral do Sistema](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração do Ambiente Jelastic](#configuração-jelastic)
4. [Implantação do Banco de Dados](#banco-de-dados)
5. [Implantação do Backend](#backend)
6. [Implantação do Frontend](#frontend)
7. [Configuração de Domínios e SSL](#domínios-ssl)
8. [Variáveis de Ambiente](#variáveis-ambiente)
9. [Deploy e Testes](#deploy-testes)
10. [Monitoramento e Manutenção](#monitoramento)

---

## 🎯 Visão Geral do Sistema {#visão-geral}

**Arquitetura:**
- **Backend:** NestJS (Node.js 20+) na porta 3000
- **Frontend:** Next.js 16 (React 19) na porta 3001
- **Banco de Dados:** PostgreSQL 15+
- **Uploads:** Sistema de arquivos local (pode ser migrado para S3)

---

## ✅ Pré-requisitos {#pré-requisitos}

Antes de começar, certifique-se de ter:

- [ ] Conta ativa no Jelastic SaveInCloud
- [ ] Código-fonte do projeto em um repositório Git (GitHub, GitLab, etc.)
- [ ] Domínio próprio (opcional, mas recomendado)
- [ ] Credenciais de acesso ao painel Jelastic

---

## 🔧 Configuração do Ambiente Jelastic {#configuração-jelastic}

### Passo 1: Criar Novo Ambiente

1. Acesse https://app.jelastic.saveincloud.net/
2. Faça login com suas credenciais
3. Clique em **"New Environment"** no topo
4. Nomeie o ambiente: `eps-campanhas-prod`

### Passo 2: Configurar Topologia

Configure a topologia do ambiente da seguinte forma:

#### 🗄️ Database Layer (SQL)
```
Tipo: PostgreSQL 15
Cloudlets: 
  - Reserved: 2 (2 GB RAM garantido)
  - Scaling Limit: 8 (até 8 GB RAM)
Disco: 10 GB SSD
Nodes: 1
```

#### 🔙 Application Server - Backend
```
Tipo: Node.js 20.x
Cloudlets:
  - Reserved: 2 (2 GB RAM garantido)
  - Scaling Limit: 16 (até 16 GB RAM)
Disco: 5 GB SSD
Nodes: 1
Balanceamento: NGINX (incluído automaticamente)
```

#### 🎨 Application Server - Frontend
```
Tipo: Node.js 20.x
Cloudlets:
  - Reserved: 2 (2 GB RAM garantido)
  - Scaling Limit: 8 (até 8 GB RAM)
Disco: 5 GB SSD
Nodes: 1
```

### Passo 3: Configuração de Rede

- ✅ **Public IPv4:** Habilite para Backend e Frontend
- ✅ **SSL:** Será configurado depois com Let's Encrypt

**Clique em "Create"** e aguarde o provisionamento (~3-5 minutos)

---

## 🗄️ Implantação do Banco de Dados {#banco-de-dados}

### Passo 1: Acessar PostgreSQL via Web SSH

1. No ambiente criado, clique no nó **PostgreSQL**
2. Clique em **"Web SSH"** (ícone de terminal)
3. Faça login com as credenciais fornecidas pelo Jelastic

### Passo 2: Criar Database e Usuário

```bash
# Conectar ao PostgreSQL como superusuário
psql -U webadmin -d postgres

# Dentro do psql, execute:
CREATE DATABASE eps_campanhas;

# Criar usuário específico (substitua SUA_SENHA_FORTE)
CREATE USER eps_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE_AQUI';

# Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE eps_campanhas TO eps_user;

# Conectar ao banco criado
\c eps_campanhas

# Conceder privilégios no schema public
GRANT ALL ON SCHEMA public TO eps_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO eps_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO eps_user;

# Sair do psql
\q
```

### Passo 3: Anotar Credenciais de Conexão

```
Host: node<ID>-eps-campanhas-prod.jelastic.saveincloud.net
Port: 5432
Database: eps_campanhas
User: eps_user
Password: SUA_SENHA_FORTE_AQUI
```

**⚠️ Importante:** Anote essas informações - você precisará delas para configurar o backend.

---

## 🔙 Implantação do Backend {#backend}

### Passo 1: Preparar Repositório Git

Certifique-se de que seu repositório Git está atualizado com:
- ✅ Arquivo `package.json` na raiz do backend
- ✅ Pasta `prisma/` com `schema.prisma`
- ✅ Script de build configurado

### Passo 2: Configurar Deployment via Git

1. No Jelastic, clique no nó **Node.js (Backend)**
2. Clique em **"Deployment Manager"** (ícone de pacote)
3. Clique em **"Add"** → **"Git/SVN"**

**Configurações:**
```
Repository URL: https://github.com/SEU_USUARIO/SEU_REPO.git
Branch: main (ou sua branch de produção)
Context: backend
Name: backend-app
```

4. Clique em **"Add"**
5. Clique em **"Deploy to..."** → Selecione o ambiente Backend
6. **Build:** Deixe em branco (vamos configurar depois)
7. **Deploy Strategy:** Classic
8. Clique em **"Deploy"**

### Passo 3: Configurar Variáveis de Ambiente

1. No nó Backend, clique em **"Config"** (ícone de engrenagem)
2. Vá para **"Variables"**
3. Adicione as seguintes variáveis:

```bash
# Database
DATABASE_URL=postgresql://eps_user:SUA_SENHA@node<ID>-eps-campanhas-prod.jelastic.saveincloud.net:5432/eps_campanhas?schema=public

# Servidor
PORT=3000
NODE_ENV=production

# JWT (gere uma chave forte - 64 caracteres aleatórios)
JWT_SECRET=GERAR_STRING_ALEATORIA_MUITO_SEGURA_64_CARACTERES_AQUI

# JWT Expiration
JWT_EXPIRES_IN=7d

# CORS - URL do Frontend (será atualizada depois)
FRONTEND_URL=https://seu-dominio-frontend.com

# Uploads (caminho no servidor)
UPLOAD_DIR=/var/www/webroot/ROOT/public/uploads
MAX_FILE_SIZE=5242880

# Taxa Limite (Rate Limiting)
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Timezone
TZ=America/Sao_Paulo
```

**💡 Dica:** Para gerar JWT_SECRET seguro:
```bash
# No PowerShell local
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

4. Clique em **"Save"**

### Passo 4: Configurar Build e Start Scripts

1. Ainda no **Config**, vá para a aba **"Root"**
2. Edite o arquivo **`package.json`** no caminho `/var/www/webroot/ROOT/`

Adicione/verifique os scripts:
```json
{
  "scripts": {
    "start": "node dist/main.js",
    "build": "npm run prisma:generate && nest build",
    "prisma:generate": "prisma generate",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

3. Clique em **"Save"**

### Passo 5: Instalar Dependências e Fazer Build

1. Abra **Web SSH** no nó Backend
2. Execute:

```bash
# Navegar para o diretório da aplicação
cd /var/www/webroot/ROOT

# Instalar dependências
npm install

# Gerar Prisma Client
npm run prisma:generate

# Executar migrações
npm run prisma:migrate:deploy

# Build da aplicação
npm run build

# (Opcional) Popular banco com dados iniciais
npm run prisma:seed
```

### Passo 6: Configurar Startup Command

1. No painel Jelastic, clique no nó **Backend**
2. Vá em **"Settings"** → **"Custom"**
3. Em **"Run Command"**, adicione:

```bash
cd /var/www/webroot/ROOT && npm run start:prod
```

4. Salve e **Restart** o nó

### Passo 7: Verificar Backend

1. Obtenha a URL do backend: `http://node<ID>-eps-campanhas-prod.jelastic.saveincloud.net`
2. Teste: `http://SEU_BACKEND_URL/api/health` (deve retornar status OK)

---

## 🎨 Implantação do Frontend {#frontend}

### Passo 1: Configurar Deployment via Git

1. No Jelastic, clique no nó **Node.js (Frontend)**
2. Clique em **"Deployment Manager"**
3. Clique em **"Add"** → **"Git/SVN"**

**Configurações:**
```
Repository URL: https://github.com/SEU_USUARIO/SEU_REPO.git
Branch: main
Context: frontend
Name: frontend-app
```

4. **Deploy** para o ambiente Frontend

### Passo 2: Configurar Variáveis de Ambiente

1. No nó Frontend, clique em **"Config"** → **"Variables"**
2. Adicione:

```bash
# URL do Backend (interna, sem HTTPS)
NEXT_PUBLIC_API_URL=http://node<ID_BACKEND>-eps-campanhas-prod.jelastic.saveincloud.net/api

# URL pública do Backend (com HTTPS quando configurado)
# NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api

# Ambiente
NODE_ENV=production

# Timezone
TZ=America/Sao_Paulo

# Porta
PORT=3001
```

### Passo 3: Build do Next.js

1. Abra **Web SSH** no nó Frontend
2. Execute:

```bash
# Navegar para o diretório
cd /var/www/webroot/ROOT

# Instalar dependências
npm install

# Build otimizado para produção
npm run build
```

**⚠️ Importante:** O Next.js 16 pode exigir Node.js 18.17+. Verifique a versão no Jelastic.

### Passo 4: Configurar Startup

1. Em **Settings** → **"Custom"** do nó Frontend
2. **Run Command:**

```bash
cd /var/www/webroot/ROOT && npm start
```

3. Salve e **Restart**

### Passo 5: Verificar Frontend

Acesse: `http://node<ID_FRONTEND>-eps-campanhas-prod.jelastic.saveincloud.net`

---

## 🌐 Configuração de Domínios e SSL {#domínios-ssl}

### Passo 1: Configurar Domínios Customizados

**Recomendado:**
- Backend: `api.seudominio.com`
- Frontend: `app.seudominio.com` ou `seudominio.com`

#### Configurar no Jelastic:

1. Clique no ambiente **"Settings"** (ícone de engrenagem ao lado do nome)
2. Vá para **"Custom Domains"**
3. Clique em **"Add"**

**Para Backend:**
```
Domain: api.seudominio.com
Environment: Selecione o nó Backend
```

**Para Frontend:**
```
Domain: app.seudominio.com
Environment: Selecione o nó Frontend
```

4. Clique em **"Add"**

### Passo 2: Configurar DNS (no seu provedor de domínio)

Adicione os seguintes registros DNS:

**Tipo A ou CNAME:**
```
api.seudominio.com → IP_DO_BACKEND_JELASTIC
app.seudominio.com → IP_DO_FRONTEND_JELASTIC
```

**💡 Dica:** O Jelastic fornece o IP/CNAME na tela de Custom Domains.

### Passo 3: Habilitar SSL/TLS com Let's Encrypt

1. No **"Settings"** do ambiente
2. Vá para **"SSL/TLS"**
3. Clique em **"Let's Encrypt"**
4. Selecione os domínios:
   - ✅ api.seudominio.com
   - ✅ app.seudominio.com
5. **External domains:** Deixe em branco
6. Clique em **"Add"**

**🎉 Pronto!** Seus certificados SSL serão gerados e renovados automaticamente.

### Passo 4: Atualizar URLs nas Variáveis de Ambiente

**Backend:**
```bash
FRONTEND_URL=https://app.seudominio.com
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api
```

**Restart ambos os nós** após atualizar.

---

## 🔐 Variáveis de Ambiente Completas {#variáveis-ambiente}

### Backend (.env)

```bash
# ============================================================================
# CONFIGURAÇÕES DE PRODUÇÃO - BACKEND
# ============================================================================

# Database
DATABASE_URL="postgresql://eps_user:SUA_SENHA@node<ID>-eps-campanhas-prod.jelastic.saveincloud.net:5432/eps_campanhas?schema=public"

# Server
PORT=3000
NODE_ENV="production"

# JWT Authentication
JWT_SECRET="SUA_CHAVE_SECRETA_MUITO_FORTE_64_CARACTERES"
JWT_EXPIRES_IN="7d"

# CORS
FRONTEND_URL="https://app.seudominio.com"

# Upload de Arquivos
UPLOAD_DIR="/var/www/webroot/ROOT/public/uploads"
MAX_FILE_SIZE=5242880

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Timezone
TZ="America/Sao_Paulo"

# ============================================================================
# OPCIONAIS (configurar se necessário)
# ============================================================================

# Email (se implementado)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=seu-email@gmail.com
# SMTP_PASS=sua-senha-app
# SMTP_FROM=noreply@seudominio.com

# S3 Storage (alternativa ao upload local)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_BUCKET_NAME=eps-campanhas-uploads
```

### Frontend (.env)

```bash
# ============================================================================
# CONFIGURAÇÕES DE PRODUÇÃO - FRONTEND
# ============================================================================

# API Backend URL (PÚBLICA)
NEXT_PUBLIC_API_URL="https://api.seudominio.com/api"

# Ambiente
NODE_ENV="production"

# Timezone
TZ="America/Sao_Paulo"

# Porta
PORT=3001
```

---

## 🚀 Deploy e Testes {#deploy-testes}

### Checklist Pré-Deploy

- [ ] Banco de dados criado e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Build do backend concluído sem erros
- [ ] Migrações do Prisma executadas
- [ ] Build do frontend concluído sem erros
- [ ] Domínios apontando corretamente
- [ ] SSL configurado e funcionando

### Testes Essenciais

#### 1. Testar Backend

```bash
# Health Check
curl https://api.seudominio.com/api/health

# Login (se já tiver usuário seed)
curl -X POST https://api.seudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eps.com.br","senha":"senha123"}'
```

#### 2. Testar Frontend

1. Acesse: `https://app.seudominio.com`
2. Teste o login
3. Navegue pelas principais funcionalidades
4. Verifique o console do navegador (F12) para erros

#### 3. Testar Upload de Arquivos

1. Faça upload de uma imagem
2. Verifique se o arquivo está sendo salvo
3. Teste o acesso à URL da imagem

#### 4. Verificar Logs

**Backend:**
```bash
# Web SSH no nó Backend
tail -f /var/log/run.log
```

**Frontend:**
```bash
# Web SSH no nó Frontend
tail -f /var/log/run.log
```

---

## 📊 Monitoramento e Manutenção {#monitoramento}

### Monitoramento no Jelastic

1. **Dashboard:** Monitore CPU, RAM, Disco em tempo real
2. **Logs:** Acesse via Web SSH ou pelo painel
3. **Alertas:** Configure alertas de uso de recursos

### Configurar Auto-Scaling

1. Vá em **Settings** do ambiente
2. **Auto Horizontal Scaling:**
   - CPU > 70% por 5 minutos → adicionar nó
   - CPU < 30% por 10 minutos → remover nó
   - Max nodes: 3

### Backup do Banco de Dados

**Manual:**
```bash
# Web SSH no nó PostgreSQL
pg_dump -U eps_user eps_campanhas > backup_$(date +%Y%m%d).sql
```

**Automático no Jelastic:**
1. **Settings** → **Backup Storage**
2. Configure schedule: Diário às 3h AM
3. Retenção: 7 dias

### Atualizações da Aplicação

**Via Git (recomendado):**
1. Faça push para o repositório
2. No Jelastic, clique em **"Update from Git"** no Deployment Manager
3. Faça rebuild e restart

**Ou via SSH:**
```bash
cd /var/www/webroot/ROOT
git pull origin main
npm install
npm run build
pm2 restart all
```

---

## 🔧 Troubleshooting Comum

### Backend não inicia

```bash
# Verificar logs
tail -f /var/log/run.log

# Verificar se as dependências foram instaladas
ls -la node_modules

# Verificar se o build existe
ls -la dist/
```

### Erro de conexão com banco de dados

- Verifique `DATABASE_URL` nas variáveis de ambiente
- Teste conexão: `psql -h HOST -U eps_user -d eps_campanhas`
- Verifique firewall/segurança no Jelastic

### Frontend não carrega assets

- Verifique `NEXT_PUBLIC_API_URL`
- Limpe cache do Next.js: `rm -rf .next`
- Rebuild: `npm run build`

### Erro 502 Bad Gateway

- Backend pode não estar rodando
- Verifique porta configurada (3000)
- Restart do nó

---

## 📚 Recursos Adicionais

- **Documentação Jelastic:** https://docs.jelastic.com/
- **Suporte SaveInCloud:** https://saveincloud.net/suporte/
- **NestJS Deployment:** https://docs.nestjs.com/
- **Next.js Production:** https://nextjs.org/docs/deployment

---

## ✅ Checklist Final

- [ ] Ambiente Jelastic criado e configurado
- [ ] PostgreSQL 15 provisionado
- [ ] Backend (NestJS) deployado e rodando
- [ ] Frontend (Next.js) deployado e rodando
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações do banco executadas
- [ ] Seed inicial carregado (opcional)
- [ ] Domínios customizados configurados
- [ ] SSL/TLS habilitado
- [ ] Testes de funcionalidade aprovados
- [ ] Backup configurado
- [ ] Monitoramento ativo

---

## 🎉 Parabéns!

Seu sistema **EPS Campanhas** está agora rodando em produção no Jelastic SaveInCloud!

**Próximos passos sugeridos:**
1. Configure CI/CD com GitHub Actions
2. Implemente monitoramento avançado (Sentry, New Relic)
3. Configure CDN para assets estáticos
4. Otimize imagens e performance

---

**Dúvidas?** Consulte a documentação do Jelastic ou o suporte técnico da SaveInCloud.

**Versão do Guia:** 1.0  
**Data:** Novembro 2025  
**Última Atualização:** {{ data_atual }}
