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

**Status: NÃO INICIADA**

#### Objetivo

Criar a infraestrutura de persistencia.

#### Tarefas

- [ ] Criar projeto PostgreSQL no Neon.
- [ ] Configurar a variavel `DATABASE_URL`.
- [ ] Usar Prisma como ORM.
- [ ] Configurar o ORM.
- [ ] Criar migrations.
- [ ] Testar conexao.
- [ ] Garantir que `.env` esteja no `.gitignore`.

#### Conceitos que devo aprender

- PostgreSQL;
- ORM;
- migrations;
- variaveis de ambiente;
- conexao com banco.

#### Criterios para considerar a fase concluida

- A escolha do ORM foi justificada e registrada.
- O ORM esta configurado para PostgreSQL.
- A conexao com o banco foi testada sem expor credenciais.
- As migrations executam corretamente.
- Arquivos de ambiente nao sao versionados.

#### Checklist de conclusao

- [ ] Confirmar que `DATABASE_URL` funciona localmente.
- [ ] Executar as migrations em um banco de desenvolvimento.
- [ ] Validar uma operacao simples de conexao.
- [ ] Confirmar `.env` no `.gitignore`.
- [ ] Confirmar que nenhum secret foi commitado.

---

### FASE 3 — Organizacoes e usuarios

**Status: NÃO INICIADA**

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

- [ ] Criar tabela `organizations`.
- [ ] Criar tabela `users`.
- [ ] Criar relacionamento usuario -> organizacao.
- [ ] Entender PK e FK.
- [ ] Criar dados locais de teste.
- [ ] Garantir isolamento logico entre organizacoes.

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

- [ ] Executar migrations da fase.
- [ ] Inserir organizacoes e usuarios de teste.
- [ ] Testar PKs e FKs.
- [ ] Testar isolamento com duas organizacoes.

---

### FASE 4 — Produtos

**Status: NÃO INICIADA**

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

- [ ] Criar tabela `products`.
- [ ] Criar relacionamento com `organization`.
- [ ] Criar constraint de unicidade adequada.
- [ ] Criar pagina Produtos.
- [ ] Listar produtos.
- [ ] Implementar paginacao.
- [ ] Pesquisar por descricao.
- [ ] Pesquisar por PLU.
- [ ] Pesquisar por codigo de barras.
- [ ] Filtrar por secao.
- [ ] Filtrar por grupo.
- [ ] Filtrar por subgrupo.

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

- [ ] Testar criacao de produtos com PLUs iguais em organizacoes diferentes.
- [ ] Testar rejeicao de PLU duplicado na mesma organizacao.
- [ ] Testar paginacao.
- [ ] Testar todos os campos de busca e filtro.
- [ ] Validar desktop e mobile.

---

### FASE 5 — Importacao de CSV

**Status: NÃO INICIADA**

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

- [ ] Criar pagina de importacao.
- [ ] Criar upload.
- [ ] Fazer parser do CSV.
- [ ] Identificar separador.
- [ ] Tratar encoding quando necessario.
- [ ] Validar cabecalhos.
- [ ] Validar PLU.
- [ ] Converter datas.
- [ ] Converter numeros com virgula.
- [ ] Tratar campos vazios.
- [ ] Criar produtos inexistentes.
- [ ] Atualizar produtos existentes.
- [ ] Processar registros eficientemente.
- [ ] Mostrar progresso/estado da importacao.
- [ ] Mostrar resumo final.
- [ ] Garantir que produtos sejam associados somente a organizacao atual.

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

- [ ] Testar CSV valido com separador por virgula.
- [ ] Testar CSV valido com separador por ponto e virgula.
- [ ] Testar cabecalhos invalidos.
- [ ] Testar datas e numeros com virgula.
- [ ] Testar campos vazios e linhas invalidas.
- [ ] Testar produtos novos e existentes.
- [ ] Testar importacao com mais de uma organizacao.
- [ ] Validar o resumo final.

---

### FASE 6 — Historico de importacoes

**Status: NÃO INICIADA**

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

- [ ] Criar tabela `imports`.
- [ ] Relacionar importacao a organizacao.
- [ ] Registrar cada importacao.
- [ ] Criar pagina Historico de Importacoes.
- [ ] Mostrar data.
- [ ] Mostrar arquivo.
- [ ] Mostrar registros processados.
- [ ] Mostrar inseridos.
- [ ] Mostrar atualizados.
- [ ] Mostrar erros.

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

- [ ] Executar uma importacao e confirmar seu registro.
- [ ] Validar todos os contadores do historico.
- [ ] Validar ordenacao por data.
- [ ] Testar isolamento entre organizacoes.

---

### FASE 7 — Motor de inventarios

**Status: NÃO INICIADA**

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

- [ ] Criar consulta agregada.
- [ ] Agrupar Secao -> Grupo -> Subgrupo.
- [ ] Criar formula inicial de prioridade.
- [ ] Documentar os pesos.
- [ ] Criar ranking por secao.
- [ ] Criar pagina Inventarios.
- [ ] Aplicar cores.
- [ ] Permitir filtro por secao.
- [ ] Permitir filtro por prioridade.
- [ ] Permitir mostrar somente pendentes.

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

- [ ] Testar agregacoes com dados conhecidos.
- [ ] Testar produtos contados no ano atual.
- [ ] Testar itens sem data.
- [ ] Testar ranking independente por secao.
- [ ] Testar o caso de subgrupo pequeno versus subgrupo volumoso.
- [ ] Testar filtros e cores de prioridade.
- [ ] Validar o fluxo completo com um CSV.

#### Criterio do MVP

Ao terminar esta fase, deve ser possivel executar:

```text
CSV -> banco -> produtos -> inventarios -> prioridades
```

Quando isso funcionar, o MVP estara concluido.

---

## VERSAO 1.0

### FASE 8 — Dashboard

**Status: NÃO INICIADA**

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

- [ ] Criar cards.
- [ ] Criar consultas.
- [ ] Criar resumo por secao.
- [ ] Criar graficos.
- [ ] Garantir responsividade.

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

- [ ] Conferir cards com dados conhecidos.
- [ ] Conferir resumo por secao.
- [ ] Conferir os tres graficos.
- [ ] Validar desktop e mobile.

---

### FASE 9 — Historico de estoque

**Status: NÃO INICIADA**

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

- [ ] Criar tabela `stock_history`.
- [ ] Relacionar produto.
- [ ] Relacionar importacao.
- [ ] Registrar snapshot.
- [ ] Preservar snapshots antigos.
- [ ] Calcular estoque anterior.
- [ ] Calcular estoque atual.
- [ ] Calcular variacao.

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

- [ ] Executar duas importacoes do mesmo produto.
- [ ] Confirmar os dois snapshots.
- [ ] Confirmar estoque anterior e atual.
- [ ] Confirmar calculo da variacao.
- [ ] Testar produto novo sem estoque anterior.

---

### FASE 10 — Pagina individual do produto

**Status: NÃO INICIADA**

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

- [ ] Criar rota dinamica.
- [ ] Criar informacoes gerais.
- [ ] Mostrar historico.
- [ ] Criar grafico de evolucao.

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

- [ ] Abrir produto existente pela rota.
- [ ] Testar produto inexistente.
- [ ] Conferir informacoes gerais.
- [ ] Conferir historico e grafico.
- [ ] Testar isolamento entre organizacoes.

---

### FASE 11 — Autenticacao

**Status: NÃO INICIADA**

#### Objetivo

Identificar corretamente o usuario.

#### Funcionalidades

- login;
- logout;
- sessao;
- paginas protegidas;
- APIs protegidas.

#### Tarefas

- [ ] Escolher solucao de autenticacao.
- [ ] Implementar login.
- [ ] Implementar logout.
- [ ] Criar sessao.
- [ ] Proteger paginas.
- [ ] Proteger APIs.

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

- [ ] Testar login valido.
- [ ] Testar credenciais invalidas.
- [ ] Testar logout.
- [ ] Acessar pagina protegida sem sessao.
- [ ] Chamar API protegida sem sessao.

---

### FASE 12 — Autorizacao e isolamento

**Status: NÃO INICIADA**

#### Objetivo

Garantir seguranca entre organizacoes.

#### Regra

Todas as consultas relevantes devem considerar `organization_id`. Nunca
confiar em `organization_id` enviado livremente pelo frontend quando ele puder
ser obtido da sessao.

#### Tarefas

- [ ] Revisar consultas para exigir `organization_id`.
- [ ] Obter a organizacao a partir da sessao.
- [ ] Impedir acesso cruzado em paginas.
- [ ] Impedir acesso cruzado em APIs.
- [ ] Criar testes de isolamento.

#### Testes obrigatorios

- [ ] Usuario A ve produtos da organizacao A.
- [ ] Usuario B ve produtos da organizacao B.
- [ ] Usuario A nao acessa produto da organizacao B pela URL.
- [ ] Usuario A nao acessa historico da organizacao B.
- [ ] Usuario A nao acessa importacoes da organizacao B.
- [ ] APIs tambem impedem acesso cruzado.

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

- [ ] Auditar consultas de produtos.
- [ ] Auditar consultas de historico.
- [ ] Auditar consultas de importacoes.
- [ ] Executar todos os testes obrigatorios.
- [ ] Testar manipulacao de parametros pelo cliente.

---

### FASE 13 — Seguranca da importacao

**Status: NÃO INICIADA**

#### Objetivo

Tornar a importacao resistente a arquivos invalidos, abusivos ou duplicados.

#### Tarefas

- [ ] Limitar tamanho do arquivo.
- [ ] Validar extensao.
- [ ] Validar conteudo.
- [ ] Validar cabecalhos.
- [ ] Tratar CSV corrompido.
- [ ] Tratar linhas invalidas.
- [ ] Validar quantidade de registros.
- [ ] Usar transacao quando apropriado.
- [ ] Evitar importacoes duplicadas acidentais.
- [ ] Criar mensagens de erro compreensiveis.

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

- [ ] Testar arquivo acima do limite.
- [ ] Testar extensao e conteudo invalidos.
- [ ] Testar CSV corrompido.
- [ ] Testar muitas linhas e linhas invalidas.
- [ ] Testar falha durante o processamento.
- [ ] Testar importacao duplicada.
- [ ] Conferir mensagens para o usuario.

---

### FASE 14 — Melhorias de UX

**Status: NÃO INICIADA**

#### Objetivo

Melhorar a eficiencia e a clareza das telas principais.

#### Inventarios

- [ ] Pesquisa.
- [ ] Filtro por secao.
- [ ] Filtro por prioridade.
- [ ] Somente pendentes.
- [ ] Somente urgentes.
- [ ] Ordenacao.
- [ ] Expandir Grupo -> Subgrupo.

#### Produtos

- [ ] Paginacao.
- [ ] Busca rapida.
- [ ] Filtros combinados.
- [ ] Loading states.
- [ ] Empty states.
- [ ] Tratamento visual de erros.

#### Importacao

- [ ] Drag and drop.
- [ ] Previa.
- [ ] Loading.
- [ ] Resultado detalhado.

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

- [ ] Testar cada recurso de Inventarios.
- [ ] Testar cada recurso de Produtos.
- [ ] Testar cada recurso de Importacao.
- [ ] Validar loading, empty e erro.
- [ ] Validar teclado e responsividade basica.

---

### FASE 15 — Deploy

**Status: NÃO INICIADA**

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

- [ ] Criar repositorio GitHub.
- [ ] Revisar `.gitignore`.
- [ ] Remover secrets.
- [ ] Configurar variaveis na Vercel.
- [ ] Configurar Neon de producao.
- [ ] Executar migrations.
- [ ] Fazer deploy.
- [ ] Testar producao.
- [ ] Testar upload.
- [ ] Testar banco.
- [ ] Testar autenticacao.
- [ ] Testar isolamento entre organizacoes.

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

- [ ] Revisar historico e arquivos versionados.
- [ ] Configurar ambiente de producao.
- [ ] Executar migrations de producao.
- [ ] Validar deploy.
- [ ] Executar todos os testes de producao.
- [ ] Confirmar que nao existem secrets ou dados reais publicados.

---

## PORTFOLIO

### FASE 16 — Conta demonstrativa

**Status: NÃO INICIADA**

#### Objetivo

Permitir demonstracao publica sem divulgar informacoes reais.

Dados ficticios sao necessarios apenas para a organizacao DEMO. Usuarios reais
continuarao importando seus proprios dados.

#### Tarefas

- [ ] Criar organizacao Demo.
- [ ] Gerar produtos ficticios.
- [ ] Gerar inventarios ficticios.
- [ ] Gerar estoques ficticios.
- [ ] Gerar historico ficticio.
- [ ] Criar usuario demo.

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

- [ ] Criar e validar a organizacao Demo.
- [ ] Validar dados ficticios em todas as telas.
- [ ] Testar o usuario demo.
- [ ] Auditar a demonstracao em busca de dados reais.

---

### FASE 17 — README e apresentacao

**Status: NÃO INICIADA**

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

- [ ] Documentar o problema.
- [ ] Documentar a solucao e funcionalidades.
- [ ] Documentar stack e arquitetura.
- [ ] Documentar banco e importacao.
- [ ] Documentar algoritmo de prioridade.
- [ ] Documentar multi-tenancy e seguranca.
- [ ] Adicionar screenshots seguros.
- [ ] Documentar instalacao e deploy.
- [ ] Documentar aprendizados e melhorias futuras.
- [ ] Criar descricao para portfolio.
- [ ] Revisar o material para remover informacoes sensiveis.

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

- [ ] Seguir o README do zero em um ambiente limpo.
- [ ] Revisar links, screenshots e comandos.
- [ ] Revisar informacoes confidenciais.
- [ ] Revisar a descricao de portfolio.

---

## VERSAO 2.0 — BACKLOG

Estas funcionalidades nao fazem parte do MVP.

- [ ] Planejamento de inventarios.
- [ ] Data prevista da contagem.
- [ ] Responsavel pela contagem.
- [ ] Status: Pendente / Programado / Em andamento / Finalizado.
- [ ] Metas por secao.
- [ ] Cobertura mensal.
- [ ] Alertas.
- [ ] Notificacoes.
- [ ] Exportacao Excel.
- [ ] Exportacao PDF.
- [ ] Comparacao entre periodos.
- [ ] Auditoria de alteracoes.
- [ ] Perfis e permissoes.
- [ ] Administrador da organizacao.
- [ ] Convite de funcionarios.
- [ ] Multiplas lojas por organizacao.
- [ ] Configuracao personalizada do CSV.
- [ ] Mapeamento de colunas de diferentes ERPs.
- [ ] Regras de prioridade configuraveis.
- [ ] PWA.
- [ ] Tema claro/escuro.

#### Criterio para iniciar o backlog

Nenhuma funcionalidade da Versao 2.0 deve ser implementada antes da
conclusao e autorizacao das fases previstas para o MVP, V1.0 e Portfolio,
salvo nova autorizacao explicita.

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

Fases 8–15. Sistema pronto para utilizacao real.

### Portfolio

Fases 16–17. Projeto preparado para demonstracao publica.

### V2.0

Backlog baseado em necessidades reais observadas durante o uso.
