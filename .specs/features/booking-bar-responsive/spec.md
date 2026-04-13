# Booking Bar Responsive Layout Specification

## Context
A barra de agendamento na página de perfil do instrutor (visão do aluno) precisava de ajustes:
1. No formato web (desktop), ela não se adaptava à nova estrutura com o menu lateral fixo (Sidebar).
2. No formato mobile, ela estava sendo sobreposta pelo menu de navegação inferior (`Tabs`), ocultando o botão de contato via WhatsApp.
3. O menu principal (`Tabs`) precisa continuar persistente, ou seja, a barra de agendamento atua como um *overlay* de ação prioritária (Call to Action) ocultando visualmente as abas apenas no perfil do instrutor no mobile, sem remover as abas de outras páginas.

## Requirements

### R-01: Responsive Z-Index (Mobile)
- A barra de agendamento (`fixed bottom-0`) deve ter um `z-index` superior ao do menu de navegação (`Tabs.tsx` que utiliza `z-40`). 
- Definir a barra de agendamento para `z-50`.

### R-02: Desktop Responsiveness (Web)
- A barra não deve sobrepor a sidebar esquerda no desktop.
- Definir classe `md:left-64` para começar após a sidebar.
- Definir layout horizontal (`md:flex-row`) para organizar os botões "Agendar agora" e "Combinar via WhatsApp" lado a lado no formato desktop, com `md:flex-1` para ocuparem o mesmo espaço.

## Success Criteria
- No celular, a barra de agendamento cobre o menu inferior de navegação.
- No desktop, a barra respeita a margem da sidebar esquerda e exibe os botões horizontalmente.
