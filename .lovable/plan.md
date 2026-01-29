
Objetivo
- Deixar o app pronto para produção (sem mocks e sem DataStore para fluxo crítico), corrigir o bloqueio “Start Forge”, e implementar a verificação de vazamento de senha via Have I Been Pwned (HIBP) no fluxo de cadastro (Sign Up), sem depender do plano Pro do Supabase.

Estado atual (o que encontrei no código)
1) Build está falhando por causa de script ausente no package.json real do repositório
- O `package.json` que está no projeto (arquivo real que o build usa) NÃO tem `build:dev`.
- Por isso o runner mostra: `Missing script: "build:dev"`.
- Você colou um package.json onde existe `build:dev`, mas isso não está refletido no arquivo que o Lovable está buildando (ou houve divergência entre branches/commits).
- Além disso, o package.json que você colou anteriormente tinha um erro de JSON (faltava vírgula). Mesmo que no GitHub esteja certo, precisamos garantir que o arquivo do projeto aqui também esteja certo.

2) “Start Forge” está propositalmente bloqueado no UI
- `components/models/model-table.tsx` tem:
  - `handleStartForge()` com TODO
  - mostra o toast: “Forge creation will be enabled once the forge pipeline is backed by Supabase.”
- Ou seja, mesmo que a tabela `public.forges` exista, o UI ainda não cria nada.

3) /dashboard/forges ainda usa DataStore (mock/in-memory)
- `app/dashboard/forges/page.tsx` e `app/dashboard/forges/[id]/page.tsx` carregam forges via `lib/data-store.ts`.
- Isso viola a regra “Supabase é a única fonte de verdade” e impede produção.

4) Cadastro (Sign Up) não existe hoje
- Só existe página `/login` (`app/login/page.tsx`) e o AuthContext só implementa `login`.
- Não existe `supabase.auth.signUp` em nenhum lugar do código atualmente.
- Portanto, para aplicar a checagem de senha vazada, primeiro precisamos criar o fluxo de cadastro real.

5) Problema importante de conformidade: `src/integrations/supabase/types.ts` foi editado manualmente
- O diff mostra alteração manual em `src/integrations/supabase/types.ts`.
- Esse arquivo é “gerado automaticamente” e não deve ser editado. Isso pode quebrar o build e também conflitar com atualizações do Supabase.
- Precisamos reverter essas alterações e voltar a depender da versão gerada.

Entregáveis (o que vou implementar)
A) Unblock build (obrigatório para publicar)
1) Você ajusta o `package.json` do projeto (o arquivo local aqui no Lovable)
- Dentro de `"scripts"`, adicionar exatamente:
  - `"build:dev": "vite build --mode development"`
- Importante: manter JSON válido (com vírgulas corretas).
- Resultado esperado: `npm run build:dev` aparece quando rodar `npm run`.

2) Confirmar que o `index.html` na raiz existe
- Você já criou; vamos apenas validar que está no root (mesmo nível do package.json).

B) Implementar Sign Up + checkPasswordLeak (HIBP) antes do supabase.auth.signUp
1) Criar utilitário `checkPasswordLeak(password: string)`
- Local: `lib/check-password-leak.ts` (ou `lib/security/check-password-leak.ts`, seguindo padrões do projeto).
- Implementação:
  - Validar entrada (string, tamanho razoável 8–128, não logar senha).
  - Gerar SHA-1 (k-anonymity) com Web Crypto:
    - `crypto.subtle.digest('SHA-1', new TextEncoder().encode(password))`
  - Converter hash em hex UPPERCASE.
  - `prefix = hash.slice(0,5)` e `suffix = hash.slice(5)`.
  - `fetch("https://api.pwnedpasswords.com/range/" + prefix)` (GET).
    - Tratar rate-limit e falhas: se a API falhar, por segurança podemos:
      - Opção “fail-closed” (bloqueia cadastro quando a API falha), ou
      - Opção “fail-open” (permite cadastro, mas avisa que não foi possível verificar).
    - Para produção, eu recomendaria “fail-closed” com mensagem clara, mas vou seguir a decisão que você preferir. (Se não decidir, implemento “fail-closed” porque você pediu “camada extra de segurança”.)
  - Parse da resposta:
    - Cada linha: `HASH_SUFFIX:COUNT`
    - Comparar `HASH_SUFFIX` com `suffix` (case-insensitive).
  - Retornar um objeto tipado, por exemplo:
    - `{ leaked: true, count }` ou `{ leaked: false }`
    - Em erro: `{ error: '...' }`

2) Criar página de cadastro
- Criar `app/signup/page.tsx` (client component) com UI consistente com `/login`.
- Campos: email + password + confirm password (recomendado) e botão “Create account”.
- Antes de chamar `supabase.auth.signUp`:
  - Validar email/senha (usar as validações existentes em `lib/validation.ts` + zod opcional se já estiver no padrão).
  - Chamar `checkPasswordLeak(password)`.
  - Se `leaked === true`: bloquear e mostrar exatamente:
    - “Esta senha apareceu em um vazamento de dados. Por segurança, escolha outra.”
    - (toast e/ou texto vermelho abaixo do campo)
  - Se estiver OK: chamar `supabase.auth.signUp`.
    - Incluir `options.emailRedirectTo = window.location.origin + "/login"` (ou "/dashboard" dependendo do fluxo).
- Após cadastro:
  - Mostrar toast de sucesso e orientar sobre confirmação de email (se aplicável na config do Supabase).

3) Atualizar `/login` para ter link “Criar conta”
- Em `app/login/page.tsx`, adicionar link para `/signup`.

4) (Opcional, recomendado) Adicionar `signup()` ao `lib/auth-context.tsx`
- Padroniza o auth flow como no login.
- Mantém a regra importante: não fazer Supabase calls dentro de `onAuthStateChange` callback (só via `setTimeout(0)` quando precisar).
- Observação: seu `AuthContext` atualmente mapeia role via `profiles.role`, mas o requisito anterior do projeto era “roles via user_roles”. Isso precisa ser resolvido em paralelo para produção; vou manter isso como item explícito na seção “Produção / RBAC” abaixo.

C) “Start Forge” realmente criar forja no Supabase e remover bloqueio
1) Atualizar `components/models/model-table.tsx`
- Substituir o toast “Forge creation will be enabled...” por:
  - `insert` em `public.forges` com:
    - `model_id = model.id`
    - `created_by = user.id`
    - `state = 'CREATED'`
  - Inserir também um audit log real em `public.audit_logs` (se a tabela existir e tiver policy correta) com ação `FORGE_CREATED`.
  - Redirecionar para `/dashboard/forges/[id]` do forge criado.

2) Migrar páginas de Forges para Supabase (tirar DataStore do caminho crítico)
- `app/dashboard/forges/page.tsx`
  - Substituir `dataStore.getForges()` por query `supabase.from("forges").select(...)`.
  - Carregar também dados mínimos do model relacionado (join) para exibir nome/identificador.
- `app/dashboard/forges/[id]/page.tsx`
  - Substituir `dataStore.getForge()` por query Supabase do forge por id + model relacionado.
  - Para ações “Advance / Rollback”:
    - Em vez de `dataStore.transitionForge`, fazer `update` no registro do forge com a próxima state (validando no client com `ForgeStateMachine`).
    - Inserir audit log `FORGE_STATE_CHANGED` / `FORGE_ROLLBACK` no Supabase.
  - Respeitar regras: “CERTIFIED = read-only”.

3) Ajustes mínimos necessários no banco/RLS (se ainda não estiverem ok)
- Garantir que:
  - Usuários com role model consigam ao menos ler seus próprios forges (policy já existe no migration que criou `public.forges`).
  - Admin/Operator consigam gerenciar (policy já existe).
  - Se faltar policy de INSERT para admin/operator ou para o usuário atual, adicionaremos.
- Nota: seu migration atual define `created_by uuid NOT NULL` mas não define FK (ok), porém é fundamental que `created_by` seja sempre `auth.uid()` em inserts (no client).
- Também precisamos verificar se existe trigger para `updated_at` (não existe hoje). Para produção, adicionaremos trigger para atualizar `updated_at` automaticamente.

D) Produção / RBAC e consistência (itens obrigatórios para “pronto para produção”)
1) Remover dependência do DataStore em qualquer fluxo operacional
- DataStore pode ficar apenas para componentes de demonstração (se houver), mas não para:
  - models, forges, captures, previews, licenses, contracts, audit.

2) Reverter alteração manual de `src/integrations/supabase/types.ts`
- Voltar o arquivo para o estado gerado e parar de editar manualmente.
- Se precisarmos de tipos do table `forges`, geramos corretamente via Supabase (ou tratamos como `any` temporário com mapeamento local) até o types estar atualizado corretamente.

3) Eliminar uso de localStorage no Supabase client (conforme regra ATLAS)
- Atualmente `src/integrations/supabase/client.ts` usa `window.localStorage` quando em browser.
- Para ficar 100% alinhado com “Nunca usar localStorage”, vamos migrar o storage do supabase-js para cookies (ou storage in-memory) usando abordagem compatível com Next.
- Observação: isso é uma mudança sensível e precisa ser feita com cuidado para não quebrar persistência de sessão. Eu colocarei isso como uma etapa dedicada e testada (ver “Testes end-to-end”).

4) Roles
- Seu `AuthContext` ainda deriva role de `profiles.role`.
- O requisito anterior do projeto era derivar roles de `public.user_roles` (fonte de autorização).
- Para produção, vou refatorar:
  - `AuthContext` carrega profile (identidade) e carrega roles (autorização) separadamente.
  - `canAccessRoute` e `hasScope` passam a usar role computada a partir de `user_roles`.

Testes (obrigatórios para validar produção)
1) Build/publish
- Validar que o build não acusa mais “Missing script build:dev”.
2) Auth
- Fluxo de cadastro:
  - Senha vazada (bloqueia e mostra mensagem exigida)
  - Senha não vazada (cria usuário e segue o fluxo)
  - Falha de API HIBP (comportamento conforme escolha fail-closed/fail-open)
- Login e sessão
3) Forge
- Models → Start Forge cria linha real em `public.forges` e navega para o detalhe.
- /dashboard/forges lista dados reais (sem DataStore).
- /dashboard/forges/[id] atualiza state no Supabase e registra audit.
4) RBAC/RLS
- Model só vê seus forges.
- Admin/Operator vê tudo.
- Certificado não permite updates.

Dependências e sequência (para evitar retrabalho)
1) Você corrige o `package.json` do projeto aqui (para desbloquear build)
2) Eu implemento Sign Up + `checkPasswordLeak`
3) Eu implemento Start Forge real + migração das páginas de Forges para Supabase
4) Eu fecho os pontos de produção: reverter types gerados, remover DataStore crítico, remover localStorage do supabase client, e finalizar RBAC via user_roles

Decisões que preciso confirmar (rápidas, para não travar)
- Em caso de falha da API do HIBP:
  - (A) Bloquear o cadastro por segurança (fail-closed), ou
  - (B) Permitir o cadastro, mas avisar que não foi possível checar (fail-open).
