# 🔍 Checklist de Debug - Upload de Imagens

## ✅ O que foi implementado

### Correções no Código
1. ✅ Conversão de crop de % para pixels
2. ✅ Remoção de `/api` da URL base para uploads
3. ✅ Logs detalhados em todo o fluxo
4. ✅ Validação de carregamento de imagem
5. ✅ Debug visual no preview
6. ✅ Backend servindo arquivos estáticos
7. ✅ Logs no backend também

### Logs Adicionados

#### Frontend Console:
```
🔄 Iniciando crop da imagem {aspect: '16x9', crop: {...}}
✅ Blob criado: {size: 234567, type: 'image/jpeg'}
📤 Enviando para backend...
📥 Resposta do backend: {url: '/uploads/campanhas/...', filename: '...'}
🖼️ URL construída: {url: '...', baseURL: '...', fullUrl: '...'}
🔄 Atualizando estado 16x9 com URL: ...
🔍 Novo estado: {imagemCampanha16x9Url: '...', ...}
✅ Estado atualizado com sucesso
✅ Imagem carregada e acessível: ...
✅ Preview 16x9 carregado com sucesso!
```

#### Backend Console:
```
📸 Imagem de campanha salva: {
  filename: 'file-1730123456789-123456789.jpg',
  size: 234567,
  path: 'public/uploads/campanhas/file-1730123456789-123456789.jpg',
  url: '/uploads/campanhas/file-1730123456789-123456789.jpg'
}
```

## 🧪 Como Testar Agora

### 1. Inicie os Servidores

**Terminal 1 - Backend:**
```bash
cd "c:\Users\Roberto\Desktop\Nova pasta\backend"
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd "c:\Users\Roberto\Desktop\Nova pasta\frontend"
npm run dev
```

### 2. Abra o Browser com DevTools

1. Abra `http://localhost:3001/admin/campanhas`
2. Pressione **F12** para abrir DevTools
3. Vá para a aba **Console**
4. Limpe o console (ícone 🚫 ou Ctrl+L)

### 3. Teste o Upload

1. Clique em **"Nova Campanha"**
2. No Step 1, clique em **"Adicionar imagem horizontal"**
3. Selecione uma imagem
4. O modal de crop deve abrir
5. Ajuste a área de crop
6. Clique em **"Confirmar"**

### 4. Observe os Logs

**No Console do Frontend (F12), você deve ver:**

```
🔄 Iniciando crop da imagem
✅ Blob criado
📤 Enviando para backend...
📥 Resposta do backend
🖼️ URL construída
🔄 Atualizando estado 16x9 com URL
🔍 Novo estado
✅ Estado atualizado com sucesso
✅ Imagem carregada e acessível
✅ Preview 16x9 carregado com sucesso!
```

**No Terminal do Backend, você deve ver:**

```
📸 Imagem de campanha salva: { filename: ..., size: ..., path: ..., url: ... }
```

### 5. Verifique o Preview

- ✅ A imagem deve aparecer **imediatamente** no preview
- ✅ Passe o mouse sobre a imagem para ver a URL no canto inferior esquerdo
- ✅ Toast de sucesso deve aparecer: "✅ Imagem 16x9 salva com sucesso!"

## 🚨 Troubleshooting

### Problema 1: Nenhum log aparece
**Causa:** Frontend ou backend não está rodando  
**Solução:** Verifique se ambos os servidores estão ativos

### Problema 2: Erro "Backend não retornou URL da imagem"
**Causa:** Backend não está respondendo ou erro na rota  
**Verificar:**
- Terminal do backend tem algum erro?
- Request no Network tab (F12) está com status 200?
- Response tem o campo `url`?

### Problema 3: Log "❌ Erro ao carregar imagem"
**Causa:** URL construída está incorreta ou arquivo não acessível  
**Verificar:**
- Qual URL está sendo construída? (veja log `🖼️ URL construída`)
- Tente acessar a URL diretamente no browser
- Arquivo existe em `backend/public/uploads/campanhas/`?
- Backend está servindo arquivos estáticos?

### Problema 4: Preview não aparece mas logs estão OK
**Causa:** Estado React não está atualizando a UI  
**Verificar:**
- Log `🔍 Novo estado` mostra a URL?
- Inspecione o elemento da imagem (Ctrl+Shift+C)
- Atributo `src` tem a URL correta?

### Problema 5: Imagem aparece quebrada (ícone 🖼️❌)
**Causa:** Arquivo não está acessível ou CORS  
**Verificar:**
- Abra a aba **Network** do DevTools
- Veja a request da imagem - qual status?
- Se 404: arquivo não existe ou path errado
- Se 403: problema de permissão
- Se CORS error: configurar CORS no backend

## 🔧 Debug Avançado

### Testar URL da Imagem Manualmente

Após o upload, copie a URL do log e teste:

```
http://localhost:3000/uploads/campanhas/file-1730123456789-123456789.jpg
```

Abra diretamente no browser. Deve mostrar a imagem.

### Verificar Arquivo no Disco

```bash
cd "c:\Users\Roberto\Desktop\Nova pasta\backend"
dir public\uploads\campanhas
```

Deve listar os arquivos `.jpg` recém-criados.

### Verificar Estado do React

Use **React Developer Tools** (extensão Chrome/Edge):
1. Instale a extensão
2. Abra a aba "Components"
3. Encontre o componente `Step1DadosBasicos`
4. Veja o `state`
5. Campo `imagemCampanha16x9Url` deve ter a URL completa

## 📋 Checklist Final

Antes de relatar um problema, confirme:

- [ ] Backend está rodando (`npm run start:dev`)
- [ ] Frontend está rodando (`npm run dev`)
- [ ] DevTools aberto na aba Console
- [ ] Logs aparecem no console ao fazer upload
- [ ] Backend logs aparecem no terminal
- [ ] Toast de sucesso aparece
- [ ] Arquivo físico criado em `public/uploads/campanhas/`
- [ ] URL da imagem acessível diretamente no browser
- [ ] Estado React atualizado (veja `🔍 Novo estado`)

## 🎯 Resultado Esperado

Após clicar em "Confirmar" no crop:
1. ⏱️ Toast "Processando imagem..." aparece
2. 📝 Logs no console aparecem em sequência
3. 📁 Arquivo salvo em `backend/public/uploads/campanhas/`
4. 🖼️ Preview da imagem aparece **imediatamente**
5. ✅ Toast "Imagem 16x9 salva com sucesso!" aparece
6. 🖱️ Hover na imagem mostra a URL no canto

---

**Se ainda não funcionar após seguir este checklist, copie TODOS os logs do console (frontend e backend) e envie para análise.**
