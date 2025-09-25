// js/app.js
// Client-side PDF generator for the full site.
// Requires html2pdf.bundle.min.js (included in index.html).
(function () {
  'use strict';

  // We export the whole document body so header, main and footer appear in the PDF.
  const exportElement = document.body;
  const downloadAnchor = document.getElementById('download-portfolio');

  // Options for html2pdf. Tune scale for quality vs file size.
  function html2pdfOptions() {
    return {
      margin:       0.35,                       // inches
      filename:     'portfolio.pdf',
      image:        { type: 'jpeg', quality: 0.96 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
  }

  // Add a temporary class to the document root to adjust styles during generation
  function setGeneratingState(on) {
    if (on) {
      document.documentElement.classList.add('generating-pdf');
    } else {
      document.documentElement.classList.remove('generating-pdf');
    }
  }

  function generatePdfWithHtml2Pdf() {
    const opts = html2pdfOptions();
    setGeneratingState(true);

    // html2pdf returns a promise-like chain. Use .save() to force download.
    return html2pdf().set(opts).from(exportElement).save()
      .finally(() => {
        // remove the temporary class so UI returns to normal
        setGeneratingState(false);
      });
  }

  function fallbackPrint() {
    // Fallback behaviour: open the print dialog. The user can choose Save as PDF.
    window.print();
  }

  function onDownloadClick(ev) {
    ev.preventDefault();

    if (typeof html2pdf === 'function') {
      generatePdfWithHtml2Pdf().catch((err) => {
        console.error('PDF generation failed, falling back to print dialog:', err);
        setGeneratingState(false);
        fallbackPrint();
      });
    } else {
      // library missing
      fallbackPrint();
    }
  }

  // Wire download button and footer year
  document.addEventListener('DOMContentLoaded', function () {
    if (downloadAnchor) {
      downloadAnchor.addEventListener('click', onDownloadClick, false);
    }

    // auto-year in footer
    const y = new Date().getFullYear();
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = y;
  }, false);
})();
