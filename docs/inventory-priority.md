# Fórmula de prioridade de inventários

A pontuação varia de 0 a 100 e é calculada por subgrupo. Subgrupos sem itens
pendentes recebem prioridade `Atualizado` e pontuação zero.

## Pesos

| Fator | Peso | Normalização |
| --- | ---: | --- |
| Quantidade pendente | 35 | Escala logarítmica, referência de 200 SKUs |
| Percentual pendente | 25 | Pendentes dividido pelo total |
| Antiguidade | 20 | Dias desde o pendente mais antigo, limitado a 3 anos |
| Itens sem data | 10 | Sem data dividido pelo total |
| Volume do subgrupo | 10 | Escala logarítmica, referência de 500 SKUs |

As escalas logarítmicas valorizam volume sem permitir que números muito grandes
eliminem os demais fatores. Ao mesmo tempo, quantidade pendente e volume somam
45 pontos; por isso um subgrupo com apenas um item antigo não domina
automaticamente outro com muitos itens pendentes.

## Faixas

| Pontuação | Prioridade |
| --- | --- |
| 70 ou mais | Urgente |
| 50 a 69,9 | Alta |
| 30 a 49,9 | Média |
| Abaixo de 30 | Baixa |
| Sem pendências | Atualizado |

Esta é a fórmula inicial do MVP. Os pesos só devem mudar após validação com o
uso real e novos casos de teste.
