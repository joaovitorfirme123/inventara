# Autenticacao

O Inventara usa Better Auth com o adapter oficial do Prisma e sessoes
persistidas no PostgreSQL. A escolha evita manter implementacoes proprias de
hash de senha, cookies e expiracao de sessao, e e compativel com Next.js 16 e
Prisma 7.

## Fluxo

- O seed provisiona os usuarios locais e grava apenas hashes `scrypt` na tabela
  `Account`.
- `POST /api/auth/sign-in/email` valida as credenciais e emite um cookie de
  sessao `httpOnly`.
- O `proxy.ts` redireciona paginas sem sessao para `/login` e responde `401` em
  APIs protegidas.
- O DAL em `src/lib/session.ts` valida novamente a sessao no servidor antes de
  disponibilizar usuario e organizacao para consultas.
- O logout invalida a sessao persistida e remove o cookie no navegador.

O cadastro publico esta desativado. Novos usuarios devem ser provisionados por
um fluxo administrativo ou pelo seed em desenvolvimento.

## Organizacao

O identificador da organizacao vem do usuario associado a sessao. Paginas e
APIs nao aceitam `organizationId` do cliente como fonte de autorizacao.

## Configuracao local

Defina `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `SEED_USER_PASSWORD` conforme
o `.env.example`, aplique as migrations e execute o seed. Com o servidor local
ativo, rode `npm run test:authentication` para validar login, sessao, logout e
protecao de rotas.
