(() => {
  const enhanceHeader = () => {
    const header = document.querySelector('header');
    if (!header || header.dataset.sitePolish === 'true') return;

    header.dataset.sitePolish = 'true';
    header.classList.add('site-header-enhanced', 'site-header-visible');

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = Math.max(window.scrollY, 0);
      const delta = y - lastY;

      header.classList.toggle('site-header-scrolled', y > 24);

      if (y < 80 || delta < -6) {
        header.classList.remove('site-header-hidden');
        header.classList.add('site-header-visible');
      } else if (delta > 8 && y > 140) {
        header.classList.add('site-header-hidden');
        header.classList.remove('site-header-visible');
      }

      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    header.addEventListener('focusin', () => {
      header.classList.remove('site-header-hidden');
      header.classList.add('site-header-visible');
    });

    update();
  };

  const observeHeader = () => {
    enhanceHeader();
    if (document.querySelector('header')) return;

    const observer = new MutationObserver(() => {
      if (document.querySelector('header')) {
        enhanceHeader();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeHeader, { once: true });
  } else {
    observeHeader();
  }
})();
