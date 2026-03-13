(() => {
  const article = new Readability(document.cloneNode(true)).parse();

  if (!article) {
    alert("Could not extract content.");
    return;
  }

  // Create container from extracted HTML
  const container = document.createElement("div");
  container.innerHTML = article.content;

  // Remove unwanted elements completely
  container
    .querySelectorAll("img, script, style, link, svg, iframe")
    .forEach((el) => el.remove());

  // Remove ALL attributes from all elements
  container.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
  });

  // Optional: remove empty elements
  container.querySelectorAll("*").forEach((el) => {
    if (!el.textContent.trim() && el.children.length === 0) {
      el.remove();
    }
  });

  const cleanHTML = "<html><body>" + container.innerHTML + "</body></html>";

  const blob = new Blob([cleanHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "clean.html";
  a.click();

  URL.revokeObjectURL(url);
})();
