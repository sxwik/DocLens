(() => {
  const MAX_CHARS = 24000;
  const MAX_PAGES = 12;
  const SUMMARY_SENTENCES = 6;

  const stopWords = new Set([
    "the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "has", "have",
    "had", "not", "but", "its", "into", "their", "they", "them", "than", "then", "there", "here",
    "which", "who", "whom", "whose", "where", "when", "while", "about", "over", "under", "between",
    "within", "without", "including", "includes", "include", "also", "such", "may", "can", "will",
    "shall", "should", "would", "could", "must", "each", "any", "all", "other", "more", "most", "some",
    "no", "yes", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"
  ]);

  const isLikelyPdf = () => {
    const contentType = document.contentType || "";
    if (contentType.includes("pdf")) {
      return true;
    }
    const url = window.location.href.split("?")[0].toLowerCase();
    if (url.endsWith(".pdf")) {
      return true;
    }
    const embeds = Array.from(document.querySelectorAll("embed[type='application/pdf'], object[type='application/pdf']"));
    return embeds.length > 0;
  };

  const createOverlay = () => {
    if (document.getElementById("doclens-overlay")) {
      return document.getElementById("doclens-overlay");
    }
    const overlay = document.createElement("section");
    overlay.id = "doclens-overlay";
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <h2>DocLens Summary</h2>
        <button type="button" id="doclens-close">Close</button>
      </div>
      <p class="doclens-muted">Analyzing the document locally in your browser...</p>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#doclens-close").addEventListener("click", () => overlay.remove());
    return overlay;
  };

  const normalizeText = (text) => text.replace(/\s+/g, " ").trim();

  const summarize = (text) => {
    const cleanText = normalizeText(text);
    if (!cleanText) {
      return [];
    }
    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 40);

    const wordScores = new Map();
    for (const sentence of sentences) {
      const words = sentence.toLowerCase().match(/[a-z0-9']+/g) || [];
      for (const word of words) {
        if (stopWords.has(word)) {
          continue;
        }
        wordScores.set(word, (wordScores.get(word) || 0) + 1);
      }
    }

    const sentenceScores = sentences.map((sentence) => {
      const words = sentence.toLowerCase().match(/[a-z0-9']+/g) || [];
      const score = words.reduce((sum, word) => sum + (wordScores.get(word) || 0), 0);
      return { sentence, score };
    });

    sentenceScores.sort((a, b) => b.score - a.score);
    const topSentences = sentenceScores.slice(0, SUMMARY_SENTENCES).map((item) => item.sentence);
    const ordered = sentences.filter((sentence) => topSentences.includes(sentence));
    return ordered;
  };

  const renderSummary = ({ summary, sourceUrl }) => {
    const overlay = createOverlay();
    const summaryItems = summary.length
      ? summary.map((sentence) => `<li>${sentence}</li>`).join("")
      : "<li>No extractable text was detected in the first pages.</li>";

    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <h2>DocLens Summary</h2>
        <button type="button" id="doclens-close">Close</button>
      </div>
      <p class="doclens-muted">Generated locally. No PDF data is stored or uploaded.</p>
      <ul>${summaryItems}</ul>
      <p><a href="${sourceUrl}" target="_blank" rel="noopener">Open original PDF source</a></p>
      <p class="doclens-muted">Disclaimer: This summary is automated and may contain errors. Refer to the original document for authoritative wording.</p>
    `;
    overlay.querySelector("#doclens-close").addEventListener("click", () => overlay.remove());
  };

  const renderError = (message) => {
    const overlay = createOverlay();
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <h2>DocLens Summary</h2>
        <button type="button" id="doclens-close">Close</button>
      </div>
      <p class="doclens-muted">${message}</p>
      <p class="doclens-muted">DocLens does not store or upload PDFs.</p>
    `;
    overlay.querySelector("#doclens-close").addEventListener("click", () => overlay.remove());
  };

  const handleExtractedText = (payload) => {
    if (!payload || payload.type !== "doclens-text") {
      return;
    }
    const { text, sourceUrl } = payload;
    const summary = summarize(text || "");
    renderSummary({ summary, sourceUrl: sourceUrl || window.location.href });
  };

  if (!isLikelyPdf()) {
    return;
  }

  const overlay = createOverlay();
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) {
      return;
    }
    if (event.data.type === "doclens-text" || event.data.type === "doclens-error") {
      overlay.remove();
    }
    if (event.data.type === "doclens-text") {
      handleExtractedText(event.data);
    }
    if (event.data.type === "doclens-error") {
      renderError(event.data.message || "DocLens could not access this PDF viewer.");
    }
  });

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-extract.js");
  script.dataset.doclensMaxChars = String(MAX_CHARS);
  script.dataset.doclensMaxPages = String(MAX_PAGES);
  script.dataset.doclensSourceUrl = window.location.href;
  document.documentElement.appendChild(script);
  script.remove();
})();
