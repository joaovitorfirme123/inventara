# Deploy

## Arquitetura

```text
Usuario -> Vercel -> Next.js -> Neon PostgreSQL
```

O projeto usa o runtime Node.js do Next.js. O `vercel.json` executa
`npm run db:deploy` antes de `npm run build`, aplicando somente migrations ainda
pendentes no banco configurado para o ambiente.

## Pré-requisitos

- repositório GitHub conectado à Vercel;
- projeto PostgreSQL criado no Neon;
- domínio ou URL pública definida para a aplicação;
- migrations versionadas em `prisma/migrations`.

## Variáveis da Vercel

Configure as variáveis no ambiente **Production** da Vercel. Nunca coloque esses
valores em arquivos versionados:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Connection string pooled do Neon para o runtime |
| `DIRECT_URL` | Connection string direct do Neon para migrations |
| `BETTER_AUTH_SECRET` | Segredo aleatório com pelo menos 32 caracteres |
| `BETTER_AUTH_URL` | URL pública exata da aplicação |

O `DATABASE_URL` é usado pela aplicação e pode apontar para o endpoint pooled
(`-pooler`). O `DIRECT_URL` é usado pelo Prisma durante o build para aplicar
migrations e deve apontar para o endpoint direct. Se `DIRECT_URL` não existir,
o Prisma usa `DATABASE_URL` como fallback.

`SEED_USER_PASSWORD` é usada apenas para provisionar contas locais com
`npm run db:seed`. Não configure essa variável na produção e não execute o seed
com dados reais sem uma decisão explícita.

Para Preview, use um banco Neon separado ou uma branch isolada. Não reutilize o
banco de produção em previews.

## Primeiro deploy

1. Importe o repositório na Vercel.
2. Cadastre as três variáveis de produção.
3. Faça o deploy pela branch `main`.
4. Confirme nos logs que `npm run db:deploy` terminou antes do build.
5. Acesse a URL pública e confirme que `/login` responde.
6. Crie ou provisione uma conta de teste fora do banco de produção real.
7. Valide autenticação, upload CSV, leitura do banco e isolamento entre organizações.

## Validação local do build de produção

Com um PostgreSQL local disponível e as variáveis carregadas:

```bash
npm ci
npm run db:deploy
npm run lint
npm run build
npm run start
```

Em outro terminal, valide a proteção da aplicação:

```bash
curl -i http://localhost:3000/estoque
```

Sem sessão, a resposta esperada é `307` para `/login`.

## Checklist

- [ ] Projeto Vercel conectado ao repositório.
- [ ] Banco Neon de produção criado.
- [ ] Variáveis de produção configuradas na Vercel.
- [ ] Migrations aplicadas pelo primeiro deploy.
- [ ] Login validado na URL pública.
- [ ] Upload CSV validado com arquivo de teste não sensível.
- [ ] Isolamento entre organizações validado.
- [ ] Nenhum segredo ou dado real adicionado ao Git.
