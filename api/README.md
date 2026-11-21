# GBM API

Rails 8 (modo API) + PostgreSQL. Por enquanto cobre o controle de acesso.

## Rodar localmente

```bash
cd api
bundle install
# Postgres local com usuário gbm/gbm, ou DB_HOST, DB_USER e DB_PASSWORD
bin/rails db:prepare db:seed   # o seed carrega os títulos de ../data/catalogo.json
bin/rails test
bin/rails s
```

Em produção: `DATABASE_URL`, `SECRET_KEY_BASE`, `MAIL_FROM`, `CORS_ORIGINS` e um servidor SMTP para o e-mail do código.

## Regras de acesso (decididas em nov/2026)

| Ação | Quem pode |
|---|---|
| Ler um livro no app | Só com assinatura ativa |
| Baixar o PDF | Assinatura ativa; o download registra a posse para sempre |
| Depois de cancelar | Só baixar de novo os PDFs que já tinha baixado; o app de leitura fecha |
| Criar ou apagar perfil, resgatar código, sair de todos os aparelhos | Só com o PIN dos pais (vale 10 minutos) |

As regras ficam em `app/policies/access_policy.rb`.

## Login

Sem senha: o responsável recebe um código de 6 dígitos por e-mail (vale 10 minutos, 5 tentativas,
5 códigos por hora). No primeiro acesso a conta é criada. Cada aparelho recebe um token próprio
(Bearer), guardado no banco só como hash, que vale 60 dias e pode ser revogado.

As crianças não têm login: são perfis da conta, sem sobrenome nem data de nascimento (LGPD).

## Assinatura

Ainda sem gateway de pagamento. A assinatura é alimentada pelo admin
(`PUT /admin/accounts/:id/subscription`) ou por um código de ativação vendido em loja
(`POST /codes/redeem`). Quando o gateway entrar, o webhook dele altera os mesmos campos.

## Endpoints

| Método | Caminho | Observação |
|---|---|---|
| POST | /auth/code | `{ email }`, sempre 202 |
| POST | /auth/verify | `{ email, code }` → `{ token, account }` |
| DELETE | /auth/session | sai deste aparelho |
| DELETE | /auth/sessions | sai de todos (PIN) |
| GET | /me | conta, perfis, assinatura |
| POST | /parent/pin | cria o PIN logo após o login, ou troca com `current_pin` |
| POST | /parent/unlock, /parent/lock | abre e fecha a janela do PIN |
| GET/POST/PATCH/DELETE | /profiles | escrita exige PIN |
| GET | /titles/:slug/access | `{ can_read, can_download, owned }` |
| GET | /titles/:slug/read | 403 sem assinatura |
| POST | /titles/:slug/download | link do PDF válido por 5 minutos |
| GET | /downloads | livros da família |
| POST | /codes/redeem | `{ code }` (PIN) |
| PUT | /admin/accounts/:id/subscription | admin |
| POST | /admin/activation_codes | `{ months, store, quantity }` (admin) |

## Ainda falta

- Armazenamento definitivo dos PDFs (hoje lê de `storage/pdfs/`) e nome do comprador no PDF.
- Gateway de pagamento.
- Leitor (conteúdo das páginas) e telas em React.
