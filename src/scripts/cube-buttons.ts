/**
 * Universal Cube Button — auto-wraps any [data-cube] element
 * into the 3D flip structure (front = original content, back = accent fill).
 * Excludes .spark-btn-canvas elements so electric effects stay intact.
 */
export function initCubeButtons() {
  document.querySelectorAll<HTMLElement>('[data-cube]').forEach((el) => {
    if (el.dataset.cubeInit) return;
    el.dataset.cubeInit = '1';

    const variant = el.dataset.cube || 'light';

    // Clone for back face — strip spark canvases so clone doesn't animate
    const clone = el.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-cube');
    clone.classList.add('cube-back');
    clone.querySelectorAll('.spark-btn-canvas').forEach(c => c.remove());

    const inner = document.createElement('div');
    inner.className = 'cube-inner';

    const front = document.createElement('div');
    front.className = 'cube-front';
    front.style.cssText = 'position:relative;inset:0;display:flex;align-items:center;justify-content:center;';

    // Move children into front, EXCEPT spark canvases which stay as direct children
    const children = Array.from(el.childNodes);
    children.forEach(child => {
      if (child.nodeType === 1 && (child as HTMLElement).classList?.contains('spark-btn-canvas')) {
        return; // keep spark canvas in its original position
      }
      front.appendChild(child);
    });

    inner.appendChild(front);
    inner.appendChild(clone);
    el.appendChild(inner);

    // Calculate half-height for back face translateZ
    const h = el.offsetHeight || 56;
    el.style.setProperty('--cube-half-h', `${h / 2}px`);
  });
}
