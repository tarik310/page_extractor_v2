document.getElementById("extractBtn").addEventListener("click", async () => {
  const scope = document.querySelector('input[name="scope"]:checked').value;
  const format = document.querySelector('input[name="format"]:checked').value;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  // Inject Readability only if Article mode
  if (scope === "article") {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["Readability.js"],
    });
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractContent,
    args: [scope, format],
  });

  window.close();
});

function extractContent(scope, format) {
  let container;

  // =========================
  // SCOPE
  // =========================

  if (scope === "article") {
    const article = new Readability(document.cloneNode(true)).parse();

    if (!article) {
      alert("Could not extract article content.");
      return;
    }

    container = document.createElement("div");
    container.innerHTML = article.content;
  } else {
    // Clone only visible body
    container = document.body.cloneNode(true);
  }

  // =========================
  // REMOVE JUNK
  // =========================

  // Remove scripts, styles, media, etc.
  container
    .querySelectorAll(
      "script, style, link, svg, iframe, img, noscript, template",
    )
    .forEach((el) => el.remove());

  // Remove hidden elements
  container.querySelectorAll("*").forEach((el) => {
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      el.hidden
    ) {
      el.remove();
    }
  });

  // Remove JSON-looking blocks (LinkedIn fix)
  container.querySelectorAll("div, span").forEach((el) => {
    const text = el.textContent.trim();
    if (text.startsWith("{") && text.endsWith("}") && text.length > 200) {
      el.remove();
    }
  });

  // Remove attributes
  container.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
  });

  // =========================
  // FILENAME
  // =========================

  const title = document.title
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .substring(0, 80);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  let content;
  let extension;

  // =========================
  // FORMAT
  // =========================

  if (format === "html") {
    content = "<html><body>" + container.innerHTML + "</body></html>";
    extension = "html";
  } else {
    function htmlToFormattedText(root) {
      let output = "";

      function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\s+/g, " ");
          output += text;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName.toLowerCase();

          if (/^h[1-6]$/.test(tag)) {
            output += "\n\n" + node.innerText.toUpperCase() + "\n\n";
            return;
          }

          if (["p", "div", "section", "article"].includes(tag)) {
            node.childNodes.forEach(walk);
            output += "\n\n";
            return;
          }

          if (tag === "br") {
            output += "\n";
            return;
          }

          if (tag === "li") {
            output += "- ";
            node.childNodes.forEach(walk);
            output += "\n";
            return;
          }

          node.childNodes.forEach(walk);
        }
      }

      walk(root);

      return output
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+\n/g, "\n")
        .trim();
    }

    if (scope === "article") {
      content = htmlToFormattedText(container);
    } else {
      content = document.body.innerText.trim();
    }

    extension = "txt";
  }

  // =========================
  // DOWNLOAD
  // =========================

  const filename = `${title}_${timestamp}.${extension}`;

  const blob = new Blob(["\uFEFF" + content], {
    type:
      format === "text"
        ? "text/plain;charset=utf-8"
        : "text/html;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
