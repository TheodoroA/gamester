---
name: gerar-transcricao-granola
description: Use quando o usuário pedir uma transcrição editorial de uma nota do Granola para refinamento de produto na Plataforma Syn, informando ID, nome ou a última nota da pasta SYN.
---

# Transcrição editorial de nota do Granola

Gere um registro **completo dos assuntos pertinentes à reunião**, em PT-BR e com visão de PM/PO. O resultado é uma transcrição editorial organizada, não uma reprodução literal de cada fala. Use a nota e a transcrição do Granola como fonte; não apresente resumo automático, documentação do projeto ou inferência como se fossem fala comprovada.

## Selecionar a nota

Aceite três formas de seleção na invocação: **ID da nota**, **nome da nota** ou **“última da pasta SYN”**. Se não houver seletor, pergunte qual das três o usuário quer. Não presuma que “última” significa a última nota já usada em outra execução.

1. Use o conector Granola disponível na sessão. Localize a pasta `SYN` pelo título em cada execução; não fixe um ID antigo.
2. Para **ID**, busque a nota por esse ID e confirme título, data e origem. Para **nome**, localize as candidatas no Granola e confira o título; se houver mais de uma correspondência plausível, peça ao usuário que escolha. Para **última**, liste as notas da pasta `SYN` e selecione a de data e hora mais recente. Se o intervalo retornado estiver vazio, amplie a busca antes de concluir que não há notas.
3. Se o usuário indicar explicitamente outra pasta, use essa pasta. Se a nota indicada não puder ser localizada ou sua identificação continuar ambígua, pare e informe o que falta; não substitua por outra nota.

## Recuperar e interpretar

1. Obtenha os metadados e as notas da reunião e **a transcrição integral** pelo ID selecionado. Confira que os resultados pertencem à mesma nota. Para uma transcrição longa, processe a resposta em partes até cobrir todo o texto. Saída truncada na exibição não é prova de que o texto inteiro foi lido.
2. Se a transcrição integral não puder ser recuperada, não gere um arquivo rotulado como transcrição completa. Explique a limitação. Um resumo detalhado do Granola só pode fundamentar um registro **condensado**, claramente identificado como tal, se o usuário optar por esse formato.
3. Preserve fatos, exemplos, regras, decisões, objeções, responsáveis, prazos, dependências e perguntas de produto. Remova saudações, repetições, falas de navegação de tela, ruído de reconhecimento e conversas sem relação com a pauta. Corrija termos mal reconhecidos apenas quando o contexto ou a nomenclatura do projeto os confirmar; marque a incerteza restante como `[VALIDAR]`.
4. Distinga sempre: comportamento **relatado**, observado na reunião, documentado, proposto, acordado, aprovado para implementação e efetivamente implementado. A reunião não comprova sozinha o estado atual do código ou da produção. Áudio rotulado `Microphone`/`System audio` não identifica necessariamente uma pessoa; não atribua fala a alguém sem evidência.

## Redigir e salvar

1. Leia o estado **atual** de `template-trancription.md`, na mesma pasta desta skill, e um exemplo em `docs/refinement/calls/`. Use as seções do template como guia, adaptando os títulos ao tema da reunião. Não invente uma ordem de prioridade quando a reunião não a definiu; registre o encaminhamento real. Preencha referências apenas com arquivos efetivamente conferidos.
2. Organize o conteúdo com visão de PM/PO: objetivo e contexto; problemas e evidências; fatias ou regras discutidas; decisões consolidadas; pontos a refinar; pendências com responsáveis e prazos quando ditos; questões em aberto. Preserve divergências e marque `[VALIDAR]` em vez de resolvê-las por suposição. Inclua na identificação título, link, ID, data, horário e pasta de origem da nota. Declare que o texto é editorial e não literal.
3. Salve em `docs/refinement/calls/<dd-MM-yyyy>/<nome-resumido-da-nota>.md`. Use a **data da nota no fuso America/Sao_Paulo**, não a data da execução, e um nome curto em kebab-case. A invocação autoriza criar esse arquivo. Se ele já existir, compare seu conteúdo e preserve edições anteriores; atualize-o somente se o pedido incluir revisão/substituição ou depois de apresentar ao usuário a mudança proposta.
4. Não altere o template, outras transcrições, regras de negócio ou código de produto como efeito colateral. Não faça commit, push, merge ou deploy sem pedido específico.

## Conferir antes de responder

- Releia o arquivo gerado contra **toda** a transcrição recuperada para identificar assunto pertinente omitido, afirmação sem fonte, decisão confundida com hipótese e dúvida tratada como resolvida.
- Confira título, ID, link, data, horário, pasta, caminho de saída e ausência de trechos de ruído. Verifique o status do Git para separar seu arquivo de alterações preexistentes.
- Informe o caminho do arquivo e, em poucas linhas, as decisões e lacunas mais importantes. Descreva a verificação feita; não declare revisão humana ou implementação concluída.
