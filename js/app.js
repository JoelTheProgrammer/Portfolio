document.addEventListener('DOMContentLoaded', function () {
  const downloadAnchor = document.getElementById('download-portfolio');
  const langButtons = Array.from(document.querySelectorAll('.lang-btn'));

  const files = {
    en: 'Angehrn_Joel_Portfolio_EN.pdf',
    de: 'Angehrn_Joel_Portfolio_DE.pdf'
  };

  function setDownloadFor(lang) {
    const file = files[lang] || files.en;
    downloadAnchor.setAttribute('href', './' + file);
    downloadAnchor.setAttribute('download', file);
  }

  function getActiveLang() {
    const active = document.querySelector('.lang-btn.active');
    return active ? active.getAttribute('data-lang') : 'en';
  }

  setDownloadFor(getActiveLang());

  langButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      langButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const lang = this.getAttribute('data-lang') || 'en';
      setDownloadFor(lang);
      // if you have an i18n loader that expects aria-selected to change, mirror that
      langButtons.forEach(b => b.setAttribute('aria-selected', b.classList.contains('active') ? 'true' : 'false'));
    });
  });

  // footer year
  const y = new Date().getFullYear();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = y;
});
