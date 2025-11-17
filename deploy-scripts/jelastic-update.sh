#!/bin/bash

# ============================================================================
# SCRIPT DE ATUALIZAÇÃO RÁPIDA - JELASTIC
# ============================================================================
# Use este script para atualizar a aplicação após mudanças no código
# Execute via Web SSH no nó correspondente (Backend ou Frontend)
# ============================================================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detectar tipo de aplicação
APP_DIR="/var/www/webroot/ROOT"
cd $APP_DIR

if [ -f "prisma/schema.prisma" ]; then
    APP_TYPE="backend"
else
    APP_TYPE="frontend"
fi

echo -e "${BLUE}🔄 Atualizando aplicação ${APP_TYPE}...${NC}"

# ============================================================================
# GIT PULL
# ============================================================================
echo -e "${YELLOW}📥 Baixando últimas alterações do Git...${NC}"
git pull origin main

# ============================================================================
# INSTALAR NOVAS DEPENDÊNCIAS
# ============================================================================
echo -e "${YELLOW}📦 Atualizando dependências...${NC}"
npm install

# ============================================================================
# BACKEND: PRISMA + BUILD
# ============================================================================
if [ "$APP_TYPE" = "backend" ]; then
    echo -e "${YELLOW}🔨 Gerando Prisma Client...${NC}"
    npx prisma generate
    
    echo -e "${YELLOW}🗄️  Executando migrações...${NC}"
    npx prisma migrate deploy
    
    echo -e "${YELLOW}🏗️  Building backend...${NC}"
    npm run build
fi

# ============================================================================
# FRONTEND: BUILD NEXT.JS
# ============================================================================
if [ "$APP_TYPE" = "frontend" ]; then
    echo -e "${YELLOW}🏗️  Building frontend...${NC}"
    rm -rf .next
    npm run build
fi

# ============================================================================
# FINALIZAÇÃO
# ============================================================================
echo ""
echo -e "${GREEN}✅ Atualização concluída!${NC}"
echo ""
echo "📋 Agora execute no painel Jelastic:"
echo "   → Restart do nó ${APP_TYPE}"
echo ""
