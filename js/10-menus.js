/*
  Контекстне меню (правий клік), плаваюча панель над виділенням, буфер обміну, вимір масштабу,
  підказка в рядку стану і довідка.
*/
// ===== Контекстне меню, плаваюча панель, буфер, нещодавні, підказки, калібрування масштабу =====
CM = document.createElement("div");
CM.id = "cm";
CM.className = "cm";
CM.hidden = true;
CM.setAttribute("role", "menu");
document.body.appendChild(CM);
FTB = document.createElement("div");
FTB.id = "ftb";
FTB.className = "ftb";
FTB.hidden = true;
document.body.appendChild(FTB);
try {
  const v = JSON.parse(localStorage.getItem(VKEY) || "{}");
  if (v.showHz === false) showHz = false;
} catch (e) {}
try {
  RECENT = JSON.parse(localStorage.getItem(RECK) || "[]");
} catch (e) {}
// Буфер обміну
function copySel() {
  if (!SEL.size) return false;
  clip = JSON.parse(JSON.stringify(selObjs()));
  return true;
}
// Вставити з буфера (у точку або зі зсувом)
function pasteClip(pos) {
  if (!clip || !clip.length || !window.__canEdit) return;
  push();
  const bb = clip.map(bbox),
    x0 = Math.min(...bb.map(b => b.x)),
    y0 = Math.min(...bb.map(b => b.y)),
    x1 = Math.max(...bb.map(b => b.x + b.w)),
    y1 = Math.max(...bb.map(b => b.y + b.h));
  const dx = pos ? sn(pos.x - (x0 + x1) / 2) : 20,
    dy = pos ? sn(pos.y - (y0 + y1) / 2) : 20;
  let id = nid();
  const gm = {};
  const ns = clip.map(o => {
    const n = JSON.parse(JSON.stringify(o));
    n.id = id++;
    n.uid = uidv();
    n.x += dx;
    n.y += dy;
    if (isLine(n)) {
      n.x2 += dx;
      n.y2 += dy;
    }
    if (o.gid) n.gid = gm[o.gid] || (gm[o.gid] = Date.now() + Math.random());
    delete n.lk;
    delete n.hid;
    return n;
  });
  S.push(...ns);
  clip = clip.map(o => {
    const n = JSON.parse(JSON.stringify(o));
    n.x += 20;
    n.y += 20;
    if (isLine(n)) {
      n.x2 += 20;
      n.y2 += 20;
    }
    return n;
  });
  const ly = LY(ns[0]);
  if (ns.every(n => LY(n) === ly) && MODES[mode].includes(ly)) act = ly;
  setSel(ns.map(n => n.id));
  const mz = ns.filter(q => q.t === "zz");
  if (mz.length) {
    zClip(mz);
    zClean();
  }
  draw();
  save();
}
// Повернути виділене на 90°
function rotSel() {
  const os = selObjs().filter(o => !isLine(o) && o.t !== "pl" && !isZL(o) && o.w != null);
  if (!os.length) return;
  push();
  os.forEach(o => {
    const cx = o.x + o.w / 2,
      cy = o.y + o.h / 2;
    [o.w, o.h] = [o.h, o.w];
    o.x = sn(cx - o.w / 2);
    o.y = sn(cy - o.h / 2);
  });
  draw();
  save();
}
// Заблокувати або розблокувати
function lockSel(v) {
  if (!SEL.size) return;
  push();
  selObjs().forEach(o => {
    if (v) o.lk = true;
    else delete o.lk;
  });
  if (v) setSel([]);
  draw();
  save();
}
// Сховати виділене
function hideSel() {
  if (!SEL.size) return;
  push();
  selObjs().forEach(o => (o.hid = true));
  setSel([]);
  draw();
  save();
}
// Розвернути напрямок лінії
function reverseSel() {
  const o = S.find(x => x.id === sel);
  if (!o) return;
  push();
  if (o.t === "pl") {
    const P = absP(o).reverse();
    setPts(o, P);
  } else if (o.t === "arrow" || o.t === "seg") {
    [o.x, o.y, o.x2, o.y2] = [o.x2, o.y2, o.x, o.y];
  }
  draw();
  save();
}
// Перейти до поля в панелі
const focusEl = id =>
  setTimeout(() => {
    const n = $(id);
    if (n && !n.hidden && !n.disabled) {
      n.scrollIntoView({ block: "nearest" });
      n.focus();
      if (n.select) n.select();
    }
  }, 60);
// Пункти меню: {t, k (клавіші), f, dis, on (галочка), sub:[...], sep, danger, hint}
function objMenu() {
  const os = selObjs(),
    o = os.length === 1 ? os[0] : null,
    L = [];
  const anyLk = os.some(x => x.lk),
    anyG = os.some(x => x.gid);
  if (o) {
    L.push({ head: esc(o.t === "zz" ? zname(o) : oname(o) || "Об'єкт") });
    if (o.t === "zz") {
      L.push(
        { t: "Змінити тип зони…", f: () => ztMenu(o) },
        { t: "Додати ще тип…", f: () => ztMenu(o, true) },
        { t: "Перейменувати", k: "F2", f: () => focusEl("znm") },
        {
          t: "Що тут роблять…",
          f: () => {
            const d = document.querySelector("#pass details.acts");
            if (d) {
              d.open = true;
              d.scrollIntoView({ block: "start" });
            }
          },
        },
        { sep: 1 }
      );
    } else if (o.t === "rz") {
      L.push(
        {
          t: "Що рухається",
          sub: RK.map(k => ({
            t: k[1],
            on: o.rk === k[0],
            sw: k[2],
            f: () => {
              push();
              o.rk = k[0];
              draw();
              save();
            },
          })),
        },
        { t: "Підпис", k: "F2", f: () => focusEl("lbl") },
        { sep: 1 }
      );
    } else if (LY(o) === "eq") {
      L.push(
        { t: "Перейменувати", k: "F2", f: () => focusEl("lbl") },
        { t: "Тип для правил…", f: () => focusEl("oti") }
      );
      if (hasMat(o))
        L.push({
          t: "Матеріал",
          sub: [
            ...MATS.map(m => ({
              t: m[1],
              on: o.m === m[0],
              sw: m[3],
              f: () => {
                push();
                o.m = m[0];
                draw();
                save();
              },
            })),
            {
              t: "Не вказано",
              on: !o.m,
              f: () => {
                push();
                delete o.m;
                draw();
                save();
              },
            },
          ],
        });
      if (o.t === "cage") L.push({ t: "Кількість місць…", f: () => focusEl("qty") });
      L.push({ sep: 1 });
    } else if (o.k && K[o.k]) {
      const same = Object.entries(K).filter(([kk, v]) => v[0] === LY(o) && v[1] === K[o.k][1]);
      if (same.length > 1)
        L.push({
          t: LY(o) === "flow" && (o.t === "pl" || o.t === "arrow") ? "Що рухається" : "Вид",
          sub: same.map(([kk, v]) => ({
            t: v[2],
            on: o.k === kk,
            sw: v[4],
            f: () => {
              push();
              o.k = kk;
              draw();
              save();
            },
          })),
        });
      if (o.t === "pl" || o.t === "arrow") L.push({ t: "Розвернути напрямок", f: reverseSel });
      L.push({ t: "Підпис", k: "F2", f: () => focusEl("lbl") }, { sep: 1 });
    }
  } else L.push({ head: "Виділено: " + os.length });
  L.push(
    { t: "Копіювати", k: "Ctrl+C", f: copySel },
    {
      t: "Вставити",
      k: "Ctrl+V",
      dis: !(clip && clip.every(o => (MODES[mode] || []).includes(LY(o)))),
      f: () => pasteClip(),
    },
    { t: "Дублювати", k: "Ctrl+D", f: () => $("mdup").onclick() }
  );
  if (os.some(x => !isLine(x) && x.t !== "pl" && !isZL(x))) L.push({ t: "Повернути на 90°", k: "R", f: rotSel });
  L.push({ sep: 1 });
  if (os.length > 1) L.push({ t: "Згрупувати", k: "Ctrl+G", f: () => $("grp").onclick() });
  if (anyG) L.push({ t: "Розгрупувати", k: "Ctrl+Shift+G", f: () => $("ungrp").onclick() });
  L.push(
    anyLk
      ? { t: "Розблокувати", f: () => lockSel(false) }
      : { t: "Заблокувати", hint: "не рухається випадково", f: () => lockSel(true) },
    { t: "Сховати", f: hideSel },
    { sep: 1 },
    { t: "Видалити", k: "Del", danger: 1, f: () => $("del").onclick() }
  );
  return L;
}
// Пункти меню для порожнього місця
function canvasMenu(p) {
  const L = [],
    a = act;
  if (clip && clip.every(o => (MODES[mode] || []).includes(LY(o))))
    L.push({ t: "Вставити сюди", k: "Ctrl+V", f: () => pasteClip(p) });
  if (a === "eq") {
    const rec = recentFor("eq");
    L.push({
      t: "Додати сюди",
      sub: [
        ...(rec.length
          ? [{ head: "Нещодавні" }, ...rec.map(it => ({ t: it[0], f: () => insertItem(it, p) })), { sep: 1 }]
          : []),
        ...GROUPS.eq.map(([g, items]) => ({ t: g, sub: items.map(it => ({ t: it[0], f: () => insertItem(it, p) })) })),
      ],
    });
  } else if (GROUPS[a] && GROUPS[a].length) {
    L.push({
      t: a === "flow" ? "Додати сюди / намалювати" : "Додати сюди",
      sub: GROUPS[a].flatMap(([g, ks], i) => [
        ...(i ? [{ sep: 1 }] : []),
        { head: g },
        ...ks.map(kk => ({ t: K[kk][2], sw: K[kk][4], f: () => insertItem(kk, p) })),
      ]),
    });
  } else if (a === "zone" || a === "route")
    L.push({
      t: a === "zone" ? "Нова зона: тягніть мишкою по плану" : "Новий маршрут: тягніть мишкою по плану",
      dis: 1,
    });
  const lyr = MODES[mode] || [];
  if (lyr.length > 1)
    L.push({
      t: "Перейти на шар",
      sub: LAYERS.filter(l => lyr.includes(l[0])).map(l => ({
        t: l[1],
        on: l[0] === a,
        sw: l[2],
        f: () => {
          act = l[0];
          show[act] = true;
          openL.add(act);
          setSel([]);
          presets();
          draw();
          saveUI();
        },
      })),
    });
  L.push(
    { sep: 1 },
    { t: "Виділити все на шарі", k: "Ctrl+A", f: () => $("sla").onclick() },
    { t: "Виділити все", k: "Ctrl+Shift+A", f: () => $("saa").onclick() }
  );
  const hid = S.filter(o => o.hid);
  if (hid.length)
    L.push({
      t: "Показати сховані (" + hid.length + ")",
      f: () => {
        push();
        hid.forEach(o => delete o.hid);
        draw();
        save();
      },
    });
  L.push({ sep: 1 });
  if (mode === "zones" || mode === "flows") L.push({ t: "Аналіз конфліктів", on: anl, f: () => $("anl").onclick() });
  if (mode === "zones") L.push({ t: "Радіуси ризиків", on: showHz, f: toggleHz });
  L.push(
    { t: "Прив'язка до сітки", on: snap, f: () => $("snap").onclick() },
    { t: "Скасувати", k: "Ctrl+Z", dis: !hist.length, f: () => $("undo").onclick() }
  );
  return L;
}
// Побудувати меню (з підменю і клавішами)
function renderCM(box, L, x, y) {
  box.innerHTML = "";
  box.hidden = false;
  for (const it of L) {
    if (it.sep) {
      const s = document.createElement("div");
      s.className = "cms";
      box.appendChild(s);
      continue;
    }
    if (it.head) {
      const h = document.createElement("div");
      h.className = "cmh";
      h.innerHTML = it.head;
      box.appendChild(h);
      continue;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cmi" + (it.danger ? " dng" : "");
    b.disabled = !!it.dis;
    b.setAttribute("role", "menuitem");
    b.innerHTML = `<span class="cmc">${it.on ? "✓" : it.sw ? `<span class="sw" style="background:${it.sw};border-color:${it.sw}"></span>` : ""}</span><span class="cmt">${esc(it.t)}${it.hint ? ` <span class="hint">${esc(it.hint)}</span>` : ""}</span><span class="cmk">${it.sub ? "▸" : document.body.classList.contains("mob") ? "" : esc(it.k || "")}</span>`;
    if (it.sub) {
      const sm = document.createElement("div");
      sm.className = "cm sub";
      sm.hidden = true;
      b.appendChild(sm);
      const open = () => {
        box.querySelectorAll(":scope > .cmi > .cm.sub").forEach(x => {
          if (x !== sm) x.hidden = true;
        });
        if (!sm.hidden) return;
        renderCM(sm, it.sub, 0, 0);
        const r = b.getBoundingClientRect();
        sm.style.left = (r.right + sm.offsetWidth > innerWidth ? r.left - sm.offsetWidth : r.right - 2) + "px";
        sm.style.top = Math.max(8, Math.min(r.top - 4, innerHeight - sm.offsetHeight - 8)) + "px";
      };
      b.onmouseenter = open;
      b.onclick = e => {
        e.stopPropagation();
        if (e.target.closest(".cm.sub") !== null && e.target.closest(".cm.sub") !== box) return;
        open();
      };
    } else
      b.onclick = e => {
        e.stopPropagation();
        hideCM();
        it.f && it.f();
      };
    b.addEventListener("mouseenter", () => {
      if (!it.sub) box.querySelectorAll(":scope > .cmi > .cm.sub").forEach(x => (x.hidden = true));
    });
    box.appendChild(b);
  }
  if (box === CM) {
    box.style.left = Math.max(8, Math.min(x, innerWidth - box.offsetWidth - 8)) + "px";
    box.style.top = Math.max(8, Math.min(y, innerHeight - box.offsetHeight - 8)) + "px";
    const f = box.querySelector(".cmi:not(:disabled)");
    if (f) f.focus({ preventScroll: true });
  }
}
// Закрити меню
function hideCM() {
  if (!CM) return;
  CM.hidden = true;
  CM.innerHTML = "";
}
// Відкрити меню в точці
function openCM(x, y, kind, p) {
  if (!window.__canEdit || mode === "result") return;
  document.querySelectorAll(".menu").forEach(m => (m.hidden = true));
  $("ztm").hidden = true;
  renderCM(CM, kind === "obj" ? objMenu() : canvasMenu(p), x, y);
}
// Правий клік: меню для об'єкта або для порожнього місця
cv.addEventListener("contextmenu", e => {
  if (!window.__canEdit || bgMode) return;
  e.preventDefault();
  if (drag && drag.wall) {
    drag = null;
    draw();
    return;
  }
  if (drag && drag.poly) {
    finishPoly();
    return;
  }
  const g = e.target.closest("[data-id]"),
    p = pt(e);
  cmPos = p;
  if (g) {
    const id = +g.dataset.id;
    if (!SEL.has(id)) {
      setSel(grpOf(id));
      draw();
    }
    openCM(e.clientX, e.clientY, "obj", p);
  } else {
    if (SEL.size) {
      setSel([]);
      draw();
    }
    openCM(e.clientX, e.clientY, "canvas", p);
  }
});
// Закриття меню кліком поза ним; клавіші в меню (стрілки, Esc)
document.addEventListener(
  "pointerdown",
  e => {
    if (!CM.hidden && !e.target.closest("#cm")) hideCM();
  },
  true
);
document.addEventListener(
  "keydown",
  e => {
    if (CM.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hideCM();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const box = (document.activeElement && document.activeElement.closest(".cm")) || CM,
        its = [...box.querySelectorAll(":scope > .cmi:not(:disabled)")],
        i = its.indexOf(document.activeElement);
      const n = its[(i + (e.key === "ArrowDown" ? 1 : its.length - 1)) % its.length];
      if (n) n.focus();
    }
    if (e.key === "ArrowRight" && document.activeElement && document.activeElement.querySelector(".cm.sub")) {
      e.preventDefault();
      e.stopPropagation();
      document.activeElement.onmouseenter();
      const f = document.activeElement.querySelector(".cm.sub .cmi:not(:disabled)");
      if (f) f.focus();
    }
    if (e.key === "ArrowLeft") {
      const sm = document.activeElement && document.activeElement.closest(".cm.sub");
      if (sm) {
        e.preventDefault();
        e.stopPropagation();
        sm.hidden = true;
        sm.parentElement.focus();
      }
    }
  },
  true
);
addEventListener("resize", hideCM);
$("wrap").addEventListener("scroll", () => {
  hideCM();
  ftb();
});
// Нові клавіші
document.addEventListener("keydown", e => {
  if (!window.__canEdit || (e.target.matches && e.target.matches("input,textarea,select")) || !CM.hidden) return;
  const k = e.key.toLowerCase(),
    mod = e.ctrlKey || e.metaKey;
  if (mod && k === "c") {
    if (copySel()) e.preventDefault();
    return;
  }
  if (mod && k === "x") {
    if (copySel()) {
      e.preventDefault();
      $("del").onclick();
    }
    return;
  }
  if (mod && k === "v") {
    if (clip && clip.every(o => (MODES[mode] || []).includes(LY(o)))) {
      e.preventDefault();
      pasteClip();
    }
    return;
  }
  if (mod && k === "d") {
    if (SEL.size) {
      e.preventDefault();
      $("mdup").onclick();
    }
    return;
  }
  if (!mod && k === "r" && SEL.size) {
    e.preventDefault();
    rotSel();
    return;
  }
  if (e.key === "F2" && SEL.size === 1) {
    e.preventDefault();
    const o = S.find(x => x.id === sel);
    focusEl(o && o.t === "zz" ? "znm" : "lbl");
    return;
  }
  if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
    e.preventDefault();
    const b = SEL.size ? selBox() : null,
      r = cv.getBoundingClientRect(),
      kk = r.width / 1260;
    openCM(
      b ? r.left + (b.x + b.w) * kk : r.left + r.width / 2,
      b ? r.top + b.y * kk : r.top + 120,
      SEL.size ? "obj" : "canvas",
      null
    );
  }
  if (e.key === "?") {
    e.preventDefault();
    showHelp();
  }
});
// Плаваюча панель над виділенням
function ftb() {
  if (!FTB) return;
  if (
    !window.__canEdit ||
    !SEL.size ||
    bgMode ||
    mode === "result" ||
    (drag && (drag.moved || drag.poly)) ||
    (!CM.hidden && false)
  ) {
    FTB.hidden = true;
    return;
  }
  const b = selBox();
  if (!b) {
    FTB.hidden = true;
    return;
  }
  const os = selObjs(),
    mo = os.filter(hasMat),
    cur = mo.length && mo.every(o => (o.m || "") === (mo[0].m || "")) ? mo[0].m || "" : null;
  let h = "";
  if (mo.length)
    h += `<span class="fmat">${MATS.map(m => `<button type="button" data-fm="${m[0]}" class="${cur === m[0] ? "on" : ""}" style="--mc:${m[3]}" title="Матеріал: ${m[1]}">${m[1]}</button>`).join("")}</span><span class="fsep"></span>`;
  h += `<button type="button" data-fa="dup" title="Дублювати (Ctrl+D)">${IC.dup}</button>`;
  if (os.some(o => !isLine(o) && o.t !== "pl" && !isZL(o)))
    h += `<button type="button" data-fa="rot" title="Повернути на 90° (R)">${IC.rot}</button>`;
  if (os.length > 1) h += `<button type="button" data-fa="grp" title="Згрупувати (Ctrl+G)">${IC.grp}</button>`;
  h += `<button type="button" data-fa="lock" title="Заблокувати">${ICO.lock}</button><button type="button" data-fa="del" class="dng" title="Видалити (Del)">${IC.del}</button><span class="fsep"></span><button type="button" data-fa="more" title="Ще дії (правий клік)">${IC.more}</button>`;
  FTB.innerHTML = h;
  FTB.hidden = false;
  const r = cv.getBoundingClientRect(),
    k = r.width / 1260,
    w = $("wrap").getBoundingClientRect();
  let x = r.left + (b.x + b.w / 2) * k - FTB.offsetWidth / 2,
    y = r.top + b.y * k - FTB.offsetHeight - 12;
  if (y < w.top + 4) y = r.top + (b.y + b.h) * k + 12;
  if (y > w.bottom - FTB.offsetHeight || r.top + (b.y + b.h) * k < w.top || r.top + b.y * k > w.bottom) {
    FTB.hidden = true;
    return;
  }
  FTB.style.left = Math.max(w.left + 4, Math.min(x, w.right - FTB.offsetWidth - 4)) + "px";
  FTB.style.top = y + "px";
}
FTB.addEventListener("pointerdown", e => e.stopPropagation());
// Кнопки плаваючої панелі
FTB.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  e.stopPropagation();
  if (b.dataset.fm) {
    const mo = selObjs().filter(hasMat);
    push();
    const v = b.dataset.fm,
      all = mo.every(o => o.m === v);
    mo.forEach(o => {
      if (all) delete o.m;
      else o.m = v;
    });
    draw();
    save();
    return;
  }
  const a = b.dataset.fa;
  if (a === "dup") $("mdup").onclick();
  else if (a === "rot") rotSel();
  else if (a === "grp") $("grp").onclick();
  else if (a === "lock") lockSel(true);
  else if (a === "del") $("del").onclick();
  else if (a === "more") {
    const r = b.getBoundingClientRect();
    openCM(r.left, r.bottom + 4, "obj", null);
  }
});
// Радіуси ризиків — перемикач
function toggleHz() {
  showHz = !showHz;
  try {
    const v = JSON.parse(localStorage.getItem(VKEY) || "{}");
    v.showHz = showHz;
    localStorage.setItem(VKEY, JSON.stringify(v));
  } catch (e) {}
  const b = $("hzt");
  if (b) b.setAttribute("aria-pressed", showHz);
  draw();
}
// Калібрування масштабу по двох точках
function startCalib() {
  if (!window.__canEdit) return;
  calib = { pts: [] };
  setSel([]);
  if (rtab !== "view") {
    rtab = "view";
    tabs();
  }
  draw();
}
// Вимір масштабу: дві точки на плані
cv.addEventListener(
  "pointerdown",
  e => {
    if (!calib) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const p = pt(e);
    calib.pts.push([p.x, p.y]);
    if (calib.pts.length === 2) {
      const [a, b] = calib.pts,
        d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      draw();
      setTimeout(() => {
        const v = prompt(
          "Скільки метрів між цими точками насправді? (наприклад, ширина дверей 0,9 або довжина стіни)",
          ""
        );
        calib = null;
        const m = parseFloat(String(v || "").replace(",", "."));
        if (m > 0 && d > 2) {
          push();
          pxm = Math.round((d / m) * 10) / 10;
          $("pxm").value = pxm;
          save();
        }
        draw();
      }, 30);
      return;
    }
    draw();
  },
  true
);
cv.addEventListener("pointermove", e => {
  if (calib && calib.pts.length === 1) {
    const p = pt(e);
    calib.cur = [p.x, p.y];
    draw();
  }
});
// Підказка в рядку стану
function sbHint() {
  const el = $("sbhint");
  if (!el) return;
  let t = "";
  if (!window.__canEdit) t = "Перегляд. Щоб редагувати — «Увійти».";
  else if (calib)
    t = calib.pts.length
      ? "Клікніть другу точку відрізка."
      : "Масштаб: клікніть першу точку відрізка відомої довжини (Esc — скасувати).";
  else if (mode === "result") t = "";
  else if (document.body.classList.contains("mob") && !armK)
    t = SEL.size
      ? "Тягніть, щоб пересунути · довге натискання — усі дії"
      : act === "zone" || act === "route"
        ? "Тягніть пальцем по порожньому місцю — нова " +
          (act === "zone" ? "зона" : "ділянка") +
          " · двома пальцями — рух і масштаб · довге натискання — меню"
        : "Двома пальцями або по порожньому — рух плану · довге натискання — «Додати сюди»";
  else if (armK && K[armK] && K[armK][1] === "seg")
    t =
      (drag && drag.wall
        ? "Клікайте наступний кут · подвійний клік, Enter або правий клік — закінчити"
        : "Клікніть початок стіни") +
      " · кути вирівнюються самі, Shift — лише прямі · кінці липнуть до інших стін · Esc — вийти";
  else if (armK) t = "Клікайте точки руху · подвійний клік або Enter — кінець · Shift — прямий кут · Esc — скасувати";
  else if (SEL.size) t = "Тягніть, щоб пересунути · стрілки — зсув · правий клік — усі дії · Del — видалити";
  else if (act === "zone")
    t =
      "Тягніть по порожньому місцю — нова зона · Shift+тягнути — додати прямокутник до виділеної · правий клік — меню";
  else if (act === "route") t = "Тягніть по плану — ділянка маршруту · правий клік — меню";
  else if (act === "flow") t = "Виберіть вид руху в «Додати» і клікайте точки на плані · правий клік — додати сюди";
  else t = "«Каталог» або правий клік по плану — «Додати сюди» · Shift+рамка — виділити кілька";
  el.textContent = t;
}
// Довідка
function showHelp() {
  let d = $("hlpd");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "hlpd";
    d.className = "hlpd";
    document.body.appendChild(d);
  }
  const R = [
    ["Правий клік по об'єкту", "усі дії з ним"],
    ["Правий клік по плану", "додати сюди, вставити, виділити все"],
    ["Shift+клік / Shift+рамка", "виділити кілька"],
    ["Ctrl+C / Ctrl+V / Ctrl+X", "копіювати / вставити / вирізати"],
    ["Ctrl+D", "дублювати"],
    ["R", "повернути на 90°"],
    ["F2", "перейменувати"],
    ["Del", "видалити"],
    ["Стрілки (Shift — крок 10)", "зсунути"],
    ["Ctrl+G / Ctrl+Shift+G", "згрупувати / розгрупувати"],
    ["Ctrl+A / Ctrl+Shift+A", "виділити все на шарі / на всіх"],
    ["Ctrl+Z", "скасувати"],
    ["Esc", "зняти виділення, закрити меню"],
    ["?", "ця довідка"],
  ];
  d.innerHTML = `<h3>Як працювати</h3><ol class="hsteps"><li><b>Вигляд</b> → завантажте фото плану і задайте масштаб («Виміряти відрізок»).</li><li><b>Приміщення</b> → стіни й обладнання з «Каталогу».</li><li><b>Зони</b> → обведіть зони і виберіть їхній тип. Паспорт зони праворуч покаже вимоги, процедури і ризики.</li><li><b>Потоки і зберігання</b> → рух тварин, білизни, відходів; де що зберігається.</li><li><b>Результат</b> → що підготувати і що змінити. Можна надрукувати.</li></ol><details class="dzhelp"><summary><b>Імпорт дезінфектантів: якою має бути таблиця</b></summary>${dzHelpHtml()}</details><h3>Клавіші</h3><table>${R.map(r => `<tr><td><kbd>${esc(r[0])}</kbd></td><td>${esc(r[1])}</td></tr>`).join("")}</table><div class="row" style="justify-content:flex-end"><button type="button" class="rb" id="hlpx">Закрити</button></div>`;
  d.querySelector("#hlpx").onclick = () => d.close();
  d.showModal();
}
$("help").onclick = showHelp;
$("help").title = "Довідка і клавіші (?)";
$("hzt").onclick = toggleHz;
$("hzt").setAttribute("aria-pressed", showHz);
$("calb").onclick = startCalib;
