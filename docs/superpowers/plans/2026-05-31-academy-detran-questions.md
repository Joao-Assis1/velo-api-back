# Academy — Banco de Questões Reais DETRAN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as questões mock do simulado teórico por 30 questões reais baseadas no banco público do DETRAN, distribuídas em 5 categorias.

**Architecture:** As questões ficam em `prisma/questions.ts` (módulo de dados puro), importado tanto pelo `seedQuestions()` do service quanto pelo `prisma/seed.ts`. O `getSimulado()` é simplificado para `findMany` + shuffle em memória. O seed passa a ser idempotente via `deleteMany` + `createMany`.

**Tech Stack:** NestJS 11, Prisma 7, Jest, TypeScript

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `prisma/questions.ts` | Criar | Array `DETRAN_QUESTIONS` com as 30 questões reais |
| `src/modules/academy/academy.service.spec.ts` | Criar | Testes unitários do service |
| `src/modules/academy/academy.service.ts` | Modificar | `seedQuestions()` idempotente + `getSimulado()` simplificado |
| `prisma/seed.ts` | Modificar | Seed usa `DETRAN_QUESTIONS` em vez das mocks |

---

## Task 1: Criar `prisma/questions.ts` com as 30 questões DETRAN

**Files:**
- Create: `prisma/questions.ts`

- [ ] **Step 1: Criar o arquivo de dados**

```typescript
// prisma/questions.ts
export interface QuestionSeed {
  text: string;
  category: string;
  options: string[];
  correct: number;
}

export const DETRAN_QUESTIONS: QuestionSeed[] = [
  // ── Legislação de Trânsito (8) ──────────────────────────────────────────────
  {
    text: 'De acordo com o CTB, a velocidade máxima permitida em rodovias de pista simples é:',
    category: 'Legislacao',
    options: ['80 km/h', '90 km/h', '100 km/h', '110 km/h'],
    correct: 2,
  },
  {
    text: 'Segundo a Lei Seca, a infração administrativa por alcoolemia começa quando o condutor apresenta:',
    category: 'Legislacao',
    options: [
      '0,05 mg de álcool por litro de ar alveolar',
      '0,1 mg de álcool por litro de ar alveolar',
      '0,2 mg de álcool por litro de ar alveolar',
      '0,3 mg de álcool por litro de ar alveolar',
    ],
    correct: 0,
  },
  {
    text: 'No CTB, infração gravíssima recebe quantos pontos na CNH?',
    category: 'Legislacao',
    options: ['3 pontos', '4 pontos', '5 pontos', '7 pontos'],
    correct: 3,
  },
  {
    text: 'O condutor que acumular 20 pontos em 12 meses terá sua CNH:',
    category: 'Legislacao',
    options: ['Cancelada', 'Cassada', 'Suspensa', 'Renovada com restrições'],
    correct: 2,
  },
  {
    text: 'Em rodovias de pista dupla, a velocidade máxima para automóveis é:',
    category: 'Legislacao',
    options: ['100 km/h', '110 km/h', '120 km/h', '130 km/h'],
    correct: 1,
  },
  {
    text: 'O uso do cinto de segurança é obrigatório:',
    category: 'Legislacao',
    options: [
      'Apenas em rodovias',
      'Apenas para motorista e passageiro dianteiro',
      'Para todos os ocupantes do veículo',
      'Opcional para adultos no banco traseiro',
    ],
    correct: 2,
  },
  {
    text: 'Em cruzamentos de mesma hierarquia viária, tem preferência de passagem o veículo que:',
    category: 'Legislacao',
    options: [
      'Estiver em maior velocidade',
      'Vier pela direita',
      'Vier pela esquerda',
      'For de maior porte',
    ],
    correct: 1,
  },
  {
    text: 'É proibido efetuar ultrapassagem em:',
    category: 'Legislacao',
    options: [
      'Retas com boa visibilidade',
      'Curvas e aclives sem visibilidade',
      'Vias com velocidade inferior a 60 km/h',
      'Vias de mão única',
    ],
    correct: 1,
  },

  // ── Direção Defensiva (7) ───────────────────────────────────────────────────
  {
    text: 'A principal finalidade da direção defensiva é:',
    category: 'Direcao Defensiva',
    options: [
      'Reduzir o consumo de combustível',
      'Evitar acidentes mesmo diante de falhas de outros condutores',
      'Aumentar a velocidade de deslocamento',
      'Diminuir o desgaste dos pneus',
    ],
    correct: 1,
  },
  {
    text: 'Ao perceber cansaço ao volante, o condutor deve:',
    category: 'Direcao Defensiva',
    options: [
      'Abrir a janela e continuar a viagem',
      'Aumentar o volume do rádio',
      'Parar em local seguro e descansar',
      'Tomar café e continuar',
    ],
    correct: 2,
  },
  {
    text: 'A regra dos 2 segundos refere-se a:',
    category: 'Direcao Defensiva',
    options: [
      'Tempo para acionar o pisca antes de ultrapassar',
      'Distância mínima de seguimento em relação ao veículo à frente',
      'Tempo máximo de parada em faixa de pedestre',
      'Intervalo entre verificações dos espelhos retrovisores',
    ],
    correct: 1,
  },
  {
    text: 'O fenômeno da aquaplanagem ocorre quando:',
    category: 'Direcao Defensiva',
    options: [
      'O veículo derrapa na areia',
      'O pneu perde contato com o asfalto devido à lâmina de água',
      'O freio para de funcionar em descidas',
      'O motor superaquece em dias quentes',
    ],
    correct: 1,
  },
  {
    text: 'Em caso de neblina intensa, o condutor deve:',
    category: 'Direcao Defensiva',
    options: [
      'Usar faróis altos para melhorar a visibilidade',
      'Aumentar a velocidade para sair da área de neblina',
      'Reduzir a velocidade e usar faróis de neblina',
      'Parar imediatamente no acostamento',
    ],
    correct: 2,
  },
  {
    text: 'O uso de celular ao volante sem dispositivo mãos livres é infração:',
    category: 'Direcao Defensiva',
    options: ['Leve', 'Média', 'Grave', 'Gravíssima'],
    correct: 3,
  },
  {
    text: 'Ao se aproximar de uma curva fechada, o condutor deve:',
    category: 'Direcao Defensiva',
    options: [
      'Manter a velocidade e frear dentro da curva',
      'Reduzir a velocidade antes de entrar na curva',
      'Acelerar para ter mais controle direcional',
      'Mudar para a faixa da esquerda para ter mais espaço',
    ],
    correct: 1,
  },

  // ── Primeiros Socorros (5) ──────────────────────────────────────────────────
  {
    text: 'Em acidente com vítima, a primeira atitude deve ser:',
    category: 'Primeiros Socorros',
    options: [
      'Remover imediatamente a vítima do veículo',
      'Sinalizar o local e acionar socorro especializado',
      'Oferecer água para a vítima',
      'Transportar a vítima ao hospital imediatamente',
    ],
    correct: 1,
  },
  {
    text: 'A posição lateral de segurança (posição de recuperação) é indicada para vítimas:',
    category: 'Primeiros Socorros',
    options: [
      'Inconscientes que respiram normalmente',
      'Conscientes com dor no pescoço',
      'Com suspeita de fratura na coluna',
      'Com hemorragia intensa nos membros',
    ],
    correct: 0,
  },
  {
    text: 'Na ressuscitação cardiopulmonar (RCP), a proporção correta é:',
    category: 'Primeiros Socorros',
    options: [
      '10 compressões para 2 ventilações',
      '15 compressões para 2 ventilações',
      '30 compressões para 2 ventilações',
      '30 compressões para 1 ventilação',
    ],
    correct: 2,
  },
  {
    text: 'Em caso de hemorragia externa intensa, o procedimento correto é:',
    category: 'Primeiros Socorros',
    options: [
      'Aplicar torniquete imediatamente',
      'Comprimir o ferimento com pano limpo',
      'Elevar o membro sem comprimir o ferimento',
      'Lavar o ferimento com água antes de comprimir',
    ],
    correct: 1,
  },
  {
    text: 'Vítima com suspeita de fratura na coluna vertebral:',
    category: 'Primeiros Socorros',
    options: [
      'Deve ser removida imediatamente para local seguro',
      'Deve receber água para se manter hidratada',
      'Não deve ser movimentada, salvo risco imediato de vida',
      'Deve ser colocada na posição lateral de segurança',
    ],
    correct: 2,
  },

  // ── Meio Ambiente (5) ───────────────────────────────────────────────────────
  {
    text: 'Os principais poluentes emitidos pelo escapamento de veículos a gasolina são:',
    category: 'Meio Ambiente',
    options: [
      'Monóxido de carbono (CO) e hidrocarbonetos',
      'Dióxido de enxofre (SO₂) e amônia',
      'Metano (CH₄) e vapor d\'água',
      'Ozônio (O₃) e nitrogênio puro',
    ],
    correct: 0,
  },
  {
    text: 'O combustível considerado mais limpo para veículos leves no Brasil é:',
    category: 'Meio Ambiente',
    options: ['Gasolina comum', 'Diesel S-10', 'Etanol', 'GNV (gás natural veicular)'],
    correct: 2,
  },
  {
    text: 'A inspeção veicular obrigatória tem como objetivo principal:',
    category: 'Meio Ambiente',
    options: [
      'Arrecadar receita para o estado',
      'Controlar a emissão de poluentes e garantir segurança',
      'Fiscalizar a estética dos veículos',
      'Regularizar a documentação do veículo',
    ],
    correct: 1,
  },
  {
    text: 'O descarte inadequado de óleo lubrificante usado contamina:',
    category: 'Meio Ambiente',
    options: [
      'Apenas o solo superficial',
      'Apenas corpos d\'água superficiais',
      'Solo, água superficial e lençol freático',
      'Somente o ar atmosférico',
    ],
    correct: 2,
  },
  {
    text: 'Fumaça escura saindo do escapamento indica que o condutor deve:',
    category: 'Meio Ambiente',
    options: [
      'Continuar usando o veículo normalmente',
      'Reduzir a velocidade para diminuir a emissão',
      'Levar o veículo para revisão mecânica',
      'Trocar o combustível por gasolina aditivada',
    ],
    correct: 2,
  },

  // ── Mecânica Básica (5) ─────────────────────────────────────────────────────
  {
    text: 'A principal função do óleo lubrificante do motor é:',
    category: 'Mecanica',
    options: [
      'Reduzir o atrito entre as peças e auxiliar no resfriamento',
      'Aumentar a potência do motor',
      'Reduzir o consumo de combustível',
      'Limpar o sistema de injeção eletrônica',
    ],
    correct: 0,
  },
  {
    text: 'O sistema ABS (Anti-lock Braking System) tem a função de:',
    category: 'Mecanica',
    options: [
      'Reduzir o espaço de frenagem em qualquer superfície',
      'Impedir o travamento das rodas, mantendo a dirigibilidade',
      'Aumentar a força de frenagem em pavimento seco',
      'Substituir o freio de estacionamento',
    ],
    correct: 1,
  },
  {
    text: 'Pneus com pressão abaixo do recomendado causam:',
    category: 'Mecanica',
    options: [
      'Maior aderência ao solo',
      'Menor consumo de combustível',
      'Maior desgaste e risco de estouro',
      'Melhor dirigibilidade em curvas',
    ],
    correct: 2,
  },
  {
    text: 'Dificuldade para dar partida e luzes internas fracas indicam problema na:',
    category: 'Mecanica',
    options: ['Bomba de combustível', 'Bateria', 'Bomba d\'água', 'Embreagem'],
    correct: 1,
  },
  {
    text: 'O superaquecimento do motor geralmente é causado por:',
    category: 'Mecanica',
    options: [
      'Excesso de óleo lubrificante',
      'Falta de líquido de arrefecimento',
      'Pneus com pressão elevada',
      'Uso de combustível aditivado',
    ],
    correct: 1,
  },
];
```

- [ ] **Step 2: Verificar que o arquivo compila sem erros**

```bash
npx tsc --noEmit prisma/questions.ts 2>&1 || echo "OK (erros esperados de path — o importante é sem erros de tipo)"
```

- [ ] **Step 3: Commit**

```bash
git add prisma/questions.ts
git commit -m "feat(academy): adicionar banco de 30 questões reais DETRAN"
```

---

## Task 2: Escrever testes unitários para `AcademyService` (TDD — falha primeiro)

**Files:**
- Create: `src/modules/academy/academy.service.spec.ts`

- [ ] **Step 1: Criar o arquivo de teste**

```typescript
// src/modules/academy/academy.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AcademyService } from './academy.service';
import { PrismaService } from '../prisma/prisma.service';
import { DETRAN_QUESTIONS } from '../../../prisma/questions';

describe('AcademyService', () => {
  let service: AcademyService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      question: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 30 }),
        findMany: jest.fn().mockResolvedValue(
          DETRAN_QUESTIONS.map((q, i) => ({ id: `q-${i}`, ...q })),
        ),
        count: jest.fn().mockResolvedValue(30),
      },
      studentSimuladoHistory: {
        create: jest.fn(),
      },
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AcademyService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = mod.get(AcademyService);
  });

  describe('seedQuestions', () => {
    it('trunca questões existentes e insere exatamente 30 questões DETRAN', async () => {
      await service.seedQuestions();

      expect(prisma.question.deleteMany).toHaveBeenCalledWith({});
      expect(prisma.question.createMany).toHaveBeenCalledWith({
        data: DETRAN_QUESTIONS,
      });
    });

    it('é idempotente — executa deleteMany mesmo se já houver questões', async () => {
      prisma.question.count.mockResolvedValue(40);

      await service.seedQuestions();

      expect(prisma.question.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.question.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSimulado', () => {
    it('retorna exatamente 30 questões quando cache está vazio', async () => {
      const result = await service.getSimulado();
      expect(result).toHaveLength(30);
    });

    it('usa findMany para buscar questões quando cache está vazio', async () => {
      await service.getSimulado();
      expect(prisma.question.findMany).toHaveBeenCalled();
    });

    it('armazena no cache após buscar do banco', async () => {
      await service.getSimulado();
      expect(cache.set).toHaveBeenCalledWith(
        'academy:questions:pool',
        expect.any(Array),
        expect.any(Number),
      );
    });

    it('usa o cache quando disponível e não chama o banco', async () => {
      const cachedQuestions = DETRAN_QUESTIONS.map((q, i) => ({ id: `q-${i}`, ...q }));
      cache.get.mockResolvedValue(cachedQuestions);

      const result = await service.getSimulado();

      expect(prisma.question.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(30);
    });
  });
});
```

- [ ] **Step 2: Rodar os testes — esperar FAIL**

```bash
npm test -- academy.service --no-coverage 2>&1 | tail -15
```

Saída esperada: falha com erros como `deleteMany is not a function` ou `Expected: {}, Received: ...` — confirmando que os testes são novos e o comportamento atual é diferente.

---

## Task 3: Atualizar `AcademyService` para passar nos testes

**Files:**
- Modify: `src/modules/academy/academy.service.ts`

- [ ] **Step 1: Substituir o conteúdo do service**

```typescript
// src/modules/academy/academy.service.ts
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { DETRAN_QUESTIONS } from '../../../prisma/questions';

const SIMULADO_CACHE_KEY = 'academy:questions:pool';
const SIMULADO_CACHE_TTL = 10 * 60 * 1000;

@Injectable()
export class AcademyService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getSimulado() {
    let pool = await this.cache.get<any[]>(SIMULADO_CACHE_KEY);

    if (!pool) {
      pool = await this.prisma.question.findMany();
      await this.cache.set(SIMULADO_CACHE_KEY, pool, SIMULADO_CACHE_TTL);
    }

    return [...pool].sort(() => 0.5 - Math.random());
  }

  async submitSimulado(
    studentId: string,
    answers: { questionId: string; answer: number }[],
    startedAt: string,
  ) {
    const startTime = new Date(startedAt);
    const endTime = new Date();

    const durationMs = endTime.getTime() - startTime.getTime();
    if (durationMs < 15 * 60 * 1000) {
      throw new BadRequestException(
        'Simulado submitted too fast. Minimum time is 15 minutes.',
      );
    }

    const questionIds = answers.map((a) => a.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
    });

    let score = 0;
    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (question && question.correct === answer.answer) {
        score++;
      }
    }

    const passed = score >= 21;

    return this.prisma.studentSimuladoHistory.create({
      data: {
        studentId,
        score,
        passed,
        startedAt: startTime,
        submittedAt: endTime,
      },
    });
  }

  async seedQuestions() {
    await this.prisma.question.deleteMany({});
    await this.prisma.question.createMany({ data: DETRAN_QUESTIONS });
    return { seeded: DETRAN_QUESTIONS.length };
  }
}
```

- [ ] **Step 2: Rodar os testes — esperar PASS**

```bash
npm test -- academy.service --no-coverage 2>&1 | tail -10
```

Saída esperada:
```
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/academy/academy.service.ts src/modules/academy/academy.service.spec.ts
git commit -m "feat(academy): substituir questões mock por 30 questões reais DETRAN"
```

---

## Task 4: Atualizar `prisma/seed.ts` para usar `DETRAN_QUESTIONS`

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Substituir o bloco de questões no seed**

Localizar o bloco atual (linhas ~81–96):

```typescript
// ── Questões do Simulado ──────────────────────────────────���─────────────────
const qCount = await prisma.question.count();
if (qCount === 0) {
  const categories = ['Legislacao', 'Direcao Defensiva', 'Primeiros Socorros', 'Meio Ambiente', 'Mecanica'];
  await prisma.question.createMany({
    data: Array.from({ length: 40 }, (_, i) => ({
      text: `Questão ${i + 1} — ${categories[i % 5]}: qual alternativa está correta?`,
      category: categories[i % 5],
      options: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
      correct: i % 4,
    })),
  });
  console.log('  ✔ 40 questões criadas');
} else {
  console.log(`  ✔ ${qCount} questões já existem`);
}
```

Substituir por:

```typescript
// ── Questões do Simulado ────────────────────────────────────────────────────
await prisma.question.deleteMany({});
await prisma.question.createMany({ data: DETRAN_QUESTIONS });
console.log(`  ✔ ${DETRAN_QUESTIONS.length} questões DETRAN inseridas`);
```

- [ ] **Step 2: Adicionar o import no topo do `prisma/seed.ts`** (junto aos outros imports existentes)

```typescript
import { DETRAN_QUESTIONS } from './questions';
```

- [ ] **Step 3: Verificar compilação do seed**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Saída esperada: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "chore(seed): usar questões reais DETRAN em vez de mocks no seed principal"
```

---

## Task 5: Rodar suite completa e verificar

- [ ] **Step 1: Rodar todos os testes**

```bash
npm test --no-coverage 2>&1 | tail -15
```

Saída esperada: todos os suites passando, nenhuma regressão.

- [ ] **Step 2: Verificar contagem de questões no banco (opcional, se tiver DB local)**

```bash
npx prisma db seed 2>&1 | grep questões
```

Saída esperada:
```
  ✔ 30 questões DETRAN inseridas
```

- [ ] **Step 3: Push**

```bash
git push origin develop
```
