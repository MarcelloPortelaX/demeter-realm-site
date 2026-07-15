(() => {
  "use strict";

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const easeInOut3 = (t) => t < .5 ? 4*t*t*t : 1 - (-2*t+2)**3/2;

  const mkRng = (seed) => {
    let s = seed >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const createSvgEl = (tag, attrs) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };

    const S = {
    rawProg: 0, visProgress: 0,
    camY: 0, targetCamY: 0,
    treeProg: 0,
    lastT: performance.now(),
    reducedMotion: matchMedia("(prefers-reduced-motion:reduce)").matches,
  };

  const Journey = {
    state: 'hero',
    bloomStartT: 0,
    bloomDur: 6000, 
    scrollStartT: 0,
    scrollDur: 28000,
    scrollFrom: 0,
    scrollTo: 0,
  };

  const L = {
    heroCanvas: qs("#heroCanvas"),
    leafCanvas: qs("#leafCanvas"),
    growth: qs("#floresta"),
    treeSvg: qs("#treeSvg"),
    trunk: qs("#trunk"),
    roots: qs("#roots"),
    branchesBack: qs("#branchesBack"),
    branchesFront: qs("#branchesFront"),
    products: qs("#products"),
    htmlProductWrappers: qsa(".html-product-wrapper"),
    htmlBalloonWrappers: qsa("#htmlBalloons .html-balloon-wrapper"),
    htmlAboutWrappers: { 'about-left': qs("#about-left"), 'about-right': qs("#about-right") },
    stageName: qs("#stageName"),
    autoHint: qs("#autoHint"),
    replayBtn: qs("#replayButton"),
    restartBtn: qs("#restartBottom"),
    canopyAura: qs("#canopyAura"),
    enterBtn: qs("#enterBtn"),
  };

  const heroCtx = L.heroCanvas.getContext('2d', { alpha: true });
  const leafCtx = L.leafCanvas.getContext('2d', { alpha: true });
  const LEAF_PATH = new Path2D("M 0,0 Q 15,-25 40,-15 Q 20,10 0,0 Z");

    const BARK_COLORS = ["rgba(40,18,5,0.9)", "rgba(55,25,8,0.85)", "rgba(75,35,12,0.8)", "rgba(30,12,3,0.95)", "rgba(65,30,10,0.8)"];
  const LEAF_COLORS = ["rgba(60,255,160,0.25)", "rgba(54,210,174,0.25)", "rgba(68,232,140,0.25)", "rgba(93,255,171,0.25)", "rgba(42,235,128,0.25)"];

  const animatedPaths = [];
  const canvasLeaves = [];
  const animatedProducts = [];
  const animatedBalloons = [];
  const animatedAboutBalloons = [];

  function getCurvePoints(pts, steps = 30) {
    const res = [];
    for(let i=0; i<pts.length-1; i++) {
      const p0 = pts[Math.max(0, i-1)], p1 = pts[i];
      const p2 = pts[i+1], p3 = pts[Math.min(pts.length-1, i+2)];
      for(let t=0; t<1; t+=1/steps) {
        const t2 = t*t, t3 = t2*t;
        const x = 0.5 * ((2*p1[0]) + (-p0[0] + p2[0])*t + (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0])*t2 + (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0])*t3);
        const y = 0.5 * ((2*p1[1]) + (-p0[1] + p2[1])*t + (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1])*t2 + (-p0[1] + 3*p1[1] - 3*p2[1] + p3[1])*t3);
        if(res.length > 0) {
          const last = res[res.length-1];
          res.push({x, y, d: last.d + Math.hypot(x-last.x, y-last.y)});
        } else res.push({x, y, d: 0});
      }
    }
    return res;
  }

  function weave(basePts, offset, freq, amp, phase, taperType = "default") {
    const res = [];
    const maxD = basePts[basePts.length-1].d || 1;
    for(let i=0; i<basePts.length; i++) {
      const p = basePts[i];
      const prev = basePts[Math.max(0, i-1)], next = basePts[Math.min(basePts.length-1, i+1)];
      const dx = next.x - prev.x, dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const t = p.d / maxD;
      
      let taper = 1;
      if (taperType === "trunk") taper = (1 - t) * 0.8 + 0.2;
      else if (taperType === "root") taper = Math.pow(1 - t, 1.5) * 0.8 + 0.2;
      else taper = 0.4 + 0.6 * Math.sin(t * Math.PI);

      const wav = Math.sin(phase + t * Math.PI * freq) * amp;
      const finalOffset = (offset + wav) * taper;
      res.push({ x: p.x - (dy/len)*finalOffset, y: p.y + (dx/len)*finalOffset });
    }
    return res;
  }

  function ptsToSVG(pts) {
    return "M " + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  }

  function generateTree() {
    const isMobileInit = innerWidth <= 760;
    const R = mkRng(777);
    const TRUNK_PTS = [[706,1700], [731,1450], [710,1100], [729,750], [706,400], [720,100]];
    const trunkBase = getCurvePoints(TRUNK_PTS, 30);
    
    for(let i=0; i<80; i++) {
      const n = i / 79, c = 1 - Math.abs(n - 0.5)*2; 
      const offset = -65 + 130 * n;
      const pts = weave(trunkBase, offset, 2 + R()*4, 15 + R()*15, R()*Math.PI*2, "trunk");
      
      const path = createSvgEl("path", {
        d: ptsToSVG(pts), fill: "none",
        stroke: BARK_COLORS[Math.floor(R()*BARK_COLORS.length)],
        "stroke-width": (1.5 + c * 7 + R()*3).toFixed(1),
        "stroke-linecap": "round", "stroke-linejoin": "round"
      });
      animatedPaths.push({ el: path, s: R()*0.05, e: 0.45 + R()*0.05 });
      L.trunk.appendChild(path);
    }
    const ROOT_DEFS = [
      {p: [[645, 1700], [580, 1850], [480, 2000], [420, 2250]], s: 0.0, e: 0.35, prod: 0},
      {p: [[706, 1700], [706, 1900], [715, 2100], [720, 2250]], s: 0.0, e: 0.35, prod: 1},
      {p: [[767, 1700], [830, 1850], [950, 2000], [1020, 2250]], s: 0.0, e: 0.35, prod: 2},
      {p: [[670, 1700], [630, 1850], [530, 2050]], s: 0.0, e: 0.35},
      {p: [[740, 1700], [790, 1850], [900, 2050]], s: 0.0, e: 0.35},
      {p: [[620, 1700], [530, 1900], [450, 2100]], s: 0.05, e: 0.4},
      {p: [[790, 1700], [880, 1900], [1000, 2100]], s: 0.05, e: 0.4},
    ];
    ROOT_DEFS.forEach((rd) => {
      const rootBase = getCurvePoints(rd.p, 25);
      const numF = rd.prod !== undefined ? 15 : 7;
      for(let j=0; j<numF; j++) {
        const fn = j / Math.max(1, numF-1);
        const offset = (rd.prod !== undefined ? -20 : -10) + (rd.prod !== undefined ? 40 : 20) * fn;
        const pts = weave(rootBase, offset, 2, 8, R()*Math.PI*2, "root");
        
        const path = createSvgEl("path", {
          d: ptsToSVG(pts), fill: "none",
          stroke: j%4===0 ? "rgba(62,120,82,0.6)" : BARK_COLORS[Math.floor(R()*BARK_COLORS.length)],
          "stroke-width": (1 + R()*2 + (rd.prod !== undefined ? 1.5 : 0)).toFixed(1),
          "stroke-linecap": "round"
        });
        animatedPaths.push({ el: path, s: rd.s + R()*0.05, e: rd.e + R()*0.05 });
        L.roots.appendChild(path);
      }
    });
    for(let i=0; i<30; i++) {
      const tBranch = Math.pow(i / 29, 1.5); 
      const trunkT = 0.75 + 0.25 * tBranch;
      const baseP = trunkBase[Math.floor(trunkT * (trunkBase.length-1))];
      const dir = (i % 2 === 0) ? 1 : -1;
      
      const length = 150 + R()*300 + (1-tBranch)*150;
      const drop = -100 + tBranch * 250 + R()*100;
      
      const bPts = [
        [baseP.x, baseP.y],
        [baseP.x + dir * length * 0.3, baseP.y + drop * 0.2 - 50],
        [baseP.x + dir * length * 0.7, baseP.y + drop * 0.7],
        [baseP.x + dir * length, baseP.y + drop]
      ];
      const bBase = getCurvePoints(bPts, 20);
      
      const numF = 3 + Math.floor(R()*3);
      for(let j=0; j<numF; j++) {
        const fn = j / (Math.max(1, numF-1)), offset = -8 + 16 * fn;
        const pts = weave(bBase, offset, 2, 6, R()*Math.PI*2, "default");
        
        const path = createSvgEl("path", {
          d: ptsToSVG(pts), fill: "none",
          stroke: BARK_COLORS[Math.floor(R()*BARK_COLORS.length)],
          "stroke-width": (0.8 + R()*1.5).toFixed(1),
          "stroke-linecap": "round"
        });
        
        const pathS = (trunkT * 0.45) - 0.05;
        animatedPaths.push({ el: path, s: pathS, e: pathS + 0.2 });
        if (dir === 1) L.branchesFront.appendChild(path);
        else L.branchesBack.appendChild(path);
      }
    }
    const aboutBranches = [
      { id: 'about-right', p: [[710, 1100], [800, 1080], [920, 1050], [isMobileInit ? 990 : 1050, 1020]], s: 0.20, e: 0.35, dir: 1 },
      { id: 'about-left', p: [[725, 950], [650, 930], [550, 900], [isMobileInit ? 450 : 400, 850]], s: 0.25, e: 0.40, dir: -1 }
    ];
    aboutBranches.forEach(ab => {
      const basePts = getCurvePoints(ab.p, 20);
      const numF = 7;
      for(let j=0; j<numF; j++) {
        const fn = j / Math.max(1, numF-1);
        const offset = -10 + 20 * fn;
        const pts = weave(basePts, offset, 2, 8, R()*Math.PI*2, "root");
        
        const path = createSvgEl("path", {
          d: ptsToSVG(pts), fill: "none",
          stroke: BARK_COLORS[Math.floor(R()*BARK_COLORS.length)],
          "stroke-width": (1.5 + R()*2).toFixed(1),
          "stroke-linecap": "round"
        });
        animatedPaths.push({ el: path, s: ab.s + R()*0.05, e: ab.e + R()*0.05 });
        L.branchesBack.appendChild(path);
      }
      if (L.htmlAboutWrappers && L.htmlAboutWrappers[ab.id]) {
         animatedAboutBalloons.push({
           el: L.htmlAboutWrappers[ab.id],
           s: ab.e + 0.05,
           x: ab.p[ab.p.length-1][0],
           y: ab.p[ab.p.length-1][1]
         });
      }
    });
    const CLUSTERS = [
      {cx: 720, cy: 220, rx: 450, ry: 210}, 
      {cx: 720, cy: 110, rx: 320, ry: 150},
      {cx: 480, cy: 160, rx: 280, ry: 160},
      {cx: 960, cy: 160, rx: 280, ry: 160},
      {cx: isMobileInit ? 450 : 320, cy: 280, rx: 280, ry: 180},
      {cx: isMobileInit ? 990 : 1120, cy: 280, rx: 280, ry: 180},
      {cx: isMobileInit ? 350 : 140, cy: 380, rx: 190, ry: 140},
      {cx: isMobileInit ? 1090 : 1300, cy: 380, rx: 190, ry: 140},
      {cx: 600, cy: 340, rx: 250, ry: 160},
      {cx: 840, cy: 340, rx: 250, ry: 160}
    ];

    CLUSTERS.forEach(cl => {
      const numLeaves = 250 + Math.floor(R() * 100); 
      for(let i=0; i<numLeaves; i++) {
        const angle = R() * Math.PI * 2;
        const rad = Math.pow(R(), 0.7); 
        const x = cl.cx + Math.cos(angle) * cl.rx * rad;
        const y = cl.cy + Math.sin(angle) * cl.ry * rad;
        
        canvasLeaves.push({
          cx: x, cy: y,
          s: 0.55 + rad * 0.15 + R()*0.15,
          scale: 0.35 + R() * 0.55,
          rot: R() * Math.PI * 2,
          col: LEAF_COLORS[Math.floor(R()*LEAF_COLORS.length)],
          fSpeed: 1 + R()*2,
          fPhase: R() * Math.PI * 2
        });
      }
    });
    const balloonCoords = [
      { id: 0, x: isMobileInit ? 380 : 280, y: isMobileInit ? 450 : 380 },
      { id: 1, x: 720, y: 150 },
      { id: 2, x: isMobileInit ? 1060 : 1160, y: isMobileInit ? 450 : 380 },
    ];
    balloonCoords.forEach(b => {
      if (L.htmlBalloonWrappers[b.id]) {
        animatedBalloons.push({
          el: L.htmlBalloonWrappers[b.id],
          s: 0.85 + b.id * 0.02,
          x: b.x,
          y: b.y
        });
      }
    });
    const PRODUCTS = [
      {id: 0, x: 420, y: 2250},
      {id: 1, x: 720, y: 2250},
      {id: 2, x: 1020, y: 2250},
    ];
    
    PRODUCTS.forEach(prod => {
      const g = createSvgEl("g", {
        class: "product-node",
        transform: `translate(${prod.x}, ${prod.y})`
      });
      g.innerHTML = `
        <circle cx="0" cy="0" r="30" fill="rgba(42,235,128,0.15)" />
        <circle class="product-ring" cx="0" cy="0" r="45" fill="none" stroke="rgba(130,255,178,0.5)" stroke-dasharray="4 8" />
        <circle cx="0" cy="0" r="16" fill="rgba(101,249,162,1)" style="mix-blend-mode: screen;" />
      `;
      L.products.appendChild(g);
      animatedProducts.push({ el: g, s: 0.78 + prod.id * 0.03, id: prod.id, x: prod.x, y: prod.y });
    });

    requestAnimationFrame(() => {
      animatedPaths.forEach(p => {
        p.len = p.el.getTotalLength();
        p.el.style.strokeDasharray = p.len;
        p.el.style.strokeDashoffset = p.len;
      });
    });
  }

    function startJourney() {
    if (Journey.state !== 'hero') return;
    
    Journey.state = 'blooming';
    Journey.bloomStartT = performance.now();
    
    const treeTop = L.growth.offsetTop;
    window.scrollTo({ top: treeTop, behavior: 'smooth' });

    setTimeout(() => {
      if (Journey.state === 'blooming') {
        Journey.state = 'scrolling';
        Journey.scrollStartT = performance.now();
        Journey.scrollFrom = scrollY;
        document.documentElement.classList.add("is-autoplay");
        L.autoHint.classList.remove("is-hidden");
      }
    }, Journey.bloomDur + 500);
  }

  function restartJourney() {
    Journey.state = 'hero';
    document.documentElement.classList.remove("is-autoplay");
    window.scrollTo({ top: 0, behavior: 'auto' });
    S.treeProg = 0; S.visProgress = 0; S.rawProg = 0; S.camY = 0;
    setTimeout(() => startJourney(), 300);
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    
    L.heroCanvas.width = innerWidth * dpr;
    L.heroCanvas.height = innerHeight * dpr;
    heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    L.leafCanvas.width = innerWidth * dpr;
    L.leafCanvas.height = innerHeight * dpr;
  }

  function frame(now) {
    const dt = clamp((now - S.lastT) / 1000, 0.001, 0.05);
    S.lastT = now;
    const nowSec = now / 1000;

    if (Journey.state === 'blooming' || Journey.state === 'scrolling' || Journey.state === 'done') {
      S.treeProg = clamp((now - Journey.bloomStartT) / Journey.bloomDur);
    } else if (Journey.state === 'hero') {
      if (scrollY > L.growth.offsetTop - innerHeight * 0.5) {
        Journey.state = 'blooming';
        Journey.bloomStartT = performance.now();
      }
    }

    if (Journey.state === 'scrolling') {
      Journey.scrollTo = document.documentElement.scrollHeight - innerHeight;
      const t = clamp((now - Journey.scrollStartT) / Journey.scrollDur);
      const eased = easeInOut3(t);
      window.scrollTo(0, lerp(Journey.scrollFrom, Journey.scrollTo, eased));
      if (t >= 1) {
        Journey.state = 'done';
        document.documentElement.classList.remove("is-autoplay");
        L.autoHint.classList.add("is-hidden");
      }
    }

    const rect = L.growth.getBoundingClientRect();
    S.rawProg = clamp(-rect.top / Math.max(1, L.growth.offsetHeight - innerHeight));
    S.visProgress = lerp(S.visProgress, S.rawProg, 1 - Math.exp(-dt * 14));

    const isMobile = innerWidth <= 760;
    const vWidth = isMobile ? 850 : 1440;
    const scale = innerWidth / vWidth;
    const minCamY = isMobile ? -150 : 0;
    const maxCamY = Math.max(minCamY, 2500 - innerHeight / scale);
    
    const p = S.visProgress;
    const c = p < 0.25 ? 0 
            : p < 0.85 ? smoothstep((p-0.25)/0.60) 
            : 1;
            
    S.targetCamY = minCamY + c * (maxCamY - minCamY);
    S.camY = lerp(S.camY, S.targetCamY, 1 - Math.exp(-dt * 10));
    const viewBoxX = 720 - (innerWidth / scale) / 2;
    L.treeSvg.setAttribute("viewBox", `${viewBoxX} ${S.camY} ${innerWidth / scale} ${innerHeight / scale}`);
    animatedPaths.forEach(path => {
      const localProg = clamp((S.treeProg - path.s) / (path.e - path.s));
      if (path.len) {
        path.el.style.strokeDashoffset = path.len * (1 - localProg);
      }
    });
    const dpr = Math.min(devicePixelRatio || 1, 2);
    leafCtx.setTransform(1, 0, 0, 1, 0, 0); // FIX: Reset transform before clearRect
    leafCtx.clearRect(0, 0, L.leafCanvas.width, L.leafCanvas.height);
    
    leafCtx.setTransform(dpr * scale, 0, 0, dpr * scale, -viewBoxX * scale * dpr, -S.camY * scale * dpr);
    leafCtx.globalCompositeOperation = 'screen';
    
    for(let i = 0; i < canvasLeaves.length; i++) {
      const leaf = canvasLeaves[i];
      const localProg = clamp((S.treeProg - leaf.s) / 0.15);
      
      if (localProg > 0) {
        const ease = localProg < 1 ? 1 - Math.pow(1 - localProg, 3) : 1;
        const currentScale = ease * leaf.scale;
        
        const flutterRot = S.reducedMotion ? 0 : Math.sin(nowSec * leaf.fSpeed + leaf.fPhase) * 0.15;
        
        leafCtx.fillStyle = leaf.col;
        leafCtx.save();
        leafCtx.translate(leaf.cx, leaf.cy);
        leafCtx.rotate(leaf.rot + flutterRot);
        leafCtx.scale(currentScale, currentScale);
        leafCtx.fill(LEAF_PATH);
        leafCtx.restore();
      }
    }

    L.canopyAura.setAttribute("opacity", (clamp(S.treeProg / 0.6) * 1).toFixed(2));
    animatedAboutBalloons.forEach(b => {
      const localProg = clamp((S.treeProg - b.s) / 0.05);
      const isVis = localProg > 0.01;
      
      if (isVis !== b.isVis) {
        if (b.el) b.el.classList.toggle("is-visible", isVis);
        b.isVis = isVis;
      }
      
      if (b.el && isVis) {
        const screenX = (b.x - viewBoxX) * scale;
        const screenY = (b.y - S.camY) * scale;
        b.el.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
      }
    });
    animatedBalloons.forEach(b => {
      const localProg = clamp((S.treeProg - b.s) / 0.05);
      const isVis = localProg > 0.01;
      
      if (isVis !== b.isVis) {
        if (b.el) b.el.classList.toggle("is-visible", isVis);
        b.isVis = isVis;
      }
      
      if (b.el && isVis) {
        const screenX = (b.x - viewBoxX) * scale;
        const screenY = (b.y - S.camY) * scale;
        b.el.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
      }
    });
    animatedProducts.forEach(prod => {
      const localProg = clamp((S.visProgress - prod.s) / 0.05);
      const isVis = localProg > 0.01;
      
      if (isVis !== prod.isVis) {
        prod.el.style.opacity = isVis ? 1 : 0;
        const htmlProd = L.htmlProductWrappers[prod.id];
        if (htmlProd) htmlProd.classList.toggle("is-visible", isVis);
        prod.isVis = isVis;
      }
      
      const htmlProdWrapper = L.htmlProductWrappers[prod.id];
      if (htmlProdWrapper && isVis) {
        const screenX = (prod.x - viewBoxX) * scale;
        const screenY = (prod.y - S.camY) * scale;
        htmlProdWrapper.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
      }
    });

    const st = p>=0.88 ? "PRODUTOS" : p>=0.65 ? "TECNOLOGIA" : p>=0.30 ? "QUEM SOMOS" : "INÍCIO";
    if (L.stageName.textContent !== st) L.stageName.textContent = st;
    document.querySelectorAll(".nav a").forEach(a => 
      a.classList.toggle("is-active", a.textContent.trim().toUpperCase() === st));
    L.replayBtn.hidden = p < 0.96;
    const hw = L.heroCanvas.width / dpr;
    const hh = L.heroCanvas.height / dpr;
    heroCtx.clearRect(0, 0, hw, hh);
    const pCount = isMobile ? 20 : 40;
    for(let i=0; i<pCount; i++) {
      const px = (Math.sin(i*77.7 + now*0.0002)*0.5+0.5) * hw;
      const py = (Math.cos(i*99.9 + now*0.0003)*0.5+0.5) * hh;
      const rad = 1 + Math.sin(i*11.1 + now*0.001)*0.5;
      heroCtx.fillStyle = `rgba(101,249,162,${0.2 + 0.3*Math.sin(now*0.002+i)})`;
      heroCtx.beginPath(); heroCtx.arc(px, py, rad, 0, Math.PI*2); heroCtx.fill();
    }

    requestAnimationFrame(frame);
  }

    const STOP = () => {
    if(Journey.state === 'scrolling') {
      Journey.state = 'done';
      document.documentElement.classList.remove("is-autoplay");
      L.autoHint.classList.add("is-hidden");
    }
  };
  ["wheel", "touchstart", "pointerdown"].forEach(evt => 
    addEventListener(evt, STOP, {passive: true, capture: true}));
  addEventListener("keydown", e => {
    if (["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(e.key)) STOP();
  }, {capture: true});

  L.replayBtn.addEventListener("click", restartJourney);
  L.restartBtn.addEventListener("click", restartJourney);
  if(L.enterBtn) L.enterBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (Journey.state === 'hero') startJourney();
    else restartJourney();
  });

    addEventListener("resize", resize);
  resize();
  generateTree(); 
  requestAnimationFrame(frame);

  window.addEventListener("load", () => {
    if (!location.hash && scrollY < 8) window.scrollTo(0, 0);
  }, {once: true});
})();
