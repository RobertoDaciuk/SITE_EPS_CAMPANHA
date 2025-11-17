# 🔧 Troubleshooting - Guia de Resolução de Problemas Jelastic

## 🚨 Problemas Comuns e Soluções

### 1. Backend não inicia após deploy

**Sintomas:**
- Erro 502 Bad Gateway
- Nó backend aparece como "stopped" ou "crashed"
- Logs mostram erro de inicialização

**Diagnóstico:**
```bash
# Web SSH no nó Backend
cd /var/www/webroot/ROOT

# Verificar logs
tail -100 /var/log/run.log

# Tentar iniciar manualmente
npm start
```

**Possíveis causas e soluções:**

#### A. Variável DATABASE_URL incorreta
```bash
# Verificar variável
echo $DATABASE_URL

# Testar conexão com banco
psql -d "$DATABASE_URL"
```
**Solução:** Corrigir no painel Jelastic → Config → Variables

#### B. Dependências não instaladas
```bash
# Verificar node_modules
ls -la node_modules

# Reinstalar
rm -rf node_modules
npm install
```

#### C. Build não foi feito
```bash
# Verificar se dist/ existe
ls -la dist/

# Fazer build
npm run build
```

#### D. Porta já em uso
```bash
# Verificar processos na porta 3000
lsof -i :3000

# Matar processo se necessário
kill -9 <PID>
```

---

### 2. Erro de conexão com banco de dados

**Sintomas:**
- "Connection refused"
- "ECONNREFUSED"
- "authentication failed"

**Diagnóstico:**
```bash
# Web SSH no nó Backend
psql -h <HOST> -U eps_user -d eps_campanhas

# Se pedir senha, o host está acessível
# Se der timeout, problema de rede/firewall
```

**Soluções:**

#### A. Verificar DATABASE_URL
```bash
# Formato correto:
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# Exemplo Jelastic:
# postgresql://eps_user:senha@node12345-eps-campanhas-prod.jelastic.saveincloud.net:5432/eps_campanhas?schema=public
```

#### B. Verificar credenciais
```bash
# Web SSH no nó PostgreSQL
psql -U webadmin -d postgres

# Dentro do psql:
\du  # Listar usuários
\l   # Listar databases
```

#### C. Resetar senha do usuário
```sql
-- No psql
ALTER USER eps_user WITH PASSWORD 'nova_senha_forte';
```

---

### 3. Frontend não carrega / Tela branca

**Sintomas:**
- Página carrega mas fica em branco
- Console do browser mostra erros
- Assets não carregam

**Diagnóstico:**
```bash
# Web SSH no nó Frontend
cd /var/www/webroot/ROOT

# Verificar logs
tail -100 /var/log/run.log

# Verificar se .next existe
ls -la .next
```

**Soluções:**

#### A. Build não foi feito corretamente
```bash
# Limpar e rebuildar
rm -rf .next
npm run build
```

#### B. Variável NEXT_PUBLIC_API_URL incorreta
```bash
# Verificar
echo $NEXT_PUBLIC_API_URL

# Deve apontar para o backend
# Exemplo: https://api.seudominio.com/api
```

**⚠️ IMPORTANTE:** Mudanças em variáveis `NEXT_PUBLIC_*` requerem rebuild!

#### C. Erro no código
```bash
# Verificar erros de sintaxe
npm run lint

# Build local para ver erros detalhados
npm run build
```

---

### 4. Erro 502 Bad Gateway

**Causas possíveis:**
1. Aplicação não está rodando
2. Porta errada configurada
3. Timeout de inicialização

**Soluções:**

#### A. Verificar se app está rodando
```bash
# Web SSH
curl http://localhost:3000/api/health  # Backend
curl http://localhost:3001/           # Frontend

# Verificar processos Node
ps aux | grep node
```

#### B. Verificar configuração de porta
```bash
# Backend deve usar PORT=3000
# Frontend deve usar PORT=3001

echo $PORT
```

#### C. Aumentar timeout do Jelastic
1. Painel Jelastic → Settings → Custom
2. Aumentar "Startup Timeout" para 300 segundos

---

### 5. Upload de imagens não funciona

**Sintomas:**
- Erro ao fazer upload
- Imagem salva mas não carrega
- 404 ao acessar imagem

**Soluções:**

#### A. Verificar diretório de uploads
```bash
# Web SSH no Backend
cd /var/www/webroot/ROOT

# Verificar se existe
ls -la public/uploads

# Criar se não existir
mkdir -p public/uploads/{produtos,avatares,temp}
chmod -R 755 public/uploads
```

#### B. Verificar variável UPLOAD_DIR
```bash
echo $UPLOAD_DIR
# Deve ser: /var/www/webroot/ROOT/public/uploads
```

#### C. Verificar permissões
```bash
# Dar permissões adequadas
chmod -R 755 public/uploads
chown -R <user>:<group> public/uploads
```

---

### 6. Migrações do Prisma falham

**Sintomas:**
- "Migration failed"
- "Schema drift detected"
- "Database out of sync"

**Diagnóstico:**
```bash
# Web SSH no Backend
cd /var/www/webroot/ROOT

# Ver status das migrações
npx prisma migrate status
```

**Soluções:**

#### A. Deploy de migrações pendentes
```bash
npx prisma migrate deploy
```

#### B. Resolver drift (diferença) no schema
```bash
# Ver diferenças
npx prisma migrate status

# Opção 1: Deploy forçado (CUIDADO!)
npx prisma migrate resolve --applied <migration_name>

# Opção 2: Reset completo (CUIDADO - perde dados!)
# npx prisma migrate reset
```

#### C. Gerar client após migrações
```bash
npx prisma generate
```

---

### 7. Variáveis de ambiente não são reconhecidas

**Sintomas:**
- "undefined" em variáveis
- Aplicação usa valores padrão
- Erro "missing required env variable"

**Soluções:**

#### A. Verificar se variáveis estão definidas
```bash
# Web SSH
env | grep DATABASE
env | grep JWT
env | grep NEXT_PUBLIC
```

#### B. Adicionar no painel Jelastic
1. Config → Variables
2. Adicionar cada variável
3. **Save**
4. **Restart do nó**

#### C. Variáveis NEXT_PUBLIC requerem rebuild
```bash
# Após mudar NEXT_PUBLIC_*, fazer:
cd /var/www/webroot/ROOT
npm run build
# Depois restart no painel
```

---

### 8. Aplicação lenta / Timeout

**Diagnóstico:**
1. Painel Jelastic → Ver uso de CPU/RAM
2. Verificar logs para queries lentas

**Soluções:**

#### A. Aumentar cloudlets
1. Settings → Change Topology
2. Aumentar "Scaling Limit"
3. Apply

#### B. Otimizar queries do banco
```bash
# Prisma Studio para ver queries
npx prisma studio

# Adicionar índices no schema.prisma
# @@index([campo])
```

#### C. Habilitar cache
- Implementar Redis
- Cache de rotas do Next.js

---

### 9. SSL/HTTPS não funciona

**Sintomas:**
- Certificado inválido
- "Not secure" no browser
- Redirecionamento não funciona

**Soluções:**

#### A. Verificar certificado Let's Encrypt
1. Settings → SSL/TLS
2. Verificar se certificado está ativo
3. Renovar se necessário: Click "Renew"

#### B. Verificar DNS
```bash
# No seu computador local
nslookup api.seudominio.com
nslookup app.seudominio.com
```

#### C. Forçar HTTPS no backend
```typescript
// main.ts
app.set('trust proxy', 1);
```

---

### 10. Logs não aparecem

**Localização dos logs no Jelastic:**

```bash
# Logs principais
tail -f /var/log/run.log

# Logs do Node.js
tail -f /var/log/node.log

# Logs de erro
tail -f /var/log/error.log

# Logs do PostgreSQL (no nó DB)
tail -f /var/lib/postgresql/data/log/postgresql-*.log
```

---

## 🛠️ Comandos Úteis para Debug

### Verificar saúde do sistema
```bash
# CPU e memória
top
htop

# Disco
df -h

# Processos Node
ps aux | grep node

# Portas em uso
netstat -tulpn | grep LISTEN
```

### Restart de serviços
```bash
# Via painel Jelastic (recomendado)
# Settings → Restart

# Ou via SSH (se configurado PM2)
pm2 restart all
pm2 logs
```

### Verificar conectividade
```bash
# Testar backend do frontend
curl http://node<ID_BACKEND>:3000/api/health

# Testar banco do backend
psql -d $DATABASE_URL -c "SELECT version();"
```

---

## 📞 Quando Contatar o Suporte

Contate o suporte da SaveInCloud se:
- Problemas de infraestrutura (rede, disco, etc)
- Não consegue acessar Web SSH
- Problemas com SSL que não se resolvem
- Necessita aumentar limites de recursos

**Suporte SaveInCloud:**
- Site: https://saveincloud.net/suporte/
- Email: suporte@saveincloud.net

---

## 📚 Recursos Adicionais

- **Jelastic Docs:** https://docs.jelastic.com/
- **NestJS Troubleshooting:** https://docs.nestjs.com/faq
- **Next.js Deploy:** https://nextjs.org/docs/deployment
- **Prisma Debug:** https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

---

**💡 Dica:** Sempre salve os logs de erro antes de fazer troubleshooting. Use `tail -1000 /var/log/run.log > erro.log` para salvar os últimos 1000 linhas.
