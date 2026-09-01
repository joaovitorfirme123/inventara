# Sistema de Gestao e Priorizacao de Inventarios

Este documento e a fonte de verdade do progresso e do plano oficial de
desenvolvimento do projeto.

Legenda dos checkboxes: `[ ]` significa pendente e `[x]` significa concluida
e validada. Os status permitidos para cada fase sao: `NÃO INICIADA`, `EM
ANDAMENTO` e `CONCLUÍDA`.

## Visao do projeto

Aplicacao web para empresas acompanharem inventarios de produtos a partir de
arquivos CSV exportados de seus sistemas ERP.

Cada organizacao tera sua propria base de:

- produtos;
- estoque;
- historico de estoque;
- importacoes;
- inventarios;
- prioridades;
- usuarios.

Fluxo principal:

```text
ERP
  -> Exportar CSV
  -> Upload no sistema
  -> Validar arquivo
  -> Atualizar produtos
  -> Registrar historico
  -> Calcular situacao dos inventarios
  -> Gerar prioridades
  -> Atualizar Dashboard
```

## Stack

- Frontend e backend: Next.js, React, TypeScript e App Router.
- Banco: PostgreSQL no Neon.
- ORM: escolher entre Drizzle e Prisma na Fase 2. A escolha deve ser
  explicada antes da implementacao.
- Hospedagem: Vercel.
- Versionamento: Git e GitHub.

## Regras de desenvolvimento com IA

Antes de alterar o projeto, a IA deve:

1. Ler este `ROADMAP.md`.
2. Identificar a fase atual e a proxima fase nao concluida.
3. Verificar quais tarefas estao concluidas.
4. Trabalhar somente na fase autorizada.
5. Nao implementar funcionalidades de fases futuras.

Regras gerais:

- Executar apenas uma fase por vez.
- Explicar brevemente o que sera feito antes de alterar codigo.
- Informar quais arquivos serao criados ou modificados.
- Priorizar codigo simples e compreensivel.
- Evitar abstracoes desnecessarias.
- Explicar conceitos novos.
- Executar testes, build e lint quando aplicavel.
- Nao marcar uma tarefa como concluida apenas porque o codigo foi escrito.
- Nao marcar uma fase como concluida sem validacao.
- Ao concluir uma tarefa implementada e testada, marcar seu checkbox como
  `[x]`.
- Ao concluir uma fase, alterar seu status para `CONCLUIDA`.
- Nao avancar automaticamente para a proxima fase. A proxima fase so inicia
  apos autorizacao do usuario.
- Se for necessario alterar algo de uma fase anterior, explicar o motivo
  antes da alteracao.
- Nunca expor secrets ou arquivos `.env` no Git.
- Nunca utilizar dados reais da empresa em commits publicos.

Ao terminar cada fase, informar:

- o que foi implementado;
- quais arquivos foram alterados;
- o que deve ser testado;
- o que deve ser entendido do codigo;
- possiveis problemas;
- qual sera a proxima fase.

---

## MVP

### FASE 1 — Inicializacao do projeto

**Status: CONCLUÍDA**

#### Objetivo

Criar a estrutura inicial da aplicacao.

#### Tarefas

- [x] Criar projeto Next.js.
- [x] Configurar TypeScript.
- [x] Utilizar App Router.
- [x] Configurar estrutura de pastas.
- [x] Criar layout principal.
- [x] Criar navegacao.
- [x] Criar pagina Dashboard.
- [x] Criar pagina Produtos.
- [x] Criar pagina Inventarios.
- [x] Criar pagina Importacoes.
- [x] Criar pagina Estoque.
- [x] Criar pagina Configuracoes.
- [x] Garantir funcionamento em desktop.
- [x] Garantir responsividade basica.
- [x] Inicializar Git.
- [x] Fazer primeiro commit.

#### Conceitos que devo aprender

- Next.js;
- React;
- componentes;
- App Router;
- layouts;
- TypeScript;
- Git.

#### Criterios para considerar a fase concluida

- A aplicacao inicia localmente sem erros.
- As paginas previstas podem ser acessadas pela navegacao.
- O layout funciona em desktop e possui responsividade basica.
- TypeScript, App Router e estrutura de pastas estao configurados.
- Git foi inicializado e o primeiro commit foi realizado.
- As tarefas marcadas foram implementadas e testadas.

#### Checklist de conclusao

- [x] Executar a aplicacao localmente.
- [x] Acessar todas as paginas pelo navegador.
- [x] Validar desktop e viewport mobile.
- [x] Executar lint e build.
- [x] Confirmar o primeiro commit.

---

### FASE 2 — Banco de dados

**Status: CONCLUÍDA**

#### Objetivo

Criar a infraestrutura de persistencia.

#### Tarefas

- [x] Criar PostgreSQL local em container Docker.
- [x] Configurar a variavel `DATABASE_URL`.
- [x] Usar Prisma como ORM.
- [x] Configurar o ORM.
- [x] Criar migrations.
- [x] Testar conexao.
- [x] Garantir que `.env` esteja no `.gitignore`.

#### Conceitos que devo aprender

- PostgreSQL;
- ORM;
- migrations;
- variaveis de ambiente;
- conexao com banco.

#### Criterios para considerar a fase concluida

- A escolha do ORM foi justificada e registrada.
- O ORM esta configurado para PostgreSQL.
- A conexao com o PostgreSQL local foi testada sem expor credenciais reais.
- As migrations executam corretamente.
- Arquivos de ambiente nao sao versionados.

#### Checklist de conclusao

- [x] Confirmar que `DATABASE_URL` funciona localmente.
- [x] Executar as migrations em um banco de desenvolvimento.
- [x] Validar uma operacao simples de conexao.
- [x] Confirmar `.env` no `.gitignore`.
- [x] Confirmar que nenhum secret foi commitado.
---

### FASE 3 — Organizacoes e usuarios

**Status: CONCLUÍDA**

#### Objetivo

Preparar o sistema para multiplas empresas.

O sistema nao deve tratar produtos como pertencentes globalmente a aplicacao.

Hierarquia:

```text
Organization
    -> Users
    -> Dados da organizacao
```

#### Estrutura inicial

`organizations`

- `id`
- `name`
- `created_at`
- `updated_at`

`users`

- `id`
- `name`
- `email`
- `organization_id`
- `created_at`
- `updated_at`

#### Tarefas

- [x] Criar tabela `organizations`.
- [x] Criar tabela `users`.
- [x] Criar relacionamento usuario -> organizacao.
- [x] Entender PK e FK.
- [x] Criar dados locais de teste.
- [x] Garantir isolamento logico entre organizacoes.

#### Regra critica

Nenhum usuario pode acessar dados pertencentes a outra organizacao.

#### Conceitos que devo aprender

- relacionamentos;
- foreign keys;
- modelagem relacional;
- multi-tenancy.

#### Criterios para considerar a fase concluida

- As tabelas e relacionamentos foram criados por migration.
- Existem dados locais de teste para mais de uma organizacao.
- Os dados de cada organizacao sao identificados por sua organizacao.
- Foi validado que nao ha acesso cruzado entre organizacoes.

#### Checklist de conclusao

- [x] Executar migrations da fase.
- [x] Inserir organizacoes e usuarios de teste.
- [x] Testar PKs e FKs.
- [x] Testar isolamento com duas organizacoes.

---

### FASE 4 — Produtos

**Status: CONCLUÍDA**

#### Objetivo

Criar a estrutura de produtos.

#### Estrutura

`products`

- `id`
- `organization_id`
- `plu`
- `barcode`
- `description`
- `section`
- `group`
- `subgroup`
- `last_inventory`
- `current_stock`
- `created_at`
- `updated_at`

#### Regras

O PLU identifica o produto dentro de uma organizacao. Portanto,
`organization_id + plu` deve identificar unicamente um produto.

#### Tarefas

- [x] Criar tabela `products`.
- [x] Criar relacionamento com `organization`.
- [x] Criar constraint de unicidade adequada.
- [x] Criar pagina Produtos.
- [x] Listar produtos.
- [x] Implementar paginacao.
- [x] Pesquisar por descricao.
- [x] Pesquisar por PLU.
- [x] Pesquisar por codigo de barras.
- [x] Filtrar por secao.
- [x] Filtrar por grupo.
- [x] Filtrar por subgrupo.

#### Regra

Nunca carregar todos os milhares de produtos no navegador simultaneamente.

#### Conceitos que devo aprender

- modelagem de entidades;
- constraints de unicidade compostas;
- consultas paginadas;
- filtros no servidor;
- indices de banco.

#### Criterios para considerar a fase concluida

- Produtos pertencem a uma organizacao.
- `organization_id + plu` e unico.
- A pagina lista dados de forma paginada.
- Buscas e filtros funcionam sem carregar todos os produtos no navegador.
- O isolamento entre organizacoes foi preservado.

#### Checklist de conclusao

- [x] Testar criacao de produtos com PLUs iguais em organizacoes diferentes.
- [x] Testar rejeicao de PLU duplicado na mesma organizacao.
- [x] Testar paginacao.
- [x] Testar todos os campos de busca e filtro.
- [x] Validar desktop e mobile.

---

### FASE 5 — Importacao de CSV

**Status: CONCLUÍDA**

#### Objetivo

Permitir que cada organizacao importe sua base do ERP.

#### Campos inicialmente suportados

- Codigo PLU;
- Codigo de barras;
- Descricao;
- Secao;
- Grupo;
- Subgrupo;
- Ultimo Inventario;
- Estoque Atual.

#### Fluxo

```text
Selecionar arquivo
  -> Ler CSV
  -> Validar estrutura
  -> Mostrar previa
  -> Confirmar
  -> Processar
  -> Atualizar banco
  -> Mostrar resultado
```

#### Tarefas

- [x] Criar pagina de importacao.
- [x] Criar upload.
- [x] Fazer parser do CSV.
- [x] Identificar separador.
- [x] Tratar encoding quando necessario.
- [x] Validar cabecalhos.
- [x] Validar PLU.
- [x] Converter datas.
- [x] Converter numeros com virgula.
- [x] Tratar campos vazios.
- [x] Criar produtos inexistentes.
- [x] Atualizar produtos existentes.
- [x] Processar registros eficientemente.
- [x] Mostrar progresso/estado da importacao.
- [x] Mostrar resumo final.
- [x] Garantir que produtos sejam associados somente a organizacao atual.

#### Resultado esperado

Exemplo:

```text
21.534 processados
120 novos
21.400 atualizados
14 erros
```

#### Conceitos que devo aprender

- upload de arquivos;
- parsing de CSV;
- validacao de dados;
- encoding;
- processamento em lote;
- upsert;
- tratamento de erros.

#### Criterios para considerar a fase concluida

- O fluxo completo de selecao, previa, confirmacao e processamento funciona.
- Os campos suportados sao validados e convertidos corretamente.
- Produtos novos sao criados e existentes sao atualizados.
- Registros invalidos sao contabilizados sem corromper os validos.
- O resultado informa processados, novos, atualizados e erros.
- A importacao respeita a organizacao atual.

#### Checklist de conclusao

- [x] Testar CSV valido com separador por virgula.
- [x] Testar CSV valido com separador por ponto e virgula.
- [x] Testar cabecalhos invalidos.
- [x] Testar datas e numeros com virgula.
- [x] Testar campos vazios e linhas invalidas.
- [x] Testar produtos novos e existentes.
- [x] Testar importacao com mais de uma organizacao.
- [x] Validar o resumo final.
- [x] Testar cabecalhos do modelo real do ERP.

---

### FASE 6 — Historico de importacoes

**Status: CONCLUÍDA**

#### Objetivo

Registrar o resultado de cada importacao realizada pela organizacao.

#### Estrutura

`imports`

- `id`
- `organization_id`
- `filename`
- `imported_at`
- `total_rows`
- `inserted_rows`
- `updated_rows`
- `error_rows`

#### Tarefas

- [x] Criar tabela `imports`.
- [x] Relacionar importacao a organizacao.
- [x] Registrar cada importacao.
- [x] Criar pagina Historico de Importacoes.
- [x] Mostrar data.
- [x] Mostrar arquivo.
- [x] Mostrar registros processados.
- [x] Mostrar inseridos.
- [x] Mostrar atualizados.
- [x] Mostrar erros.

#### Conceitos que devo aprender

- auditoria de operacoes;
- relacionamentos com registros de processo;
- agregacao de resultados;
- exibicao de historico.

#### Criterios para considerar a fase concluida

- Cada importacao gera um registro ligado a uma organizacao.
- O historico exibe todos os indicadores definidos.
- Uma organizacao nao visualiza o historico de outra.
- Os numeros exibidos correspondem ao processamento realizado.

#### Checklist de conclusao

- [x] Executar uma importacao e confirmar seu registro.
- [x] Validar todos os contadores do historico.
- [x] Validar ordenacao por data.
- [x] Testar isolamento entre organizacoes.

---

### FASE 7 — Motor de inventarios

**Status: CONCLUÍDA**

#### Objetivo

Transformar os produtos importados em informacoes para planejamento de
inventarios.

Hierarquia:

```text
SECAO
  -> GRUPO
  -> SUBGRUPO
```

#### Calculos por Grupo/Subgrupo

- Total de SKUs;
- contados no ano atual;
- nao contados no ano atual;
- percentual contado;
- itens sem data;
- data mais antiga;
- data mais recente.

#### Organizacao e prioridades

As secoes devem aparecer em ordem alfabetica. O ranking deve reiniciar dentro
de cada secao.

Prioridades:

- Urgente;
- Alta;
- Media;
- Baixa;
- Atualizado.

A pontuacao deve considerar:

1. quantidade de produtos pendentes;
2. percentual pendente;
3. antiguidade;
4. itens sem data;
5. volume do subgrupo.

Subgrupos pequenos nao devem dominar o ranking apenas por terem produtos
antigos. Um produto antigo nao deve necessariamente ter prioridade maior que
200 produtos com 100 pendentes.

#### Tarefas

- [x] Criar consulta agregada.
- [x] Agrupar Secao -> Grupo -> Subgrupo.
- [x] Criar formula inicial de prioridade.
- [x] Documentar os pesos.
- [x] Criar ranking por secao.
- [x] Criar pagina Inventarios.
- [x] Aplicar cores.
- [x] Permitir filtro por secao.
- [x] Permitir filtro por prioridade.
- [x] Permitir mostrar somente pendentes.

#### Conceitos que devo aprender

- consultas agregadas;
- agrupamento hierarquico;
- regras de negocio;
- normalizacao de pontuacao;
- ordenacao e ranking;
- testes de regras de negocio.

#### Criterios para considerar a fase concluida

- A cadeia CSV -> banco -> produtos -> inventarios -> prioridades funciona.
- Todos os indicadores por grupo/subgrupo sao calculados corretamente.
- Secoes sao ordenadas alfabeticamente e o ranking reinicia em cada uma.
- A formula inicial esta documentada e considera os cinco fatores definidos.
- O ranking nao e dominado indevidamente por subgrupos pequenos.
- A pagina permite os filtros definidos.

#### Checklist de conclusao

- [x] Testar agregacoes com dados conhecidos.
- [x] Testar produtos contados no ano atual.
- [x] Testar itens sem data.
- [x] Testar ranking independente por secao.
- [x] Testar o caso de subgrupo pequeno versus subgrupo volumoso.
- [x] Testar filtros e cores de prioridade.
- [x] Validar o fluxo completo com um CSV.

#### Criterio do MVP

Ao terminar esta fase, deve ser possivel executar:

```text
CSV -> banco -> produtos -> inventarios -> prioridades
```

Quando isso funcionar, o MVP estara concluido.

---

## VERSAO 1.0

### FASE 8 — Dashboard

**Status: CONCLUÍDA**

#### Objetivo

Apresentar uma visao consolidada da situacao dos inventarios.

#### Indicadores

- Total de SKUs;
- total de secoes;
- total de grupos/subgrupos;
- contados no ano;
- pendentes;
- percentual de cobertura;
- itens sem data.

#### Indicadores por secao

- Total de SKUs;
- contados;
- pendentes;
- percentual contado;
- urgentes;
- altas prioridades.

#### Graficos

- Cobertura por secao;
- pendencias por secao;
- distribuicao das prioridades.

#### Tarefas

- [x] Criar cards.
- [x] Criar consultas.
- [x] Criar resumo por secao.
- [x] Criar graficos.
- [x] Garantir responsividade.

#### Conceitos que devo aprender

- agregacao para dashboards;
- visualizacao de dados;
- graficos em React;
- responsividade.

#### Criterios para considerar a fase concluida

- Todos os indicadores gerais e por secao sao exibidos corretamente.
- Os tres graficos representam os dados do banco.
- A pagina e responsiva e possui estados de carregamento/vazio adequados.

#### Checklist de conclusao

- [x] Conferir cards com dados conhecidos.
- [x] Conferir resumo por secao.
- [x] Conferir os tres graficos.
- [x] Validar desktop e mobile.

---

### FASE 9 — Historico de estoque

**Status: CONCLUÍDA**

#### Objetivo

Preservar o estoque de cada importacao.

#### Estrutura

`stock_history`

- `id`
- `organization_id`
- `product_id`
- `import_id`
- `stock`
- `recorded_at`

#### Fluxo

```text
Nova importacao
  -> Localizar produto
  -> Registrar estoque
  -> Atualizar current_stock
  -> Preservar snapshots anteriores
```

#### Tarefas

- [x] Criar tabela `stock_history`.
- [x] Relacionar produto.
- [x] Relacionar importacao.
- [x] Registrar snapshot.
- [x] Preservar snapshots antigos.
- [x] Calcular estoque anterior.
- [x] Calcular estoque atual.
- [x] Calcular variacao.

Variacao: `estoque atual - estoque anterior`.

Variacao de estoque nao significa necessariamente venda.

#### Conceitos que devo aprender

- historico temporal;
- snapshots;
- consistencia entre tabelas;
- calculo de variacao.

#### Criterios para considerar a fase concluida

- Cada importacao registra um snapshot por produto processado.
- Snapshots antigos permanecem preservados.
- `current_stock`, estoque anterior e variacao sao calculados corretamente.
- A implementacao nao interpreta variacao como venda automaticamente.

#### Checklist de conclusao

- [x] Executar duas importacoes do mesmo produto.
- [x] Confirmar os dois snapshots.
- [x] Confirmar estoque anterior e atual.
- [x] Confirmar calculo da variacao.
- [x] Testar produto novo sem estoque anterior.

---

### FASE 10 — Pagina individual do produto

**Status: CONCLUÍDA**

#### Objetivo

Exibir os dados atuais e a evolucao historica de um produto.

#### Rota

`/produtos/[plu]`

#### Informacoes

- descricao;
- PLU;
- codigo de barras;
- secao;
- grupo;
- subgrupo;
- ultimo inventario;
- estoque atual;
- estoque anterior;
- variacao.

#### Historico

- data;
- estoque;
- importacao.

#### Tarefas

- [x] Criar rota dinamica.
- [x] Criar informacoes gerais.
- [x] Mostrar historico.
- [x] Criar grafico de evolucao.

#### Conceitos que devo aprender

- rotas dinamicas no App Router;
- carregamento de detalhes;
- historico temporal;
- graficos de evolucao.

#### Criterios para considerar a fase concluida

- A rota localiza o produto dentro da organizacao correta.
- Todas as informacoes gerais sao exibidas.
- O historico mostra data, estoque e importacao.
- O grafico representa a evolucao dos snapshots.

#### Checklist de conclusao

- [x] Abrir produto existente pela rota.
- [x] Testar produto inexistente.
- [x] Conferir informacoes gerais.
- [x] Conferir historico e grafico.
- [x] Testar isolamento entre organizacoes.

---

### FASE 11 — Autenticacao

**Status: CONCLUÍDA**

#### Objetivo

Identificar corretamente o usuario.

#### Funcionalidades

- login;
- logout;
- sessao;
- paginas protegidas;
- APIs protegidas.

#### Tarefas

- [x] Escolher solucao de autenticacao.
- [x] Implementar login.
- [x] Implementar logout.
- [x] Criar sessao.
- [x] Proteger paginas.
- [x] Proteger APIs.

#### Conceitos que devo aprender

- autenticacao;
- sessoes;
- cookies e tokens;
- middleware/protecao de rotas;
- APIs autenticadas.

#### Criterios para considerar a fase concluida

- Usuarios conseguem fazer login e logout.
- A sessao e mantida e encerrada corretamente.
- Paginas e APIs protegidas rejeitam usuarios nao autenticados.
- A solucao escolhida e documentada.

#### Checklist de conclusao

- [x] Testar login valido.
- [x] Testar credenciais invalidas.
- [x] Testar logout.
- [x] Acessar pagina protegida sem sessao.
- [x] Chamar API protegida sem sessao.

---

### FASE 12 — Autorizacao e isolamento

**Status: CONCLUÍDA**

#### Objetivo

Garantir seguranca entre organizacoes.

#### Regra

Todas as consultas relevantes devem considerar `organization_id`. Nunca
confiar em `organization_id` enviado livremente pelo frontend quando ele puder
ser obtido da sessao.

#### Tarefas

- [x] Revisar consultas para exigir `organization_id`.
- [x] Obter a organizacao a partir da sessao.
- [x] Impedir acesso cruzado em paginas.
- [x] Impedir acesso cruzado em APIs.
- [x] Criar testes de isolamento.

#### Testes obrigatorios

- [x] Usuario A ve produtos da organizacao A.
- [x] Usuario B ve produtos da organizacao B.
- [x] Usuario A nao acessa produto da organizacao B pela URL.
- [x] Usuario A nao acessa historico da organizacao B.
- [x] Usuario A nao acessa importacoes da organizacao B.
- [x] APIs tambem impedem acesso cruzado.

#### Conceitos que devo aprender

- autorizacao;
- multi-tenancy seguro;
- controle de acesso;
- seguranca no servidor;
- testes de isolamento.

#### Criterios para considerar a fase concluida

- Todas as consultas relevantes filtram pela organizacao da sessao.
- O frontend nao consegue escolher livremente outra organizacao.
- Todos os testes obrigatorios passam para paginas e APIs.
- Nao existe acesso cruzado por URL, parametros ou chamadas diretas.

#### Checklist de conclusao

- [x] Auditar consultas de produtos.
- [x] Auditar consultas de historico.
- [x] Auditar consultas de importacoes.
- [x] Executar todos os testes obrigatorios.
- [x] Testar manipulacao de parametros pelo cliente.

---

### FASE 13 — Seguranca da importacao

**Status: CONCLUÍDA**

#### Objetivo

Tornar a importacao resistente a arquivos invalidos, abusivos ou duplicados.

#### Tarefas

- [x] Limitar tamanho do arquivo.
- [x] Validar extensao.
- [x] Validar conteudo.
- [x] Validar cabecalhos.
- [x] Tratar CSV corrompido.
- [x] Tratar linhas invalidas.
- [x] Validar quantidade de registros.
- [x] Usar transacao quando apropriado.
- [x] Evitar importacoes duplicadas acidentais.
- [x] Criar mensagens de erro compreensiveis.

#### Conceitos que devo aprender

- validacao de entrada;
- limites e rate limiting;
- transacoes;
- idempotencia;
- mensagens de erro seguras.

#### Criterios para considerar a fase concluida

- Arquivos fora dos limites ou formatos sao rejeitados claramente.
- CSVs corrompidos e linhas invalidas nao derrubam a aplicacao.
- A quantidade de registros e validada.
- Transacoes evitam estados parciais quando apropriado.
- Reimportacoes acidentais sao detectadas ou impedidas.

#### Checklist de conclusao

- [x] Testar arquivo acima do limite.
- [x] Testar extensao e conteudo invalidos.
- [x] Testar CSV corrompido.
- [x] Testar muitas linhas e linhas invalidas.
- [x] Testar falha durante o processamento.
- [x] Testar importacao duplicada.
- [x] Conferir mensagens para o usuario.

---

### FASE 14 — Melhorias de UX

**Status: CONCLUÍDA**

#### Objetivo

Melhorar a eficiencia e a clareza das telas principais.

#### Inventarios

- [x] Pesquisa.
- [x] Filtro por secao.
- [x] Filtro por prioridade.
- [x] Somente pendentes.
- [x] Somente urgentes.
- [x] Ordenacao.
- [x] Expandir Grupo -> Subgrupo.

#### Produtos

- [x] Paginacao.
- [x] Busca rapida.
- [x] Filtros combinados.
- [x] Loading states.
- [x] Empty states.
- [x] Tratamento visual de erros.

#### Importacao

- [x] Drag and drop.
- [x] Previa.
- [x] Loading.
- [x] Resultado detalhado.

#### Conceitos que devo aprender

- experiencia do usuario;
- estados de carregamento;
- estados vazios e de erro;
- filtros combinados;
- acessibilidade basica;
- interacoes responsivas.

#### Criterios para considerar a fase concluida

- Inventarios, Produtos e Importacao possuem os recursos de UX definidos.
- As telas comunicam carregamento, ausencia de dados e erros.
- Os fluxos principais sao utilizaveis em desktop e mobile.
- A expansao hierarquica e os filtros mantem informacoes claras.

#### Checklist de conclusao

- [x] Testar cada recurso de Inventarios.
- [x] Testar cada recurso de Produtos.
- [x] Testar cada recurso de Importacao.
- [x] Validar loading, empty e erro.
- [x] Validar teclado e responsividade basica.

---

### FASE 15 — Pagina de estoque

**Status: CONCLUÍDA**

#### Objetivo

Consolidar a posicao e a evolucao do estoque em uma tela dedicada.

#### Rota

`/estoque`

#### Funcionalidades

- listagem de produtos com estoque atual;
- estoque anterior e variacao por produto;
- busca por descricao, PLU ou codigo de barras;
- filtros por secao, grupo e subgrupo;
- paginacao;
- estados de carregamento e vazio.

#### Conceitos que devo aprender

- consultas com snapshots;
- calculo de variacao em listas;
- reutilizacao de filtros.

#### Criterios para considerar a fase concluida

- A tela lista os produtos com estoque atual, anterior e variacao.
- Os filtros e a paginacao funcionam como em Produtos.
- A pagina protege o acesso por organizacao.

#### Checklist de conclusao

- [x] Testar calculo de variacao na listagem.
- [x] Testar paginacao, busca e filtros.
- [x] Testar isolamento entre organizacoes.

---

### FASE 16 — Deploy

**Status: CONCLUÍDA**

#### Objetivo

Disponibilizar o sistema em producao com a arquitetura definida.

Arquitetura:

```text
Usuario
  -> Vercel
  -> Next.js
  -> PostgreSQL / Neon
```

#### Tarefas

- [x] Criar repositorio GitHub.
- [x] Revisar `.gitignore`.
- [x] Remover secrets.
- [x] Configurar variaveis na Vercel.
- [x] Configurar Neon de producao.
- [x] Executar migrations.
- [x] Fazer deploy.
- [x] Testar producao.
- [x] Testar upload.
- [x] Testar banco.
- [x] Testar autenticacao.
- [x] Testar isolamento entre organizacoes.

#### Conceitos que devo aprender

- deploy continuo;
- ambientes de desenvolvimento e producao;
- secrets de plataforma;
- migrations em producao;
- observabilidade basica.

#### Criterios para considerar a fase concluida

- O sistema esta acessivel em producao pela Vercel.
- O banco Neon de producao esta configurado com migrations aplicadas.
- Variaveis e secrets estao configurados sem serem versionados.
- Upload, banco, autenticacao e isolamento funcionam em producao.
- O repositorio publico nao contem dados reais ou secrets.

#### Checklist de conclusao

- [x] Revisar arquivos versionados e preparar CI/deploy.
- [x] Configurar ambiente de producao.
- [x] Executar migrations de producao.
- [x] Validar deploy.
- [x] Executar todos os testes de producao.
- [x] Confirmar que nao existem secrets ou dados reais publicados.

---

## PORTFOLIO

### FASE 17 — Conta demonstrativa

**Status: CONCLUÍDA**

#### Objetivo

Permitir demonstracao publica sem divulgar informacoes reais.

Dados ficticios sao necessarios apenas para a organizacao DEMO. Usuarios reais
continuarao importando seus proprios dados.

#### Tarefas

- [x] Criar organizacao Demo.
- [x] Gerar produtos ficticios.
- [x] Gerar inventarios ficticios.
- [x] Gerar estoques ficticios.
- [x] Gerar historico ficticio.
- [x] Criar usuario demo.

#### Regra

Nenhum dado real da empresa deve aparecer na demonstracao publica.

#### Conceitos que devo aprender

- seed de banco;
- dados sinteticos;
- demonstracao segura;
- separacao entre dados demo e dados reais.

#### Criterios para considerar a fase concluida

- A conta Demo pode ser usada para demonstracao publica.
- Todos os dados exibidos sao ficticios.
- A conta possui produtos, inventarios, estoques e historico coerentes.
- Dados reais da empresa nao estao presentes nem sao expostos.

#### Checklist de conclusao

- [x] Criar e validar a organizacao Demo.
- [x] Validar dados ficticios em todas as telas.
- [x] Testar o usuario demo.
- [x] Auditar a demonstracao em busca de dados reais.

---

### FASE 18 — README e apresentacao

**Status: CONCLUÍDA**

#### Objetivo

Documentar o projeto e prepara-lo para apresentacao publica.

#### README

Documentar:

- problema;
- solucao;
- funcionalidades;
- stack;
- arquitetura;
- banco;
- importacao;
- algoritmo de prioridade;
- multi-tenancy;
- seguranca;
- screenshots;
- instalacao;
- deploy;
- aprendizados;
- melhorias futuras.

#### Portfolio

Criar descricao resumida explicando que o projeto surgiu da observacao de um
problema real de acompanhamento de inventarios.

Nao divulgar:

- nome da empresa sem autorizacao;
- dados internos;
- produtos reais;
- estoques reais;
- relatorios internos.

#### Tarefas

- [x] Documentar o problema.
- [x] Documentar a solucao e funcionalidades.
- [x] Documentar stack e arquitetura.
- [x] Documentar banco e importacao.
- [x] Documentar algoritmo de prioridade.
- [x] Documentar multi-tenancy e seguranca.
- [x] Adicionar screenshots seguros.
- [x] Documentar instalacao e deploy.
- [x] Documentar aprendizados e melhorias futuras.
- [x] Criar descricao para portfolio.
- [x] Revisar o material para remover informacoes sensiveis.

#### Conceitos que devo aprender

- documentacao tecnica;
- comunicacao de arquitetura;
- escrita de portfolio;
- anonimacao de dados;
- reproducibilidade de projetos.

#### Criterios para considerar a fase concluida

- O README cobre todos os topicos definidos.
- Uma pessoa consegue instalar, entender e executar o projeto seguindo a
  documentacao.
- A apresentacao explica o problema sem expor informacoes confidenciais.
- Screenshots e exemplos usam somente dados seguros.

#### Checklist de conclusao

- [x] Seguir o README do zero em um ambiente limpo.
- [x] Revisar links, screenshots e comandos.
- [x] Revisar informacoes confidenciais.
- [x] Revisar a descricao de portfolio.

---

## AJUSTES OPERACIONAIS

### Limpeza segura da base

**Status: CONCLUÍDA**

Permitir que uma organização substitua sua base importada sem apagar usuários,
sessões ou dados de outros tenants.

#### Tarefas

- [x] Remover produtos da organização atual.
- [x] Remover seções, grupos e subgrupos junto do catálogo.
- [x] Remover importações e histórico de estoque relacionados.
- [x] Exigir confirmação explícita antes da operação.
- [x] Executar a limpeza em uma transação.
- [x] Testar isolamento entre organizações.

#### Regra

Usuários e sessões permanecem intactos. A operação nunca aceita a organização
como parâmetro livre do cliente; ela usa o tenant da sessão autenticada.

---

## VERSAO 2.0 — BACKLOG

Estas funcionalidades nao fazem parte do MVP. A ordem abaixo organiza o
backlog por dependencias de negocio e de dados.

#### Criterio para iniciar o backlog

As fases da Versao 2.0 devem ser implementadas uma por vez, na ordem definida,
apos autorizacao explicita para iniciar a proxima fase. Cada fase precisa ter
seus testes e criterios validados antes de ser marcada como concluida.

### FASE 19 — Administracao da plataforma e organizacoes

**Status: CONCLUIDA**

#### Objetivo

Criar o onboarding controlado de organizacoes e a administracao dos usuarios
sem misturar permissoes globais da plataforma com dados de cada tenant.

#### Papeis

- `platform_admin`: administra a plataforma e cria organizacoes.
- `owner`: administra usuarios da propria organizacao.
- `member`: utiliza os modulos operacionais da propria organizacao.

#### Rotas

- `/admin/organizacoes`: acesso do `platform_admin` para listar e criar
  organizacoes.
- `/configuracoes/usuarios`: acesso do `owner` para gerenciar usuarios da
  propria organizacao.

#### Tarefas

- [x] Modelar papeis globais e papeis por organizacao.
- [x] Criar o usuario inicial `platform_admin` por seed ou bootstrap protegido.
- [x] Criar organizacao junto com seu primeiro usuario `owner` em uma transacao.
- [x] Criar tela administrativa de listagem e criacao de organizacoes.
- [x] Criar tela de usuarios da organizacao atual.
- [x] Permitir criar e desativar usuarios da propria organizacao.
- [x] Impedir que `owner` ou `member` criem organizacoes.
- [x] Proteger paginas, Server Actions e APIs no servidor.
- [x] Impedir elevacao de privilegio pelo cliente.
- [x] Registrar alteracoes administrativas relevantes.
- [x] Garantir isolamento entre organizacoes durante todo o fluxo.
- [x] Consultar usuarios, papeis e permissoes efetivas de cada organizacao.
- [x] Excluir organizacoes com confirmacao pelo nome e limpeza transacional.

#### Conceitos que devo aprender

- RBAC e menor privilegio;
- onboarding multi-tenant;
- bootstrap de administrador;
- transacoes de provisionamento;
- autorizacao server-side;
- ciclo de vida de usuarios.

#### Criterios para considerar a fase concluida

- Um `platform_admin` consegue criar uma organizacao e seu primeiro `owner`.
- O `owner` consegue gerenciar somente usuarios da propria organizacao.
- `member` nao acessa rotas administrativas.
- Nenhuma permissao depende apenas de esconder elementos da interface.
- A criacao de organizacao e usuario inicial e atomica.
- Tentativas de acessar outra organizacao ou elevar privilegio sao rejeitadas.
- O fluxo funciona sem cadastro publico aberto por padrao.

#### Checklist de conclusao

- [x] Testar criacao de organizacao e primeiro owner.
- [x] Testar criacao e desativacao de usuario pelo owner.
- [x] Testar acesso de platform_admin, owner e member.
- [x] Testar tentativa de acesso cruzado entre organizacoes.
- [x] Testar tentativa de elevacao de privilegio.
- [x] Testar rollback quando a criacao falhar.
- [x] Testar exclusao com confirmacao invalida e valida.
- [x] Testar consulta administrativa de usuarios e permissoes.
- [x] Validar desktop e mobile.

---

### FASE 20 — Dashboard -> Produtos filtrados

**Status: CONCLUÍDA**

#### Objetivo

Transformar os principais indicadores do Dashboard em atalhos para os produtos
que originaram cada metrica, reutilizando a pagina existente de Produtos.

Nao criar paginas separadas para cada indicador. Os filtros devem ser
representados na URL sempre que possivel.

#### Tarefas

- [x] Tornar o card Total de SKUs clicavel e direcionar para `/produtos`.
- [x] Tornar o card Contados no ano atual clicavel.
- [x] Calcular o ano atual dinamicamente, sem fixar 2026 no codigo.
- [x] Tornar o card Pendentes clicavel.
- [x] Tornar o card Sem data clicavel.
- [x] Aplicar o filtro correspondente na pagina Produtos.
- [x] Exibir visualmente o filtro ativo.
- [x] Permitir remover o filtro sem voltar ao Dashboard.
- [x] Manter busca, paginacao, ordenacao e demais filtros existentes.
- [x] Garantir que o card inteiro seja clicavel e acessivel por teclado.
- [x] Reutilizar as mesmas regras de negocio usadas pelo Dashboard.

#### Exemplos conceituais

```text
/produtos
/produtos?status=contado
/produtos?status=pendente
/produtos?status=sem-data
```

#### Regra critica

Os numeros do Dashboard e os resultados do drill-down devem usar a mesma regra
de negocio.

Exemplo: se o Dashboard mostrar 6.715 pendentes, o filtro correspondente deve
representar os mesmos 6.715 produtos para a mesma organizacao e o mesmo estado
dos dados.

#### Conceitos que devo aprender

- drill-down;
- navegacao orientada a dados;
- query parameters;
- reutilizacao de regras de negocio;
- links semanticos e acessibilidade.

#### Criterios para considerar a fase concluida

- Os quatro cards definidos abrem a pagina de Produtos com o recorte correto.
- O filtro ativo fica visivel e pode ser removido.
- Os filtros continuam combinaveis com busca, ordenacao e paginacao.
- As quantidades sao consistentes com o Dashboard.
- Os cards sao navegaveis por teclado e possuem foco visivel.
- O isolamento por organizacao permanece protegido.

#### Checklist de conclusao

- [x] Testar Total de SKUs.
- [x] Testar Contados no ano atual.
- [x] Testar Pendentes.
- [x] Testar Sem data.
- [x] Comparar quantidades do Dashboard com a listagem filtrada.
- [x] Testar combinacao com filtros existentes.
- [x] Testar teclado e foco.
- [x] Testar isolamento entre organizacoes.
- [x] Executar testes, lint e build.

---

### FASE 21 — Ranking de Inventarios -> Produtos filtrados

**Status: CONCLUÍDA**

#### Objetivo

Permitir investigar diretamente quais produtos formam os indicadores exibidos
no ranking de inventarios.

A pagina de Inventarios deve permitir sair de uma informacao agregada de
Secao/Grupo/Subgrupo para os SKUs correspondentes sem criar novas paginas.

#### Tarefas

- [x] Tornar investigavel a quantidade de produtos pendentes de um subgrupo.
- [x] Permitir abrir produtos contados no ano quando fizer sentido.
- [x] Permitir abrir produtos sem data.
- [x] Permitir abrir o total de produtos do recorte quando fizer sentido.
- [x] Enviar Secao, Grupo, Subgrupo e status para a pagina Produtos.
- [x] Reutilizar os filtros existentes da pagina Produtos.
- [x] Garantir consistencia entre os numeros do ranking e o resultado filtrado.
- [x] Manter os filtros combinaveis com busca, ordenacao e paginacao.

#### Exemplo conceitual

```text
/inventarios
  -> MERCEARIA
  -> ALIMENTOS
  -> MOLHOS
  -> 183 pendentes
  -> /produtos?secao=MERCEARIA&grupo=ALIMENTOS&subgrupo=MOLHOS&status=pendente
```

Os nomes dos parametros sao apenas referencia. A implementacao deve utilizar a
estrutura mais adequada ao codigo atual.

#### UX

Nem todo numero precisa virar link. Tornar clicaveis somente os indicadores que
possuem um destino util e claramente compreensivel.

Podem ser utilizados:

- numero clicavel;
- link discreto;
- acao Ver produtos;
- outro componente coerente com o design atual.

#### Conceitos que devo aprender

- drill-down hierarquico;
- composicao de filtros;
- reutilizacao de componentes;
- consistencia entre agregacao e detalhe.

#### Criterios para considerar a fase concluida

- Um indicador do ranking pode abrir os SKUs que o compoem.
- Secao, Grupo, Subgrupo e status sao aplicados corretamente.
- Os numeros do ranking batem com os resultados detalhados.
- O usuario pode continuar refinando a listagem depois do drill-down.
- O isolamento por organizacao permanece protegido.

#### Checklist de conclusao

- [x] Testar pendentes por Subgrupo.
- [x] Testar contados por Subgrupo.
- [x] Testar sem data por Subgrupo.
- [x] Testar combinacao Secao + Grupo + Subgrupo + status.
- [x] Comparar agregados com a listagem detalhada.
- [x] Testar isolamento entre organizacoes.
- [x] Executar testes, lint e build.

---

### FASE 22 — Filtros persistidos na URL e breadcrumbs

**Status: CONCLUÍDA**

#### Objetivo

Representar o estado relevante da pagina Produtos na URL e melhorar a
orientacao do usuario com breadcrumbs contextuais.

#### Filtros que devem ser avaliados para persistencia

- status;
- Secao;
- Grupo;
- Subgrupo;
- busca;
- ordenacao;
- pagina;
- demais filtros existentes que sejam relevantes.

Exemplo:

```text
/produtos?secao=MERCEARIA&grupo=ALIMENTOS&status=pendente&sort=ultimoInventario
```

#### Tarefas

- [x] Sincronizar os filtros relevantes com query parameters.
- [x] Preservar os filtros ao recarregar a pagina.
- [x] Permitir abrir diretamente uma URL filtrada.
- [x] Fazer voltar/avancar do navegador respeitar o estado da listagem.
- [x] Remover parametros obsoletos ao limpar filtros.
- [x] Tratar filtros hierarquicos incompativeis.
- [x] Criar breadcrumbs contextuais.
- [x] Tornar niveis aplicaveis dos breadcrumbs clicaveis.
- [x] Evitar breadcrumbs excessivos quando nao houver contexto.

#### Exemplo de breadcrumb

Produtos > Mercearia > Alimentos > Molhos > Pendentes

#### Comportamento esperado

- Produtos: remove o contexto de filtros.
- Mercearia: mantem apenas o recorte da Secao.
- Alimentos: mantem Secao + Grupo.
- Molhos: mantem Secao + Grupo + Subgrupo.
- Pendentes: representa o status atual.

#### Regra de hierarquia

Filtros filhos incompativeis nao podem permanecer silenciosamente ativos.

Exemplo: ao trocar de Secao, um Grupo pertencente a Secao anterior deve ser
removido ou validado.

#### Regra de seguranca

Query parameters sao filtros, nunca autorizacao. A organizacao deve continuar
sendo determinada pela sessao autenticada no servidor.

#### Conceitos que devo aprender

- URL como estado;
- query parameters;
- navegacao do navegador;
- breadcrumbs;
- filtros hierarquicos.

#### Criterios para considerar a fase concluida

- URLs filtradas podem ser copiadas, recarregadas e abertas diretamente.
- Voltar e avancar preservam um comportamento previsivel.
- Filtros incompativeis sao tratados corretamente.
- Breadcrumbs representam o contexto atual.
- A organizacao nunca e determinada por parametros livres da URL.

#### Checklist de conclusao

- [x] Testar reload com filtros.
- [x] Testar URL aberta diretamente.
- [x] Testar voltar e avancar.
- [x] Testar remocao de filtros.
- [x] Testar mudanca de filtros hierarquicos.
- [x] Testar breadcrumbs.
- [x] Testar manipulacao manual da URL.
- [x] Testar isolamento entre organizacoes.
- [x] Executar testes, lint e build.

---

### FASE 23 — Drill-down das importacoes

**Status: EM ANDAMENTO**

#### Objetivo

Transformar o resultado e o historico de importacoes em informacoes
investigaveis.

Depois de uma importacao, o usuario deve conseguir identificar quais registros
foram novos, quais foram atualizados e quais apresentaram problemas, conforme os
dados que o importador realmente consegue determinar.

#### Tarefas

- [x] Revisar o significado atual de inserted, updated, error e outros estados.
- [x] Exibir resumo detalhado de cada importacao.
- [x] Permitir abrir os produtos criados naquela importacao.
- [x] Permitir abrir os produtos atualizados naquela importacao.
- [x] Criar visualizacao dos erros da importacao.
- [x] Criar visualizacao de linhas ignoradas, caso esse estado exista (nao aplicavel: o importador nao possui estado separado).
- [x] Permitir abrir detalhes a partir do Historico de Importacoes.
- [x] Relacionar o drill-down a um identificador real da importacao.
- [x] Exibir mensagens compreensiveis sem vazar detalhes internos.

#### Informacoes de erro

Quando disponiveis, apresentar:

- linha do CSV;
- PLU recebido;
- descricao recebida;
- campo problematico;
- motivo do erro.

Exemplo:

```text
Linha | PLU  | Descricao   | Problema
148   | -    | ARROZ XYZ   | PLU ausente
293   | 8172 | FEIJAO XYZ  | Data invalida
```

Nunca expor stack traces, SQL, secrets ou mensagens internas desnecessarias ao
usuario final.

#### Regra importante

Nao confundir produto presente no CSV com produto efetivamente alterado
sem antes verificar como o importador atual define updated.

Se a arquitetura atual nao registrar detalhe suficiente para reconstruir
novos/atualizados/erros por importacao, modelar a persistencia necessaria de
forma explicada antes de implementar.

#### Conceitos que devo aprender

- rastreabilidade de importacoes;
- auditoria;
- relacionamento entre processamento e registros;
- mensagens de erro seguras;
- observabilidade.

#### Criterios para considerar a fase concluida

- Cada importacao possui uma visao detalhada.
- Novos e atualizados podem ser investigados quando suportados pela regra atual.
- Erros possuem motivo compreensivel.
- O Historico de Importacoes permite acessar os detalhes.
- Nenhum dado de outra organizacao pode ser acessado pelo identificador da importacao.

#### Checklist de conclusao

- [x] Testar importacao apenas com produtos novos.
- [x] Testar importacao com atualizacoes.
- [x] Testar importacao com erros.
- [x] Testar linhas ignoradas, se aplicavel (nao aplicavel: o importador nao possui estado separado).
- [x] Testar detalhes pelo historico.
- [x] Testar identificador de importacao de outra organizacao.
- [x] Revisar mensagens expostas ao usuario.
- [x] Executar testes, lint e build.

---

### FASE 24 — Drawer rapido do produto

**Status: CONCLUÍDA**

#### Objetivo

Permitir consultar rapidamente as principais informacoes de um produto sem
abandonar a tabela ou perder o contexto atual.

O Drawer complementa a pagina individual do produto, mas nao a substitui.

#### Onde aplicar inicialmente

- pagina Produtos;
- listagens acessadas por drill-down;
- pagina Estoque, quando fizer sentido.

Nao aplicar automaticamente a todas as tabelas sem avaliar utilidade.

#### Informacoes do Drawer

Mostrar, quando disponivel:

- descricao;
- PLU;
- codigo de barras;
- estoque atual;
- estoque anterior;
- variacao;
- ultimo inventario;
- Secao;
- Grupo;
- Subgrupo;
- status de inventario;
- atalhos relevantes.

#### Tarefas

- [x] Criar componente reutilizavel de Drawer do produto.
- [x] Permitir abertura a partir das tabelas priorizadas.
- [x] Preservar filtros, busca, ordenacao e paginacao ao abrir/fechar.
- [x] Criar acao Ver produto completo.
- [x] Reutilizar os drill-downs das fases anteriores quando fizer sentido.
- [x] Permitir fechar por botao.
- [x] Permitir fechar com Esc quando apropriado.
- [x] Implementar gerenciamento correto de foco.
- [x] Garantir comportamento responsivo.
- [x] Avaliar se o produto aberto deve ser representado na URL.
- [x] Evitar consultas N+1.
- [x] Buscar detalhes sob demanda quando necessario.
- [x] Mostrar estado de loading em consultas assincronas.

Decisao: o produto aberto permanece apenas no estado temporario do Drawer, sem
ser adicionado a URL. Assim, filtros, busca, ordenacao e paginacao continuam
representados pela URL atual sem criar estados canonicos adicionais.

#### Exemplo conceitual opcional

```text
/produtos?status=pendente&produto=1847
```

A URL acima nao e obrigatoria. Antes de implementar, avaliar se o beneficio
justifica a complexidade e explicar a decisao.

#### Performance

Nao carregar detalhes pesados de todos os produtos antecipadamente.

Reutilizar dados ja carregados quando forem suficientes.

Buscar dados adicionais somente quando necessario.

Mostrar estado de loading em consultas assincronas.

Nao introduzir N+1 queries.

#### Acessibilidade

Drawer com titulo acessivel.

Foco movido de forma adequada ao abrir.

Foco devolvido ao elemento de origem ao fechar.

Navegacao por teclado.

Botao de fechar acessivel.

Evitar que o foco percorra conteudo da pagina que esta atras do Drawer.

#### Conceitos que devo aprender

- drawers/dialogs acessiveis;
- gerenciamento de foco;
- carregamento sob demanda;
- reutilizacao de componentes;
- prevencao de N+1.

#### Criterios para considerar a fase concluida

- O usuario consulta um produto sem perder o contexto da tabela.
- O Drawer exibe as informacoes principais.
- A pagina completa do produto continua acessivel.
- A abertura nao provoca consultas desnecessarias em massa.
- O componente funciona por teclado e em telas menores.
- O isolamento por organizacao permanece protegido.

#### Checklist de conclusao

- [x] Testar abertura e fechamento.
- [x] Testar preservacao de filtros e pagina.
- [x] Testar Esc e foco.
- [x] Testar acesso ao produto completo.
- [x] Testar responsividade.
- [x] Revisar queries e verificar N+1.
- [x] Testar produto pertencente a outra organizacao.
- [x] Executar testes, lint e build.

---

### FASE 25 — Planejamento de inventarios

**Status: NÃO INICIADA**

#### Objetivo

Transformar a prioridade calculada em um plano operacional de contagem.

#### Tarefas

- [ ] Criar planejamento de inventarios.
- [ ] Definir data prevista da contagem.
- [ ] Definir responsavel pela contagem.
- [ ] Criar status: Pendente, Programado, Em andamento e Finalizado.
- [ ] Permitir visualizar e filtrar planejamentos.
- [ ] Relacionar o planejamento aos grupos e subgrupos priorizados.

#### Conceitos que devo aprender

- modelagem de workflow;
- estados de dominio;
- datas e responsaveis;
- transicoes de status.

#### Criterios para considerar a fase concluida

- Um inventario pode ser criado para uma organizacao.
- Data, responsavel e status podem ser definidos e alterados.
- O inventario permanece isolado por organizacao.
- O fluxo de status e validado sem transicoes ambiguas.

#### Checklist de conclusao

- [ ] Modelar tabelas e relacionamentos.
- [ ] Testar criacao, edicao e filtros.
- [ ] Testar todas as transicoes de status.
- [ ] Testar isolamento entre organizacoes.

---

### FASE 26 — Metas e cobertura historica

**Status: NÃO INICIADA**

#### Objetivo

Permitir acompanhar metas de inventario e a evolucao da cobertura ao longo dos
meses.

#### Tarefas

- [ ] Criar metas por secao.
- [ ] Registrar cobertura mensal.
- [ ] Comparar cobertura planejada e realizada.
- [ ] Exibir evolucao por periodo no Dashboard.
- [ ] Permitir consultar periodos anteriores.

#### Conceitos que devo aprender

- metricas temporais;
- metas e indicadores;
- agregacoes por periodo;
- comparacao entre planejado e realizado.

#### Criterios para considerar a fase concluida

- Uma organizacao pode definir metas por secao.
- A cobertura mensal e calculada a partir de dados consistentes.
- O historico nao e sobrescrito por um novo periodo.
- Os indicadores respeitam a organizacao atual.

#### Checklist de conclusao

- [ ] Testar metas por secao.
- [ ] Testar fechamento de meses.
- [ ] Testar comparacao entre meta e cobertura.
- [ ] Testar periodos sem dados.

---

### FASE 27 — Relatorios e exportacoes

**Status: NÃO INICIADA**

#### Objetivo

Transformar os indicadores operacionais em relatorios compartilhaveis e
comparaveis entre periodos.

#### Tarefas

- [ ] Exportar dados para Excel.
- [ ] Exportar relatorios para PDF.
- [ ] Comparar cobertura e inventarios entre periodos.
- [ ] Definir quais filtros e metadados entram em cada exportacao.
- [ ] Garantir que exportacoes respeitem a organizacao e as permissoes.

#### Conceitos que devo aprender

- geracao de arquivos;
- relatorios e formatos de apresentacao;
- comparacao temporal;
- processamento de exportacoes grandes.

#### Criterios para considerar a fase concluida

- Um usuario autorizado consegue exportar os dados do proprio recorte.
- Excel e PDF apresentam valores coerentes com as telas.
- A comparacao entre periodos identifica variacoes sem misturar organizacoes.
- Exportacoes nao expoem dados fora do escopo da sessao.

#### Checklist de conclusao

- [ ] Testar exportacao Excel.
- [ ] Testar exportacao PDF.
- [ ] Testar comparacao com periodos com e sem dados.
- [ ] Testar filtros, permissao e isolamento.

---

### FASE 28 — Alertas e notificacoes

**Status: NÃO INICIADA**

#### Objetivo

Comunicar pendencias relevantes sem exigir consulta manual constante ao
Dashboard.

#### Tarefas

- [ ] Criar alertas para prioridades e metas fora do esperado.
- [ ] Criar notificacoes dentro da aplicacao.
- [ ] Permitir marcar notificacoes como lidas.
- [ ] Definir regras para evitar alertas duplicados.
- [ ] Registrar quando um alerta foi gerado e lido.

#### Conceitos que devo aprender

- eventos de dominio;
- idempotencia de notificacoes;
- filas e processamento assincrono;
- preferencias de comunicacao.

#### Criterios para considerar a fase concluida

- Alertas sao gerados apenas para a organizacao correta.
- Uma mesma condicao nao cria notificacoes duplicadas indevidas.
- O usuario consegue consultar e marcar notificacoes como lidas.
- Falhas de notificacao nao corrompem os dados operacionais.

#### Checklist de conclusao

- [ ] Testar geracao de alertas.
- [ ] Testar deduplicacao.
- [ ] Testar leitura e persistencia de notificacoes.
- [ ] Testar isolamento entre organizacoes.

---

### FASE 29 — Perfis, permissoes e convites

**Status: NÃO INICIADA**

#### Objetivo

Aprofundar a autorizacao por operacao e adicionar convites para equipes, sobre
a base de papeis criada na Fase 19.

#### Tarefas

- [ ] Expandir perfis e permissoes por operacao.
- [ ] Criar matriz de permissao da organizacao.
- [ ] Permitir convite de funcionarios.
- [ ] Restringir telas e operacoes conforme a permissao.
- [ ] Permitir revogar convite e acesso.
- [ ] Registrar alteracoes de permissao.
- [ ] Criar auditoria de alteracoes relevantes.

#### Conceitos que devo aprender

- RBAC;
- menor privilegio;
- ciclo de vida de convites;
- autorizacao por operacao.

#### Criterios para considerar a fase concluida

- Administradores conseguem gerenciar usuarios da propria organizacao.
- Permissoes sao verificadas no servidor, nao apenas na interface.
- Convites possuem expiracao e nao permitem acesso cruzado.
- Usuarios nao conseguem elevar o proprio privilegio.

#### Checklist de conclusao

- [ ] Definir matriz de permissoes.
- [ ] Testar convite aceito, expirado e revogado.
- [ ] Testar cada permissao em pagina e API.
- [ ] Testar tentativa de escalada de privilegio.

---

### FASE 30 — Multiplas lojas por organizacao

**Status: NÃO INICIADA**

#### Objetivo

Separar dados operacionais de diferentes lojas pertencentes a uma mesma
organizacao.

#### Tarefas

- [ ] Criar entidade de loja.
- [ ] Relacionar produtos, estoques, importacoes e inventarios a uma loja.
- [ ] Permitir selecionar uma ou mais lojas na consulta.
- [ ] Criar visao consolidada da organizacao.
- [ ] Atualizar isolamento e permissoes por loja.

#### Conceitos que devo aprender

- tenancy hierarquica;
- agregacao multi-unidade;
- escopo de autorizacao;
- migrations de dados existentes.

#### Criterios para considerar a fase concluida

- Uma organizacao pode possuir mais de uma loja.
- Dados de uma loja nao aparecem em outra sem permissao.
- Relatorios podem ser vistos por loja e de forma consolidada.
- Dados existentes possuem uma estrategia de migracao segura.

#### Checklist de conclusao

- [ ] Definir regra de pertencimento dos dados.
- [ ] Migrar dados existentes para uma loja padrao.
- [ ] Testar consultas por loja e consolidadas.
- [ ] Testar autorizacao entre lojas.

---

### FASE 31 — Importacao configuravel

**Status: NÃO INICIADA**

#### Objetivo

Permitir que diferentes ERPs usem o Inventara sem exigir alteracoes no codigo
do parser.

#### Tarefas

- [ ] Criar configuracao personalizada do CSV.
- [ ] Criar mapeamento de colunas por ERP.
- [ ] Permitir salvar mais de um modelo por organizacao.
- [ ] Validar campos obrigatorios conforme o modelo.
- [ ] Mostrar a configuracao aplicada antes da importacao.
- [ ] Manter compatibilidade com o modelo atual.

#### Conceitos que devo aprender

- configuracao orientada a dados;
- contratos de importacao;
- versionamento de schema;
- validacao configuravel.

#### Criterios para considerar a fase concluida

- Um usuario autorizado consegue criar e editar um mapeamento.
- Arquivos de formatos diferentes sao interpretados corretamente.
- A configuracao usada fica registrada na importacao.
- Um mapeamento de uma organizacao nao pode ser usado para alterar outra.

#### Checklist de conclusao

- [ ] Testar mapeamento de dois ERPs.
- [ ] Testar campos obrigatorios e opcionais.
- [ ] Testar alteracao de uma configuracao versionada.
- [ ] Testar compatibilidade com o CSV atual.

---

### FASE 32 — Regras de prioridade configuraveis

**Status: NÃO INICIADA**

#### Objetivo

Permitir que cada organizacao ajuste a prioridade de inventarios sem perder uma
formula explicavel e auditavel.

#### Tarefas

- [ ] Criar regras de prioridade configuraveis.
- [ ] Permitir ajustar pesos e faixas por organizacao.
- [ ] Validar que os pesos formam uma configuracao consistente.
- [ ] Versionar alteracoes nas regras.
- [ ] Mostrar a regra aplicada junto da pontuacao.
- [ ] Preservar a formula padrao como fallback.

#### Conceitos que devo aprender

- configuracao de regras de negocio;
- versionamento de configuracoes;
- explicabilidade de pontuacao;
- validacao de invariantes.

#### Criterios para considerar a fase concluida

- Uma organizacao pode configurar sua propria regra.
- A pontuacao continua deterministica e explicavel.
- Alteracoes novas nao reescrevem o historico de configuracoes.
- Uma organizacao nao consegue alterar regras de outra.

#### Checklist de conclusao

- [ ] Testar pesos validos e invalidos.
- [ ] Testar versionamento e vigencia.
- [ ] Testar pontuacao com a regra padrao e personalizada.
- [ ] Testar isolamento entre organizacoes.

---

### FASE 33 — PWA e temas visuais

**Status: NÃO INICIADA**

#### Objetivo

Melhorar o uso recorrente em dispositivos moveis e permitir preferencia visual.

#### Tarefas

- [ ] Transformar a aplicacao em PWA instalavel.
- [ ] Configurar manifest e icones.
- [ ] Definir estrategia de cache segura para dados autenticados.
- [ ] Criar tema claro.
- [ ] Criar tema escuro.
- [ ] Permitir alternar ou respeitar a preferencia do sistema.
- [ ] Validar contraste e legibilidade nos dois temas.

#### Conceitos que devo aprender

- service workers;
- cache de aplicacoes autenticadas;
- manifest web;
- preferencias de tema;
- acessibilidade visual.

#### Criterios para considerar a fase concluida

- A aplicacao pode ser instalada em um dispositivo compativel.
- O cache nao expoe dados de uma sessao ou organizacao para outra.
- Tema claro e escuro cobrem todas as telas principais.
- Contraste, teclado e responsividade permanecem adequados.

#### Checklist de conclusao

- [ ] Testar instalacao em desktop e mobile.
- [ ] Testar logout e troca de usuario com cache ativo.
- [ ] Testar tema claro e escuro.
- [ ] Validar acessibilidade visual.

---

## Marcos

### MVP

Fases 1–7.

O MVP esta pronto quando:

```text
Usuario
  -> possui organizacao
  -> importa CSV
  -> produtos sao processados
  -> dados sao salvos
  -> inventarios sao agrupados
  -> prioridades sao calculadas
```

### V1.0

Fases 8–16. Sistema pronto para utilizacao real.

### Portfolio

Fases 17–18. Projeto preparado para demonstracao publica.

### V2.0

Fases 19–33. Evolucao baseada em necessidades reais observadas durante o uso.
