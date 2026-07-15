# Demeter Forest Site — V7

Landing page da startup Demeter. Árvore procedural SVG com rolagem automática cinematográfica, copa botânica, tronco entrelaçado e três produtos emergindo das raízes.

## Como abrir

Abra `index.html` em qualquer navegador moderno. Sem dependências, sem build.

Para desenvolvimento com live-reload use **Live Server** no VS Code ou:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`.

---

## O que é novo na V7

### Folhas — UX botânico
- **6 formas botânicas**: elíptica, ovada, lanceolada, cordatum, oblonga, reniforme
- **Nervura central** em cada folha + nervuras laterais secundárias
- **Gradientes de 5 stops** com rim-light (luz na borda superior)
- **Depth fog**: folhas de fundo (`depth=back`) são menores (86%), mais opacas e usam o gradiente `leafDeep` (mais dessaturado)
- **Flutter 3D**: animação com `skewX` simula perspectiva
- **Parallax**: camada de fundo move 18% mais devagar → profundidade percebida

### Tronco — Material vivo
- **44 fibras** entrelaçadas (eram 34)
- **Raios de medula**: linhas radiais ultrafinas irradiando do centro do tronco
- **6 linhas de seiva** (eram 4) com brilho neon

### Rolagem automática — Cinematográfica
- **Pausas dramáticas** em cada âncora:
  - Copa: 15% do tempo (contemplação)
  - Tronco: 12% (descoberta)
  - Raízes: 12% (tensão antes dos produtos)
- Duração total: 52 segundos
- Reinício: 46 segundos

### Parallax de camadas
| Camada | Velocidade relativa | Efeito |
|--------|---------------------|--------|
| Névoa de copa | 72% da câmera | Muito distante |
| Foliage fundo | 82% da câmera | Fundo da copa |
| Tronco/galhos | 100% (câmera) | Plano de foco |
| Foliage frente | 107% da câmera | Próximo ao usuário |

### Produtos nas raízes
Os três produtos emergem exatamente nas pontas das raízes principais:
- **Dashboard Demeter** ← raiz esquerda (x=420)
- **Demeter GIS** ← raiz central (x=720)
- **DemeterKit** ← raiz direita (x=1020)

Cada produto tem: orb com gradiente, dois anéis (velocidades opostas), ícone vetorial, linha conectora com ponto pulsante, card com título + subtítulo.

### Design
- Tipografia: **Outfit** (display, pesos 200–600) + **Inter** (corpo)
- Hero: eyebrow com dot animado, h1 com gradiente animado, CTA como pill button
- Grid sutil no hero (linhas 88×88px com máscara radial)
- Seção de encerramento com três colunas de valor (Visão / Território / Execução)
- Partículas: 88% pó fino, 12% esporos maiores com trajetória em arco

---

## Rolagem automática

Inicia automaticamente ao carregar. Interrompida por:
- roda do mouse / trackpad
- toque na tela
- clique
- teclas de navegação (↑↓ PageUp/Down Home End Espaço)

Para abrir sem autoplay:
```
index.html?autoplay=0
```

---

## Ajuste de textos

`index.html`:
- Título: `<h1>Inteligência<br><span class="h1-gradient">que cria raízes.</span></h1>`
- Subtítulo: `<p class="hero-subtitle">Visão. Território. Execução.</p>`
- Closing: `.closing-name`, `.closing-tagline`, `.pillar-title`, `.pillar-desc`

`script.js`:
- Nomes e subtítulos dos produtos: `productDataDesktop` / `productDataMobile`

---

## Ajuste de cores

`styles.css` → `:root` (tokens globais)

`index.html` → bloco `<defs>`:
- `leafEmerald`, `leafJade`, `leafSage`, `leafMoss`: copa frontal
- `leafDeep`: copa de fundo
- `barkWash`: volume do tronco
- `sapGradient`: veias luminosas
- `orbGradient`: orbs dos produtos

`script.js` → `barkPalette` (array de cores das fibras)

---

## Arquivos

- `index.html` — estrutura, SVG, gradientes
- `styles.css` — design system, animações
- `script.js` — geração procedural, câmera, parallax, autoplay
- `README.md` — este guia
