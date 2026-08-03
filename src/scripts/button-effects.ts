import { gsap } from 'gsap';

// ═══════════════════════════════════════════════════════════
// BUTTON SPARKS — Canvas lightning bolts + spark particles
// Replicates original initButtonSparks() from utils.js
// ═══════════════════════════════════════════════════════════

function initButtonSparks() {
  const isMobile = window.innerWidth < 768;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const canvas = entry.target as HTMLCanvasElement;
      if (entry.isIntersecting) {
        if (!canvas.dataset.animating) {
          canvas.dataset.animating = 'true';
          startButtonAnimation(canvas, isMobile);
        }
      } else {
        canvas.removeAttribute('data-animating');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.spark-btn-canvas').forEach(canvas => {
    observer.observe(canvas);
  });
}

function startButtonAnimation(canvas: HTMLCanvasElement, isMobile: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let bolts: any[] = [];
  let sparks: any[] = [];

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
  };
  resize();

  class Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    decay: number;
    size: number;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
      const speedMult = isMobile ? 0.6 : 1.0;
      this.vx = (Math.random() - 0.5) * 10 * speedMult;
      this.vy = (Math.random() - 0.5) * 10 * speedMult;
      this.life = 1.0;
      this.decay = (isMobile ? 0.04 : 0.02) + Math.random() * 0.05;
      this.size = 1 + Math.random() * 2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.2;
      this.life -= this.decay;
    }
    draw(isDark: boolean) {
      if (!ctx) return;
      const rgb = isDark ? '74, 222, 128' : '0, 0, 0';
      ctx.fillStyle = `rgba(${rgb}, ${this.life})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function createBolt() {
    const margin = 0;
    const x1 = margin + Math.random() * (width - margin * 2);
    const y1 = margin + Math.random() * (height - margin * 2);
    const x2 = x1 + (Math.random() - 0.5) * 100;
    const y2 = y1 + (Math.random() - 0.5) * 100;

    const segments: any[] = [];
    let curX = x1;
    let curY = y1;
    const parts = isMobile ? 6 : 10;

    for (let i = 0; i < parts; i++) {
      const tx = x1 + (x2 - x1) * (i / parts) + (Math.random() - 0.5) * (isMobile ? 15 : 30);
      const ty = y1 + (y2 - y1) * (i / parts) + (Math.random() - 0.5) * (isMobile ? 15 : 30);
      segments.push({ x1: curX, y1: curY, x2: tx, y2: ty });
      curX = tx;
      curY = ty;

      if (Math.random() > 0.8) {
        const sparkCount = isMobile ? 2 : 5;
        for (let s = 0; s < sparkCount; s++) sparks.push(new Spark(tx, ty));
      }
    }
    return { segments, life: 1.0, decay: (isMobile ? 0.2 : 0.1) + Math.random() * 0.2 };
  }

  function animate() {
    if (!document.body.contains(canvas) || !canvas.getAttribute('data-animating')) {
      canvas.removeAttribute('data-animating');
      return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const shadowColor = isDark ? '#4ade80' : 'rgba(0,0,0,0.5)';
    const boltColor = isDark ? '255, 255, 255' : '0, 0, 0';

    ctx.clearRect(0, 0, width, height);

    const boltProb = isMobile ? 0.96 : 0.92;
    if (Math.random() > boltProb) bolts.push(createBolt());

    ctx.lineCap = 'round';
    ctx.shadowBlur = isDark ? 15 : 5;
    ctx.shadowColor = shadowColor;

    bolts.forEach(bolt => {
      ctx.strokeStyle = `rgba(${boltColor}, ${bolt.life})`;
      ctx.lineWidth = 2 * bolt.life;

      ctx.beginPath();
      bolt.segments.forEach((s: any) => {
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
      });
      ctx.stroke();
      bolt.life -= bolt.decay;
    });
    bolts = bolts.filter(b => b.life > 0);

    ctx.shadowBlur = 0;
    sparks.forEach(spark => {
      spark.update();
      spark.draw(isDark);
    });
    sparks = sparks.filter(s => s.life > 0);

    requestAnimationFrame(animate);
  }

  setTimeout(() => {
    resize();
    animate();
  }, 100);
}

// ═══════════════════════════════════════════════════════════
// ELECTRIC LINK — Canvas lightning inside a container
// Replicates original initElectricLinkEffect() from modals.js
// ═══════════════════════════════════════════════════════════

function initElectricLinks() {
  document.querySelectorAll('.electric-link-canvas').forEach((canvasEl) => {
    const canvas = canvasEl as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let bolts: any[] = [];
    let sparks: any[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    class Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      decay: number;
      size: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.05;
        this.size = 1 + Math.random() * 2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life -= this.decay;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(74, 222, 128, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function createBolt() {
      const margin = 60;
      const x1 = margin + Math.random() * (width - margin * 2);
      const y1 = margin + Math.random() * (height - margin * 2);
      const x2 = x1 + (Math.random() - 0.5) * 100;
      const y2 = y1 + (Math.random() - 0.5) * 100;

      const segments: any[] = [];
      let curX = x1;
      let curY = y1;
      const parts = 10;

      for (let i = 0; i < parts; i++) {
        const tx = x1 + (x2 - x1) * (i / parts) + (Math.random() - 0.5) * 30;
        const ty = y1 + (y2 - y1) * (i / parts) + (Math.random() - 0.5) * 30;
        segments.push({ x1: curX, y1: curY, x2: tx, y2: ty });
        curX = tx;
        curY = ty;

        if (Math.random() > 0.8) {
          for (let s = 0; s < 5; s++) sparks.push(new Spark(tx, ty));
        }
      }
      return { segments, life: 1.0, decay: 0.1 + Math.random() * 0.2 };
    }

    function animate() {
      if (!document.getElementById(canvas.id)) return;

      ctx.clearRect(0, 0, width, height);

      if (Math.random() > 0.92) bolts.push(createBolt());

      ctx.lineCap = 'round';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#4ade80';

      bolts.forEach(bolt => {
        ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.life})`;
        ctx.lineWidth = 2 * bolt.life;

        ctx.beginPath();
        bolt.segments.forEach((s: any) => {
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
        });
        ctx.stroke();
        bolt.life -= bolt.decay;
      });
      bolts = bolts.filter(b => b.life > 0);

      ctx.shadowBlur = 0;
      sparks.forEach(spark => {
        spark.update();
        spark.draw();
      });
      sparks = sparks.filter(s => s.life > 0);

      requestAnimationFrame(animate);
    }

    animate();
  });
}

// ═══════════════════════════════════════════════════════════
// GLOW CARDS — GSAP opacity toggle on hover/touch
// ═══════════════════════════════════════════════════════════

function initGlowCards() {
  document.querySelectorAll('.glow-on-hover').forEach((card) => {
    const el = card as HTMLElement;
    el.style.position = 'relative';

    const glow = document.createElement('div');
    glow.style.cssText = `
      position: absolute; inset: -1px; border-radius: inherit;
      background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent, rgba(255,255,255,0.04));
      opacity: 0; pointer-events: none; z-index: -1;
    `;
    el.appendChild(glow);

    el.addEventListener('mouseenter', () => gsap.to(glow, { opacity: 1, duration: 0.3 }));
    el.addEventListener('mouseleave', () => gsap.to(glow, { opacity: 0, duration: 0.2 }));
    el.addEventListener('touchstart', () => gsap.to(glow, { opacity: 1, duration: 0.2 }), { passive: true });
    el.addEventListener('touchend', () => gsap.to(glow, { opacity: 0, duration: 0.3, delay: 0.2 }), { passive: true });
  });
}

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════

export function initButtonEffects() {
  initButtonSparks();
  initElectricLinks();
  initGlowCards();
}
