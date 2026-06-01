# Design: Banco de Questões Reais DETRAN — Academy

**Data:** 2026-05-31
**Módulo:** `src/modules/academy`

---

## Objetivo

Substituir as 40 questões mock do simulado teórico por 30 questões reais baseadas no banco público do DETRAN, cobrindo as 5 categorias oficiais do CTB.

---

## Arquitetura

### Novo arquivo: `prisma/questions.ts`

Módulo de dados puro — exporta um array tipado com as 30 questões. Não tem dependências de runtime. Pode ser importado tanto pelo service quanto pelo `prisma/seed.ts`.

```ts
export interface QuestionSeed {
  text: string;
  category: string;
  options: string[];
  correct: number; // índice 0-based da opção correta
}

export const DETRAN_QUESTIONS: QuestionSeed[] = [ /* 30 questões */ ];
```

### Alterações em `academy.service.ts`

**`seedQuestions()`**
- Remove o guard `if (count > 0) return`
- Passa a ser idempotente: `deleteMany({})` seguido de `createMany({ data: DETRAN_QUESTIONS })`
- Importa `DETRAN_QUESTIONS` de `prisma/questions.ts`

**`getSimulado()`**
- Remove o branch `total < 30` e o `ORDER BY RANDOM()` (SQL desnecessário com pool fixo)
- Busca as 30 questões com `findMany()` e embaralha em memória com `.sort(() => 0.5 - Math.random())`
- Mantém o cache de 10 minutos sobre o pool (antes do shuffle)

### Alterações em `prisma/seed.ts`

Adiciona chamada ao seed de questões após o seed de usuários/veículos existente:

```ts
import { DETRAN_QUESTIONS } from './questions';
// ...
await prisma.question.deleteMany({});
await prisma.question.createMany({ data: DETRAN_QUESTIONS });
```

---

## Distribuição das Questões

| Categoria            | Quantidade |
|----------------------|------------|
| Legislação de Trânsito | 8        |
| Direção Defensiva    | 7          |
| Primeiros Socorros   | 5          |
| Meio Ambiente        | 5          |
| Mecânica Básica      | 5          |
| **Total**            | **30**     |

---

## Questões

### Legislação de Trânsito (8)

1. De acordo com o CTB, a velocidade máxima permitida em rodovias de pista simples é:
   - `[0]` 80 km/h
   - `[1]` 90 km/h
   - `[2]` **100 km/h** ✓
   - `[3]` 110 km/h

2. Segundo a Lei Seca, a infração administrativa por alcoolemia começa quando o condutor apresenta:
   - `[0]` **0,05 mg de álcool por litro de ar alveolar** ✓
   - `[1]` 0,1 mg de álcool por litro de ar alveolar
   - `[2]` 0,2 mg de álcool por litro de ar alveolar
   - `[3]` 0,3 mg de álcool por litro de ar alveolar

3. No CTB, infração gravíssima recebe quantos pontos na CNH?
   - `[0]` 3 pontos
   - `[1]` 4 pontos
   - `[2]` 5 pontos
   - `[3]` **7 pontos** ✓

4. O condutor que acumular 20 pontos em 12 meses terá sua CNH:
   - `[0]` Cancelada
   - `[1]` Cassada
   - `[2]` **Suspensa** ✓
   - `[3]` Renovada com restrições

5. Em rodovias de pista dupla, a velocidade máxima para automóveis é:
   - `[0]` 100 km/h
   - `[1]` **110 km/h** ✓
   - `[2]` 120 km/h
   - `[3]` 130 km/h

6. O uso do cinto de segurança é obrigatório:
   - `[0]` Apenas em rodovias
   - `[1]` Apenas para motorista e passageiro dianteiro
   - `[2]` **Para todos os ocupantes do veículo** ✓
   - `[3]` Opcional para adultos no banco traseiro

7. Em cruzamentos de mesma hierarquia, tem preferência o veículo que:
   - `[0]` Estiver em maior velocidade
   - `[1]` **Vier pela direita** ✓
   - `[2]` Vier pela esquerda
   - `[3]` For de maior porte

8. É proibido efetuar ultrapassagem em:
   - `[0]` Retas com boa visibilidade
   - `[1]` **Curvas e aclives sem visibilidade** ✓
   - `[2]` Vias com velocidade inferior a 60 km/h
   - `[3]` Vias de mão única

### Direção Defensiva (7)

9. A principal finalidade da direção defensiva é:
   - `[0]` Reduzir o consumo de combustível
   - `[1]` **Evitar acidentes mesmo diante de falhas de outros condutores** ✓
   - `[2]` Aumentar a velocidade de deslocamento
   - `[3]` Diminuir o desgaste dos pneus

10. Ao perceber cansaço ao volante, o condutor deve:
    - `[0]` Abrir a janela e continuar a viagem
    - `[1]` Aumentar o volume do rádio
    - `[2]` **Parar em local seguro e descansar** ✓
    - `[3]` Tomar café e continuar

11. A regra dos 2 segundos refere-se a:
    - `[0]` Tempo para acionar o pisca antes de ultrapassar
    - `[1]` **Distância mínima de seguimento em relação ao veículo à frente** ✓
    - `[2]` Tempo máximo de parada em faixa de pedestre
    - `[3]` Intervalo entre verificações dos espelhos retrovisores

12. O fenômeno da aquaplanagem ocorre quando:
    - `[0]` O veículo derrapa na areia
    - `[1]` **O pneu perde contato com o asfalto devido à lâmina de água** ✓
    - `[2]` O freio para de funcionar em descidas
    - `[3]` O motor superaquece em dias quentes

13. Em caso de neblina intensa, o condutor deve:
    - `[0]` Usar faróis altos para melhorar a visibilidade
    - `[1]` Aumentar a velocidade para sair da área de neblina
    - `[2]` **Reduzir a velocidade e usar faróis de neblina** ✓
    - `[3]` Parar imediatamente no acostamento

14. O uso de celular ao volante sem dispositivo mãos livres é infração:
    - `[0]` Leve
    - `[1]` Média
    - `[2]` Grave
    - `[3]` **Gravíssima** ✓

15. Ao se aproximar de uma curva fechada, o condutor deve:
    - `[0]` Manter a velocidade e frear dentro da curva
    - `[1]` **Reduzir a velocidade antes de entrar na curva** ✓
    - `[2]` Acelerar para ter mais controle direcional
    - `[3]` Mudar para a faixa da esquerda para ter mais espaço

### Primeiros Socorros (5)

16. Em acidente com vítima, a primeira atitude deve ser:
    - `[0]` Remover imediatamente a vítima do veículo
    - `[1]` **Sinalizar o local e acionar socorro especializado** ✓
    - `[2]` Oferecer água para a vítima
    - `[3]` Transportar a vítima ao hospital imediatamente

17. A posição lateral de segurança (posição de recuperação) é indicada para vítimas:
    - `[0]` **Inconscientes que respiram normalmente** ✓
    - `[1]` Conscientes com dor no pescoço
    - `[2]` Com suspeita de fratura na coluna
    - `[3]` Com hemorragia intensa nos membros

18. Na ressuscitação cardiopulmonar (RCP), a proporção correta é:
    - `[0]` 10 compressões para 2 ventilações
    - `[1]` 15 compressões para 2 ventilações
    - `[2]` **30 compressões para 2 ventilações** ✓
    - `[3]` 30 compressões para 1 ventilação

19. Em caso de hemorragia externa intensa, o procedimento correto é:
    - `[0]` Aplicar torniquete imediatamente
    - `[1]` **Comprimir o ferimento com pano limpo** ✓
    - `[2]` Elevar o membro sem comprimir o ferimento
    - `[3]` Lavar o ferimento com água antes de comprimir

20. Vítima com suspeita de fratura na coluna vertebral:
    - `[0]` Deve ser removida imediatamente para local seguro
    - `[1]` Deve receber água para se manter hidratada
    - `[2]` **Não deve ser movimentada, salvo risco imediato de vida** ✓
    - `[3]` Deve ser colocada na posição lateral de segurança

### Meio Ambiente (5)

21. Os principais poluentes emitidos pelo escapamento de veículos a gasolina são:
    - `[0]` **Monóxido de carbono (CO) e hidrocarbonetos** ✓
    - `[1]` Dióxido de enxofre (SO₂) e amônia
    - `[2]` Metano (CH₄) e vapor d'água
    - `[3]` Ozônio (O₃) e nitrogênio puro

22. O combustível considerado mais limpo para veículos leves no Brasil é:
    - `[0]` Gasolina comum
    - `[1]` Diesel S-10
    - `[2]` **Etanol** ✓
    - `[3]` GNV (gás natural veicular)

23. A inspeção veicular obrigatória tem como objetivo principal:
    - `[0]` Arrecadar receita para o estado
    - `[1]` **Controlar a emissão de poluentes e garantir segurança** ✓
    - `[2]` Fiscalizar a estética dos veículos
    - `[3]` Regularizar a documentação do veículo

24. O descarte inadequado de óleo lubrificante usado contamina:
    - `[0]` Apenas o solo superficial
    - `[1]` Apenas corpos d'água superficiais
    - `[2]` **Solo, água superficial e lençol freático** ✓
    - `[3]` Somente o ar atmosférico

25. Fumaça escura saindo do escapamento indica que o condutor deve:
    - `[0]` Continuar usando o veículo normalmente
    - `[1]` Reduzir a velocidade para diminuir a emissão
    - `[2]` **Levar o veículo para revisão mecânica** ✓
    - `[3]` Trocar o combustível por gasolina aditivada

### Mecânica Básica (5)

26. A principal função do óleo lubrificante do motor é:
    - `[0]` **Reduzir o atrito entre as peças e auxiliar no resfriamento** ✓
    - `[1]` Aumentar a potência do motor
    - `[2]` Reduzir o consumo de combustível
    - `[3]` Limpar o sistema de injeção eletrônica

27. O sistema ABS (Anti-lock Braking System) tem a função de:
    - `[0]` Reduzir o espaço de frenagem em qualquer superfície
    - `[1]` **Impedir o travamento das rodas, mantendo a dirigibilidade** ✓
    - `[2]` Aumentar a força de frenagem em pavimento seco
    - `[3]` Substituir o freio de estacionamento

28. Pneus com pressão abaixo do recomendado causam:
    - `[0]` Maior aderência ao solo
    - `[1]` Menor consumo de combustível
    - `[2]` **Maior desgaste e risco de estouro** ✓
    - `[3]` Melhor dirigibilidade em curvas

29. Dificuldade para dar partida e luzes internas fracas indicam problema na:
    - `[0]` Bomba de combustível
    - `[1]` **Bateria** ✓
    - `[2]` Bomba d'água
    - `[3]` Embreagem

30. O superaquecimento do motor geralmente é causado por:
    - `[0]` Excesso de óleo lubrificante
    - `[1]` **Falta de líquido de arrefecimento** ✓
    - `[2]` Pneus com pressão elevada
    - `[3]` Uso de combustível aditivado

---

## Fluxo de Dados

```
prisma/questions.ts  ──► academy.service.ts#seedQuestions()  ──► DB (Question)
                     └──► prisma/seed.ts                      ──► DB (Question)

DB (Question) ──► getSimulado() ──► cache (10 min) ──► shuffle ──► response
```

---

## Sem Migração de Schema

O model `Question` existente é compatível:
- `text: String` ✓
- `category: String` ✓
- `options: String[]` ✓
- `correct: Int` (índice 0-based) ✓

---

## Comportamento do `getSimulado()` após a mudança

```
1. Verifica cache → se hit, shuffle e retorna
2. Se miss → findMany() (todos os 30) → set cache → shuffle → retorna
```

O shuffle em memória garante ordem diferente por request sem custo de SQL.
