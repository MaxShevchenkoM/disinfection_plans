/*
  Каталог «Додати»: де з'являється новий об'єкт, кнопки стрічки для поточного шару, пошук і нещодавні.
*/
// Видима частина плану
function visRect() {
  const r = cv.getBoundingClientRect(),
    w = $("wrap").getBoundingClientRect(),
    tb = document.querySelector(".top").getBoundingClientRect().bottom,
    k = 1260 / r.width;
  const x0 = Math.max(r.left, w.left, 0),
    x1 = Math.min(r.right, w.right, innerWidth),
    y0 = Math.max(r.top, w.top, tb, 0),
    y1 = Math.min(r.bottom, w.bottom, innerHeight);
  if (x1 - x0 < 20 || y1 - y0 < 20) return { x0: 0, y0: 0, x1: 1260, y1: 1280 };
  return { x0: (x0 - r.left) * k, x1: (x1 - r.left) * k, y0: (y0 - r.top) * k, y1: (y1 - r.top) * k };
}
// Де поставити новий елемент
function spawnPos(w, h) {
  const v = visRect(),
    cl = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  let x, y;
  if (lastPos) {
    x = lastPos.x + 24;
    y = lastPos.y + 24;
    if (x + w > v.x1 || y + h > v.y1) {
      x = lastPos.x;
      y = lastPos.y + (lastPos.h || 0) + 16;
    }
    if (x < v.x0 || y < v.y0 || x + w > v.x1 || y + h > v.y1) lastPos = null;
  }
  if (!lastPos) {
    x = (v.x0 + v.x1 - w) / 2;
    y = (v.y0 + v.y1 - h) / 2;
  }
  x = cl(x, 0, 1260 - w);
  y = cl(y, 0, 1280 - h);
  return { x: sn(x), y: sn(y) };
}
// Запам'ятати положення елемента
const remember = o => {
  if (!o) return;
  const b = bbox(o);
  lastPos = { x: b.x, y: b.y, h: b.h };
};
// Додати елемент на план
function add(n) {
  push();
  n.id = nid();
  n.uid = uidv();
  S.push(n);
  remember(n);
  setSel([n.id]);
  draw();
  save();
}
// Кнопки «Додати» для поточного шару
function presets() {
  const pz = $("presets");
  pz.innerHTML = "";
  if (act === "flow" && armK) {
    const k = K[armK];
    pz.innerHTML = `<span class="armed"><span class="sw" style="background:${k[4]};border-color:${k[4]}"></span>Малюю «${esc(k[2])}»: клікайте точки, подвійний клік або Enter — кінець, Shift — прямий кут, Esc — скасувати</span><button type="button" class="rb" id="disarm">Скасувати</button>`;
    $("disarm").onclick = () => {
      armK = null;
      drag = null;
      presets();
      draw();
    };
    return;
  }
  if (act === "route") {
    pz.innerHTML = '<span class="gl">Тягніть мишкою по плану — нова ділянка маршруту</span>';
    return;
  }
  if (act === "zone") {
    pz.innerHTML = '<span class="gl">Тягніть мишкою по порожньому місцю — нова зона</span>';
    return;
  }
  const wide = GROUPS[act].length > 3;
  let W = null;
  const mk = (label, cls) => {
    const dd = document.createElement("span");
    dd.className = "dd";
    const tb = document.createElement("button");
    tb.type = "button";
    tb.className = "ddb";
    tb.innerHTML = label;
    const m = document.createElement("div");
    m.className = "menu" + (cls || "");
    m.hidden = true;
    tb.onclick = e => {
      e.stopPropagation();
      const was = !m.hidden;
      document.querySelectorAll(".menu").forEach(x => (x.hidden = true));
      document.querySelectorAll(".ddb").forEach(x => x.classList.remove("open"));
      if (!was) {
        m.hidden = false;
        tb.classList.add("open");
      }
    };
    dd.append(tb, m);
    return { dd, tb, m };
  };
  if (wide) {
    W = mk(
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--acc)"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg> Каталог ▾',
      " wide"
    );
    pz.appendChild(W.dd);
    const sh = document.createElement("div");
    sh.className = "catsh";
    sh.innerHTML =
      '<input class="catq" type="search" placeholder="Пошук: мийка, клітка, шафа…"><div class="catres" hidden></div>';
    W.m.appendChild(sh);
    const inp = sh.querySelector("input"),
      res = sh.querySelector(".catres");
    inp.addEventListener("keydown", e => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const f = res.querySelector("button");
        if (f) f.click();
      }
      if (e.key === "Escape") {
        W.m.hidden = true;
      }
    });
    inp.addEventListener("click", e => e.stopPropagation());
    const mkb = (it, extra) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML =
        '<span class="sw" style="background:' +
        SW[it[1]] +
        (it[1] === "water" ? ";border-radius:50%" : "") +
        '"></span>' +
        esc(it[0]) +
        (extra ? ' <span class="hint">· ' + esc(extra) + "</span>" : "");
      b.onclick = e => {
        e.stopPropagation();
        insertItem(it);
        W.m.hidden = true;
        W.tb.classList.remove("open");
        presets();
      };
      return b;
    };
    inp.oninput = () => {
      const q = inp.value.trim().toLowerCase();
      res.innerHTML = "";
      W.m.querySelectorAll(":scope > .cat, :scope > .recl").forEach(x => (x.hidden = !!q));
      res.hidden = !q;
      if (!q) return;
      const f = GROUPS.eq.flatMap(([g, its]) =>
        its.filter(it => it[0].toLowerCase().includes(q) || g.toLowerCase().includes(q)).map(it => [it, g])
      );
      if (!f.length) res.innerHTML = '<div class="hint" style="padding:6px 10px">Нічого не знайдено</div>';
      f.forEach(([it, g]) => res.appendChild(mkb(it, g)));
    };
    W.tb.addEventListener("click", () =>
      setTimeout(() => {
        if (!W.m.hidden) inp.focus();
      }, 0)
    );
    const rec = recentFor("eq");
    if (rec.length) {
      const rl = document.createElement("div");
      rl.className = "recl";
      rl.innerHTML = '<div class="rgh" style="padding:4px 10px">Нещодавні</div>';
      rec.forEach(it => rl.appendChild(mkb(it)));
      W.m.appendChild(rl);
    }
  }
  GROUPS[act].forEach(([gname, items]) => {
    let dd, tb, m, tgt;
    if (wide) {
      ({ dd, tb, m } = W);
      m.classList.remove("wide");
      m.classList.add("cas");
      const cat = document.createElement("div");
      cat.className = "cat";
      const cb = document.createElement("button");
      cb.type = "button";
      cb.className = "catb";
      cb.innerHTML = esc(gname) + '<span class="hint">' + items.length + '</span><span class="ar">▸</span>';
      cb.onclick = e => {
        e.stopPropagation();
        m.querySelectorAll(".cat.open").forEach(x => x !== cat && x.classList.remove("open"));
        cat.classList.toggle("open");
      };
      cat.onmouseenter = () => {
        m.querySelectorAll(".cat.open").forEach(x => x !== cat && x.classList.remove("open"));
        cat.classList.add("open");
      };
      tgt = document.createElement("div");
      tgt.className = "sub";
      cat.append(cb, tgt);
      m.appendChild(cat);
    } else {
      ({ dd, tb, m } = mk(esc(gname) + ' <span class="hint">' + items.length + "</span> ▾"));
    }
    if (0)
      tb.onclick = e => {
        e.stopPropagation();
        const was = !m.hidden;
        document.querySelectorAll(".menu").forEach(x => (x.hidden = true));
        document.querySelectorAll(".ddb").forEach(x => x.classList.remove("open"));
        if (!was) {
          m.hidden = false;
          tb.classList.add("open");
        }
      };
    items.forEach(it => {
      const b = document.createElement("button");
      b.type = "button";
      if (act === "eq") {
        const [lab, t, w, h] = it;
        b.innerHTML =
          '<span class="sw" style="background:' +
          SW[t] +
          (t === "water" ? ";border-radius:50%" : "") +
          '"></span>' +
          esc(lab);
        b.onclick = () => {
          const q = spawnPos(w, h);
          add({
            t,
            ot: lab,
            oti: it[4] || LBL2OT[lab.toLowerCase()] || null,
            l: lab === "Двері" || (t === "water" && lab === "Точка води") ? "" : lab.toLowerCase(),
            x: q.x,
            y: q.y,
            w,
            h,
          });
        };
      } else {
        const k = K[it],
          sh = k[1];
        b.innerHTML =
          (sh === "seg"
            ? `<svg width="26" height="12" style="margin-right:6px;vertical-align:-1px"><line x1="2" y1="6" x2="24" y2="6" stroke="${k[4]}" stroke-width="${Math.min(6, k[6])}" ${
                k[5]
                  ? `stroke-dasharray="${k[5]
                      .split(" ")
                      .map(v => v / 2)
                      .join(" ")}"`
                  : ""
              }/></svg>`
            : sh === "arrow"
              ? `<svg width="26" height="12" style="margin-right:6px;vertical-align:-1px"><line x1="1" y1="6" x2="17" y2="6" stroke="${k[4]}" stroke-width="3" ${
                  k[5]
                    ? `stroke-dasharray="${k[5]
                        .split(" ")
                        .map(v => v / 2)
                        .join(" ")}"`
                    : ""
                }/><polygon points="25,6 16,1 16,11" fill="${k[4]}"/></svg>`
              : sh === "zone"
                ? `<span class="sw" style="background:${k[4]}33;border:2px dashed ${k[4]}"></span>`
                : `<span class="ic" style="background:${sh === "tri" ? "#ffd34d" : sh === "doc" ? "transparent" : k[4]};color:${sh === "tri" ? "#1d2326" : sh === "doc" ? k[4] : "#fff"};${sh === "doc" ? `border:1.5px solid ${k[4]}` : ""}${sh === "pt" ? ";border-radius:10px" : ""}">${esc(k[3])}</span>`) +
          esc(k[2]);
        b.onclick = () => {
          if (sh === "seg") {
            armK = armK === it ? null : it;
            if (drag && drag.wall) drag = null;
            setSel([]);
            presets();
            draw();
            return;
          } else if (sh === "arrow") {
            armK = armK === it ? null : it;
            if (drag && drag.poly) drag = null;
            presets();
            draw();
            return;
          } else if (sh === "zone") {
            const q = spawnPos(220, 140);
            add({ ly: act, t: "zone", k: it, l: "", x: q.x, y: q.y, w: 220, h: 140 });
          } else {
            const q = spawnPos(34, 34);
            add({ ly: act, t: "mk", k: it, l: "", n: "", x: q.x, y: q.y, w: 34, h: 34 });
          }
        };
      }
      const bb = () => insertItem(it);
      b.onclick = e => {
        e.stopPropagation();
        bb();
        m.hidden = true;
        tb.classList.remove("open");
        if (act === "eq") presets();
      };
      (tgt || m).appendChild(b);
    });
    if (!wide) pz.appendChild(dd);
  });
}
// Закривати спадні меню каталогу кліком поза ними і Esc
document.addEventListener("click", e => {
  if (!e.target.closest(".dd")) {
    document.querySelectorAll(".menu").forEach(x => (x.hidden = true));
    document.querySelectorAll(".ddb").forEach(x => x.classList.remove("open"));
  }
});
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape") document.querySelectorAll(".menu").forEach(x => (x.hidden = true));
  },
  true
);
// Додати в нещодавні
function addRecent(it) {
  const key = JSON.stringify(it);
  RECENT = [key, ...RECENT.filter(x => x !== key)].slice(0, 8);
  try {
    localStorage.setItem(RECK, JSON.stringify(RECENT));
  } catch (e) {}
}
// Нещодавні елементи для шару
function recentFor(a) {
  return RECENT.map(x => {
    try {
      return JSON.parse(x);
    } catch (e) {
      return null;
    }
  }).filter(it => it && (a === "eq" ? Array.isArray(it) : K[it] && K[it][0] === a));
}
// Вставка елемента каталогу; pos — точка на плані (необов'язково)
function insertItem(it, pos) {
  const at = (w, h) =>
    pos
      ? { x: sn(Math.max(0, Math.min(1260 - w, pos.x - w / 2))), y: sn(Math.max(0, Math.min(1280 - h, pos.y - h / 2))) }
      : spawnPos(w, h);
  if (Array.isArray(it)) {
    const [lab, t, w, h] = it,
      q = at(w, h);
    addRecent(it);
    add({
      t,
      ot: lab,
      oti: it[4] || LBL2OT[lab.toLowerCase()] || null,
      l: lab === "Двері" || (t === "water" && lab === "Точка води") ? "" : lab.toLowerCase(),
      x: q.x,
      y: q.y,
      w,
      h,
    });
    return;
  }
  const k = K[it];
  if (!k) return;
  const sh = k[1],
    ly = k[0];
  addRecent(it);
  if (sh === "seg") {
    act = ly;
    armK = it;
    setSel([]);
    if (pos) {
      const q = wallSnap([pos.x, pos.y], null, false);
      drag = { wall: { k: it, a: q, n: 0 }, cur: q, moved: false };
    }
    presets();
    draw();
  } else if (sh === "arrow") {
    act = ly;
    armK = it;
    if (drag && drag.poly) drag = null;
    presets();
    draw();
  } else if (sh === "zone") {
    const q = at(220, 140);
    add({ ly, t: "zone", k: it, l: "", x: q.x, y: q.y, w: 220, h: 140 });
  } else {
    const q = at(34, 34);
    add({ ly, t: "mk", k: it, l: "", n: "", x: q.x, y: q.y, w: 34, h: 34 });
  }
}
// Назва елемента каталогу
const itLabel = it => (Array.isArray(it) ? it[0] : (K[it] || [, , it])[2]);
