# Demeter Realm — V2 aprimorada

Versão experimental e isolada do site Demeter Realm. A experiência original da árvore procedural, o percurso cinematográfico, os balões, os produtos e os contatos foram preservados.

## Como abrir

Abra `index.html` em um navegador moderno ou, a partir desta pasta, execute:

```powershell
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Melhorias desta versão

- metadados de descrição, tema e compartilhamento social;
- link para pular ao conteúdo e foco de teclado visível;
- menu móvel expansível com estados acessíveis;
- controle manual de movimento com preferência salva localmente;
- comportamento adequado para `prefers-reduced-motion` e `prefers-contrast`;
- barra discreta de progresso da jornada;
- jornada iniciada somente pelo CTA, com percurso automático lento que termina nas raízes e pode ser cancelado por qualquer interação;
- enquadramento mobile das raízes com área de contemplação antes da seção de contato;
- curva de câmera responsiva, sem trecho morto longo entre a copa e os galhos;
- identidade visual oficial aplicada ao cabeçalho, favicon, tela inicial, compartilhamento social e encerramento;
- indicação de seção atual com `aria-current`;
- pausa do ciclo de renderização quando a aba fica oculta;
- proteção `noopener noreferrer` em links externos;
- cards de produtos sem links vazios enquanto não houver destinos reais;
- mensagem alternativa quando JavaScript está desativado.

## Limites preservados

- nenhuma URL de produto foi inventada;
- textos provisórios continuam provisórios;
- não há dependências nem etapa de build;
- `script_pc_pure.js` foi mantido como referência da versão de origem, mas não é carregado pela página.

## Arquivos

- `index.html` — estrutura e metadados;
- `favicon.svg` — ícone vetorial inspirado na semente da marca;
- `brand-mark.png` — identidade oficial em alta resolução, usada no encerramento e compartilhamento;
- `brand-icon.png` — recorte otimizado da mesma marca para cabeçalho, favicon e atalhos mobile;
- `styles.css` — identidade visual, responsividade e acessibilidade;
- `script.js` — árvore procedural, jornada e controles da V2;
- `script_pc_pure.js` — variante de referência preservada da origem.
