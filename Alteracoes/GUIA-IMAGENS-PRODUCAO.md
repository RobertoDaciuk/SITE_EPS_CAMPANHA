# Guia de Configuração - Imagens em Produção

## 🎯 Problema Resolvido

O Next.js em produção bloqueia imagens servidas de `localhost` ou IPs privados por questões de segurança, gerando o erro:

```
⨯ upstream image http://localhost:3000/uploads/campanhas/file-xxx.jpg resolved to private ip ["::1","127.0.0.1"]
```

## ✅ Solução Implementada

A solução usa **rewrites do Next.js** para fazer proxy das imagens do backend, eliminando a dependência de URLs com localhost.

### Como Funciona

1. **Backend** retorna URLs relativas: `/uploads/campanhas/file-123.jpg`
2. **Frontend** usa URLs relativas: `/uploads/campanhas/file-123.jpg`
3. **Next.js rewrites** automaticamente faz proxy para o backend
4. **Imagem** é servida sem expor URLs de localhost

### Arquivos Modificados

#### 1. `frontend/next.config.ts`
```typescript
async rewrites() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';
  
  return [
    {
      source: '/uploads/:path*',
      destination: `${backendUrl}/uploads/:path*`,
    },
  ];
}
```

#### 2. `frontend/src/lib/image-url.ts`
```typescript
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) return '';
  
  // URLs absolutas externas mantém como estão
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // URLs relativas são mantidas para rewrites funcionarem
  if (imagePath.startsWith('/')) {
    return imagePath;
  }
  
  return `/${imagePath}`;
}
```

## 🚀 Configuração para Produção

### Variáveis de Ambiente

#### Backend (.env)
```env
# Porta do backend
PORT=3000

# URL do frontend (para CORS)
CORS_ORIGIN=https://seu-dominio-frontend.com

# Outras configurações...
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

#### Frontend (.env.production)
```env
# URL da API backend (COM /api no final)
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api

# Outras configurações...
```

### Exemplo de URLs em Produção

| Contexto | URL |
|----------|-----|
| **API REST** | `https://api.seu-dominio.com/api/campanhas` |
| **Imagem no Frontend** | `https://seu-dominio.com/uploads/campanhas/file-123.jpg` |
| **Imagem no Backend** | `https://api.seu-dominio.com/uploads/campanhas/file-123.jpg` |

### Fluxo de Requisição

```
Usuário solicita:
https://seu-dominio.com/uploads/campanhas/file-123.jpg
           ↓
Next.js rewrite detecta /uploads/:path*
           ↓
Next.js busca do backend:
https://api.seu-dominio.com/uploads/campanhas/file-123.jpg
           ↓
Backend serve a imagem de public/uploads/campanhas/
           ↓
Next.js retorna ao usuário
```

## 🧪 Testando em Desenvolvimento

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Acesse: `http://localhost:3001`

As imagens devem carregar normalmente em `/uploads/...`

## 🔧 Testando Build de Produção Localmente

```powershell
# Frontend - Build e Start
cd frontend
npm run build
npm start
```

Acesse: `http://localhost:3001`

As imagens devem carregar sem erros de IP privado.

## 📦 Deploy na Nuvem

### 1. Backend (Node.js)

```bash
# Build
cd backend
npm install
npm run build

# Start
npm run start:prod
```

**Variáveis de ambiente necessárias:**
- `PORT=3000`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=...`
- `CORS_ORIGIN=https://seu-dominio-frontend.com`

### 2. Frontend (Next.js)

```bash
# Build
cd frontend
npm install
npm run build

# Start
npm start
```

**Variáveis de ambiente necessárias:**
- `NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api`

### 3. Verificar Funcionamento

1. Acesse o dashboard
2. Verifique se as imagens das campanhas carregam
3. Abra DevTools → Network → Veja se `/uploads/...` retorna 200 OK

## 🐛 Troubleshooting

### Erro: "upstream image resolved to private ip"
**Causa:** Frontend tentando acessar localhost diretamente  
**Solução:** Certifique-se que `getImageUrl()` retorna URLs relativas (`/uploads/...`)

### Erro: "Failed to fetch image"
**Causa:** Rewrites não configurados ou variável de ambiente incorreta  
**Solução:** 
1. Verifique `NEXT_PUBLIC_API_URL` no `.env`
2. Verifique se o backend está acessível na URL configurada
3. Rebuild o frontend: `npm run build`

### Imagens não carregam em produção
**Causa:** CORS ou pasta de uploads inexistente  
**Solução:**
1. Verifique CORS no backend (`main.ts`)
2. Confirme que pasta `backend/public/uploads/` existe
3. Verifique permissões de leitura da pasta

### Imagens carregam mas ficam distorcidas
**Causa:** Otimização de imagens do Next.js  
**Solução:** Use componente `<Image>` do Next.js com width/height corretos

## 📝 Checklist de Deploy

- [ ] Backend configurado com `CORS_ORIGIN` correto
- [ ] Frontend com `NEXT_PUBLIC_API_URL` apontando para backend de produção
- [ ] Pasta `public/uploads/` existe no backend com permissões corretas
- [ ] Rewrites configurados em `next.config.ts`
- [ ] Build de produção testado localmente antes do deploy
- [ ] SSL/HTTPS configurado (recomendado)
- [ ] Backup das imagens configurado

## 🎓 Vantagens desta Solução

✅ **Funciona em qualquer ambiente** (dev, staging, produção)  
✅ **Sem hardcoded URLs** (tudo via variáveis de ambiente)  
✅ **Mantém otimização de imagens** do Next.js  
✅ **Não expõe URLs internas** do backend  
✅ **Fácil de debugar** (URLs relativas simples)  
✅ **Compatível com CDN** (pode adicionar cache depois)  

## 🔮 Melhorias Futuras (Opcional)

1. **CDN para imagens**: Fazer upload para AWS S3/CloudFlare
2. **Cache de imagens**: Configurar headers de cache no backend
3. **Lazy loading**: Implementar carregamento progressivo
4. **Placeholder blur**: Adicionar blur hash para preview
5. **Compressão**: Otimizar imagens no upload (sharp, tinypng)

---

**Documentação gerada em:** 2025-01-20  
**Última atualização:** Sprint 20.5
