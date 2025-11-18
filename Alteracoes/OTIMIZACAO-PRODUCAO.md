# 🚀 Otimização e Boas Práticas - Jelastic Production

## 📋 Índice
1. [Otimização de Performance](#performance)
2. [Redução de Custos](#custos)
3. [CI/CD com GitHub Actions](#cicd)
4. [Monitoramento Avançado](#monitoramento)
5. [Estratégias de Scaling](#scaling)
6. [Segurança Avançada](#seguranca)

---

## ⚡ Otimização de Performance {#performance}

### Backend (NestJS)

#### 1. Habilitar Compressão
```typescript
// main.ts
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Comprimir respostas HTTP
  app.use(compression());
  
  await app.listen(3000);
}
```

#### 2. Configurar Cache HTTP
```typescript
// Em controllers específicos
@Controller('produtos')
export class ProdutosController {
  @Get()
  @Header('Cache-Control', 'public, max-age=300') // 5 minutos
  async findAll() {
    // ...
  }
}
```

#### 3. Otimizar Queries Prisma
```typescript
// ❌ Ruim - N+1 queries
const campanhas = await prisma.campanha.findMany();
for (const campanha of campanhas) {
  const vendas = await prisma.venda.findMany({ 
    where: { campanhaId: campanha.id } 
  });
}

// ✅ Bom - Include/Select
const campanhas = await prisma.campanha.findMany({
  include: {
    vendas: true,
  },
});

// ✅ Melhor - Select apenas campos necessários
const campanhas = await prisma.campanha.findMany({
  select: {
    id: true,
    nome: true,
    dataInicio: true,
    vendas: {
      select: {
        id: true,
        valorTotal: true,
      },
    },
  },
});
```

#### 4. Adicionar Índices no Banco
```prisma
// prisma/schema.prisma
model Venda {
  id           Int      @id @default(autoincrement())
  campanhaId   Int
  vendedorId   Int
  dataVenda    DateTime
  
  // Índices para queries frequentes
  @@index([campanhaId])
  @@index([vendedorId])
  @@index([dataVenda])
  @@index([campanhaId, vendedorId]) // Índice composto
}
```

Aplicar:
```bash
npx prisma migrate dev --name add_performance_indexes
npx prisma migrate deploy
```

#### 5. Connection Pool do PostgreSQL
```env
# .env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20"
```

### Frontend (Next.js)

#### 1. Otimizar Imagens
```tsx
// Use next/image ao invés de <img>
import Image from 'next/image';

<Image
  src="/uploads/produto.jpg"
  alt="Produto"
  width={300}
  height={200}
  quality={85}
  loading="lazy"
/>
```

#### 2. Code Splitting Dinâmico
```tsx
// Carregar componentes pesados sob demanda
import dynamic from 'next/dynamic';

const GraficoComplexo = dynamic(() => import('@/components/GraficoComplexo'), {
  loading: () => <p>Carregando gráfico...</p>,
  ssr: false, // Não renderizar no servidor
});
```

#### 3. Memoização de Componentes
```tsx
import { memo, useMemo } from 'react';

// Componente pesado
const ListaProdutos = memo(({ produtos }) => {
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => p.ativo);
  }, [produtos]);
  
  return (
    <ul>
      {produtosFiltrados.map(p => <li key={p.id}>{p.nome}</li>)}
    </ul>
  );
});
```

#### 4. Prefetching de Rotas
```tsx
import Link from 'next/link';

// Next.js prefetch automático em Links visíveis
<Link href="/dashboard" prefetch={true}>
  Dashboard
</Link>
```

#### 5. Cache de Dados (SWR)
```tsx
import useSWR from 'swr';

function Dashboard() {
  const { data, error } = useSWR('/api/campanhas', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minuto
  });
}
```

---

## 💰 Redução de Custos {#custos}

### 1. Auto-Scaling Inteligente

**Configuração no Jelastic:**
```
Horizontal Scaling:
  - CPU > 70% por 5 min → +1 node
  - CPU < 20% por 15 min → -1 node
  - Min nodes: 1
  - Max nodes: 3

Vertical Scaling:
  - Reserved: 2 cloudlets (garantido)
  - Limit: 8 cloudlets (sob demanda)
```

### 2. Scheduling de Recursos

Para ambientes não-críticos:
```bash
# Cron job para desligar fora do horário comercial
# (não recomendado para produção)

# Desligar às 19h (segunda-sexta)
0 19 * * 1-5 /usr/local/bin/jelastic-cli environment.control.Stop --envName eps-campanhas-dev

# Ligar às 7h
0 7 * * 1-5 /usr/local/bin/jelastic-cli environment.control.Start --envName eps-campanhas-dev
```

### 3. Otimizar Disco

```bash
# Limpar logs antigos
find /var/log -name "*.log" -mtime +30 -delete

# Limpar node_modules de builds antigos
find /var/www -name "node_modules" -type d -mtime +90 -exec rm -rf {} +

# Limpar cache npm
npm cache clean --force
```

### 4. Usar CDN para Assets

Mover assets estáticos para CDN (ex: Cloudflare, AWS CloudFront):
- Imagens de produtos
- CSS/JS do frontend
- Fontes

### 5. Revisar Cloudlets Mensalmente

Analise o uso real e ajuste:
1. Dashboard Jelastic → Statistics
2. Veja média de uso nos últimos 30 dias
3. Ajuste Reserved Cloudlets para ~70% do uso médio

---

## 🔄 CI/CD com GitHub Actions {#cicd}

### Workflow Automático

Crie `.github/workflows/deploy-jelastic.yml`:

```yaml
name: Deploy to Jelastic

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install Dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run Tests
        working-directory: ./backend
        run: npm test
      
      - name: Build
        working-directory: ./backend
        run: npm run build
      
      - name: Deploy to Jelastic
        env:
          JELASTIC_API_TOKEN: ${{ secrets.JELASTIC_API_TOKEN }}
          JELASTIC_ENV: eps-campanhas-prod
        run: |
          curl -X POST "https://app.jelastic.saveincloud.net/1.0/environment/control/rest/redeploycontainers" \
            -d "session=$JELASTIC_API_TOKEN" \
            -d "envName=$JELASTIC_ENV" \
            -d "nodeGroup=cp" \
            -d "tag=latest"
  
  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install Dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_API_URL: https://api.seudominio.com/api
        run: npm run build
      
      - name: Deploy to Jelastic
        env:
          JELASTIC_API_TOKEN: ${{ secrets.JELASTIC_API_TOKEN }}
          JELASTIC_ENV: eps-campanhas-prod
        run: |
          curl -X POST "https://app.jelastic.saveincloud.net/1.0/environment/control/rest/redeploycontainers" \
            -d "session=$JELASTIC_API_TOKEN" \
            -d "envName=$JELASTIC_ENV" \
            -d "nodeGroup=cp" \
            -d "tag=latest"
```

**Configurar Secrets no GitHub:**
1. Repository Settings → Secrets → Actions
2. Adicionar `JELASTIC_API_TOKEN`

---

## 📊 Monitoramento Avançado {#monitoramento}

### 1. Integrar Sentry (Error Tracking)

**Backend:**
```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**Frontend:**
```typescript
// app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 2. Application Performance Monitoring (APM)

**New Relic ou similar:**
```bash
# Instalar
npm install newrelic

# backend/newrelic.js
exports.config = {
  app_name: ['EPS Campanhas Backend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  }
};

// main.ts (primeira linha)
require('newrelic');
```

### 3. Health Checks Customizados

```typescript
// backend/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        memory: this.checkMemory(),
      },
    };
    
    return checks;
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  private checkMemory() {
    const used = process.memoryUsage();
    return {
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    };
  }
}
```

### 4. Uptime Monitoring

Use serviços externos:
- **UptimeRobot** (gratuito)
- **Pingdom**
- **StatusCake**

Monitore:
- `https://api.seudominio.com/api/health`
- `https://app.seudominio.com`

---

## 📈 Estratégias de Scaling {#scaling}

### Horizontal Scaling (Múltiplos Nodes)

**Quando usar:**
- Alto tráfego constante
- Necessidade de alta disponibilidade
- Picos de acesso previsíveis

**Configuração:**
```
Backend:
  - 2 nodes mínimo (alta disponibilidade)
  - NGINX load balancer (incluído)
  - Session storage em Redis (não em memória)

Frontend:
  - 1-2 nodes geralmente suficiente
  - Next.js é stateless (fácil escalar)
```

### Vertical Scaling (Mais Recursos)

**Quando usar:**
- Aplicação single-threaded
- Operações CPU-intensive
- Database queries pesadas

**Configuração:**
```
Reserved Cloudlets: 4 (4 GB RAM)
Limit: 16 (16 GB RAM)
```

### Database Scaling

#### Read Replicas
```
Master (Write): 1 node
Replica (Read): 1+ nodes
```

#### Connection Pooling
```typescript
// backend/src/prisma/prisma.service.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// Configurar pool no DATABASE_URL
// ?connection_limit=20&pool_timeout=30
```

---

## 🔐 Segurança Avançada {#seguranca}

### 1. Rate Limiting por IP

```typescript
// backend/src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
      // Configuração avançada por rota
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 3,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### 2. Helmet (Security Headers)

```typescript
// backend/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  
  await app.listen(3000);
}
```

### 3. Validação de Inputs

```typescript
// Usar class-validator em todos os DTOs
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;
}
```

### 4. SQL Injection Protection

```typescript
// ✅ Prisma já protege automaticamente
const users = await prisma.user.findMany({
  where: {
    email: userInput, // Sanitizado automaticamente
  },
});

// ❌ Evite raw queries quando possível
// Se necessário, use parametrização:
await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

### 5. Rotação de Secrets

```bash
# Rotacionar JWT_SECRET a cada 90 dias
# Suporte a múltiplos secrets (transição suave)

# .env
JWT_SECRET=novo_secret_aqui
JWT_SECRET_OLD=secret_antigo_aqui

# Validar com ambos por período de transição
```

---

## 📚 Recursos Adicionais

- **NestJS Best Practices:** https://docs.nestjs.com/fundamentals
- **Next.js Performance:** https://nextjs.org/docs/advanced-features/measuring-performance
- **Prisma Performance:** https://www.prisma.io/docs/guides/performance-and-optimization
- **Jelastic API:** https://docs.jelastic.com/api/

---

## ✅ Checklist de Otimização

- [ ] Compressão HTTP habilitada
- [ ] Índices do banco otimizados
- [ ] Connection pooling configurado
- [ ] Cache HTTP implementado
- [ ] Imagens otimizadas (Next.js Image)
- [ ] Code splitting implementado
- [ ] Auto-scaling configurado
- [ ] Monitoramento de erros (Sentry)
- [ ] Health checks implementados
- [ ] Rate limiting configurado
- [ ] Security headers (Helmet)
- [ ] Backup automatizado
- [ ] CI/CD pipeline funcional
- [ ] CDN para assets estáticos

---

**🚀 Sistema otimizado = Melhor performance + Menor custo + Maior segurança!**
