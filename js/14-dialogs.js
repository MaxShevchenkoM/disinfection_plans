/*
  Спільне для всіх вікон: хрестик, закриття кліком поза вікном і Esc.
*/
// ===== Зручне закриття вікон: хрестик, клік поза вікном, Esc =====
function dlgX(d) {
  if (d.querySelector(":scope > .dlgx")) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "dlgx";
  b.title = "Закрити (Esc)";
  b.setAttribute("aria-label", "Закрити");
  b.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>';
  b.onclick = () => d.close();
  d.prepend(b);
}
{
  const fix = () => document.querySelectorAll("dialog[open]").forEach(dlgX);
  new MutationObserver(fix).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["open"],
  });
  let downOut = false;
  const out = (d, e) => {
    const r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  document.addEventListener(
    "pointerdown",
    e => {
      const d = e.target.closest && e.target.closest("dialog[open]");
      downOut = !!(d && e.target === d && out(d, e));
    },
    true
  );
  document.addEventListener(
    "click",
    e => {
      const d = e.target.closest && e.target.closest("dialog[open]");
      if (d && e.target === d && downOut && out(d, e)) d.close();
      downOut = false;
    },
    true
  );
  document.addEventListener(
    "keydown",
    e => {
      if (e.key !== "Escape") return;
      let hit = false;
      if (!$("ztm").hidden) {
        $("ztm").hidden = true;
        hit = true;
      }
      document.querySelectorAll(".menu:not([hidden]),#clinm:not([hidden])").forEach(m => {
        m.hidden = true;
        hit = true;
      });
      document.querySelectorAll(".ddb.open,.tb.open").forEach(b => b.classList.remove("open"));
      if (hit) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
}
