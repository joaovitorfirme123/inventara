# Conta Demo

A conta demonstrativa usa somente dados sintéticos e fica isolada das
organizações reais.

## Credenciais

```text
E-mail: demo@inventara.test
Senha: valor definido em DEMO_USER_PASSWORD
```

Se `DEMO_USER_PASSWORD` não for definida, o seed usa o valor de
`SEED_USER_PASSWORD` como fallback.

## Provisionamento

Em uma base nova ou de demonstração, execute:

```bash
DATABASE_URL="sua_connection_string" \
SEED_USER_PASSWORD="senha-das-contas-de-teste" \
DEMO_USER_PASSWORD="senha-publica-da-demo" \
npm run db:seed
```

O seed cria ou atualiza:

- a organização `Inventara Demo`;
- o usuário `demo@inventara.test`;
- 12 produtos sintéticos;
- duas importações fictícias;
- dois snapshots de estoque para cada produto.

O comando é idempotente e pode ser repetido para atualizar a senha e os dados
da demonstração. Não execute o seed em uma base com dados reais sem revisar o
efeito das organizações e produtos adicionais.
