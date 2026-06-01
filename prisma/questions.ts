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
      "Metano (CH₄) e vapor d'água",
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
      "Apenas corpos d'água superficiais",
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
    options: ["Bomba de combustível", 'Bateria', "Bomba d'água", 'Embreagem'],
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
