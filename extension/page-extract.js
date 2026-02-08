(() => {
  const scriptTag = document.currentScript;
  const maxChars = Number(scriptTag?.dataset.doclensMaxChars || 24000);
  const maxPages = Number(scriptTag?.dataset.doclensMaxPages || 12);
  const sourceUrl = scriptTag?.dataset.doclensSourceUrl || window.location.href;

  const postError = (message) => {
    window.postMessage({ type: "doclens-error", message }, "*");
  };

  const extractWithPdfJs = async () => {
    const pdfApp = window.PDFViewerApplication;
    const pdfDocument = pdfApp?.pdfDocument;
    const pdfjsLib = window.pdfjsLib;

    let doc = pdfDocument;
    if (!doc && pdfjsLib) {
      doc = await pdfjsLib.getDocument({ url: sourceUrl, withCredentials: true }).promise;
    }

    if (!doc) {
      postError("DocLens could not access PDF.js on this page.");
      return;
    }

    const totalPages = Math.min(doc.numPages, maxPages);
    let combinedText = "";

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent({ normalizeWhitespace: true });
      const pageText = textContent.items.map((item) => item.str).join(" ");
      combinedText += ` ${pageText}`;
      if (combinedText.length >= maxChars) {
        combinedText = combinedText.slice(0, maxChars);
        break;
      }
    }

    window.postMessage({ type: "doclens-text", text: combinedText.trim(), sourceUrl }, "*");
  };

  extractWithPdfJs().catch((error) => {
    postError(error?.message || "DocLens encountered an unexpected error.");
  });
})();
