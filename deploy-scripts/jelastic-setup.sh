#!/bin/bash

# ============================================================================
# SCRIPT DE SETUP AUTOMÁTICO - JELASTIC BACKEND
# ============================================================================
# Este script automatiza a configuração inicial do backend no Jelastic
# Execute via Web SSH no nó Backend
# ============================================================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando setup do Backend EPS Campanhas..."

# Variáveis (AJUSTE CONFORME SEU AMBIENTE)
APP_DIR="/var/www/webroot/ROOT"
NODE_VERSION="20.x"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# 1. VERIFICAR NODE.JS
# ============================================================================
echo -e "${YELLOW}📦 Verificando versão do Node.js...${NC}"
node -v
npm -v

# ============================================================================
# 2. NAVEGAR PARA DIRETÓRIO DA APLICAÇÃO
# ============================================================================
echo -e "${YELLOW}📁 Navegando para diretório da aplicação...${NC}"
cd $APP_DIR

# ============================================================================
# 3. VERIFICAR VARIÁVEIS DE AMBIENTE
# ============================================================================
echo -e "${YELLOW}🔐 Verificando variáveis de ambiente...${NC}"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL não configurada!${NC}"
    echo "Configure as variáveis de ambiente no painel Jelastic antes de continuar."
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ ERROR: JWT_SECRET não configurada!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Variáveis de ambiente OK${NC}"

# ============================================================================
# 4. LIMPAR NODE_MODULES E CACHE (opcional)
# ============================================================================
echo -e "${YELLOW}🧹 Limpando node_modules e cache antigos...${NC}"
rm -rf node_modules
rm -rf dist
rm -rf .npm
npm cache clean --force

# ============================================================================
# 5. INSTALAR DEPENDÊNCIAS
# ============================================================================
echo -e "${YELLOW}📦 Instalando dependências do projeto...${NC}"
npm install --production=false

# ============================================================================
# 6. GERAR PRISMA CLIENT
# ============================================================================
echo -e "${YELLOW}🔨 Gerando Prisma Client...${NC}"
npx prisma generate

# ============================================================================
# 7. EXECUTAR MIGRAÇÕES
# ============================================================================
echo -e "${YELLOW}🗄️  Executando migrações do banco de dados...${NC}"
npx prisma migrate deploy

# Verificar status das migrações
echo -e "${YELLOW}📊 Status das migrações:${NC}"
npx prisma migrate status

# ============================================================================
# 8. BUILD DA APLICAÇÃO
# ============================================================================
echo -e "${YELLOW}🏗️  Fazendo build da aplicação NestJS...${NC}"
npm run build

# Verificar se o build foi criado
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ ERROR: Build falhou! Diretório 'dist' não foi criado.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"

# ============================================================================
# 9. POPULAR BANCO COM DADOS INICIAIS (OPCIONAL)
# ============================================================================
read -p "Deseja popular o banco com dados iniciais (seed)? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}🌱 Populando banco de dados...${NC}"
    npm run prisma:seed || echo -e "${YELLOW}⚠️  Seed não disponível ou já executado${NC}"
fi

# ============================================================================
# 10. CRIAR DIRETÓRIOS NECESSÁRIOS
# ============================================================================
echo -e "${YELLOW}📁 Criando diretórios de upload...${NC}"
mkdir -p public/uploads/produtos
mkdir -p public/uploads/avatares
mkdir -p public/uploads/temp

# Dar permissões adequadas
chmod -R 755 public/uploads

# ============================================================================
# 11. VERIFICAR HEALTH CHECK
# ============================================================================
echo -e "${YELLOW}🏥 Verificando se a aplicação está respondendo...${NC}"
echo "Aguarde 10 segundos para o servidor iniciar..."
sleep 10

# Tentar fazer um health check
curl -f http://localhost:3000/api/health || echo -e "${YELLOW}⚠️  Health check falhou - servidor pode não estar rodando ainda${NC}"

# ============================================================================
# FINALIZAÇÃO
# ============================================================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ SETUP CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "📋 Próximos passos:"
echo "1. Restart o nó Backend no painel Jelastic"
echo "2. Verifique os logs: tail -f /var/log/run.log"
echo "3. Teste o endpoint: http://SEU_DOMINIO/api/health"
echo ""
echo -e "${YELLOW}💡 Comandos úteis:${NC}"
echo "  - Ver logs: tail -f /var/log/run.log"
echo "  - Prisma Studio: npx prisma studio"
echo "  - Rebuild: npm run build"
echo ""
