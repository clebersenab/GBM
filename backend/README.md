# GBM backend (API)

Rails 8 (modo API) + PostgreSQL. Por enquanto cobre o controle de acesso.

## Rodar localmente

```bash
cd backend
bundle install
# Postgres local com usuário gbm/gbm, ou DB_HOST, DB_USER e DB_PASSWORD
bin/rails db:prepare db:seed   # o seed carrega os títulos de ../data/catalogo.json
bin/rails test
bin/rails s
```

## Produção (Render + Neon)

- Banco: Neon, criado pela Vercel (Storage). A API usa a `DATABASE_URL` dele.
- API: Render, configurado pelo `render.yaml` da raiz (Blueprint). A cada inicialização,
  `bin/render-start` migra o banco, carrega o catálogo e, se `LIBERAR_EMAIL` estiver definido,
  cria ou atualiza essa conta liberada.
- Variáveis: `DATABASE_URL`, `SECRET_KEY_BASE` (gerada pelo Render), `CORS_ORIGINS`, `MAIL_FROM`,
  `LIBERAR_EMAIL`/`LIBERAR_PASSWORD`/`LIBERAR_UNTIL` e, quando houver, `SMTP_ADDRESS`, `SMTP_PORT`,
  `SMTP_USERNAME`, `SMTP_PASSWORD`. Sem SMTP, o e-mail de redefinir senha só aparece no log.

## Regras de acesso (decididas em nov/2026)

| Ação | Quem pode |
|---|---|
| Ler um livro no app | Só com acesso pleno (assinatura ativa ou liberação do admin) |
| Baixar o PDF | Assinatura ativa; o download registra a posse para sempre |
| Depois de cancelar | Só baixar de novo os PDFs que já tinha baixado; o app de leitura fecha |
| Perfis, códigos, sair de todos os aparelhos | Basta estar logado (o PIN foi removido) |

As regras ficam em `app/policies/access_policy.rb`.

## Cadastro e login

Cadastro com nome, e-mail, senha (mínimo de 8 caracteres), WhatsApp opcional, aceite dos termos
e da política de privacidade (obrigatório, LGPD) e opt-in de novidades. A conta nasce **sem acesso**
aos livros. Login por e-mail e senha. "Esqueci a senha" envia um código de 6 dígitos por e-mail
(vale 30 minutos); trocar a senha encerra as sessões dos outros aparelhos.

Cada aparelho recebe um token próprio (Bearer), guardado no banco só como hash, que vale 60 dias e
pode ser revogado. As crianças não têm login: são perfis da conta, sem sobrenome nem data de
nascimento (LGPD).

## Acesso pleno

Uma conta lê e baixa livros quando tem **liberação do admin vigente** ou **assinatura ativa**.
Status da conta: `cadastrado` (padrão), `liberado` (com início e fim) ou `bloqueado` (perde tudo).

```bash
EMAIL=... PASSWORD=... UNTIL=2050-12-31 bin/rails gbm:liberar   # cria ou atualiza uma conta liberada
```

## Assinatura

Ainda sem gateway de pagamento. A assinatura é alimentada pelo admin
(`PUT /admin/accounts/:id/subscription`) ou por um código de ativação vendido em loja
(`POST /codes/redeem`). Quando o gateway entrar, o webhook dele altera os mesmos campos.

## Endpoints

| Método | Caminho | Observação |
|---|---|---|
| POST | /auth/signup | `{ name, email, password, phone?, accept_terms, marketing_opt_in? }` |
| POST | /auth/login | `{ email, password }` → `{ token, account }` |
| POST | /auth/password/forgot | `{ email }`, sempre 202 |
| POST | /auth/password/reset | `{ email, code, password }` |
| DELETE | /auth/session | sai deste aparelho |
| DELETE | /auth/sessions | sai de todos os aparelhos |
| GET | /me | conta, perfis e situação de acesso |
| GET/POST/PATCH/DELETE | /profiles | perfis; `focus_valores` e `focus_caminhos` (até 3 cada) |
| GET | /profiles/:id/library | estante da criança |
| PUT/DELETE | /profiles/:id/library/:slug | `{ status: quero_ler|lendo|lido, liked }` |
| GET/POST | /profiles/:id/signals | sinais de interesse `{ kind: valor|caminho, key }` |
| PATCH | /me | `{ name, phone, marketing_opt_in }` |
| PATCH | /me/password | `{ current_password, password }` (derruba outros aparelhos) |
| GET | /me/subscription | plano, próxima cobrança, acesso até, PDFs baixados |
| POST | /me/subscription/cancel | `{ nps_score 0–10, reason, comment }`: não renova; acesso vale até o fim do período |
| POST | /me/subscription/resume | desfaz o cancelamento |
| GET | /titles/:slug/access | `{ can_read, can_download, owned }` |
| GET | /titles/:slug/read | 403 sem assinatura |
| POST | /titles/:slug/download | link do PDF válido por 5 minutos |
| GET | /downloads | livros da família |
| POST | /codes/redeem | `{ code }` |
| PUT | /admin/accounts/:id/subscription | admin |
| PUT | /admin/accounts/:id/access | `{ status, from?, until }` (admin) |
| POST | /admin/activation_codes | `{ months, store, quantity }` (admin) |

## Ainda falta

- Armazenamento definitivo dos PDFs (hoje lê de `storage/pdfs/`) e nome do comprador no PDF.
- Gateway de pagamento.
- Leitor (conteúdo das páginas) e telas em React.
