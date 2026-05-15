# Frontend Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar no projeto `velo-front` (Next.js 16 + React 19 + Tailwind v4) toda a experiência da journey 1ª CNH consumindo os endpoints expostos pelos sub-planos anteriores (Foundation, Validation/Clinics, Pre-Practical Stages, LADV/Lesson Gate, Stripe Migration). Cobre seis novas rotas, três telas existentes repaginadas, seis componentes reutilizáveis, hook `useJourney()` com React Query e migração de cartões/pagamentos para Stripe Elements.

**Architecture:** App Router Next.js (`src/app/app/student/...`). Estado de jornada via `useJourney()` (React Query, sem store global). Componentes em `src/components/journey/`. Mensagens de bloqueio em `src/i18n/journeyBlockerMessages.ts`. Pagamento via `@stripe/stripe-js` + `@stripe/react-stripe-js` (PaymentElement + SetupIntent). Upload de documentos via `<DocumentUploader />` (drag-and-drop nativo + multipart) com fallback de entrada manual. Mobile-first (target 360 px).

**Tech Stack:** Next.js 16, React 19, Tailwind v4, shadcn v4 (Stepper, Card, Alert, Dropzone), `@base-ui/react`, `@tanstack/react-query` (já instalado), `@stripe/stripe-js` + `@stripe/react-stripe-js` (novos), `date-fns`, `lucide-react`, Vitest + Testing Library, `zod` (já instalado), `react-hook-form` (novo).

**Spec de referência:** `docs/superpowers/specs/2026-05-14-brazilian-license-system-design.md` — Seção 10 inteira, com integração às seções 6, 7, 8 e 9.

**Critério de pronto:**

- Aluno seed `student-registered@email.com` faz login → vê `NextStepCard` apontando "Inicie o curso teórico", consegue navegar para `/student/theory-course`, clicar em "Já comecei" e ver o stage avançar.
- Aluno seed `student-ladv@email.com` consegue agendar aula em `/student/schedule` (banner verde); `student-renach@email.com` vê banner vermelho "LADV pendente" e botão desabilitado.
- Aluno seed `student-ready@email.com` vê estado `READY_FOR_PRACTICAL_EXAM` no `JourneyStepper` com badge "Pronto para o exame DETRAN".
- `/student/payments` adiciona cartão via Stripe Elements (SetupIntent) e usa o cartão para pagar aulas.
- `/student/instructors` mostra badge "DETRAN-MS credenciado" e oculta instrutores com `credentialStatus != APPROVED`.
- `npm run build` e `npm test` (Vitest) verdes; smoke E2E manual roteirizado em `docs/journey-smoke-test.md`.

---

## File Structure

**Created (29 arquivos):**

- `src/hooks/useJourney.ts` — hook React Query principal
- `src/hooks/useStripe.ts` — provider/hook do Stripe Elements
- `src/hooks/useClinicCatalog.ts` — listagem de clínicas
- `src/i18n/journeyBlockerMessages.ts` — tradução de códigos de bloqueio
- `src/lib/api/journey.ts` — wrappers tipados dos endpoints `/journey/*`
- `src/lib/api/stages.ts` — wrappers de RENACH/medical/psychological/theory-official/ladv
- `src/lib/api/clinics.ts` — wrappers `/clinics`
- `src/lib/api/validation.ts` — wrappers `/validation/*`
- `src/lib/api/payments-stripe.ts` — wrappers do novo módulo Stripe
- `src/lib/stripe.ts` — `getStripe()` singleton com `loadStripe`
- `src/components/journey/JourneyStepper.tsx`
- `src/components/journey/NextStepCard.tsx`
- `src/components/journey/DocumentUploader.tsx`
- `src/components/journey/ClinicCard.tsx`
- `src/components/journey/ValidatedField.tsx`
- `src/components/journey/ProtocolPdfDownload.tsx`
- `src/components/journey/JourneyBlockerBanner.tsx`
- `src/components/journey/JourneyStepper.test.tsx`
- `src/components/journey/NextStepCard.test.tsx`
- `src/components/journey/DocumentUploader.test.tsx`
- `src/components/journey/ValidatedField.test.tsx`
- `src/app/app/student/theory-course/page.tsx`
- `src/app/app/student/renach/page.tsx`
- `src/app/app/student/exams/medical/page.tsx`
- `src/app/app/student/exams/psychological/page.tsx`
- `src/app/app/student/exams/theory-official/page.tsx`
- `src/app/app/student/ladv/page.tsx`
- `src/app/app/student/dispute/[lessonId]/page.tsx` (extensão da rota existente)
- `docs/journey-smoke-test.md` — roteiro manual de smoke

**Modified:**

- `src/app/app/student/dashboard/page.tsx` — embute `<NextStepCard />` no topo
- `src/app/app/student/concierge/page.tsx` — "Minha Jornada" baseada em `useJourney()`
- `src/app/app/student/progress/page.tsx` — stepper visual completo
- `src/app/app/student/schedule/page.tsx` — banner + disable se `canScheduleLessons=false`
- `src/app/app/student/instructors/page.tsx` — badge DETRAN + filtro server-side
- `src/app/app/student/payments/page.tsx` — Stripe Elements + SetupIntent
- `src/components/layout/StudentNav.tsx` (ou equivalente) — adicionar 6 novas entradas
- `src/lib/api-client.ts` — overload para retornar `Response` quando preciso (PDF blob)
- `package.json` — adicionar `@stripe/stripe-js`, `@stripe/react-stripe-js`, `react-hook-form`
- `.env.local.example` — adicionar `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `CLAUDE.md` (raiz `velo-front`) — registrar rotas e componentes da journey

**Backend (velo-api) — nenhuma modificação neste sub-plano.** Todos os endpoints consumidos já foram entregues pelos sub-planos 1–4. Caso falte algo, abrir issue separada.

---

## Task 1: Setup compartilhado (deps, API wrappers, useJourney, blocker messages)

**Files:**

- Modify: `package.json`
- Modify: `.env.local.example`
- Modify: `src/lib/api-client.ts`
- Create: `src/lib/stripe.ts`
- Create: `src/lib/api/journey.ts`
- Create: `src/lib/api/stages.ts`
- Create: `src/lib/api/clinics.ts`
- Create: `src/lib/api/validation.ts`
- Create: `src/lib/api/payments-stripe.ts`
- Create: `src/hooks/useJourney.ts`
- Create: `src/hooks/useStripe.ts`
- Create: `src/hooks/useClinicCatalog.ts`
- Create: `src/i18n/journeyBlockerMessages.ts`

- [ ] **Step 1.1: Instalar dependências**

```bash
cd "D:/velo-front"
npm install @stripe/stripe-js@^5 @stripe/react-stripe-js@^3 react-hook-form@^7
```

Verificar `package.json` resultante: presença de `@stripe/stripe-js`, `@stripe/react-stripe-js` e `react-hook-form` em `dependencies`.

- [ ] **Step 1.2: Adicionar a env pública no `.env.local.example`**

```env
# Stripe (publishable key — pode ser pk_test_... durante MVP)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_changeme
```

- [ ] **Step 1.3: Estender `src/lib/api-client.ts` com helpers tipados**

Substituir o arquivo `src/lib/api-client.ts` por:

```ts
type FetchOptions = RequestInit & { rawResponse?: boolean };

async function resolveAuthHeader(): Promise<Record<string, string>> {
  let token: string | null = null;
  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    token = (await cookies()).get("velo-token")?.value ?? null;
  } else {
    const match = document.cookie.match(/(^|;)\s*velo-token\s*=\s*([^;]+)/);
    token = match ? match[2] : null;
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
    "http://127.0.0.1:3001/api/v1"
  );
}

export async function fetchWrapper<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const url = `${resolveBaseUrl()}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  const auth = await resolveAuthHeader();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...auth,
      ...options.headers,
    },
    cache: options.cache || "no-store",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message ||
        `Erro na requisição: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

export async function fetchBlob(
  endpoint: string,
  options: RequestInit = {},
): Promise<Blob> {
  const url = `${resolveBaseUrl()}${endpoint}`;
  const auth = await resolveAuthHeader();
  const response = await fetch(url, {
    ...options,
    headers: { ...auth, ...options.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Falha ao baixar: ${response.status}`);
  return response.blob();
}
```

- [ ] **Step 1.4: Criar `src/lib/stripe.ts`**

```ts
import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn(
        "[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ausente — Elements ficará indisponível",
      );
    }
    stripePromise = loadStripe(key ?? "");
  }
  return stripePromise;
}
```

- [ ] **Step 1.5: Criar wrappers tipados em `src/lib/api/journey.ts`**

```ts
import { fetchWrapper } from "../api-client";

export type JourneyStage =
  | "REGISTERED"
  | "THEORY_COURSE_IN_PROGRESS"
  | "RENACH_PENDING"
  | "MEDICAL_PENDING"
  | "PSYCH_PENDING"
  | "THEORY_EXAM_PENDING"
  | "AWAITING_LADV_UPLOAD"
  | "LADV_UPLOADED_VALID"
  | "PRACTICAL_IN_PROGRESS"
  | "READY_FOR_PRACTICAL_EXAM";

export type JourneyBlocker = {
  code: string;
  message: string;
  helpUrl?: string;
};

export type JourneyState = {
  stage: JourneyStage;
  completedSteps: JourneyStage[];
  nextStep: JourneyStage | null;
  blockers: JourneyBlocker[];
  progressPct: number;
  canScheduleLessons: boolean;
};

export type TimelineStep = {
  key: JourneyStage;
  label: string;
  status: "completed" | "in_progress" | "blocked" | "upcoming";
  helpUrl?: string;
  blockedReason?: string;
};

type Wrapped<T> = { success: boolean; data: T; message?: string };

export async function getJourneyState(): Promise<JourneyState> {
  const res = await fetchWrapper<Wrapped<JourneyState>>("/journey/me");
  return res.data;
}

export async function getTimeline(): Promise<TimelineStep[]> {
  const res = await fetchWrapper<Wrapped<TimelineStep[]>>("/journey/me/timeline");
  return res.data;
}

export async function declareReadyForExam(): Promise<JourneyState> {
  const res = await fetchWrapper<Wrapped<JourneyState>>(
    "/journey/me/declare-ready-for-exam",
    { method: "POST" },
  );
  return res.data;
}
```

- [ ] **Step 1.6: Criar wrappers em `src/lib/api/stages.ts`**

```ts
import { fetchWrapper, fetchBlob } from "../api-client";

type Wrapped<T> = { success: boolean; data: T; message?: string };

// === Theory course ===
export async function startTheoryCourse() {
  const res = await fetchWrapper<Wrapped<{ stage: string }>>(
    "/students/me/theory-course/start",
    { method: "POST" },
  );
  return res.data;
}

// === RENACH ===
export type RenachStatus = {
  status: "PENDING" | "SCHEDULED" | "DONE";
  renachNumber: string | null;
  biometryDoneAt: string | null;
  ufDetran: string;
};
export type RenachGuide = {
  uf: string;
  detranName: string;
  detranUrl: string;
  instructions: string[];
};

export async function getRenachGuide(uf: string): Promise<RenachGuide> {
  const res = await fetchWrapper<Wrapped<RenachGuide>>(
    `/renach/guide?uf=${encodeURIComponent(uf)}`,
  );
  return res.data;
}

export async function getMyRenach(): Promise<RenachStatus> {
  const res = await fetchWrapper<Wrapped<RenachStatus>>("/renach/me");
  return res.data;
}

export async function submitMyRenach(payload: {
  renachNumber: string;
  ufDetran: string;
  biometryDoneAt: string;
}): Promise<RenachStatus> {
  const res = await fetchWrapper<Wrapped<RenachStatus>>("/renach/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

// === Medical / Psychological ===
export type ClinicExamStatus = {
  scheduledAt: string | null;
  clinicId: string | null;
  laudoUrl: string | null;
  laudoStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
};

export async function getMyMedicalExam(): Promise<ClinicExamStatus> {
  const res = await fetchWrapper<Wrapped<ClinicExamStatus>>("/medical-exam/me");
  return res.data;
}
export async function scheduleMedicalExam(payload: {
  clinicId: string;
  scheduledAt: string;
}) {
  const res = await fetchWrapper<Wrapped<ClinicExamStatus>>(
    "/medical-exam/me/schedule",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}
export async function uploadMedicalLaudo(file: File): Promise<ClinicExamStatus> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWrapper<Wrapped<ClinicExamStatus>>(
    "/medical-exam/me/laudo",
    { method: "POST", body: form },
  );
  return res.data;
}
export async function downloadMedicalProtocol(): Promise<Blob> {
  return fetchBlob("/medical-exam/me/protocol.pdf");
}

export async function getMyPsychExam(): Promise<ClinicExamStatus> {
  const res = await fetchWrapper<Wrapped<ClinicExamStatus>>(
    "/psychological-exam/me",
  );
  return res.data;
}
export async function schedulePsychExam(payload: {
  clinicId: string;
  scheduledAt: string;
}) {
  const res = await fetchWrapper<Wrapped<ClinicExamStatus>>(
    "/psychological-exam/me/schedule",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}
export async function uploadPsychLaudo(file: File): Promise<ClinicExamStatus> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWrapper<Wrapped<ClinicExamStatus>>(
    "/psychological-exam/me/laudo",
    { method: "POST", body: form },
  );
  return res.data;
}
export async function downloadPsychProtocol(): Promise<Blob> {
  return fetchBlob("/psychological-exam/me/protocol.pdf");
}

// === Official theory exam ===
export type OfficialTheoryStatus = {
  declaredAt: string | null;
  proofUrl: string | null;
  approved: boolean | null;
};
export async function getMyOfficialTheory(): Promise<OfficialTheoryStatus> {
  const res = await fetchWrapper<Wrapped<OfficialTheoryStatus>>(
    "/theory-exam-official/me",
  );
  return res.data;
}
export async function declareOfficialTheory(payload: {
  approved: boolean;
  proofUrl?: string;
}): Promise<OfficialTheoryStatus> {
  const res = await fetchWrapper<Wrapped<OfficialTheoryStatus>>(
    "/theory-exam-official/me/declare",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}
export async function uploadOfficialTheoryProof(
  file: File,
): Promise<OfficialTheoryStatus> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWrapper<Wrapped<OfficialTheoryStatus>>(
    "/theory-exam-official/me/proof",
    { method: "POST", body: form },
  );
  return res.data;
}

// === LADV ===
export type LadvStatus = {
  ladvNumber: string | null;
  ladvIssuedAt: string | null;
  ladvValidUntil: string | null;
  ladvOcrStatus: "PASS" | "NEEDS_REVIEW" | "FAIL" | null;
  ladvOcrConfidence: number | null;
};
export type LadvGuide = {
  uf: string;
  instructions: string[];
};

export async function getLadvGuide(uf: string): Promise<LadvGuide> {
  const res = await fetchWrapper<Wrapped<LadvGuide>>(
    `/ladv/guide?uf=${encodeURIComponent(uf)}`,
  );
  return res.data;
}
export async function getMyLadv(): Promise<LadvStatus> {
  const res = await fetchWrapper<Wrapped<LadvStatus>>("/ladv/me");
  return res.data;
}
export async function uploadLadv(file: File): Promise<LadvStatus> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWrapper<Wrapped<LadvStatus>>("/ladv/me/upload", {
    method: "POST",
    body: form,
  });
  return res.data;
}
export async function submitLadvManual(payload: {
  ladvNumber: string;
  ladvIssuedAt: string;
  ladvValidUntil: string;
}): Promise<LadvStatus> {
  const res = await fetchWrapper<Wrapped<LadvStatus>>("/ladv/me/manual", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
```

- [ ] **Step 1.7: Criar `src/lib/api/clinics.ts`**

```ts
import { fetchWrapper } from "../api-client";

export type Clinic = {
  id: string;
  name: string;
  type: "MEDICAL" | "PSYCHOLOGICAL";
  city: string;
  uf: string;
  address: string;
  phone: string | null;
  active: boolean;
};

type Wrapped<T> = { success: boolean; data: T; message?: string };

export async function listClinics(params: {
  type: "MEDICAL" | "PSYCHOLOGICAL";
  uf?: string;
  city?: string;
}): Promise<Clinic[]> {
  const qs = new URLSearchParams();
  qs.set("type", params.type);
  if (params.uf) qs.set("uf", params.uf);
  if (params.city) qs.set("city", params.city);
  const res = await fetchWrapper<Wrapped<Clinic[]>>(`/clinics?${qs}`);
  return res.data;
}
```

- [ ] **Step 1.8: Criar `src/lib/api/validation.ts`**

```ts
import { fetchWrapper } from "../api-client";

type Wrapped<T> = { success: boolean; data: T; message?: string };

export async function validateCpf(cpf: string): Promise<{ valid: boolean }> {
  const res = await fetchWrapper<Wrapped<{ valid: boolean }>>(
    "/validation/cpf",
    { method: "POST", body: JSON.stringify({ cpf }) },
  );
  return res.data;
}

export type CepResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};
export async function validateCep(cep: string): Promise<CepResult | null> {
  const res = await fetchWrapper<Wrapped<CepResult | null>>(
    `/validation/cep/${cep.replace(/\D/g, "")}`,
  );
  return res.data;
}

export async function validateCnh(cnh: string): Promise<{ valid: boolean }> {
  const res = await fetchWrapper<Wrapped<{ valid: boolean }>>(
    "/validation/cnh",
    { method: "POST", body: JSON.stringify({ cnh }) },
  );
  return res.data;
}
```

- [ ] **Step 1.9: Criar `src/lib/api/payments-stripe.ts`**

Rotas mapeadas com base no spec (Seção 6) e no backend plan (stripe-migration Task 3):

- Listagem e gestão de cartões → módulo `payment-methods` existente (adaptado para Stripe)
- SetupIntent e cobrança → novo módulo `payments-stripe`

```ts
import { fetchWrapper } from "../api-client";

type Wrapped<T> = { success: boolean; data: T; message?: string };

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
};

// GET /payment-methods — módulo existente adaptado para Stripe
export async function listCards(): Promise<SavedCard[]> {
  const res = await fetchWrapper<Wrapped<SavedCard[]>>("/payment-methods");
  return res.data;
}

// POST /payments-stripe/setup-intent — cria SetupIntent para captura segura do cartão
export async function createSetupIntent(): Promise<{ clientSecret: string }> {
  const res = await fetchWrapper<Wrapped<{ clientSecret: string }>>(
    "/payments-stripe/setup-intent",
    { method: "POST" },
  );
  return res.data;
}

// POST /payments-stripe/payment-methods — vincula stripePaymentMethodId após SetupIntent confirmado
export async function attachCard(
  stripePaymentMethodId: string,
): Promise<SavedCard> {
  const res = await fetchWrapper<Wrapped<SavedCard>>(
    "/payments-stripe/payment-methods",
    { method: "POST", body: JSON.stringify({ stripePaymentMethodId }) },
  );
  return res.data;
}

// DELETE /payment-methods/:id — módulo existente
export async function deleteCard(id: string): Promise<void> {
  await fetchWrapper<Wrapped<unknown>>(`/payment-methods/${id}`, {
    method: "DELETE",
  });
}

// PATCH /payment-methods/:id/default — módulo existente
export async function setDefaultCard(id: string): Promise<void> {
  await fetchWrapper<Wrapped<unknown>>(`/payment-methods/${id}/default`, {
    method: "PATCH",
  });
}

export type LessonChargeResult = {
  paymentId: string;
  clientSecret: string;
};

// POST /payments-stripe/charge — cria PaymentIntent off-session, status→HELD
export async function createLessonCharge(
  lessonId: string,
  paymentMethodId: string,
): Promise<LessonChargeResult> {
  const res = await fetchWrapper<Wrapped<LessonChargeResult>>(
    "/payments-stripe/charge",
    { method: "POST", body: JSON.stringify({ lessonId, paymentMethodId }) },
  );
  return res.data;
}
```

- [ ] **Step 1.10: Criar hook `src/hooks/useJourney.ts`**

```tsx
"use client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getJourneyState,
  getTimeline,
  declareReadyForExam,
  JourneyState,
  TimelineStep,
} from "@/lib/api/journey";

const QK = {
  state: ["journey", "me"] as const,
  timeline: ["journey", "me", "timeline"] as const,
};

export function useJourney() {
  return useQuery<JourneyState>({
    queryKey: QK.state,
    queryFn: getJourneyState,
    staleTime: 30_000,
  });
}

export function useJourneyTimeline() {
  return useQuery<TimelineStep[]>({
    queryKey: QK.timeline,
    queryFn: getTimeline,
    staleTime: 30_000,
  });
}

export function useDeclareReadyForExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: declareReadyForExam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journey"] });
    },
  });
}

export function useInvalidateJourney() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["journey"] });
}
```

- [ ] **Step 1.11: Criar hook `src/hooks/useStripe.ts`**

```tsx
"use client";
import { ReactNode, useMemo } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

export function StripeProvider({
  clientSecret,
  children,
}: {
  clientSecret?: string;
  children: ReactNode;
}) {
  const stripePromise = useMemo(() => getStripe(), []);
  const options = clientSecret
    ? { clientSecret, appearance: { theme: "stripe" as const } }
    : undefined;
  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
```

- [ ] **Step 1.12: Criar hook `src/hooks/useClinicCatalog.ts`**

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { listClinics, Clinic } from "@/lib/api/clinics";

export function useClinicCatalog(
  type: "MEDICAL" | "PSYCHOLOGICAL",
  uf: string = "MS",
  city: string = "Campo Grande",
) {
  return useQuery<Clinic[]>({
    queryKey: ["clinics", type, uf, city],
    queryFn: () => listClinics({ type, uf, city }),
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 1.13: Criar `src/i18n/journeyBlockerMessages.ts`**

```ts
export const journeyBlockerMessages: Record<
  string,
  { title: string; description: string; ctaLabel?: string; ctaHref?: string }
> = {
  REGISTERED: {
    title: "Termine o cadastro para começar",
    description: "Confirme seus dados pessoais antes de iniciar a journey.",
    ctaLabel: "Completar perfil",
    ctaHref: "/app/student/profile",
  },
  THEORY_COURSE_PENDING: {
    title: "Inicie o curso teórico",
    description:
      "Faça o curso EAD pelo app oficial CNH do Brasil. Depois volte e clique em 'Já comecei'.",
    ctaLabel: "Ir para curso teórico",
    ctaHref: "/app/student/theory-course",
  },
  RENACH_PENDING: {
    title: "Abra seu processo no DETRAN",
    description:
      "Compareça à unidade DETRAN-MS para abertura do RENACH e biometria.",
    ctaLabel: "Como abrir o RENACH",
    ctaHref: "/app/student/renach",
  },
  MEDICAL_PENDING: {
    title: "Exame médico pendente",
    description: "Escolha uma clínica conveniada e envie o laudo APTO.",
    ctaLabel: "Agendar exame médico",
    ctaHref: "/app/student/exams/medical",
  },
  PSYCH_PENDING: {
    title: "Exame psicológico pendente",
    description: "Escolha uma clínica conveniada e envie o laudo APTO.",
    ctaLabel: "Agendar exame psicológico",
    ctaHref: "/app/student/exams/psychological",
  },
  THEORY_EXAM_PENDING: {
    title: "Faça o exame teórico oficial no DETRAN",
    description:
      "Após aprovação, volte e declare o resultado para liberar a LADV.",
    ctaLabel: "Declarar exame teórico",
    ctaHref: "/app/student/exams/theory-official",
  },
  AWAITING_LADV_UPLOAD: {
    title: "Envie sua LADV",
    description:
      "Faça upload da Licença de Aprendizagem (LADV) emitida pelo DETRAN para liberar aulas práticas.",
    ctaLabel: "Enviar LADV",
    ctaHref: "/app/student/ladv",
  },
  LADV_EXPIRED: {
    title: "Sua LADV venceu",
    description:
      "Reemita a LADV no DETRAN-MS e faça novo upload para voltar a agendar aulas.",
    ctaLabel: "Reenviar LADV",
    ctaHref: "/app/student/ladv",
  },
  INSTRUCTOR_NOT_CREDENTIALED: {
    title: "Instrutor sem credencial DETRAN válida",
    description:
      "Selecione outro instrutor — apenas instrutores credenciados podem ministrar aulas oficiais.",
    ctaLabel: "Trocar instrutor",
    ctaHref: "/app/student/instructors",
  },
  MINIMUM_LEGAL_NOT_MET: {
    title: "Você ainda não cumpriu as 2h de aulas práticas",
    description:
      "Conclua pelo menos duas aulas com biometria completa para se declarar pronto.",
    ctaLabel: "Agendar mais aulas",
    ctaHref: "/app/student/schedule",
  },
};

export function resolveBlockerMessage(code: string) {
  return (
    journeyBlockerMessages[code] ?? {
      title: "Há uma pendência na sua jornada",
      description: code,
    }
  );
}
```

- [ ] **Step 1.14: Commit**

```bash
git add package.json package-lock.json .env.local.example src/lib src/hooks src/i18n
git commit -m "adiciona(journey-front): setup compartilhado (api wrappers, hooks, Stripe, blocker messages)"
```

---

## Task 2: Componentes reutilizáveis em `src/components/journey/` (TDD)

**Files:**

- Create: `src/components/journey/JourneyStepper.tsx` (+ `.test.tsx`)
- Create: `src/components/journey/NextStepCard.tsx` (+ `.test.tsx`)
- Create: `src/components/journey/DocumentUploader.tsx` (+ `.test.tsx`)
- Create: `src/components/journey/ClinicCard.tsx`
- Create: `src/components/journey/ValidatedField.tsx` (+ `.test.tsx`)
- Create: `src/components/journey/ProtocolPdfDownload.tsx`
- Create: `src/components/journey/JourneyBlockerBanner.tsx`

- [ ] **Step 2.1: Escrever testes (RED) — `JourneyStepper.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { JourneyStepper } from "./JourneyStepper";
import type { TimelineStep } from "@/lib/api/journey";

const steps: TimelineStep[] = [
  { key: "REGISTERED", label: "Cadastro", status: "completed" },
  {
    key: "THEORY_COURSE_IN_PROGRESS",
    label: "Curso teórico",
    status: "in_progress",
  },
  { key: "RENACH_PENDING", label: "RENACH", status: "upcoming" },
];

describe("JourneyStepper", () => {
  it("renderiza um nó por step", () => {
    render(<JourneyStepper steps={steps} />);
    expect(screen.getByText("Cadastro")).toBeInTheDocument();
    expect(screen.getByText("Curso teórico")).toBeInTheDocument();
    expect(screen.getByText("RENACH")).toBeInTheDocument();
  });

  it("marca step concluído com aria-current=false e completed", () => {
    render(<JourneyStepper steps={steps} />);
    const completed = screen.getByTestId("step-REGISTERED");
    expect(completed.getAttribute("data-status")).toBe("completed");
  });

  it("marca step in_progress como aria-current", () => {
    render(<JourneyStepper steps={steps} />);
    const current = screen.getByTestId("step-THEORY_COURSE_IN_PROGRESS");
    expect(current.getAttribute("aria-current")).toBe("step");
  });
});
```

- [ ] **Step 2.2: Implementar `JourneyStepper.tsx` (GREEN)**

```tsx
"use client";
import { Check, CircleDashed, Clock, AlertOctagon } from "lucide-react";
import type { TimelineStep } from "@/lib/api/journey";
import { cn } from "@/lib/utils";

const icons = {
  completed: Check,
  in_progress: Clock,
  upcoming: CircleDashed,
  blocked: AlertOctagon,
} as const;

const tones = {
  completed: "bg-emerald-500 text-white border-emerald-500",
  in_progress: "bg-blue-500 text-white border-blue-500 animate-pulse",
  upcoming: "bg-zinc-100 text-zinc-500 border-zinc-300",
  blocked: "bg-rose-500 text-white border-rose-500",
} as const;

export function JourneyStepper({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-2">
      {steps.map((s, idx) => {
        const Icon = icons[s.status];
        return (
          <li
            key={s.key}
            data-testid={`step-${s.key}`}
            data-status={s.status}
            aria-current={s.status === "in_progress" ? "step" : undefined}
            className="flex flex-1 items-center gap-3 md:flex-col md:gap-1 md:text-center"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                tones[s.status],
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="flex flex-col md:items-center">
              <span className="text-sm font-medium leading-tight">
                {s.label}
              </span>
              {s.status === "blocked" && s.blockedReason && (
                <span className="text-xs text-rose-600">{s.blockedReason}</span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div
                aria-hidden
                className="hidden h-px flex-1 bg-zinc-200 md:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2.3: Escrever testes para `NextStepCard`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextStepCard } from "./NextStepCard";

describe("NextStepCard", () => {
  it("renderiza título e descrição para THEORY_COURSE_PENDING", () => {
    render(<NextStepCard blockers={[{ code: "THEORY_COURSE_PENDING", message: "" }]} />);
    expect(screen.getByText(/Inicie o curso teórico/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ir para curso teórico/i }),
    ).toHaveAttribute("href", "/app/student/theory-course");
  });

  it("renderiza estado terminal quando não há blockers", () => {
    render(<NextStepCard blockers={[]} stage="READY_FOR_PRACTICAL_EXAM" />);
    expect(
      screen.getByText(/Pronto para o exame DETRAN/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2.4: Implementar `NextStepCard.tsx`**

```tsx
"use client";
import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import type { JourneyBlocker, JourneyStage } from "@/lib/api/journey";
import { resolveBlockerMessage } from "@/i18n/journeyBlockerMessages";
import { Button } from "@/components/ui/button";

export function NextStepCard({
  blockers,
  stage,
}: {
  blockers: JourneyBlocker[];
  stage?: JourneyStage;
}) {
  if (!blockers.length && stage === "READY_FOR_PRACTICAL_EXAM") {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5">
        <div className="flex items-center gap-3">
          <PartyPopper className="h-6 w-6 text-emerald-600" aria-hidden />
          <div>
            <h3 className="font-semibold text-emerald-900">
              Pronto para o exame DETRAN
            </h3>
            <p className="text-sm text-emerald-800">
              Marque seu exame prático oficial pelo portal DETRAN-MS.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const first = blockers[0];
  if (!first) return null;
  const msg = resolveBlockerMessage(first.code);

  return (
    <div className="rounded-xl border border-blue-300 bg-blue-50 p-5">
      <h3 className="font-semibold text-blue-900">{msg.title}</h3>
      <p className="mt-1 text-sm text-blue-800">{msg.description}</p>
      {msg.ctaHref && (
        <Button asChild className="mt-3" size="sm">
          <Link href={msg.ctaHref}>
            {msg.ctaLabel ?? "Continuar"}{" "}
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2.5: Escrever testes para `DocumentUploader`**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DocumentUploader } from "./DocumentUploader";

describe("DocumentUploader", () => {
  it("rejeita arquivo > 10 MB", async () => {
    const onFile = vi.fn();
    render(<DocumentUploader onFile={onFile} label="Enviar laudo" />);
    const input = screen.getByLabelText(/Enviar laudo/i) as HTMLInputElement;
    const big = new File(["x".repeat(11 * 1024 * 1024)], "big.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByText(/Arquivo maior que 10 MB/i)).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  it("rejeita mime inválido", async () => {
    const onFile = vi.fn();
    render(<DocumentUploader onFile={onFile} label="Enviar laudo" />);
    const input = screen.getByLabelText(/Enviar laudo/i) as HTMLInputElement;
    const txt = new File(["x"], "doc.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [txt] } });
    expect(
      await screen.findByText(/Tipo inválido/i),
    ).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  it("dispara onFile para PDF válido", async () => {
    const onFile = vi.fn();
    render(<DocumentUploader onFile={onFile} label="Enviar laudo" />);
    const input = screen.getByLabelText(/Enviar laudo/i) as HTMLInputElement;
    const ok = new File(["x"], "ok.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [ok] } });
    expect(onFile).toHaveBeenCalledWith(ok);
  });
});
```

- [ ] **Step 2.6: Implementar `DocumentUploader.tsx`**

```tsx
"use client";
import { useId, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];

export function DocumentUploader({
  onFile,
  label = "Selecionar arquivo",
  hint = "PDF, JPG ou PNG até 10 MB",
  disabled = false,
}: {
  onFile: (file: File) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState(false);

  function validate(file: File): string | null {
    if (file.size > MAX_BYTES) return "Arquivo maior que 10 MB";
    if (!ALLOWED.includes(file.type)) return "Tipo inválido (use PDF, JPG ou PNG)";
    return null;
  }

  function handle(file: File | null) {
    if (!file) return;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onFile(file);
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed p-6 text-center transition",
        hover ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-white",
        disabled && "opacity-50 pointer-events-none",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        handle(e.dataTransfer.files[0] ?? null);
      }}
    >
      <UploadCloud className="mx-auto mb-2 h-8 w-8 text-zinc-500" aria-hidden />
      <label
        htmlFor={id}
        className="cursor-pointer text-sm font-medium text-blue-700 underline"
      >
        {label}
      </label>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2.7: Implementar `ClinicCard.tsx`**

```tsx
"use client";
import { MapPin, Phone } from "lucide-react";
import type { Clinic } from "@/lib/api/clinics";
import { Button } from "@/components/ui/button";

export function ClinicCard({
  clinic,
  onSelect,
  selected = false,
}: {
  clinic: Clinic;
  onSelect: (c: Clinic) => void;
  selected?: boolean;
}) {
  return (
    <article
      data-testid={`clinic-${clinic.id}`}
      className={`rounded-xl border p-4 transition ${
        selected ? "border-blue-500 bg-blue-50" : "border-zinc-200 bg-white"
      }`}
    >
      <h3 className="text-base font-semibold">{clinic.name}</h3>
      <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
        <MapPin className="h-4 w-4" aria-hidden /> {clinic.address}, {clinic.city}/
        {clinic.uf}
      </p>
      {clinic.phone && (
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
          <Phone className="h-4 w-4" aria-hidden /> {clinic.phone}
        </p>
      )}
      <Button
        className="mt-3 w-full"
        variant={selected ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(clinic)}
      >
        {selected ? "Selecionada" : "Selecionar"}
      </Button>
    </article>
  );
}
```

- [ ] **Step 2.8: Escrever testes para `ValidatedField`**

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ValidatedField } from "./ValidatedField";

describe("ValidatedField", () => {
  it("chama validate onBlur e exibe erro", async () => {
    const validate = vi.fn().mockResolvedValue("CPF inválido");
    render(
      <ValidatedField
        name="cpf"
        label="CPF"
        validate={validate}
      />,
    );
    const input = screen.getByLabelText(/CPF/i);
    fireEvent.change(input, { target: { value: "111.111.111-11" } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(screen.getByText(/CPF inválido/)).toBeInTheDocument(),
    );
  });

  it("não exibe erro quando validate retorna null", async () => {
    const validate = vi.fn().mockResolvedValue(null);
    render(
      <ValidatedField
        name="cpf"
        label="CPF"
        validate={validate}
      />,
    );
    const input = screen.getByLabelText(/CPF/i);
    fireEvent.change(input, { target: { value: "529.982.247-25" } });
    fireEvent.blur(input);
    await waitFor(() => expect(validate).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2.9: Implementar `ValidatedField.tsx`**

```tsx
"use client";
import { useId, useState, ChangeEvent, FocusEvent, InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onBlur"> & {
  name: string;
  label: string;
  validate?: (value: string) => Promise<string | null>;
  onValidatedChange?: (value: string, isValid: boolean) => void;
};

export function ValidatedField({
  name,
  label,
  validate,
  onValidatedChange,
  defaultValue = "",
  ...rest
}: Props) {
  const id = useId();
  const [value, setValue] = useState<string>(String(defaultValue));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleBlur(_: FocusEvent<HTMLInputElement>) {
    if (!validate) return;
    setBusy(true);
    try {
      const err = await validate(value);
      setError(err);
      onValidatedChange?.(value, err === null);
    } finally {
      setBusy(false);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    if (error) setError(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        {...rest}
      />
      {busy && <span className="text-xs text-zinc-500">Validando…</span>}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2.10: Implementar `ProtocolPdfDownload.tsx`**

```tsx
"use client";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProtocolPdfDownload({
  fetcher,
  filename = "protocolo.pdf",
  label = "Baixar protocolo PDF",
  disabled = false,
}: {
  fetcher: () => Promise<Blob>;
  filename?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const blob = await fetcher();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={download} disabled={busy || disabled}>
      <FileDown className="mr-1 h-4 w-4" aria-hidden />
      {busy ? "Gerando…" : label}
    </Button>
  );
}
```

- [ ] **Step 2.11: Implementar `JourneyBlockerBanner.tsx`**

```tsx
"use client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { JourneyBlocker } from "@/lib/api/journey";
import { resolveBlockerMessage } from "@/i18n/journeyBlockerMessages";

export function JourneyBlockerBanner({
  blockers,
}: {
  blockers: JourneyBlocker[];
}) {
  if (!blockers.length) return null;
  const first = blockers[0];
  const msg = resolveBlockerMessage(first.code);
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3"
    >
      <AlertTriangle
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
        aria-hidden
      />
      <div className="text-sm">
        <p className="font-semibold text-amber-900">{msg.title}</p>
        <p className="text-amber-800">{msg.description}</p>
        {msg.ctaHref && (
          <Link
            href={msg.ctaHref}
            className="mt-1 inline-block font-medium text-amber-900 underline"
          >
            {msg.ctaLabel ?? "Resolver"}
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2.12: Rodar testes (esperado tudo verde)**

```bash
npm test -- src/components/journey
```

Esperado: `PASS — Tests: 8 passed` (3 stepper + 2 nextstep + 3 uploader + 2 validated = 10; ajuste se houver casos a mais).

- [ ] **Step 2.13: Commit**

```bash
git add src/components/journey
git commit -m "adiciona(journey-front): componentes reutilizáveis (stepper, next-step, uploader, clinic-card, validated-field, protocol-pdf, blocker-banner)"
```

---

## Task 3: Refactor das telas existentes — Dashboard, Concierge, Progress

**Files:**

- Modify: `src/app/app/student/dashboard/page.tsx`
- Modify: `src/app/app/student/concierge/page.tsx`
- Modify: `src/app/app/student/progress/page.tsx`

- [ ] **Step 3.1: Embutir `<NextStepCard />` no topo do dashboard**

Substituir o início do `src/app/app/student/dashboard/page.tsx` adicionando a chamada do hook e o card de próxima ação antes do bloco KPI atual:

```tsx
"use client";
import { NextStepCard } from "@/components/journey/NextStepCard";
import { useJourney } from "@/hooks/useJourney";
// ...demais imports existentes

export default function DashboardPage() {
  const { data: journey, isLoading } = useJourney();

  return (
    <div className="flex flex-col gap-6">
      {!isLoading && journey && (
        <NextStepCard blockers={journey.blockers} stage={journey.stage} />
      )}
      {/* resto do dashboard preservado */}
    </div>
  );
}
```

Caso o arquivo já tenha JSX complexo, manter o restante intocado — apenas envelopar com o container `flex flex-col gap-6` e inserir o `<NextStepCard />` como primeiro filho.

- [ ] **Step 3.2: Reescrever `src/app/app/student/concierge/page.tsx` como "Minha Jornada"**

```tsx
"use client";
import { useJourney, useJourneyTimeline } from "@/hooks/useJourney";
import { JourneyStepper } from "@/components/journey/JourneyStepper";
import { NextStepCard } from "@/components/journey/NextStepCard";
import { JourneyBlockerBanner } from "@/components/journey/JourneyBlockerBanner";

export default function ConciergePage() {
  const state = useJourney();
  const timeline = useJourneyTimeline();

  if (state.isLoading || timeline.isLoading) {
    return <p className="p-4 text-sm text-zinc-500">Carregando jornada…</p>;
  }
  if (state.isError || timeline.isError) {
    return (
      <p className="p-4 text-sm text-rose-600">
        Não foi possível carregar sua jornada. Tente novamente.
      </p>
    );
  }
  const journey = state.data!;
  const steps = timeline.data!;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold">Minha Jornada</h1>
        <p className="text-sm text-zinc-600">
          Etapa atual: <strong>{journey.stage}</strong> · Progresso:{" "}
          {journey.progressPct}%
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <JourneyStepper steps={steps} />
      </section>

      <JourneyBlockerBanner blockers={journey.blockers} />
      <NextStepCard blockers={journey.blockers} stage={journey.stage} />
    </main>
  );
}
```

- [ ] **Step 3.3: Reescrever `src/app/app/student/progress/page.tsx` como stepper visual completo**

```tsx
"use client";
import { useJourneyTimeline, useJourney, useDeclareReadyForExam } from "@/hooks/useJourney";
import { JourneyStepper } from "@/components/journey/JourneyStepper";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ProgressPage() {
  const state = useJourney();
  const timeline = useJourneyTimeline();
  const declare = useDeclareReadyForExam();
  const [error, setError] = useState<string | null>(null);

  if (state.isLoading || timeline.isLoading) {
    return <p className="p-4 text-sm text-zinc-500">Carregando…</p>;
  }
  const journey = state.data!;
  const steps = timeline.data!;
  const canDeclare =
    journey.stage === "PRACTICAL_IN_PROGRESS" &&
    journey.blockers.every((b) => b.code !== "MINIMUM_LEGAL_NOT_MET");

  async function handleDeclare() {
    setError(null);
    try {
      await declare.mutateAsync();
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível declarar.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold">Progresso da 1ª CNH</h1>
        <p className="text-sm text-zinc-600">
          Acompanhe cada etapa exigida pela Resolução CONTRAN 1.020/2025.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <JourneyStepper steps={steps} />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Declarar pronto para o exame</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Quando cumprir as 2 horas mínimas de aulas práticas válidas, declare
          que está pronto para marcar o exame oficial no DETRAN-MS.
        </p>
        <Button
          className="mt-3"
          onClick={handleDeclare}
          disabled={!canDeclare || declare.isPending}
        >
          {declare.isPending ? "Enviando…" : "Estou pronto para o exame"}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-600">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 3.4: Commit**

```bash
git add src/app/app/student/dashboard src/app/app/student/concierge src/app/app/student/progress
git commit -m "ajusta(journey-front): dashboard, concierge e progress consomem useJourney"
```

---

## Task 4: Rota `/student/theory-course`

**Files:**

- Create: `src/app/app/student/theory-course/page.tsx`

- [ ] **Step 4.1: Implementar a página**

```tsx
"use client";
import { useState } from "react";
import { useJourney, useInvalidateJourney } from "@/hooks/useJourney";
import { startTheoryCourse } from "@/lib/api/stages";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen } from "lucide-react";

const APP_CNH_BRASIL = "https://www.gov.br/transportes/cnh-do-brasil";

export default function TheoryCoursePage() {
  const journey = useJourney();
  const invalidate = useInvalidateJourney();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyStarted =
    journey.data?.stage &&
    journey.data.stage !== "REGISTERED" &&
    journey.data.stage !== "THEORY_COURSE_IN_PROGRESS";

  const started = journey.data?.stage === "THEORY_COURSE_IN_PROGRESS";

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      await startTheoryCourse();
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao registrar início do curso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <BookOpen className="mt-1 h-7 w-7 text-blue-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Curso teórico oficial</h1>
          <p className="text-sm text-zinc-600">
            Conforme Resolução CONTRAN 1.020/2025, o curso teórico é feito
            integralmente pelo app oficial CNH do Brasil (gov.br/MinTrans).
          </p>
        </div>
      </header>

      <ol className="ml-5 list-decimal space-y-2 text-sm text-zinc-800">
        <li>Baixe o app oficial CNH do Brasil na loja do seu celular.</li>
        <li>Faça login com sua conta gov.br nível ouro/prata.</li>
        <li>Conclua os módulos teóricos no próprio app (45 horas mínimas).</li>
        <li>
          Ao terminar, volte aqui e clique em <strong>"Já comecei"</strong> para
          liberar a próxima etapa.
        </li>
      </ol>

      <a
        href={APP_CNH_BRASIL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline"
      >
        Saiba mais sobre o app oficial{" "}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {started ? (
          <p className="text-sm text-emerald-700">
            Você marcou o curso teórico como iniciado. Próximo passo: abrir o
            processo RENACH no DETRAN-MS.
          </p>
        ) : alreadyStarted ? (
          <p className="text-sm text-zinc-600">
            Você já avançou desta etapa.
          </p>
        ) : (
          <Button onClick={handleStart} disabled={busy}>
            {busy ? "Registrando…" : "Já comecei o curso teórico"}
          </Button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4.2: Commit**

```bash
git add src/app/app/student/theory-course
git commit -m "adiciona(journey-front): rota theory-course"
```

---

## Task 5: Rota `/student/renach`

**Files:**

- Create: `src/app/app/student/renach/page.tsx`

- [ ] **Step 5.1: Implementar a página**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useJourney, useInvalidateJourney } from "@/hooks/useJourney";
import { getMyRenach, getRenachGuide, submitMyRenach, RenachGuide, RenachStatus } from "@/lib/api/stages";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";

type FormShape = {
  renachNumber: string;
  ufDetran: string;
  biometryDoneAt: string;
};

export default function RenachPage() {
  const journey = useJourney();
  const invalidate = useInvalidateJourney();
  const [guide, setGuide] = useState<RenachGuide | null>(null);
  const [status, setStatus] = useState<RenachStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormShape>({
    defaultValues: { ufDetran: "MS" },
  });

  useEffect(() => {
    let cancel = false;
    Promise.all([getRenachGuide("MS"), getMyRenach()])
      .then(([g, s]) => {
        if (!cancel) {
          setGuide(g);
          setStatus(s);
        }
      })
      .catch((e) => !cancel && setError(e?.message ?? "Erro ao carregar."));
    return () => {
      cancel = true;
    };
  }, []);

  async function onSubmit(values: FormShape) {
    setBusy(true);
    setError(null);
    try {
      const updated = await submitMyRenach(values);
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao enviar dados do RENACH.");
    } finally {
      setBusy(false);
    }
  }

  const alreadyDone = status?.status === "DONE";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <FileText className="mt-1 h-7 w-7 text-blue-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Processo RENACH</h1>
          <p className="text-sm text-zinc-600">
            Abertura do processo no DETRAN-MS, biometria e captura de dados.
          </p>
        </div>
      </header>

      {guide && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">
            Instruções para {guide.detranName}
          </h2>
          <ol className="ml-5 mt-2 list-decimal space-y-1 text-sm text-zinc-800">
            {guide.instructions.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
          <a
            href={guide.detranUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700 underline"
          >
            Abrir portal DETRAN-MS <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold">
          Após fazer biometria, informe os dados
        </h2>
        {alreadyDone ? (
          <p className="mt-2 text-sm text-emerald-700">
            RENACH {status?.renachNumber} concluído em{" "}
            {status?.biometryDoneAt?.slice(0, 10)}.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-2 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Número do RENACH
              <input
                {...register("renachNumber", { required: true, minLength: 6 })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="MS-000000000"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              UF do DETRAN
              <input
                {...register("ufDetran", { required: true, maxLength: 2 })}
                readOnly
                className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data da biometria
              <input
                type="date"
                {...register("biometryDoneAt", { required: true })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <Button type="submit" disabled={busy || !formState.isValid}>
              {busy ? "Enviando…" : "Confirmar RENACH"}
            </Button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-600">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 5.2: Commit**

```bash
git add src/app/app/student/renach
git commit -m "adiciona(journey-front): rota renach com guide DETRAN-MS"
```

---

## Task 6: Rotas `/student/exams/medical` e `/student/exams/psychological`

**Files:**

- Create: `src/app/app/student/exams/medical/page.tsx`
- Create: `src/app/app/student/exams/psychological/page.tsx`

Ambas as telas seguem o mesmo fluxo: catálogo de clínicas → seleção → agendamento → upload de laudo → download de protocolo PDF. A única diferença é o tipo de clínica e o conjunto de endpoints (`medical-exam` vs `psychological-exam`).

- [ ] **Step 6.1: Implementar `exams/medical/page.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import {
  getMyMedicalExam,
  scheduleMedicalExam,
  uploadMedicalLaudo,
  downloadMedicalProtocol,
  ClinicExamStatus,
} from "@/lib/api/stages";
import { useClinicCatalog } from "@/hooks/useClinicCatalog";
import { useInvalidateJourney } from "@/hooks/useJourney";
import { ClinicCard } from "@/components/journey/ClinicCard";
import { DocumentUploader } from "@/components/journey/DocumentUploader";
import { ProtocolPdfDownload } from "@/components/journey/ProtocolPdfDownload";
import { Button } from "@/components/ui/button";
import type { Clinic } from "@/lib/api/clinics";
import { Stethoscope } from "lucide-react";

export default function MedicalExamPage() {
  const catalog = useClinicCatalog("MEDICAL");
  const invalidate = useInvalidateJourney();
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<ClinicExamStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyMedicalExam().then(setStatus).catch(() => undefined);
  }, []);

  async function handleSchedule() {
    if (!selected || !date) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await scheduleMedicalExam({
        clinicId: selected.id,
        scheduledAt: new Date(date).toISOString(),
      });
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao agendar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadMedicalLaudo(file);
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <Stethoscope className="mt-1 h-7 w-7 text-blue-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Exame médico</h1>
          <p className="text-sm text-zinc-600">
            Escolha uma clínica credenciada em Campo Grande/MS, agende,
            compareça e envie o laudo APTO.
          </p>
        </div>
      </header>

      {status?.laudoStatus === "APPROVED" ? (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          Laudo médico aprovado ✓
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-base font-semibold">
              Clínicas disponíveis
            </h2>
            {catalog.isLoading && <p className="text-sm">Carregando…</p>}
            {catalog.isError && (
              <p className="text-sm text-rose-600">
                Falha ao carregar clínicas.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(catalog.data ?? []).map((c) => (
                <ClinicCard
                  key={c.id}
                  clinic={c}
                  selected={selected?.id === c.id}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </section>

          {selected && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold">Agendamento</h2>
              <label className="mt-2 flex flex-col gap-1 text-sm">
                Data e hora
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <Button
                onClick={handleSchedule}
                disabled={busy || !date}
                className="mt-3"
              >
                {busy ? "Agendando…" : "Confirmar agendamento"}
              </Button>
            </section>
          )}

          {status?.scheduledAt && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold">Enviar laudo APTO</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Agendado para {new Date(status.scheduledAt).toLocaleString("pt-BR")}.
              </p>
              <div className="mt-3">
                <DocumentUploader
                  label="Enviar laudo (PDF/JPG/PNG)"
                  onFile={handleUpload}
                />
              </div>
            </section>
          )}
        </>
      )}

      <section>
        <ProtocolPdfDownload
          fetcher={downloadMedicalProtocol}
          filename="protocolo-medico.pdf"
        />
      </section>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 6.2: Implementar `exams/psychological/page.tsx` (espelho de medical)**

```tsx
"use client";
import { useEffect, useState } from "react";
import {
  getMyPsychExam,
  schedulePsychExam,
  uploadPsychLaudo,
  downloadPsychProtocol,
  ClinicExamStatus,
} from "@/lib/api/stages";
import { useClinicCatalog } from "@/hooks/useClinicCatalog";
import { useInvalidateJourney } from "@/hooks/useJourney";
import { ClinicCard } from "@/components/journey/ClinicCard";
import { DocumentUploader } from "@/components/journey/DocumentUploader";
import { ProtocolPdfDownload } from "@/components/journey/ProtocolPdfDownload";
import { Button } from "@/components/ui/button";
import type { Clinic } from "@/lib/api/clinics";
import { Brain } from "lucide-react";

export default function PsychologicalExamPage() {
  const catalog = useClinicCatalog("PSYCHOLOGICAL");
  const invalidate = useInvalidateJourney();
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<ClinicExamStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyPsychExam().then(setStatus).catch(() => undefined);
  }, []);

  async function handleSchedule() {
    if (!selected || !date) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await schedulePsychExam({
        clinicId: selected.id,
        scheduledAt: new Date(date).toISOString(),
      });
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao agendar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadPsychLaudo(file);
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <Brain className="mt-1 h-7 w-7 text-blue-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Exame psicológico</h1>
          <p className="text-sm text-zinc-600">
            Escolha uma clínica credenciada em Campo Grande/MS, agende,
            compareça e envie o laudo APTO.
          </p>
        </div>
      </header>

      {status?.laudoStatus === "APPROVED" ? (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          Laudo psicológico aprovado ✓
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-base font-semibold">
              Clínicas disponíveis
            </h2>
            {catalog.isLoading && <p className="text-sm">Carregando…</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(catalog.data ?? []).map((c) => (
                <ClinicCard
                  key={c.id}
                  clinic={c}
                  selected={selected?.id === c.id}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </section>

          {selected && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold">Agendamento</h2>
              <label className="mt-2 flex flex-col gap-1 text-sm">
                Data e hora
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <Button
                onClick={handleSchedule}
                disabled={busy || !date}
                className="mt-3"
              >
                {busy ? "Agendando…" : "Confirmar agendamento"}
              </Button>
            </section>
          )}

          {status?.scheduledAt && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold">Enviar laudo APTO</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Agendado para{" "}
                {new Date(status.scheduledAt).toLocaleString("pt-BR")}.
              </p>
              <div className="mt-3">
                <DocumentUploader
                  label="Enviar laudo (PDF/JPG/PNG)"
                  onFile={handleUpload}
                />
              </div>
            </section>
          )}
        </>
      )}

      <section>
        <ProtocolPdfDownload
          fetcher={downloadPsychProtocol}
          filename="protocolo-psicologico.pdf"
        />
      </section>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 6.3: Commit**

```bash
git add src/app/app/student/exams/medical src/app/app/student/exams/psychological
git commit -m "adiciona(journey-front): rotas exames medico e psicologico (catálogo + agendamento + laudo)"
```

---

## Task 7: Rota `/student/exams/theory-official`

**Files:**

- Create: `src/app/app/student/exams/theory-official/page.tsx`

- [ ] **Step 7.1: Implementar página**

```tsx
"use client";
import { useEffect, useState } from "react";
import {
  declareOfficialTheory,
  getMyOfficialTheory,
  uploadOfficialTheoryProof,
  OfficialTheoryStatus,
} from "@/lib/api/stages";
import { useInvalidateJourney } from "@/hooks/useJourney";
import { DocumentUploader } from "@/components/journey/DocumentUploader";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export default function TheoryOfficialPage() {
  const invalidate = useInvalidateJourney();
  const [status, setStatus] = useState<OfficialTheoryStatus | null>(null);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyOfficialTheory().then(setStatus).catch(() => undefined);
  }, []);

  async function handleDeclare() {
    if (approved === null) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await declareOfficialTheory({ approved });
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao declarar resultado.");
    } finally {
      setBusy(false);
    }
  }

  async function handleProof(file: File) {
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadOfficialTheoryProof(file);
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro no upload.");
    } finally {
      setBusy(false);
    }
  }

  const already = status?.approved === true;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <GraduationCap className="mt-1 h-7 w-7 text-blue-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Exame teórico oficial</h1>
          <p className="text-sm text-zinc-600">
            Após fazer o exame teórico oficial no posto DETRAN-MS, registre o
            resultado e anexe o comprovante.
          </p>
        </div>
      </header>

      {already ? (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          Aprovação registrada em{" "}
          {status?.declaredAt
            ? new Date(status.declaredAt).toLocaleString("pt-BR")
            : "—"}
          . Próximo passo: enviar sua LADV.
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold">Resultado</h2>
            <div className="mt-2 flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="approved"
                  value="yes"
                  onChange={() => setApproved(true)}
                />
                Aprovado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="approved"
                  value="no"
                  onChange={() => setApproved(false)}
                />
                Reprovado
              </label>
            </div>
            <Button
              className="mt-3"
              onClick={handleDeclare}
              disabled={busy || approved === null}
            >
              {busy ? "Enviando…" : "Confirmar declaração"}
            </Button>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold">
              Comprovante do DETRAN (opcional, mas recomendado)
            </h2>
            <div className="mt-2">
              <DocumentUploader
                label="Anexar comprovante (PDF/JPG/PNG)"
                onFile={handleProof}
              />
            </div>
          </section>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
git add src/app/app/student/exams/theory-official
git commit -m "adiciona(journey-front): rota theory-official com auto-declaração e comprovante"
```

---

## Task 8: Rota `/student/ladv`

**Files:**

- Create: `src/app/app/student/ladv/page.tsx`

- [ ] **Step 8.1: Implementar página**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  getLadvGuide,
  getMyLadv,
  submitLadvManual,
  uploadLadv,
  LadvStatus,
  LadvGuide,
} from "@/lib/api/stages";
import { useInvalidateJourney } from "@/hooks/useJourney";
import { DocumentUploader } from "@/components/journey/DocumentUploader";
import { Button } from "@/components/ui/button";
import { IdCard } from "lucide-react";

type ManualShape = {
  ladvNumber: string;
  ladvIssuedAt: string;
  ladvValidUntil: string;
};

export default function LadvPage() {
  const invalidate = useInvalidateJourney();
  const [guide, setGuide] = useState<LadvGuide | null>(null);
  const [status, setStatus] = useState<LadvStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const { register, handleSubmit, formState } = useForm<ManualShape>();

  useEffect(() => {
    Promise.all([getLadvGuide("MS"), getMyLadv()])
      .then(([g, s]) => {
        setGuide(g);
        setStatus(s);
      })
      .catch((e) => setError(e?.message ?? "Erro ao carregar."));
  }, []);

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadLadv(file);
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro no upload.");
    } finally {
      setBusy(false);
    }
  }

  async function onManual(values: ManualShape) {
    setBusy(true);
    setError(null);
    try {
      const updated = await submitLadvManual(values);
      setStatus(updated);
      await invalidate();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao enviar dados.");
    } finally {
      setBusy(false);
    }
  }

  const ocrLabel: Record<NonNullable<LadvStatus["ladvOcrStatus"]>, string> = {
    PASS: "Validada automaticamente",
    NEEDS_REVIEW: "Em revisão manual",
    FAIL: "OCR não reconheceu — envie novamente ou use entrada manual",
  } as any;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <IdCard className="mt-1 h-7 w-7 text-blue-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">LADV — Licença de Aprendizagem</h1>
          <p className="text-sm text-zinc-600">
            A LADV é emitida pelo DETRAN-MS após aprovação no exame teórico.
            Envie a versão digital aqui para liberar o agendamento de aulas
            práticas.
          </p>
        </div>
      </header>

      {guide && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Como obter a LADV em {guide.uf}</h2>
          <ol className="ml-5 mt-2 list-decimal space-y-1 text-sm text-zinc-800">
            {guide.instructions.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold">Status atual</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">Número</dt>
          <dd>{status?.ladvNumber ?? "—"}</dd>
          <dt className="text-zinc-500">Validade</dt>
          <dd>{status?.ladvValidUntil?.slice(0, 10) ?? "—"}</dd>
          <dt className="text-zinc-500">OCR</dt>
          <dd>{status?.ladvOcrStatus ? ocrLabel[status.ladvOcrStatus] : "—"}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold">Upload da LADV (PDF/JPG/PNG)</h2>
        <div className="mt-3">
          <DocumentUploader label="Enviar arquivo da LADV" onFile={handleUpload} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <button
          type="button"
          className="text-sm font-medium text-blue-700 underline"
          onClick={() => setManualOpen((v) => !v)}
        >
          {manualOpen ? "Ocultar" : "Não tenho o arquivo — preencher manualmente"}
        </button>

        {manualOpen && (
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={handleSubmit(onManual)}
          >
            <label className="flex flex-col gap-1 text-sm">
              Número da LADV
              <input
                {...register("ladvNumber", { required: true, minLength: 6 })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="LADV-MS-000000"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data de emissão
              <input
                type="date"
                {...register("ladvIssuedAt", { required: true })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Validade
              <input
                type="date"
                {...register("ladvValidUntil", { required: true })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-zinc-500">
              Entrada manual fica em revisão (não libera aulas automaticamente).
            </p>
            <Button type="submit" disabled={busy || !formState.isValid}>
              {busy ? "Enviando…" : "Enviar dados para revisão"}
            </Button>
          </form>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add src/app/app/student/ladv
git commit -m "adiciona(journey-front): rota ladv (upload OCR + entrada manual)"
```

---

## Task 9: Schedule + Instructors (gates e badges)

**Files:**

- Modify: `src/app/app/student/schedule/page.tsx`
- Modify: `src/app/app/student/instructors/page.tsx`

- [ ] **Step 9.1: Adicionar banner e gate no `schedule/page.tsx`**

Inserir no topo do JSX retornado (após hooks existentes), antes do componente de calendário:

```tsx
import { useJourney } from "@/hooks/useJourney";
import { JourneyBlockerBanner } from "@/components/journey/JourneyBlockerBanner";

// dentro do componente:
const journey = useJourney();
const blocked = journey.data && !journey.data.canScheduleLessons;
```

Renderizar antes do calendário:

```tsx
{blocked && journey.data && (
  <JourneyBlockerBanner blockers={journey.data.blockers} />
)}
```

E ao disparar o submit de agendamento, checar:

```tsx
if (blocked) return; // não permitir agendar quando bloqueado
```

Aplicar `disabled={blocked}` ao botão principal de "Agendar aula".

- [ ] **Step 9.2: Filtrar instrutores credenciados em `instructors/page.tsx`**

A API já filtra `credentialStatus='APPROVED' AND stripeAccountStatus='ACTIVE'`. Adicionar badge visível e label no card:

```tsx
import { ShieldCheck } from "lucide-react";

// dentro do card de instrutor (onde renderiza nome/foto):
<div className="flex items-center gap-1 text-xs text-emerald-700">
  <ShieldCheck className="h-4 w-4" aria-hidden />
  DETRAN-MS credenciado
</div>
```

Adicionar tooltip/explicação no topo da página:

```tsx
<p className="text-sm text-zinc-600">
  Mostramos apenas instrutores credenciados pelo DETRAN-MS e com conta
  Stripe ativa, conforme exigido pela Resolução CONTRAN 1.020/2025.
</p>
```

- [ ] **Step 9.3: Commit**

```bash
git add src/app/app/student/schedule src/app/app/student/instructors
git commit -m "ajusta(journey-front): schedule com gate canScheduleLessons e instructors com badge DETRAN"
```

---

## Task 10: Pagamentos com Stripe Elements (SetupIntent + PaymentIntent)

**Files:**

- Modify: `src/app/app/student/payments/page.tsx`
- Create: `src/components/journey/AddCardStripe.tsx`

- [ ] **Step 10.1: Implementar `AddCardStripe.tsx`**

Flow: (1) `createSetupIntent` → backend cria SetupIntent Stripe → retorna `clientSecret`; (2) Stripe Elements coleta dados do cartão; (3) `stripe.confirmSetup` confirma no Stripe; (4) `attachCard(stripePaymentMethodId)` → `POST /payments-stripe/payment-methods` salva no banco.

```tsx
"use client";
import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { createSetupIntent, attachCard } from "@/lib/api/payments-stripe";
import { Button } from "@/components/ui/button";

function InnerForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });
    if (stripeError) {
      setError(stripeError.message ?? "Falha ao salvar cartão.");
      setBusy(false);
      return;
    }
    // Após confirmação bem-sucedida, vincular o PaymentMethod ao aluno no backend
    const pmId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;
    if (pmId) {
      try {
        await attachCard(pmId);
      } catch (e: any) {
        setError(e?.message ?? "Cartão confirmado no Stripe mas falhou ao salvar localmente.");
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <PaymentElement />
      <Button onClick={handleConfirm} disabled={busy}>
        {busy ? "Salvando…" : "Salvar cartão"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function AddCardStripe({ onDone }: { onDone: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      const intent = await createSetupIntent();
      setClientSecret(intent.clientSecret);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao iniciar SetupIntent.");
    }
  }

  if (!clientSecret) {
    return (
      <div className="flex flex-col gap-2">
        <Button onClick={start}>Adicionar novo cartão</Button>
        {error && (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <InnerForm onDone={onDone} />
    </Elements>
  );
}
```

- [ ] **Step 10.2: Reescrever `payments/page.tsx` para listar/excluir/setar padrão + adicionar cartão**

```tsx
"use client";
import { useEffect, useState } from "react";
import { listCards, deleteCard, setDefaultCard, SavedCard } from "@/lib/api/payments-stripe";
import { AddCardStripe } from "@/components/journey/AddCardStripe";
import { Button } from "@/components/ui/button";
import { CreditCard, Trash2, Star } from "lucide-react";

export default function PaymentsPage() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      setCards(await listCards());
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar cartões.");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await deleteCard(id);
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao remover cartão.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDefault(id: string) {
    setBusy(true);
    try {
      await setDefaultCard(id);
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao definir padrão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <CreditCard className="mt-1 h-7 w-7 text-blue-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Métodos de pagamento</h1>
          <p className="text-sm text-zinc-600">
            Cartões são salvos com segurança pelo Stripe. A Velo não armazena
            número, CVV ou validade — apenas o token.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        {cards.length === 0 && (
          <p className="text-sm text-zinc-500">
            Nenhum cartão salvo ainda.
          </p>
        )}
        {cards.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-zinc-500" aria-hidden />
              <div>
                <p className="text-sm font-medium">
                  {c.brand.toUpperCase()} •••• {c.last4}
                </p>
                <p className="text-xs text-zinc-500">
                  Validade {String(c.expiryMonth).padStart(2, "0")}/
                  {String(c.expiryYear).slice(-2)}
                  {c.isDefault && " · padrão"}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {!c.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={() => handleDefault(c.id)}
                  aria-label="Definir como padrão"
                >
                  <Star className="h-4 w-4" aria-hidden />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                onClick={() => handleDelete(c.id)}
                aria-label="Remover cartão"
              >
                <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold">Adicionar novo cartão</h2>
        <div className="mt-3">
          <AddCardStripe onDone={() => void reload()} />
        </div>
      </section>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 10.3: Verificar fluxo de pagamento de aula em `schedule/`**

Localizar onde a aula é criada/confirmada em `schedule/` (ou modal de confirmação) e substituir a chamada antiga do Asaas por:

```tsx
import { createLessonCharge } from "@/lib/api/payments-stripe";
import { getStripe } from "@/lib/stripe";

async function payLesson(lessonId: string, paymentMethodId: string) {
  const intent = await createLessonCharge(lessonId, paymentMethodId);
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe não inicializado");
  const { error } = await stripe.confirmCardPayment(intent.clientSecret, {
    payment_method: paymentMethodId,
  });
  if (error) throw new Error(error.message ?? "Falha ao confirmar pagamento.");
}
```

E permitir ao usuário escolher um dos cartões salvos (já listados em `payments-stripe.ts`) antes de chamar `payLesson`.

- [ ] **Step 10.4: Commit**

```bash
git add src/app/app/student/payments src/components/journey/AddCardStripe.tsx
git commit -m "migra(journey-front): payments e fluxo de aula para Stripe Elements"
```

---

## Task 11: Dispute resolution UI

**Files:**

- Modify: `src/app/app/student/dispute/page.tsx` (lista) **OU**
- Create: `src/app/app/student/dispute/[lessonId]/page.tsx` (detalhe da disputa)

A escolha entre modificar a lista existente e/ou criar a página de detalhe depende do que já existe. Esta task assume que `dispute/page.tsx` já lista disputas; criamos apenas a página de detalhe (que era inexistente ou estática).

- [ ] **Step 11.1: Criar `dispute/[lessonId]/page.tsx`**

**Nota de rota:** O spec e o backend plan (stripe-migration) expõem apenas `POST /payments-stripe/disputes/:lessonId/resolve`. Não há `GET` de disputa avulsa. Os dados de contexto (motivo, data de abertura) vêm via `searchParams` passados pela lista existente em `dispute/page.tsx`. O botão de resolução chama diretamente o `POST`.

```tsx
"use client";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { fetchWrapper } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AlertOctagon, RefreshCcw, Send } from "lucide-react";

export default function DisputeDetailPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params.lessonId;
  const sp = useSearchParams();
  // Dados de contexto passados via query string pela lista de disputas
  const openedAt = sp.get("openedAt") ?? "—";
  const reason = sp.get("reason") ?? "—";
  const paymentStatus = sp.get("paymentStatus") ?? "—";
  const [resolved, setResolved] = useState(false);
  const [resolution, setResolution] = useState<"release" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resolve(action: "release" | "refund") {
    setBusy(true);
    setError(null);
    try {
      await fetchWrapper(`/payments-stripe/disputes/${lessonId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao resolver disputa.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(action: "release" | "refund") {
    setBusy(true);
    setError(null);
    try {
      await fetchWrapper(`/payments-stripe/disputes/${lessonId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setResolved(true);
      setResolution(action);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao resolver disputa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <header className="flex items-start gap-3">
        <AlertOctagon className="mt-1 h-7 w-7 text-amber-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Disputa da aula</h1>
          <p className="text-sm text-zinc-600">
            Aula <code>{lessonId}</code>
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-zinc-500">Pagamento</dt>
          <dd>{paymentStatus}</dd>
          <dt className="text-zinc-500">Aberta em</dt>
          <dd>
            {openedAt !== "—"
              ? new Date(openedAt).toLocaleString("pt-BR")
              : "—"}
          </dd>
          <dt className="text-zinc-500">Motivo</dt>
          <dd className="col-span-1">{reason}</dd>
        </dl>
      </section>

      {resolved ? (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          Disputa resolvida:{" "}
          {resolution === "release"
            ? "pagamento liberado ao instrutor"
            : "estorno solicitado ao aluno"}
          .
        </section>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Resolução</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Apenas administradores enxergam estes botões.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => resolve("release")} disabled={busy}>
              <Send className="mr-1 h-4 w-4" aria-hidden />
              Liberar pagamento ao instrutor
            </Button>
            <Button
              variant="outline"
              onClick={() => resolve("refund")}
              disabled={busy}
            >
              <RefreshCcw className="mr-1 h-4 w-4" aria-hidden />
              Estornar para o aluno
            </Button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 11.2: Commit**

```bash
git add src/app/app/student/dispute
git commit -m "adiciona(journey-front): página de detalhe e resolução de disputa"
```

---

## Task 12: Smoke E2E, navegação e documentação

**Files:**

- Modify: `src/components/layout/StudentNav.tsx` (ou arquivo equivalente que lista as rotas)
- Modify: `CLAUDE.md` (raiz `velo-front`)
- Create: `docs/journey-smoke-test.md`

- [ ] **Step 12.1: Adicionar as 6 novas entradas na navegação do aluno**

No componente de navegação principal do aluno (provavelmente `src/components/layout/StudentNav.tsx` ou um array em `src/components/navigation/`), adicionar/garantir os itens abaixo, agrupados em "Jornada":

```ts
const journeyLinks = [
  { href: "/app/student/concierge", label: "Minha Jornada", icon: "Compass" },
  { href: "/app/student/theory-course", label: "Curso teórico", icon: "BookOpen" },
  { href: "/app/student/renach", label: "RENACH", icon: "FileText" },
  { href: "/app/student/exams/medical", label: "Exame médico", icon: "Stethoscope" },
  { href: "/app/student/exams/psychological", label: "Exame psicológico", icon: "Brain" },
  { href: "/app/student/exams/theory-official", label: "Exame teórico oficial", icon: "GraduationCap" },
  { href: "/app/student/ladv", label: "LADV", icon: "IdCard" },
];
```

Mantenha as entradas existentes (dashboard, schedule, instructors, payments, dispute, profile, settings) e ajuste a ordem para que "Minha Jornada" apareça logo após "Dashboard".

- [ ] **Step 12.2: Atualizar `CLAUDE.md` da raiz `velo-front`**

Adicionar uma nova seção:

```markdown
## Journey 1ª CNH (Resolução CONTRAN 1.020/2025)

Estado da journey vive no backend (`Student.journeyStage`). O frontend consome
`/journey/me` via `useJourney()` (`src/hooks/useJourney.ts`) e renderiza:

- `src/app/app/student/concierge` — "Minha Jornada" (stepper + next-step)
- `src/app/app/student/progress` — stepper visual completo + declarar-pronto
- `src/app/app/student/theory-course` — CTA app oficial CNH do Brasil
- `src/app/app/student/renach` — guide DETRAN-MS + form RENACH
- `src/app/app/student/exams/medical|psychological` — catálogo + agendamento + laudo
- `src/app/app/student/exams/theory-official` — auto-declaração + comprovante
- `src/app/app/student/ladv` — upload com OCR + entrada manual

Componentes reutilizáveis em `src/components/journey/`: `JourneyStepper`,
`NextStepCard`, `DocumentUploader`, `ClinicCard`, `ValidatedField`,
`ProtocolPdfDownload`, `JourneyBlockerBanner`.

Mensagens PT-BR em `src/i18n/journeyBlockerMessages.ts`.

Pagamentos via Stripe Elements (`@stripe/stripe-js` + `@stripe/react-stripe-js`).
Cartões salvos via SetupIntent; cobranças de aula via PaymentIntent + delayed
transfer (escrow no backend).
```

- [ ] **Step 12.3: Criar `docs/journey-smoke-test.md`**

```markdown
# Smoke test manual — Journey 1ª CNH

Pré-condições:
- Backend rodando em http://127.0.0.1:3001 com seed completa
- Frontend rodando em http://localhost:3000
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` válida (ambiente Stripe test mode)
- Conta de teste Stripe com cartão 4242 4242 4242 4242

## Cenário 1 — Aluno recém-cadastrado avança até THEORY_COURSE
1. Login com `student-registered@email.com` / `123456`
2. Acessar `/app/student/dashboard` → ver NextStepCard "Inicie o curso teórico"
3. Clicar CTA → vai para `/app/student/theory-course`
4. Clicar "Já comecei o curso teórico" → ver mensagem de sucesso
5. Voltar ao dashboard → ver NextStepCard "Abra seu processo no DETRAN"

## Cenário 2 — RENACH
1. Login com `student-renach@email.com`
2. `/app/student/renach` → ver guide DETRAN-MS
3. Preencher número RENACH `MS-123456789`, data atual, UF `MS`
4. Submit → ver "RENACH MS-123456789 concluído"

## Cenário 3 — Exame médico
1. Login com `student-medical@email.com`
2. `/app/student/exams/medical` → ver 3 clínicas em Campo Grande/MS
3. Selecionar uma → preencher data futura → confirmar agendamento
4. Upload de PDF dummy → ver laudoStatus PENDING e botão "Baixar protocolo"

## Cenário 4 — LADV
1. Login com `student-ladv@email.com`
2. `/app/student/ladv` → ver status `PASS`
3. Confirmar que `canScheduleLessons=true` em `/app/student/schedule`

## Cenário 5 — Schedule gate
1. Login com `student-renach@email.com`
2. `/app/student/schedule` → ver banner amarelo "LADV pendente"
3. Botão "Agendar aula" desabilitado

## Cenário 6 — Pagamentos
1. Qualquer aluno → `/app/student/payments`
2. Clicar "Adicionar novo cartão" → Stripe PaymentElement aparece
3. Preencher `4242 4242 4242 4242` + data futura + CVC `123`
4. Confirmar → ver cartão na lista
5. Definir como padrão → ver "padrão" no rótulo

## Cenário 7 — Ready for exam
1. Login com `student-ready@email.com`
2. `/app/student/progress` → JourneyStepper com último step "completed"
3. NextStepCard mostra "Pronto para o exame DETRAN"

Para cada cenário registrar: data, navegador (Chrome/Firefox/Safari mobile), resultado (OK/FALHOU), screenshot quando relevante.
```

- [ ] **Step 12.4: Rodar build e testes completos**

```bash
npm run build
npm test
```

Esperado: build sem erros TS; vitest verde (testes de componentes).

- [ ] **Step 12.5: Commit**

```bash
git add src/components/layout CLAUDE.md docs/journey-smoke-test.md
git commit -m "docs(journey-front): navegação, CLAUDE.md e roteiro de smoke E2E"
```

---

## Self-Review Checklist (executado antes da entrega)

**Spec coverage** — cada item da Seção 10 do spec:

- ✅ `src/app/app/student/dashboard` mantido com NextStepCard — Task 3
- ✅ `concierge/` repurposed (Minha Jornada) — Task 3
- ✅ `progress/` repurposed (stepper visual completo + declarar-pronto) — Task 3
- ✅ `academy/` mantido — sem mudança
- ✅ `schedule/` com banner `canScheduleLessons=false` — Task 9
- ✅ `instructors/` com badge credenciado DETRAN — Task 9
- ✅ `payments/` migrado para Stripe Elements (SetupIntent + PaymentIntent) — Task 10
- ✅ `dispute/` com detalhe e ações release/refund — Task 11
- ✅ `theory-course/` novo (CTA app CNH do Brasil) — Task 4
- ✅ `renach/` novo (guide + form) — Task 5
- ✅ `exams/medical` novo (catálogo + agendamento + upload laudo + protocolo) — Task 6
- ✅ `exams/psychological` novo (idem médico) — Task 6
- ✅ `exams/theory-official` novo (auto-declaração + comprovante) — Task 7
- ✅ `ladv/` novo (upload com OCR + entrada manual) — Task 8
- ✅ `<JourneyStepper />`, `<NextStepCard />`, `<DocumentUploader />`, `<ClinicCard />`, `<ValidatedField />`, `<ProtocolPdfDownload />` — Task 2
- ✅ Hook `useJourney()` + `journeyBlockerMessages.ts` — Task 1
- ✅ shadcn/ui + mobile-first 360 px — todas as Tasks (uso de utilitários Tailwind responsivos)

**Placeholder scan** — sem `TBD`, `TODO`, `implement later`, `similar to`. Cada step contém código completo. Endpoints referenciados (`/journey/me`, `/clinics`, `/renach/*`, `/medical-exam/*`, `/psychological-exam/*`, `/theory-exam-official/*`, `/ladv/*`, `/payment-methods/me/*`, `/payments-stripe/*`, `/validation/*`) existem ou foram criados em sub-planos anteriores (Foundation, Validation/Clinics, Pre-Practical Stages, LADV/Lesson Gate, Stripe Migration).

**Type consistency** — `JourneyStage`, `JourneyBlocker`, `JourneyState`, `TimelineStep` definidos em `src/lib/api/journey.ts` (Task 1.5) e importados consistentemente em Tasks 2, 3, 9. `Clinic` definido em `src/lib/api/clinics.ts` (Task 1.7) e usado em Tasks 2.7 e 6. `LadvStatus`/`OfficialTheoryStatus`/`RenachStatus`/`ClinicExamStatus` em `src/lib/api/stages.ts` (Task 1.6) e usados consistentemente em Tasks 5–8.

**Estado terminal de Frontend Journey:** após Task 12, o `velo-front` tem:

- 6 novas rotas implementadas (`theory-course`, `renach`, `exams/medical`, `exams/psychological`, `exams/theory-official`, `ladv`) e 3 telas existentes repaginadas (`dashboard`, `concierge`, `progress`)
- 7 componentes reutilizáveis em `src/components/journey/` com 10 testes Vitest verdes
- Hook `useJourney()` em React Query + provider Stripe Elements
- Tradução PT-BR completa de códigos de bloqueio
- Pagamento de aulas via Stripe (SetupIntent + PaymentIntent + delayed transfer)
- Smoke test manual roteirizado em `docs/journey-smoke-test.md`
- Documentação atualizada (`CLAUDE.md` do `velo-front` + nova seção Journey)

**Não cobre (escopo futuro, fora do MVP da 1ª CNH):**

- App admin separado (resolução de disputa via UI dedicada — atualmente endpoint backend + página `/dispute/[lessonId]` reutilizada)
- Push notifications de mudança de stage
- Internacionalização EN/ES (apenas PT-BR no MVP)
- Storybook/visual regression dos componentes journey
- Testes E2E automatizados (Playwright) — apenas smoke manual roteirizado
