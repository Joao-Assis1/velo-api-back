# Responsive Layout Specification

## Context
O aplicativo foi migrado recentemente para Next.js, mas o layout foca muito no formato mobile (com menu na parte inferior da tela). Para melhorar a experiência na web, o menu de navegação precisa ser responsivo, fixando-se como uma barra lateral à esquerda em telas maiores. Além disso, as subpáginas precisam de botões de voltar e o menu deve persistir ao longo da navegação, inclusive nessas subpáginas.

## Requirements

### R-01: Responsive Navigation Menu
- Transformar o componente `Tabs.tsx` em um menu responsivo.
- No mobile: manter o menu de abas fixo na base (`bottom-0`).
- No desktop (a partir de `md:`): exibir como barra lateral (`Sidebar`) fixa no lado esquerdo (`left-0`, `h-screen`, `w-64`), com alinhamento vertical dos botões.

### R-02: Persistent Menu
- Atualizar a lógica do arquivo `page.tsx` para garantir que o menu seja exibido em **todas** as telas da aplicação logada (exceto `splash`, `onboarding`, `auth`, e `register`).
- Ocultar o menu em fluxos puramente de autenticação.

### R-03: Page Layout Alignment
- Adicionar um *padding* lateral nas páginas (apenas no desktop) para compensar a barra lateral fixa (`md:pl-64` ou similar).
- Limitar a largura do conteúdo (ex: `max-w-2xl` ou remover limitação no desktop, dependendo de como as telas foram construídas), ajustando o contêiner principal do `page.tsx`.

### R-04: Sub-page Back Buttons
- Incluir ou padronizar um botão de voltar (ícone `ArrowLeft` da `lucide-react`) nos cabeçalhos das subpáginas.
- Subpáginas mapeadas: 
  - `student-personal-data` (Dados Pessoais do Aluno)
  - `instructor-edit-profile` (Editar Perfil do Instrutor)
  - `instructor-vehicle` (Veículo do Instrutor)
  - `instructor-availability` (Disponibilidade do Instrutor já possui, mas garantir padrão)
  - Telas genéricas como pagamentos e configurações.

## Success Criteria
- No redimensionamento para desktop (ex: janela do navegador em 1024px), o menu move para a lateral e o conteúdo se ajusta à direita.
- Ao navegar para "Dados Pessoais" (uma subpágina), o menu de navegação continua visível e clicável, e a página apresenta um botão de voltar para a tela anterior ("Perfil").
- Nenhum menu aparece na tela de Login.
