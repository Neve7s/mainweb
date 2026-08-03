// Scroll-triggered animation via IntersectionObserver
// Replaces GSAP ScrollTrigger for better performance (no JS library needed)

export function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  elements.forEach(el => observer.observe(el));
}

// Initialize on DOM ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
}
