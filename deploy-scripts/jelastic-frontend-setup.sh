#!/bin/bash

# ============================================================================
# SCRIPT DE SETUP AUTOMÁTICO - JELASTIC FRONTEND
# ============================================================================
# Este script automatiza a configuração inicial do frontend no Jelastic
# Execute via Web SSH no nó Frontend
# ============================================================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando setup do Frontend EPS Campanhas..."

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

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo -e "${RED}❌ ERROR: NEXT_PUBLIC_API_URL não configurada!${NC}"
    echo "Configure as variáveis de ambiente no painel Jelastic antes de continuar."
    exit 1
fi

echo -e "${GREEN}✅ Variáveis de ambiente OK${NC}"
echo "   API URL: $NEXT_PUBLIC_API_URL"

# ============================================================================
# 4. LIMPAR NODE_MODULES E CACHE
# ============================================================================
echo -e "${YELLOW}🧹 Limpando node_modules e cache antigos...${NC}"
rm -rf node_modules
rm -rf .next
rm -rf .npm
npm cache clean --force

# ============================================================================
# 5. INSTALAR DEPENDÊNCIAS
# ============================================================================
echo -e "${YELLOW}📦 Instalando dependências do projeto...${NC}"
npm install --production=false

# ============================================================================
# 6. BUILD DO NEXT.JS
# ============================================================================
echo -e "${YELLOW}🏗️  Fazendo build otimizado para produção...${NC}"
echo "⏱️  Isso pode levar alguns minutos..."

# Definir variável de ambiente para produção
export NODE_ENV=production

# Build com saída detalhada
npm run build

# Verificar se o build foi criado
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ ERROR: Build falhou! Diretório '.next' não foi criado.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"

# ============================================================================
# 7. OTIMIZAR PARA PRODUÇÃO
# ============================================================================
echo -e "${YELLOW}⚡ Otimizando para produção...${NC}"

# Remover devDependencies (opcional - economiza espaço)
# npm prune --production

# ============================================================================
# 8. VERIFICAR SERVIDOR
# ============================================================================
echo -e "${YELLOW}🏥 Testando servidor Next.js...${NC}"
echo "Aguarde 10 segundos para o servidor iniciar..."

# Iniciar servidor em background temporariamente para teste
npm start &
SERVER_PID=$!

sleep 10

# Tentar acessar a home
curl -f http://localhost:3001/ || echo -e "${YELLOW}⚠️  Health check falhou - servidor pode não estar rodando ainda${NC}"

# Parar servidor de teste
kill $SERVER_PID 2>/dev/null || true

# ============================================================================
# FINALIZAÇÃO
# ============================================================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ SETUP CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "📋 Próximos passos:"
echo "1. Restart o nó Frontend no painel Jelastic"
echo "2. Verifique os logs: tail -f /var/log/run.log"
echo "3. Acesse a aplicação: http://SEU_DOMINIO"
echo ""
echo -e "${YELLOW}💡 Comandos úteis:${NC}"
echo "  - Ver logs: tail -f /var/log/run.log"
echo "  - Rebuild: npm run build"
echo "  - Iniciar dev: npm run dev"
echo ""
echo -e "${YELLOW}📊 Estatísticas do Build:${NC}"
du -sh .next
echo ""
