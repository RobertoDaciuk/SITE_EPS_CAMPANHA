#!/bin/bash

# ============================================================================
# SCRIPT DE BACKUP DO BANCO DE DADOS - JELASTIC
# ============================================================================
# Execute via Web SSH no nó PostgreSQL
# Crie um cron job para executar automaticamente
# ============================================================================

set -e

# Configurações
BACKUP_DIR="/var/lib/postgresql/backups"
DB_NAME="eps_campanhas"
DB_USER="eps_user"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql"
RETENTION_DAYS=7

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🗄️  Iniciando backup do banco de dados...${NC}"

# ============================================================================
# CRIAR DIRETÓRIO DE BACKUP
# ============================================================================
mkdir -p $BACKUP_DIR

# ============================================================================
# EXECUTAR BACKUP
# ============================================================================
echo -e "${YELLOW}📦 Criando backup: $BACKUP_FILE${NC}"

pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f $BACKUP_FILE

# Verificar se o backup foi criado
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup criado com sucesso! Tamanho: $SIZE${NC}"
else
    echo -e "${RED}❌ Erro ao criar backup!${NC}"
    exit 1
fi

# ============================================================================
# COMPRIMIR BACKUP
# ============================================================================
echo -e "${YELLOW}🗜️  Comprimindo backup...${NC}"
gzip $BACKUP_FILE

COMPRESSED_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
echo -e "${GREEN}✅ Backup comprimido! Tamanho: $COMPRESSED_SIZE${NC}"

# ============================================================================
# LIMPAR BACKUPS ANTIGOS
# ============================================================================
echo -e "${YELLOW}🧹 Removendo backups com mais de $RETENTION_DAYS dias...${NC}"
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# ============================================================================
# LISTAR BACKUPS DISPONÍVEIS
# ============================================================================
echo -e "${YELLOW}📋 Backups disponíveis:${NC}"
ls -lh $BACKUP_DIR/backup_*.sql.gz

echo ""
echo -e "${GREEN}✅ Backup concluído com sucesso!${NC}"
echo ""
echo "📁 Localização: $COMPRESSED_FILE"
echo ""
echo "💡 Para restaurar este backup:"
echo "   gunzip $COMPRESSED_FILE"
echo "   pg_restore -U $DB_USER -d $DB_NAME -v $BACKUP_FILE"
echo ""
