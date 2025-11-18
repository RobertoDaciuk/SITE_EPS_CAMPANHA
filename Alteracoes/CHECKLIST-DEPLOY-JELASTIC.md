# ✅ Checklist de Deploy - Jelastic SaveInCloud

Use este checklist para garantir que todos os passos foram executados corretamente.

---

## 🎯 PRÉ-DEPLOY

### Preparação
- [ ] Código commitado e pusheado para o repositório Git
- [ ] Branch de produção criada (main ou production)
- [ ] Testes locais executados e aprovados
- [ ] Arquivo `.env.example` atualizado com todas as variáveis
- [ ] Documentação atualizada

### Conta Jelastic
- [ ] Conta ativa no Jelastic SaveInCloud
- [ ] Créditos suficientes para provisionamento
- [ ] Acesso ao painel: https://app.jelastic.saveincloud.net/

---

## 🏗️ PROVISIONAMENTO JELASTIC

### Criar Ambiente
- [ ] Ambiente criado: `eps-campanhas-prod`
- [ ] PostgreSQL 15 adicionado (2-8 cloudlets)
- [ ] Node.js 20.x Backend adicionado (2-16 cloudlets)
- [ ] Node.js 20.x Frontend adicionado (2-8 cloudlets)
- [ ] Public IPv4 habilitado para Backend e Frontend
- [ ] Ambiente iniciado com sucesso

### Configurar Database
- [ ] Acesso Web SSH ao PostgreSQL funcionando
- [ ] Database `eps_campanhas` criada
- [ ] Usuário `eps_user` criado
- [ ] Privilégios concedidos corretamente
- [ ] Conexão testada com `psql`
- [ ] Credenciais anotadas em local seguro

---

## 🔙 BACKEND

### Deployment
- [ ] Repositório Git configurado no Deployment Manager
- [ ] Branch correta selecionada (main)
- [ ] Context definido como `backend`
- [ ] Deploy executado com sucesso
- [ ] Arquivos do projeto visíveis em `/var/www/webroot/ROOT`

### Variáveis de Ambiente
- [ ] `DATABASE_URL` configurada
- [ ] `JWT_SECRET` gerada (64+ caracteres)
- [ ] `JWT_EXPIRES_IN` definida (7d)
- [ ] `PORT` = 3000
- [ ] `NODE_ENV` = production
- [ ] `FRONTEND_URL` configurada
- [ ] `UPLOAD_DIR` configurado
- [ ] `TZ` = America/Sao_Paulo
- [ ] Todas as variáveis salvas

### Build e Instalação
- [ ] `npm install` executado sem erros
- [ ] `npx prisma generate` executado
- [ ] `npx prisma migrate deploy` executado
- [ ] Todas as migrações aplicadas
- [ ] `npm run build` executado com sucesso
- [ ] Diretório `dist/` criado
- [ ] Diretórios de upload criados
- [ ] Permissões de arquivos configuradas

### Inicialização
- [ ] Startup command configurado
- [ ] Nó Backend reiniciado
- [ ] Aplicação iniciou sem erros
- [ ] Logs verificados (`tail -f /var/log/run.log`)
- [ ] Endpoint `/api/health` respondendo
- [ ] Teste de login funcionando

---

## 🎨 FRONTEND

### Deployment
- [ ] Repositório Git configurado no Deployment Manager
- [ ] Branch correta selecionada (main)
- [ ] Context definido como `frontend`
- [ ] Deploy executado com sucesso
- [ ] Arquivos do projeto visíveis em `/var/www/webroot/ROOT`

### Variáveis de Ambiente
- [ ] `NEXT_PUBLIC_API_URL` configurada
- [ ] `NODE_ENV` = production
- [ ] `PORT` = 3001
- [ ] `TZ` = America/Sao_Paulo
- [ ] Todas as variáveis salvas

### Build e Instalação
- [ ] `npm install` executado sem erros
- [ ] `npm run build` executado com sucesso
- [ ] Diretório `.next/` criado
- [ ] Build otimizado para produção
- [ ] Sem warnings críticos

### Inicialização
- [ ] Startup command configurado
- [ ] Nó Frontend reiniciado
- [ ] Aplicação iniciou sem erros
- [ ] Logs verificados
- [ ] Homepage carregando corretamente
- [ ] Assets (CSS, JS, imagens) carregando

---

## 🌐 DOMÍNIOS E SSL

### Configuração de Domínios
- [ ] Domínio para backend escolhido (ex: api.seudominio.com)
- [ ] Domínio para frontend escolhido (ex: app.seudominio.com)
- [ ] Domínios adicionados no Custom Domains
- [ ] Registros DNS configurados no provedor
- [ ] DNS propagado (teste com `nslookup`)
- [ ] Domínios acessíveis via HTTP

### SSL/TLS
- [ ] Let's Encrypt habilitado
- [ ] Certificados gerados para ambos os domínios
- [ ] HTTPS funcionando sem warnings
- [ ] Redirecionamento HTTP → HTTPS ativo
- [ ] Certificado válido no browser (cadeado verde)

### Atualização de URLs
- [ ] `FRONTEND_URL` no backend atualizada para HTTPS
- [ ] `NEXT_PUBLIC_API_URL` no frontend atualizada para HTTPS
- [ ] Backend rebuildeado (se necessário)
- [ ] Frontend rebuildeado
- [ ] Ambos os nós reiniciados
- [ ] Comunicação Frontend ↔ Backend funcionando

---

## 🧪 TESTES FUNCIONAIS

### Backend
- [ ] Health check: `GET /api/health` → 200 OK
- [ ] Login: `POST /api/auth/login` → 200 + token
- [ ] Endpoint protegido com JWT funcionando
- [ ] CORS permitindo requisições do frontend
- [ ] Rate limiting funcionando
- [ ] Upload de arquivo testado

### Frontend
- [ ] Homepage carrega completamente
- [ ] Tela de login acessível
- [ ] Login com credenciais válidas funciona
- [ ] Dashboard carrega após login
- [ ] Navegação entre páginas funciona
- [ ] Listagens carregam dados do backend
- [ ] Formulários salvam corretamente
- [ ] Upload de imagens funciona
- [ ] Logout funciona

### Integração
- [ ] Autenticação ponta a ponta funciona
- [ ] Dados são persistidos no banco
- [ ] Arquivos uploadados são salvos
- [ ] Tokens JWT são validados corretamente
- [ ] Sessões expiram após tempo configurado

### Performance
- [ ] Tempo de resposta < 2s para páginas principais
- [ ] Queries ao banco otimizadas (sem N+1)
- [ ] Imagens carregam rapidamente
- [ ] Sem memory leaks (verificar após 1h rodando)

---

## 📊 MONITORAMENTO

### Configurações
- [ ] Dashboard do Jelastic monitorando recursos
- [ ] Alertas configurados para CPU > 80%
- [ ] Alertas configurados para RAM > 80%
- [ ] Alertas configurados para disco > 80%
- [ ] Auto-scaling configurado (se desejado)

### Backup
- [ ] Script de backup do banco configurado
- [ ] Primeiro backup manual executado
- [ ] Backup agendado (cron job)
- [ ] Teste de restore realizado
- [ ] Backups armazenados em local seguro

### Logs
- [ ] Logs de aplicação acessíveis
- [ ] Logs de erro configurados
- [ ] Rotação de logs configurada
- [ ] Sistema de alertas para erros críticos

---

## 🔐 SEGURANÇA

### Credenciais
- [ ] Todas as senhas são fortes (16+ caracteres)
- [ ] JWT_SECRET é único e aleatório
- [ ] Credenciais armazenadas em gerenciador de senhas
- [ ] Acesso SSH protegido
- [ ] Usuários do banco com privilégios mínimos

### Aplicação
- [ ] HTTPS obrigatório em produção
- [ ] Headers de segurança configurados
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] Validação de inputs no frontend e backend
- [ ] SQL Injection protegido (Prisma ORM)
- [ ] XSS protegido

### Infraestrutura
- [ ] Firewall configurado no Jelastic
- [ ] Portas desnecessárias fechadas
- [ ] Acesso ao PostgreSQL restrito
- [ ] Backups encriptados
- [ ] Certificados SSL válidos e auto-renováveis

---

## 📝 DOCUMENTAÇÃO

### Atualizar Documentos
- [ ] README.md com instruções de deploy
- [ ] Variáveis de ambiente documentadas
- [ ] Diagrama de arquitetura atualizado
- [ ] Endpoints da API documentados
- [ ] Guia de troubleshooting criado

### Conhecimento da Equipe
- [ ] Equipe treinada para acessar Jelastic
- [ ] Processo de deploy documentado
- [ ] Contatos de suporte anotados
- [ ] Runbook de incidentes criado

---

## 🎉 PÓS-DEPLOY

### Validação Final
- [ ] Todos os testes funcionais passando
- [ ] Performance aceitável
- [ ] Usuários conseguem acessar
- [ ] Sistema estável por pelo menos 1 hora
- [ ] Nenhum erro crítico nos logs

### Comunicação
- [ ] Stakeholders notificados do deploy
- [ ] Documentação de release criada
- [ ] Changelog atualizado
- [ ] Equipe de suporte informada

### Próximos Passos
- [ ] Monitorar logs nas primeiras 24h
- [ ] Planejar melhorias de performance
- [ ] Configurar CI/CD para próximos deploys
- [ ] Implementar monitoramento avançado (APM)
- [ ] Planejar estratégia de backup offsite

---

## 🆘 EM CASO DE PROBLEMAS

### Rollback Rápido
- [ ] Backup do banco disponível
- [ ] Processo de rollback documentado
- [ ] Commit anterior identificado no Git
- [ ] Equipe sabe como executar rollback

### Contatos de Emergência
- [ ] Suporte Jelastic: suporte@saveincloud.net
- [ ] Dev Lead: _______________
- [ ] DBA: _______________
- [ ] DevOps: _______________

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Meta | Atual | Status |
|---------|------|-------|--------|
| Uptime | > 99.5% | ___ | ⚪ |
| Tempo de resposta | < 2s | ___ | ⚪ |
| Taxa de erro | < 1% | ___ | ⚪ |
| Uso de CPU | < 70% | ___ | ⚪ |
| Uso de RAM | < 80% | ___ | ⚪ |
| Uso de Disco | < 70% | ___ | ⚪ |

**Legenda:**
- ✅ Meta atingida
- ⚠️ Próximo do limite
- ❌ Acima do aceitável
- ⚪ Não medido ainda

---

**🎯 Deploy completo quando TODOS os itens estiverem marcados!**

**Data do Deploy:** ___/___/______  
**Responsável:** _________________  
**Versão:** _____________________  

---

**💾 Salve este checklist preenchido para referência futura!**
