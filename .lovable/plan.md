
Objetivo geral (ATLAS Next Phases)
- Evoluir o ATLAS para uma plataforma comercial completa (Model Portal + Brand Portal + dashboards profissionais + base de API + placeholder real de certificação hash), sem recriar arquitetura existente e usando apenas Supabase como fonte de verdade.
- Antes de qualquer expansão, estabilizar o pipeline de build/publicação (no estado atual há falha de build).

Contexto técnico importante (o que encontrei)
- O projeto é Next.js (App Router) e já possui `next.config.mjs`.
- O script `build:dev` foi criado apontando para `vite build --mode development`, mas:
  - `vite.config.ts` depende de `@vitejs/plugin-react-swc`.
  - Existe `pnpm-lock.yaml` e `bun.lockb` no repo. O `pnpm-lock.yaml` NÃO contém `@vitejs/plugin-react-swc`, o que indica risco de o pipeline estar usando pnpm e não instalando o plugin.
  - O `index.html` está vazio, o que faria um build Vite falhar mesmo que o plugin existisse (não há entrypoint Vite em `src/`).
- Você confirmou a decisão: `build:dev` deve usar Next build (mais simples e alinhado ao app real).

Também confirmado via perguntas
- Brand linkage: criar `brand_users` (tabela de relação entre user e brand).
- Role: usar role nova `brand` (não reutilizar `client`).
- API Key (Fase 7): guardar em env var do Lovable (para validar header no server).

Estratégia de entrega (para reduzir risco)
- Entregar em milestones, em ordem: “Build/Publish OK” → “Model Technical Profile” → “Model Portal” → “Brand Portal” → “Licensing UI” → “Contracts UI” → “Audit viewer” → “Public API foundation” → “Certificate hash”.
- Cada fase inclui: (1) ajustes mínimos de schema/RLS, (2) wiring no frontend/rotas, (3) teste end-to-end guiado.

========================
FASE 0 — Stabilize Build/Publish (obrigatório antes das fases)
========================
0.1 Trocar `build:dev` para Next
- Atualizar `package.json`:
  - `"build:dev": "next build"`
- Motivo: remove dependência de Vite para o pipeline de publish, elimina falha do `vite.config.ts`, e alinha com o build real do app.
- Resultado esperado: publish não trava por “failed to load config … vite.config.ts”.

0.2 Resolver ambiguidade de package manager (lockfiles)
- Padronizar para 1 lockfile para evitar installs inconsistentes no pipeline do Lovable:
  - Opção recomendada: manter `package-lock.json` e remover `pnpm-lock.yaml` e `bun.lockb`.
- Motivo: hoje o `pnpm-lock.yaml` não contém deps recentes (ex.: plugin-react-swc), e isso pode causar “Cannot find module …” em builds que usam pnpm por heurística.

0.3 Limpeza de configuração que conflita com regras ATLAS
- O projeto hoje contém `.env` no repo (foi criado anteriormente). Pelas regras do Lovable/Supabase neste projeto, não devemos depender de `.env` no repositório para segredos.
- Ajuste planejado:
  - Remover dependência de `.env` e usar:
    - Supabase URL/anon key já hardcoded em `src/integrations/supabase/client.ts` (publishable ok)
    - para secrets privados, usar Supabase secrets ou Lovable env var (conforme o caso)
  - (Sem quebrar o que já está funcionando)

Critério de aceite Fase 0
- Publish completa sem erro genérico “Publishing failed”.
- `next build` executa no pipeline.

========================
FASE 1 — Model Technical Profile (Ficha técnica automática)
========================
Rotas novas
- Criar: `/dashboard/model/profile` (área do dashboard, acessível com RBAC role=model).

Dados exibidos (todos via Supabase, sem mocks)
- full_name, email, city, status do modelo
- total captures, valid captures, missing captures
- previews gerados (contagem)
- licenses ativas (contagem)
- contracts vinculados (contagem)

Campos editáveis pelo Model
- city
- telefone

Mudanças de Banco (migração)
1) Adicionar `phone` (telefone) em `public.profiles`
- `ALTER TABLE public.profiles ADD COLUMN phone text;`
- (City já existe em `profiles` e em `models`; vamos definir fonte única no app — ver abaixo.)

2) Permitir update controlado (RLS)
- Hoje `profiles` não tem policy de UPDATE; e `models` também não tem policy de UPDATE para model.
- Para o escopo da fase:
  - Criar policy “profiles self update (limited)” permitindo update apenas do próprio registro.
  - (Opcional para reforçar) Criar trigger para impedir update do campo `role` em profiles (role é display-only e não pode virar vetor de escalonamento).
- Para `models`, decidiremos se city/status ficam no models ou profiles para edição. Recomendação:
  - editar `profiles.city` e `profiles.phone` no portal (perfil do usuário)
  - manter `models.city` apenas como espelho/legado (não editar) ou sincronizar explicitamente (decisão técnica: minimizar duplicidade).

Consultas (frontend)
- Buscar modelo via `models.user_id = auth.uid()` (ou via link existente do usuário no app).
- Agregações:
  - captures: total e breakdown por status (valid/missing) (precisa mapear “valid” vs “pending/invalid” do schema atual; vamos padronizar as categorias exibidas sem alterar o fluxo existente)
  - previews: contar por model via join `previews.capture_id -> captures.model_id`
  - licenses: schema atual usa `licenses.model_id` (ok)
  - contracts: via `contracts.license_id -> licenses.id`

UI
- Usar componentes shadcn existentes (Card, Table, Badge, Tabs).
- Sem redesign: layout simples em cards + métricas.

Critério de aceite Fase 1
- Model acessa `/dashboard/model/profile` e vê números reais.
- Model edita city/telefone e a mudança persiste no Supabase (com RLS).

========================
FASE 2 — Model Portal (/model)
========================
Rota nova
- Criar `/model` (portal externo do modelo) protegido por RBAC role=model.

Conteúdo
- Sua ficha técnica (reuse do componente da Fase 1)
- Suas capturas (listagem / galeria com URLs reais)
- Seus previews
- Suas licenças
- Histórico de contratos
- Logs de auditoria do próprio modelo (filtrado por actor_id=model user, e/ou por model_id/target_id quando aplicável)

Backend/RLS
- Garantir SELECT apropriado para model:
  - `captures`: policy já existe para “model reads own captures”
  - `previews`: policy já existe para “model reads own previews”
  - `licenses`: policy já existe “model reads own licenses”
  - `audit_logs`: hoje apenas admin lê. Para essa fase, adicionar policy de SELECT para o próprio usuário (actor_id = auth.uid()) e/ou logs relacionados ao seu model. (Preferência: permitir apenas logs do próprio actor_id por segurança.)

Critério de aceite Fase 2
- Usuário MODEL acessa `/model` e vê apenas seus dados.

========================
FASE 3 — Brand Portal (/brand)
========================
Pré-requisito: suporte a role brand
- O enum `public.app_role` hoje: ('admin','operator','model','client').
- Precisamos adicionar `brand`.

Mudanças de Banco (migração)
1) Alterar enum
- `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'brand';`

2) Criar tabela `public.brand_users`
- Colunas sugeridas:
  - `id uuid pk default gen_random_uuid()`
  - `brand_id uuid not null references public.brands(id)`
  - `user_id uuid not null` (não referenciar auth.users diretamente via FK se quisermos seguir estritamente a diretriz de não FK com auth; se já adotado em outros pontos, manter consistência do projeto)
  - `created_at timestamptz default now()`
  - UNIQUE(brand_id, user_id)
- RLS:
  - Admin: manage all
  - Brand user: select rows where `user_id = auth.uid()`
- Função helper (security definer) opcional:
  - `public.user_brand_ids(user_id uuid)` para facilitar policies sem recursão e melhorar legibilidade.

3) Policies para brand consumir dados
- `brand_models`: permitir SELECT para brand quando brand_id pertence ao user via brand_users.
- `brands`: permitir SELECT do próprio brand (por brand_users).
- `contracts` e `financeiro_transacoes`: hoje só admin. Para portal de brand, precisamos permitir SELECT “do brand”:
  - Se `contracts` não tem `brand_id`, hoje só tem `brand_name`. Para suportar portal comercial real, precisaremos link consistente.
  - Proposta mínima e compatível:
    - adicionar `contracts.brand_id uuid references brands(id)` (mantendo `brand_name` por compat/legado)
    - e ajustar criação de contracts (quando cria contrato ao criar licença) para preencher brand_id.
  - `financeiro_transacoes` já referencia `contract_id`, então o filtro vem de contracts.

Rota nova
- Criar `/brand` protegido por RBAC role=brand.

Conteúdo
- Modelos vinculados via `brand_models`
- Ficha técnica read-only dos modelos
- Previews liberados (conforme regras atuais do sistema; se “liberação” ainda não existir no schema, manter apenas o que já está permitido por RLS e tabelas existentes)
- Assets licenciados (bucket `assets` é privado; acesso via signed URLs no backend/edge, mas sem alterar fluxo existente que já funciona)
- Contratos
- Histórico financeiro (financeiro_transacoes)

Critério de aceite Fase 3
- Usuário BRAND vê apenas dados do seu brand (via brand_users).
- Não vê modelos/contratos de outros brands.

========================
FASE 4 — Licensing Dashboard Profissional (/dashboard/licenses)
========================
Objetivo
- Melhorar a experiência sem quebrar o que já existe.

Implementação
- Atualizar `/dashboard/licenses` para buscar dados reais do Supabase (se ainda existir qualquer dependência de store local).
- Adicionar colunas/ações na lista:
  - status visual (ativa/expirada)
  - modelo vinculado
  - botões: “Ver contrato”, “Ver assets liberados”, “Histórico de downloads”

Downloads history
- Como MVP, usar `audit_logs` para registrar `ASSET_DOWNLOADED` com metadata (license_id, asset_url/id).
- Se precisar de maior granularidade, criar tabela `asset_downloads` (opcional) com RLS por license/client/brand.

Critério de aceite Fase 4
- Licenses mostram status correto por data real (`valid_until`) e links funcionam.

========================
FASE 5 — Contract Visual System (/dashboard/contracts/[id])
========================
Rota nova
- `/dashboard/contracts/[id]`

Exibir
- Modelo, Marca, License vinculada, status signed
- Botão: marcar como assinado (apenas admin/brand conforme sua regra)
- Histórico financeiro ligado ao contrato

Mudanças de Banco/RLS
- Garantir que brand (e admin) possam:
  - SELECT do contrato se ligado ao brand
  - UPDATE `signed=true` com policy restrita (admin ou brand_owner)
- Se necessário, registrar audit log “CONTRACT_SIGNED”.

Critério de aceite Fase 5
- Botão “assinar” altera Supabase e reflete instantaneamente no UI.

========================
FASE 6 — Audit Log Viewer (Admin) (/dashboard/audit)
========================
Rota existente já existe (`app/dashboard/audit/page.tsx`), mas implementar tabela real (se ainda não estiver).
- UI: tabela com filtros (actor, action, table, date)
- Fonte: `public.audit_logs` via Supabase
- RLS já restringe leitura a admin (ok)

Critério de aceite Fase 6
- Admin filtra e navega logs sem carregar dados indevidos.

========================
FASE 7 — API FOUNDATION (/app/api/public)
========================
Objetivo
- Preparar endpoints GET read-only protegidos por API KEY no header.

Implementação (Next.js Route Handlers)
- Criar pasta `app/api/public/...`
- Endpoints:
  - GET `/api/models/:id`
  - GET `/api/licenses/:id`
- Proteção:
  - Validar header `x-api-key` (ou `authorization: Bearer`) contra `process.env.PUBLIC_API_KEY`
  - Retornar 401 se ausente/incorreto
- Queries via Supabase server-side:
  - Usar Supabase Service Role apenas se necessário; preferir anon + RLS se o endpoint tiver escopo público restrito.
  - Como é “public foundation”, geralmente exige bypass de RLS para dados específicos. Se for o caso, usar service role e filtrar rigorosamente campos retornados.

Checklist de deploy
- Você precisará definir `PUBLIC_API_KEY` como env var no Lovable (Project Settings) para funcionar em produção.

Critério de aceite Fase 7
- Chamadas sem header retornam 401.
- Chamadas com header retornam JSON com dados reais.

========================
FASE 8 — Blockchain Certification (placeholder real)
========================
Mudanças de Banco
- Adicionar `models.certificate_hash text` (nullable).

UI
- Botão em perfil do modelo: “Generate Certificate Hash”

Lógica
- Gerar SHA-256 determinístico baseado em:
  - model id
  - lista de captures (ids + asset_url + status + created_at)
  - previews (ids + preview_url + approved + created_at)
  - licenses (ids + usage_type + valid_until + created_at)
- Persistir `certificate_hash` no banco.
- Registrar audit log “CERTIFICATE_HASH_GENERATED”.

Critério de aceite Fase 8
- Hash muda quando dados mudam; permanece igual para o mesmo conjunto de dados.

========================
Riscos e cuidados (para não quebrar o que já funciona)
- Não alterar Capture/Preview/License/Contract MVP existente além de “wiring” e novas telas.
- RLS: sempre evitar recursão; usar funções SECURITY DEFINER quando policies precisarem de lookup (ex.: brand_users).
- Não usar mocks, placeholders, nem localStorage.
- Assets privados: sempre servir via Signed URL quando aplicável (bucket `assets`, `contracts`).

Plano de execução sugerido (ordem exata)
1) Fase 0 (build/publish) — aplicar e publicar para estabilizar
2) Fase 1 (dashboard model profile)
3) Fase 2 (/model)
4) Fase 3 (/brand + brand role + brand_users + RLS)
5) Fase 5 (contracts/[id]) — depende de vínculo brand_id no contract
6) Fase 4 (upgrade licenses UI) — pode vir antes/depois, mas ideal após contracts UI existir
7) Fase 6 (audit viewer admin)
8) Fase 7 (API foundation)
9) Fase 8 (certificate_hash)

Testes end-to-end obrigatórios após cada fase
- Fase 0: Publish e abrir app
- Fase 1-2: login como model; ver/editar city/phone; conferir métricas batem com Supabase
- Fase 3: login como brand; confirmar isolamento total por brand_users
- Fase 4-5: criar/visualizar contratos e licenças; “signed” só para roles autorizadas
- Fase 6: admin filtra audit
- Fase 7: curl com/sem x-api-key
- Fase 8: gerar hash e verificar persistência

O que vou precisar de você durante a implementação (inputs mínimos)
- 1) Confirmação de nomes de header do API KEY (prefere `x-api-key` ou `authorization: Bearer`) — eu sugeriria `x-api-key`.
- 2) Um usuário de teste BRAND (email) e qual brand ele deve representar (para eu validar o fluxo end-to-end após criar brand_users).
