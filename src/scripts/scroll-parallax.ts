import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScrollParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 768) return;

  // ── Hero parallax (centered layout) ──
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      }
    });

    // Robot canvas fades out on scroll
    const robotCanvas = heroSection.querySelector('#robot-canvas');
    if (robotCanvas) {
      heroTl.to(robotCanvas, { opacity: 0, y: -40, ease: 'none' }, 0);
    }

    // Matrix rain fades out
    const matrixCanvas = heroSection.querySelector('#matrix-canvas');
    if (matrixCanvas) {
      heroTl.to(matrixCanvas, { opacity: 0, ease: 'none' }, 0);
    }

    // Terminal window fades out on scroll
    const terminalWindow = heroSection.querySelector('.terminal-window');
    if (terminalWindow) {
      heroTl.to(terminalWindow, { y: -60, opacity: 0, scale: 0.98, ease: 'none' }, 0);
    }
  }

  // ── Expertise section — staggered card entrance ──
  const expertiseSection = document.getElementById('expertise');
  if (expertiseSection) {
    const expCards = expertiseSection.querySelectorAll('.hidden.md\\:grid > div');
    if (expCards.length) {
      gsap.from(expCards, {
        scrollTrigger: {
          trigger: expertiseSection,
          start: 'top 80%',
          end: 'top 20%',
          scrub: 1,
        },
        y: 60,
        opacity: 0,
        stagger: 0.15,
        ease: 'power2.out',
      });
    }

    const expHeader = expertiseSection.querySelector('[data-animate]');
    if (expHeader) {
      gsap.from(expHeader, {
        scrollTrigger: {
          trigger: expertiseSection,
          start: 'top 85%',
          end: 'top 50%',
          scrub: 1,
        },
        x: -40,
        opacity: 0,
        ease: 'power2.out',
      });
    }
  }

  // ── Projects section — header animation ──
  const projectsSection = document.getElementById('work');
  if (projectsSection) {
    const projHeader = projectsSection.querySelector('[data-animate]');
    if (projHeader) {
      gsap.from(projHeader, {
        scrollTrigger: {
          trigger: projectsSection,
          start: 'top 85%',
          end: 'top 50%',
          scrub: 1,
        },
        y: 30,
        opacity: 0,
        ease: 'power2.out',
      });
    }
  }

  // ── TechStack section — marquee activation on scroll ──
  const techSection = document.getElementById('tech-stack');
  if (techSection) {
    const techRows = techSection.querySelectorAll('.tech-marquee-row');
    if (techRows.length) {
      gsap.from(techRows, {
        scrollTrigger: {
          trigger: techSection,
          start: 'top 80%',
          end: 'top 30%',
          scrub: 1,
        },
        x: (i: number) => i % 2 === 0 ? -60 : 60,
        opacity: 0,
        stagger: 0.1,
        ease: 'power2.out',
      });
    }

    const techHeader = techSection.querySelector('[data-animate]');
    if (techHeader) {
      gsap.from(techHeader, {
        scrollTrigger: {
          trigger: techSection,
          start: 'top 85%',
          end: 'top 50%',
          scrub: 1,
        },
        y: 30,
        opacity: 0,
        ease: 'power2.out',
      });
    }
  }

  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger };
