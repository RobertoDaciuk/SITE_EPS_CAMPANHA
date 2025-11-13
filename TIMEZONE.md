# Sincronia Temporal Universal - EPS Campanhas

## 📅 Política de Timezone

Este sistema adota uma **Sincronia Temporal Universal** para garantir consistência de datas em toda a stack:

### Princípios Fundamentais

1. **Backend & Banco de Dados**: UTC sempre
2. **API**: Timestamps em ISO 8601 UTC
3. **Frontend**: Exibição em `America/Sao_Paulo` (BRT/BRST)

---

## Backend (NestJS + Prisma)

### Armazenamento
- **Banco de Dados (PostgreSQL)**: Todos os campos `DateTime` são armazenados em **UTC**.
- **Prisma**: Converte automaticamente para UTC ao salvar e retorna UTC nas queries.

### Criação de Datas
```typescript
// ✅ CORRETO: Node.js new Date() já retorna UTC internamente
const agora = new Date(); // UTC

// ✅ CORRETO: Ao salvar no Prisma, sempre em UTC
await prisma.campanha.create({
  data: {
    dataInicio: new Date('2024-06-01T00:00:00Z'), // UTC
    dataFim: new Date('2024-12-31T23:59:59Z'),     // UTC
  },
});
```

### Retorno de API
- Todas as datas são serializadas como **ISO 8601 UTC**:
  ```json
  {
    "dataInicio": "2024-06-01T00:00:00.000Z",
    "dataFim": "2024-12-31T23:59:59.000Z"
  }
  ```

---

## Frontend (Next.js + React)

### Utilitário Centralizado
Todas as formatações usam `@/lib/timezone.ts`:

```typescript
import { formatarDataBR, formatarDataHoraBR, agoraBR } from '@/lib/timezone';

// ✅ CORRETO: Formatar data UTC em São Paulo
const dataExibida = formatarDataBR(campanha.dataInicio); // "01/06/2024"
const dataHoraCompleta = formatarDataHoraBR(envio.dataValidacao); // "01/06/2024 15:30"

// ✅ CORRETO: Obter data/hora atual em São Paulo
const agora = agoraBR(); // Date object no timezone SP
```

### Regras de Formatação
- **Nunca** use `new Date().toLocaleDateString()` diretamente
- **Sempre** use funções do `timezone.ts`:
  - `formatarDataBR(date, format?)` → Formata em SP
  - `formatarDataHoraBR(date)` → Data e hora em SP
  - `formatarDataCurtaBR(date)` → dd/MM
  - `formatarMoeda(valor)` → R$ formatado
  - `formatarNumero(valor, decimais?)` → Número BR

### Envio ao Backend
Ao criar/editar datas, converta SP → UTC antes de enviar:

```typescript
import { converterParaUTC } from '@/lib/timezone';

// Usuário selecionou "01/06/2024 10:00" em SP
const dataLocal = new Date('2024-06-01T10:00:00'); // Interpretada como local do navegador
const dataUTC = converterParaUTC(dataLocal); // Converte SP → UTC

await api.post('/campanhas', {
  dataInicio: dataUTC.toISOString(), // Envia em UTC
});
```

---

## Comparação de Datas

### Frontend
Use as funções auxiliares:
```typescript
import { estaNoPassadoBR, estaNoFuturoBR, estaEntreBR } from '@/lib/timezone';

// Compara em SP mesmo que a data venha em UTC
const campanhaExpirada = estaNoPassadoBR(campanha.dataFim);
const campanhaAtiva = estaEntreBR(new Date(), campanha.dataInicio, campanha.dataFim);
```

### Backend
Comparações diretas já usam UTC:
```typescript
const agora = new Date(); // UTC
const campanhaAtiva = campanha.dataInicio <= agora && agora <= campanha.dataFim;
```

---

## Componentes já Adaptados

### Frontend
- ✅ `CampaignCard` (user)
- ✅ `AdminCampaignCard` (admin)
- ✅ `AnalyticsModal` (admin)
- ✅ `Step5Revisao` e `Step6Revisao` (wizard)
- ✅ Admin resgates (app + components)
- ⚠️ Outros componentes: em processo de migração

### Backend
- ✅ Prisma schema (UTC por padrão)
- ✅ Controllers retornam ISO 8601 UTC
- ✅ Services usam `new Date()` (UTC)
- ⚠️ Validar casos especiais de range queries

---

## Exemplos Práticos

### Criar Campanha (Frontend)
```typescript
// Usuário define: "Início: 01/06/2024 00:00" em SP
const formData = {
  dataInicio: '2024-06-01', // Input type="date" (sem timezone)
};

// Antes de enviar, normalizar para UTC:
import { fromZonedTime } from 'date-fns-tz';
const dataInicioUTC = fromZonedTime(
  new Date(formData.dataInicio + 'T00:00:00'),
  'America/Sao_Paulo'
);

await api.post('/campanhas', {
  ...formData,
  dataInicio: dataInicioUTC.toISOString(), // "2024-06-01T03:00:00.000Z" (UTC)
});
```

### Exibir Data de Validação
```typescript
// Backend retorna: "dataValidacao": "2024-06-01T15:30:00.000Z"
import { formatarDataHoraBR } from '@/lib/timezone';

// Frontend exibe:
<p>{formatarDataHoraBR(envio.dataValidacao)}</p>
// Renderiza: "01/06/2024 12:30" (convertido para SP)
```

---

## Checklist de Migração

Ao criar novos componentes:
- [ ] Importar funções de `@/lib/timezone`
- [ ] Substituir `.toLocaleDateString()` por `formatarDataBR()`
- [ ] Substituir `.toLocaleString()` por `formatarDataHoraBR()`
- [ ] Usar `formatarMoeda()` e `formatarNumero()` para valores
- [ ] Testar exibição em diferentes horários (madrugada, meio-dia, fim de semana)

---

## Validação

### Testes Manuais
1. Criar campanha com início às 00:00 do dia 01/06
2. Verificar que backend armazena em UTC (+3h no verão BRT)
3. Confirmar que frontend exibe "01/06/2024 00:00" (não "31/05")

### Testes Automatizados (futuro)
```typescript
import { formatarDataBR } from '@/lib/timezone';

test('Deve formatar data UTC em São Paulo', () => {
  const dataUTC = new Date('2024-06-01T03:00:00.000Z'); // 03:00 UTC = 00:00 SP
  expect(formatarDataBR(dataUTC)).toBe('01/06/2024');
});
```

---

## Troubleshooting

### "Data aparece com dia errado"
- **Causa**: Frontend usando `new Date(str).toLocaleDateString()` em vez de `formatarDataBR()`
- **Solução**: Migrar para utilitário de timezone

### "Horário de início da campanha está 3h adiantado"
- **Causa**: Input de data não normalizado para SP antes de enviar
- **Solução**: Usar `converterParaUTC()` antes de POST/PUT

### "Comparação de datas falha no fim de semana"
- **Causa**: Horário de verão (BRST) vs inverno (BRT)
- **Solução**: Usar `date-fns-tz` que lida com DST automaticamente

---

## Referências

- [date-fns](https://date-fns.org/)
- [date-fns-tz](https://github.com/marnusw/date-fns-tz)
- [Prisma DateTime](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datetime)
- [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html)
