# Apresentação para portfólio

## Resumo

O Inventara é uma aplicação de inteligência operacional para inventários. O
projeto surgiu da observação de um problema recorrente: relatórios de estoque
contêm os dados necessários, mas não deixam claro quais grupos devem ser
contados primeiro ou como o estoque evoluiu entre importações.

A solução importa uma base de produtos, organiza a cobertura por seção, grupo e
subgrupo, calcula uma prioridade explicável e preserva snapshots para mostrar
variações de estoque. O resultado é uma interface de apoio à decisão, não uma
substituição do ERP.

## Destaques técnicos

- Next.js App Router com páginas server-rendered.
- PostgreSQL e Prisma para catálogo, importações e snapshots.
- Better Auth com sessões persistidas.
- Multi-tenancy derivado da sessão e aplicado na camada de dados.
- Parser tolerante a formatos de CSV exportados por ERPs.
- CI com banco descartável, migrations, testes de dados e testes HTTP.
- Deploy em Vercel com Neon e migrations versionadas.

## Texto curto

> Inventara transforma relatórios de estoque em prioridades de inventário e
> histórico de variação. A aplicação combina importação CSV, análise de
> cobertura, multi-tenancy e snapshots de estoque em um fluxo operacional
> seguro, reproduzível e preparado para produção.

## Segurança da apresentação

Todos os exemplos, previews e dados da conta Demo são sintéticos. Não devem ser
publicados nome de empresa, CNPJ, produtos reais, estoques reais ou relatórios
internos.
