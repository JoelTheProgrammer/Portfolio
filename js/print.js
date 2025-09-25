async function generatePdfFromFullCloneInlineCss() {
  if (typeof html2pdf !== 'function') {
    alert('html2pdf missing. Include html2pdf.bundle.min.js in index.html.');
    return;
  }

  // create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '8.27in';
  iframe.style.height = '11.7in';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  // clone body HTML
  const bodyHtml = document.body.cloneNode(true).innerHTML;

  // Build a safe head: clone link/meta but remove scripts
  const originalHead = document.head;
  const headLinks = Array.from(originalHead.querySelectorAll('link[rel="stylesheet"], meta, title')).map(n => n.outerHTML).join('\n');

  // Try to fetch and inline your print.css for guaranteed application
  let printCssText = '';
  try {
    const resp = await fetch('./css/print.css', { cache: 'no-store' });
    if (resp.ok) printCssText = await resp.text();
    else console.warn('print.css fetch returned', resp.status);
  } catch (e) {
    console.warn('print.css fetch failed:', e && e.message ? e.message : e);
  }

  // A small force style to ensure backgrounds/shadows appear
  const forcedStyles = `
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fbfbfb !important; color: #111 !important; }
    .lang-switch, .btnrow, #download-portfolio, .no-print { display: none !important; }
    .container { max-width: 7.4in; margin: 0 auto; padding: 0.25in; box-sizing: border-box; }
    .card { break-inside: avoid; page-break-inside: avoid; box-shadow: 0 14px 28px rgba(16,24,40,0.09) !important; border: 1px solid rgba(0,0,0,0.07) !important; }
  `;

  // write iframe document
  doc.open();
  doc.write('<!doctype html><html><head>');
  doc.write(headLinks);
  if (printCssText) {
    doc.write(`<style id="inlined-print-css">\n${printCssText}\n</style>`);
  } else {
    // fallback: try to include link tag (less reliable)
    doc.write('<link rel="stylesheet" href="./css/print.css" media="all">');
  }
  doc.write(`<style id="forced-print-styles">${forcedStyles}</style>`);
  doc.write('</head><body>');
  doc.write(bodyHtml);
  doc.write('</body></html>');
  doc.close();

  // temporarily disable UI button
  const downloadBtn = document.getElementById('download-portfolio');
  if (downloadBtn) {
    downloadBtn.dataset.origText = downloadBtn.textContent;
    downloadBtn.textContent = 'Generating PDF...';
    downloadBtn.setAttribute('disabled', 'true');
    downloadBtn.style.pointerEvents = 'none';
  }

  // debug helper: log presence of inlined CSS and stylesheets
  try {
    const ifHead = iframe.contentDocument.head;
    console.log('iframe head children:', Array.from(ifHead.children).map(n => n.tagName + (n.id ? '#' + n.id : '') + (n.getAttribute && n.getAttribute('href') ? ' ' + n.getAttribute('href') : '')));
  } catch (e) {
    console.warn('Cannot inspect iframe head for debug:', e);
  }

  // wait for fonts and images inside iframe
  async function waitForIframeResources() {
    try {
      const ifDoc = iframe.contentDocument;
      // fonts
      if (ifDoc && ifDoc.fonts && typeof ifDoc.fonts.ready !== 'undefined') {
        await ifDoc.fonts.ready;
      }
      // images
      const imgs = Array.from(ifDoc.images || []);
      await Promise.all(imgs.map(img => new Promise(res => {
        if (img.complete) return res();
        img.addEventListener('load', res);
        img.addEventListener('error', res);
      })));
      // small delay to let layout settle
      await new Promise(r => setTimeout(r, 120));
    } catch (e) {
      console.warn('Waiting for iframe resources failed:', e && e.message ? e.message : e);
    }
  }

  await waitForIframeResources();

  // check computed background color; if transparent, inject body background inline
  try {
    const bw = iframe.contentWindow.getComputedStyle(iframe.contentDocument.body).backgroundColor;
    console.log('iframe body computed background:', bw);
    if (!bw || bw === 'rgba(0, 0, 0, 0)' || bw === 'transparent') {
      // force inline
      iframe.contentDocument.body.style.background = '#fbfbfb';
      console.log('forced iframe body background to #fbfbfb');
    }
  } catch (e) {
    console.warn('Could not read computedStyle from iframe:', e && e.message ? e.message : e);
  }

  // html2pdf options tuned to preserve background + higher quality
  const opts = {
    margin: 0.35,
    filename: 'portfolio.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#fbfbfb'
    },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // Render and download
  try {
    await html2pdf().set(opts).from(iframe.contentDocument.body).save();
  } catch (err) {
    console.error('html2pdf failed:', err);
    // fallback: open print dialog from iframe
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(iframe.contentDocument.documentElement.outerHTML);
      w.document.close();
      setTimeout(() => { try { w.print(); } catch (e) { console.error(e); } }, 200);
    } else {
      alert('Popup blocked. Allow popups or enable html2pdf.');
    }
  } finally {
    // cleanup UI and iframe
    if (downloadBtn) {
      downloadBtn.textContent = downloadBtn.dataset.origText || 'Download portfolio (PDF)';
      downloadBtn.removeAttribute('disabled');
      downloadBtn.style.pointerEvents = '';
    }
    setTimeout(() => { try { iframe.remove(); } catch (e) {} }, 300);
  }
}
