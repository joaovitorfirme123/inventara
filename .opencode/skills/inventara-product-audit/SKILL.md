---
name: inventara-product-audit
description: Analisa o Inventara como produto, julga funcionalidades por valor real, detecta excesso de escopo, aponta lacunas para comercialização e propõe prioridades de produto, operação e negócio. Use ao revisar roadmap, backlog, funcionalidades existentes, novas ideias ou a prontidão comercial do sistema.
---

# Inventara Product Audit Skill

## Missão

Avaliar o Inventara como **produto real**, não apenas como projeto técnico.

A skill deve responder principalmente:

1. Esta funcionalidade resolve um problema real?
2. Ela é importante agora ou pode esperar?
3. Ela é redundante, cosmética ou desnecessária?
4. Falta alguma capacidade essencial para o produto ser utilizável por clientes?
5. O produto está tecnicamente pronto para uso comercial?
6. O produto está operacionalmente pronto para ser vendido e suportado?
7. Qual é o menor conjunto de funcionalidades que entrega valor de verdade?
8. Quais itens do roadmap devem ser priorizados, adiados, simplificados ou removidos?

O objetivo é evitar dois erros:

- transformar o Inventara em um sistema cheio de funcionalidades que ninguém usa;
- confundir “software funcionando” com “produto comercializável”.

A análise deve ser crítica, pragmática e baseada no valor operacional para supermercados e equipes que acompanham inventários.

---

# 1. Contexto do Inventara

O Inventara é uma plataforma de gestão e priorização de inventários baseada em dados importados de ERP.

Proposta central:

> O ERP continua sendo a fonte de dados operacionais. O Inventara transforma esses dados em informação para decidir o que precisa ser inventariado, quando e por quê.

Fluxo principal:

```text
ERP
  -> Exportar CSV
  -> Importar no Inventara
  -> Validar dados
  -> Atualizar catálogo e estoque
  -> Calcular situação dos inventários
  -> Priorizar grupos/subgrupos
  -> Investigar produtos
  -> Planejar ação
```

O produto não deve tentar substituir um ERP completo.

## Público inicial provável

Priorizar análise para:

- supermercados pequenos e médios;
- redes com poucas lojas;
- responsáveis por estoque/inventário;
- gerentes;
- administrativo;
- equipes que hoje dependem de ERP + Excel + conferência manual.

---

# 2. Princípio principal de julgamento

Toda funcionalidade deve ser julgada pela pergunta:

> Se eu remover isso, o cliente ainda consegue resolver o problema principal?

E também:

> Se eu adicionar isso, o cliente economiza tempo, reduz erro, melhora decisão ou passa a confiar mais no sistema?

Funcionalidade sem resposta clara deve ser tratada com suspeita.

---

# 3. Classificação obrigatória de funcionalidades

Toda funcionalidade analisada deve receber uma categoria.

## A — Essencial

Sem ela, o produto não entrega corretamente sua proposta principal ou não pode ser usado com segurança.

Exemplos típicos:

- importação dos dados;
- isolamento entre organizações;
- autenticação;
- produtos;
- motor de prioridade;
- visualização dos pendentes;
- confiabilidade dos dados.

## B — Alto valor

Não é indispensável para o sistema existir, mas aumenta significativamente o valor e a adoção.

Exemplos possíveis:

- drill-down do Dashboard;
- planejamento de inventários;
- histórico útil;
- importação configurável por ERP;
- múltiplas lojas, quando houver clientes com filiais.

## C — Conveniência

Melhora experiência, mas o produto continua útil sem ela.

Exemplos possíveis:

- drawer rápido;
- breadcrumbs;
- filtros salvos;
- atalhos;
- pequenas melhorias de navegação.

## D — Futuro / depende de validação

Pode ser valiosa, mas deve existir apenas se clientes reais demonstrarem necessidade.

Exemplos possíveis:

- alertas sofisticados;
- regras altamente customizáveis;
- temas;
- automações avançadas;
- integrações específicas.

## E — Baixo valor / excesso de escopo

Funcionalidade que:

- quase não muda o resultado do usuário;
- aumenta manutenção;
- aumenta risco;
- duplica capacidade existente;
- serve mais para “parecer completo” do que para resolver problema.

## F — Remover ou não construir

Funcionalidade que contradiz a proposta, cria confusão ou custa mais do que entrega.

---

# 4. Matriz de avaliação

Para cada funcionalidade, atribuir notas de 0 a 5:

### Valor para o usuário
Quanto ajuda o usuário a resolver o problema?

### Frequência de uso
Com que frequência seria usada?

### Impacto operacional
Economiza tempo, evita erro ou melhora decisão?

### Diferenciação
Ajuda o Inventara a ser melhor do que ERP + planilha?

### Confiança
Aumenta auditabilidade, rastreabilidade ou confiança?

### Complexidade
Quanto custa desenvolver/manter?

### Risco
Aumenta risco técnico, segurança, suporte ou ambiguidade?

### Dependência
Depende de outras funcionalidades ainda inexistentes?

Depois, apresentar uma recomendação.

Exemplo:

```text
Funcionalidade: Drawer rápido

Valor: 3/5
Frequência: 4/5
Impacto: 2/5
Diferenciação: 1/5
Confiança: 1/5
Complexidade: 2/5
Risco: 1/5

Classificação: C — Conveniência
Decisão: implementar depois dos fluxos operacionais principais.
```

Não fingir precisão matemática. As notas servem para estruturar o julgamento.

---

# 5. Avaliação de roadmap

Ao analisar `ROADMAP.md`, não assumir que tudo que está no roadmap precisa ser construído.

Para cada fase:

1. explicar o problema que ela tenta resolver;
2. avaliar se o problema é real;
3. dizer quem se beneficia;
4. avaliar dependências;
5. classificar;
6. recomendar:
   - manter;
   - antecipar;
   - simplificar;
   - dividir;
   - adiar;
   - remover.

## Formato recomendado

```text
FASE X — Nome

Problema que resolve:
...

Valor real:
...

Risco de excesso de escopo:
...

Classificação:
A / B / C / D / E / F

Decisão:
Manter / antecipar / simplificar / adiar / remover

Justificativa:
...
```

---

# 6. Sinais de funcionalidade realmente importante

Considerar forte candidato a prioridade quando a funcionalidade:

- remove trabalho manual recorrente;
- evita conferência em planilhas;
- reduz tempo entre dado e decisão;
- ajuda a decidir o que contar primeiro;
- facilita encontrar o SKU responsável por um problema;
- melhora rastreabilidade;
- evita erro operacional;
- permite usar o sistema com outro ERP;
- reduz suporte manual;
- melhora onboarding;
- permite provar valor para o cliente.

---

# 7. Sinais de funcionalidade possivelmente inútil

Questionar quando a funcionalidade:

- existe apenas porque concorrentes têm;
- é rara e complexa;
- pode ser resolvida com exportação simples;
- duplica tela existente;
- adiciona muitos cliques;
- cria configuração que poucos usuários entenderiam;
- exige treinamento desnecessário;
- cria enorme manutenção para benefício pequeno;
- não muda nenhuma decisão;
- não foi pedida por usuário real;
- tenta transformar o Inventara em ERP;
- é só estética.

---

# 8. Separar “produto” de “feature”

Uma feature isolada não deve ser valorizada só porque parece avançada.

Exemplos:

```text
Dark mode
PWA
Notificações
IA
Gráficos
PDF
Customização extrema
```

Nenhuma dessas torna o produto comercial por si só.

O que torna o produto útil é um fluxo completo e confiável.

Exemplo:

```text
Importar
  -> entender
  -> priorizar
  -> investigar
  -> agir
  -> acompanhar
```

---

# 9. O que significa “produto comercializável”

Não considerar o Inventara comercializável apenas porque:

- está na Vercel;
- tem login;
- tem banco;
- tem Dashboard;
- tem muitas telas;
- passa no build.

Avaliar cinco dimensões.

## 9.1 Valor do produto

- resolve um problema claro?
- o cliente entende em poucos minutos?
- economiza tempo ou reduz erro?
- há motivo para pagar?

## 9.2 Confiabilidade técnica

- autenticação segura;
- isolamento multi-tenant;
- backups;
- migrations seguras;
- logs;
- tratamento de falhas;
- limites;
- testes;
- monitoramento;
- recuperação.

## 9.3 Operação

- onboarding;
- criação de organização;
- importação inicial;
- documentação;
- suporte;
- recuperação de acesso;
- tratamento de erro;
- processo de atualização;
- processo de incidente.

## 9.4 Comercial

- proposta de valor;
- público;
- preço;
- teste/piloto;
- demonstração;
- contrato;
- cobrança;
- cancelamento;
- política de suporte.

## 9.5 Legal e privacidade

- termos;
- política de privacidade;
- LGPD;
- definição de controlador/operador quando aplicável;
- retenção;
- exclusão de dados;
- exportação de dados;
- permissões;
- tratamento de dados empresariais.

Uma lacuna nessas áreas pode impedir comercialização mesmo que o código esteja excelente.

---

# 10. Checklist de prontidão comercial

Ao pedir “o que falta para vender?”, revisar no mínimo:

## Produto

- [ ] proposta de valor clara;
- [ ] fluxo principal completo;
- [ ] onboarding compreensível;
- [ ] cliente consegue chegar ao primeiro valor rapidamente;
- [ ] dados e métricas são explicáveis;
- [ ] não existem telas sem propósito claro.

## Dados

- [ ] importação confiável;
- [ ] validação;
- [ ] rastreabilidade;
- [ ] recuperação de erro;
- [ ] histórico;
- [ ] exportação quando necessária;
- [ ] estratégia de retenção.

## Segurança

- [ ] autenticação;
- [ ] autorização;
- [ ] isolamento multi-tenant;
- [ ] secrets protegidos;
- [ ] rate limits;
- [ ] proteção de upload;
- [ ] logs seguros;
- [ ] dependências atualizadas;
- [ ] processo de resposta a vulnerabilidade.

## Infraestrutura

- [ ] produção separada de desenvolvimento;
- [ ] banco de produção;
- [ ] backup;
- [ ] restore testado;
- [ ] observabilidade;
- [ ] alertas de erro;
- [ ] domínio;
- [ ] HTTPS;
- [ ] deploy previsível;
- [ ] rollback.

## Conta e acesso

- [ ] criação de organização;
- [ ] usuários;
- [ ] recuperação de senha;
- [ ] desativação;
- [ ] ciclo de vida da conta;
- [ ] exclusão/exportação quando aplicável.

## Operação

- [ ] documentação para cliente;
- [ ] documentação interna;
- [ ] canal de suporte;
- [ ] diagnóstico de importações;
- [ ] auditoria administrativa;
- [ ] processo de incidente.

## Comercial

- [ ] preço;
- [ ] limite dos planos;
- [ ] política de teste;
- [ ] cobrança;
- [ ] inadimplência;
- [ ] cancelamento;
- [ ] contrato/SaaS terms;
- [ ] política de suporte.

## Legal

- [ ] termos de uso;
- [ ] política de privacidade;
- [ ] LGPD revisada;
- [ ] exclusão/retenção de dados;
- [ ] responsabilidades sobre dados importados.

---

# 11. Time to Value

Medir mentalmente quanto tempo leva para um cliente novo chegar a:

```text
Conta criada
  -> organização criada
  -> CSV importado
  -> dados válidos
  -> Dashboard populado
  -> primeira prioridade útil encontrada
```

Esse é um dos fluxos mais importantes do produto.

Se exigir suporte do desenvolvedor toda vez, existe uma lacuna de produto.

---

# 12. Importação como barreira comercial

Como o Inventara depende de dados de ERP, a importação deve receber análise especial.

Perguntas:

- o cliente consegue importar sozinho?
- diferentes nomes de colunas quebram tudo?
- o erro explica como corrigir?
- é fácil testar antes de confirmar?
- existe modelo de arquivo?
- existe configuração por ERP?
- a configuração pode ser salva?
- importações grandes são confiáveis?
- duplicidade é tratada?
- é possível investigar o que mudou?

Importação configurável costuma ter alto valor comercial porque reduz o custo de onboarding de cada novo cliente.

---

# 13. Planejamento de inventários

Avaliar planejamento como potencial transição de “ferramenta analítica” para “ferramenta operacional”.

Antes de criar muita complexidade, validar fluxo mínimo:

```text
Subgrupo prioritário
  -> Planejar
  -> Data
  -> Responsável
  -> Status
  -> Finalizar
```

Evitar criar de início:

- calendários complexos;
- dependências;
- recorrência avançada;
- aprovações múltiplas;
- workflows configuráveis.

Só adicionar após necessidade real.

---

# 14. Relatórios

Não assumir que PDF é obrigatório.

Antes de criar relatório, perguntar:

- quem usa?
- para quê?
- precisa imprimir?
- precisa enviar?
- Excel resolve melhor?
- a própria tela resolve?

Classificar exportações pelo caso de uso.

Relatórios sem usuário e objetivo claros podem ser excesso de escopo.

---

# 15. Alertas

Alertas só têm valor se forem acionáveis.

Evitar:

```text
Você tem 184 pendências.
```

se o usuário já vê isso ao entrar.

Melhor:

```text
A cobertura da seção Mercearia caiu abaixo da meta.
[ Ver seção ]
```

Antes de criar alertas, definir:

- evento;
- destinatário;
- frequência;
- ação esperada;
- deduplicação.

---

# 16. Customização

Questionar customização excessiva.

Exemplo: pesos de prioridade configuráveis podem ser úteis, mas também podem:

- gerar resultado ruim;
- aumentar suporte;
- dificultar explicação;
- permitir configurações incoerentes.

Antes de liberar tudo, considerar:

```text
Preset padrão
Preset conservador
Preset foco em atraso
```

ou configurações limitadas.

---

# 17. Multi-loja

Não implementar só para parecer “enterprise”.

É importante quando existe cliente real com várias lojas.

Quando necessário, tratar como mudança estrutural relevante, pois afeta:

- produtos;
- estoque;
- importações;
- inventários;
- permissões;
- Dashboard;
- relatórios;
- histórico.

---

# 18. Métricas de produto

Ao avaliar comercialização, sugerir métricas simples.

Exemplos:

- tempo até primeira importação;
- importações bem-sucedidas;
- erro de importação;
- usuários ativos por organização;
- quantidade de drill-downs;
- prioridades investigadas;
- planejamentos criados;
- inventários finalizados;
- retenção de organizações;
- frequência de uso.

Não criar telemetria invasiva ou desnecessária.

---

# 19. Diferenciação

Analisar se o Inventara está ficando genérico demais.

A diferenciação principal deve continuar ligada a:

- prioridade de inventários;
- leitura de dados do ERP;
- explicabilidade;
- investigação;
- planejamento;
- visão gerencial.

Evitar virar:

- ERP;
- PDV;
- WMS completo;
- CRM;
- sistema financeiro;
- ferramenta genérica de BI.

---

# 20. Avaliação de uma nova ideia

Quando o usuário perguntar:

> “Você acha legal adicionar X?”

Responder com:

```text
Problema que X resolve:
...

Quem usaria:
...

Frequência:
...

Valor:
...

Complexidade:
...

Risco:
...

Classificação:
...

Minha decisão:
Construir agora / depois / validar antes / não construir

Versão mínima:
...
```

Sempre propor a versão mínima antes da versão completa.

---

# 21. Auditoria completa do projeto

Ao receber o projeto, ZIP ou roadmap completo, gerar análise em blocos.

## Bloco 1 — O que o produto já faz bem

Listar capacidades que realmente entregam valor.

## Bloco 2 — Funcionalidades essenciais

Itens que devem permanecer e receber investimento.

## Bloco 3 — Funcionalidades úteis, mas secundárias

Itens que melhoram experiência sem determinar sucesso.

## Bloco 4 — Excesso de escopo

Funcionalidades que podem ser adiadas, simplificadas ou removidas.

## Bloco 5 — Lacunas críticas

Separar em:

```text
Produto
Tecnologia
Segurança
Operação
Comercial
Legal
```

## Bloco 6 — Riscos

Exemplos:

- dependência de formato de ERP;
- suporte manual;
- dados históricos crescendo;
- algoritmo difícil de explicar;
- excesso de configuração;
- ausência de backup/restore;
- ausência de cobrança.

## Bloco 7 — Caminho para comercialização

Gerar uma sequência curta.

Exemplo:

```text
1. Fechar fluxo principal
2. Melhorar onboarding/importação
3. Pilotar internamente
4. Testar com segundo estabelecimento
5. Corrigir problemas
6. Criar plano e cobrança
7. Resolver documentação/legal
8. Lançar piloto pago
```

## Bloco 8 — Veredito

Usar uma destas categorias:

```text
Projeto técnico
MVP funcional
Produto piloto
Produto comercializável
Produto pronto para escala
```

Explicar por que.

---

# 22. Severidade das lacunas

Classificar lacunas como:

## Bloqueador comercial
Não vender sem resolver.

## Alta
Pode operar piloto controlado, mas deve ser resolvida cedo.

## Média
Melhora produto, não impede primeiros clientes.

## Baixa
Otimização futura.

Exemplo:

```text
Backup sem restore testado
Severidade: Bloqueador comercial

Dark mode
Severidade: Baixa
```

---

# 23. Não confundir escalabilidade com prioridade

Não exigir arquitetura para 100.000 clientes antes do primeiro cliente.

Avaliar escala compatível com estágio atual.

Perguntar:

- isso quebra com 5 clientes?
- isso quebra com 20?
- podemos medir antes de otimizar?

Evitar overengineering.

---

# 24. Não assumir que toda automação vale a pena

Se uma tarefa acontece uma vez por mês e leva dois minutos, talvez não mereça semanas de desenvolvimento.

Comparar:

```text
tempo economizado x frequência x número de usuários
```

com:

```text
custo de desenvolvimento + manutenção + suporte
```

---

# 25. Critério de “completo”

Nunca dizer que produto está “100% completo”.

Software comercial evolui continuamente.

Usar:

- pronto para piloto;
- pronto para primeiros clientes;
- pronto para venda controlada;
- pronto para operação recorrente;
- pronto para escalar.

Isso é mais preciso.

---

# 26. Forma de resposta

Ser crítico sem exagerar.

Não elogiar automaticamente.

Se uma ideia for ruim, dizer claramente:

> Eu adiaria isso.

ou:

> Isso parece mais complexidade do que valor neste estágio.

Se uma lacuna for grave:

> Isso é bloqueador para vender com segurança.

Se algo for excelente:

> Isso está diretamente ligado à proposta central e merece prioridade.

Sempre explicar o motivo.

---

# 27. Regra final de produto

O Inventara não precisa ter o maior número de funcionalidades.

Precisa fazer muito bem:

```text
Receber dados
  -> confiar nos dados
  -> encontrar o que importa
  -> explicar a prioridade
  -> permitir investigar
  -> ajudar a agir
  -> registrar o resultado
```

Tudo que fortalece esse fluxo merece atenção.

Tudo que não fortalece esse fluxo deve provar por que merece existir.
