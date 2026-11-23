/*
  Малювання плану в SVG: стіни, обладнання, зони, маршрути, рух, позначки, радіуси ризиків.
  draw() перебудовує план повністю; drawSoon() — не частіше одного разу на кадр (під час перетягування).
*/
// Заливка старих типів обладнання
function fill(t) {
  return {
    room: "var(--room)",
    part: "none",
    eq: "var(--eq)",
    cage: "var(--teal)",
    sink: "var(--blue)",
    water: "var(--blue)",
    door: "var(--amb)",
    note: "none",
    stair: "var(--eq)",
  }[t];
}
// Обведення старих типів обладнання
function stroke(t) {
  return {
    room: "var(--wall)",
    part: "var(--wall)",
    eq: "var(--mute)",
    cage: "var(--tealk)",
    sink: "var(--bluek)",
    water: "var(--bluek)",
    door: "var(--ambk)",
    note: "none",
    stair: "var(--mute)",
  }[t];
}
// Колір підпису
function tcol(t) {
  return { cage: "var(--tealk)", sink: "var(--bluek)", door: "var(--ambk)", note: "var(--mute)" }[t] || "var(--ink)";
}
// Розбити підпис на рядки під ширину
function wrap(words, aw, fs) {
  const L = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (t.length * fs * 0.56 <= aw) cur = t;
    else {
      if (!cur || w.length * fs * 0.56 > aw) return null;
      L.push(cur);
      cur = w;
    }
  }
  if (cur) L.push(cur);
  return L;
}
// Підпис елемента з підбором розміру і повороту
function label(o) {
  const col = tcol(o.t);
  if (o.t === "stair")
    return `<text x="${o.x + o.w / 2}" y="${o.y + o.h + 18}" text-anchor="middle" font-size="16" fill="var(--mute)">${esc(o.l)}</text>`;
  if (o.t === "room" || o.t === "part") {
    let fs = 22;
    const aw = o.w - 20;
    while (fs > 11 && o.l.length * fs * 0.56 > aw) fs--;
    return `<text x="${o.x + 10}" y="${o.y + fs + 8}" font-size="${fs}" font-weight="600" fill="${col}">${esc(o.l)}</text>`;
  }
  const words = o.l.split(/\s+/),
    W = o.w - 8,
    H = o.h - 6;
  let best = null;
  for (const rot of o.h > o.w * 1.3 ? [false, true] : [false]) {
    const aw = rot ? H : W,
      ah = rot ? W : H;
    for (let fs = 16; fs >= 7; fs--) {
      const L = wrap(words, aw, fs);
      if (L && L.length * fs * 1.15 <= ah) {
        if (!best || fs > best.fs) best = { fs, L, rot };
        break;
      }
    }
  }
  if (!best) best = { fs: 8, L: [o.l], rot: o.h > o.w };
  const cx = o.x + o.w / 2,
    cy = o.y + o.h / 2,
    lh = best.fs * 1.15,
    y0 = cy - ((best.L.length - 1) * lh) / 2;
  const sp = best.L.map((t, i) => `<tspan x="${cx}" y="${y0 + i * lh}">${esc(t)}</tspan>`).join("");
  return `<text text-anchor="middle" dominant-baseline="central" font-size="${best.fs}" fill="${col}"${best.rot ? ` transform="rotate(-90 ${cx} ${cy})"` : ""}>${sp}</text>`;
}
// Текст зі світлим обведенням
const halo = (x, y, txt, fs, anchor, col) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${fs}" font-weight="500" fill="${col}" stroke="var(--paper)" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${esc(txt)}</text>`;
// Намалювати обладнання
function drawEq(o) {
  const sw = o.t === "room" || o.t === "part" ? 3 : 1.5;
  let g = "";
  if (o.t === "water")
    g += `<ellipse cx="${o.x + o.w / 2}" cy="${o.y + o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}" fill="${fill(o.t)}" stroke="${stroke(o.t)}" stroke-width="2"/>`;
  else
    g += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${o.t === "room" || o.t === "part" ? 2 : 6}" fill="${fill(o.t)}" stroke="${stroke(o.t)}" stroke-width="${sw}" ${o.t === "note" ? 'pointer-events="all"' : ""}/>`;
  if (o.t === "stair")
    for (let k = 1; k < 5; k++)
      g += `<line x1="${o.x}" x2="${o.x + o.w}" y1="${o.y + (o.h * k) / 5}" y2="${o.y + (o.h * k) / 5}" stroke="var(--mute)" stroke-width="1.5"/>`;
  if (o.l) g += label(o);
  if (o.q > 1)
    g += `<rect x="${o.x + o.w - 26}" y="${o.y + o.h - 15}" width="24" height="13" rx="3" fill="var(--tealk)"/><text x="${o.x + o.w - 14}" y="${o.y + o.h - 8.5}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="#fff">×${o.q}</text>`;
  return g;
}
// Шлях ламаної зі стрілкою
function plPath(pts, k, dash) {
  const c = k[4];
  if (pts.length < 2) return "";
  const n = pts.length,
    [x2, y2] = pts[n - 1],
    [x1, y1] = pts[n - 2],
    len = Math.hypot(x2 - x1, y2 - y1) || 1,
    ux = (x2 - x1) / len,
    uy = (y2 - y1) / len,
    hx = x2 - ux * 16,
    hy = y2 - uy * 16,
    px = -uy * 8,
    py = ux * 8;
  const d =
    "M" +
    pts
      .slice(0, -1)
      .map(q => q.join(" "))
      .join("L") +
    "L" +
    hx +
    " " +
    hy;
  return `<path d="M${pts.map(q => q.join(" ")).join("L")}" fill="none" stroke="transparent" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" ${dash || k[5] ? `stroke-dasharray="${dash || k[5]}"` : ""}/><polygon points="${x2},${y2} ${hx + px},${hy + py} ${hx - px},${hy - py}" fill="${c}"/>`;
}
// Намалювати лінію руху
function drawPL(o) {
  const k = K[o.k] || K.a_pat,
    pts = absP(o);
  let g = plPath(pts, k);
  if (o.l && pts.length > 1) {
    const i = Math.floor((pts.length - 1) / 2),
      a = pts[i],
      b = pts[i + 1];
    g += halo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8, o.l, 13, "middle", k[4]);
  }
  return g;
}
// Намалювати стрілку
function drawArrow(o) {
  const k = K[o.k] || K.a_pat,
    c = k[4],
    dx = o.x2 - o.x,
    dy = o.y2 - o.y,
    len = Math.hypot(dx, dy) || 1,
    ux = dx / len,
    uy = dy / len;
  const hx = o.x2 - ux * 16,
    hy = o.y2 - uy * 16,
    px = -uy * 8,
    py = ux * 8;
  let g = `<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="transparent" stroke-width="22" stroke-linecap="round"/>`;
  g += `<line x1="${o.x}" y1="${o.y}" x2="${hx}" y2="${hy}" stroke="${c}" stroke-width="4" stroke-linecap="round" ${k[5] ? `stroke-dasharray="${k[5]}"` : ""}/>`;
  g += `<polygon points="${o.x2},${o.y2} ${hx + px},${hy + py} ${hx - px},${hy - py}" fill="${c}"/>`;
  if (o.l) g += halo((o.x + o.x2) / 2, (o.y + o.y2) / 2 - 8, o.l, 13, "middle", c);
  return g;
}
// Значок позначки (ризик, зберігання, матеріал)
function sym(k, x, y, w, h) {
  const c = k[4],
    cx = x + w / 2,
    cy = y + h / 2,
    fs = k[3].length > 2 ? 10 : k[3].length > 1 ? 12 : 15;
  let g = "";
  if (k[1] === "pt")
    g += `<circle cx="${cx}" cy="${cy}" r="${w / 2}" fill="${c}" stroke="var(--paper)" stroke-width="2"/>`;
  else if (k[1] === "tri")
    g += `<polygon points="${cx},${y} ${x + w},${y + h} ${x},${y + h}" fill="#ffd34d" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`;
  else if (k[1] === "sq")
    g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}" stroke="var(--paper)" stroke-width="2"/>`;
  else
    g += `<path d="M${x} ${y}H${x + w - 9}L${x + w} ${y + 9}V${y + h}H${x}Z" fill="var(--paper)" stroke="${c}" stroke-width="2.5"/><path d="M${x + w - 9} ${y}V${y + 9}H${x + w}" fill="none" stroke="${c}" stroke-width="2"/>`;
  const tc = k[1] === "tri" ? "#1d2326" : k[1] === "doc" ? c : "#fff",
    ty = k[1] === "tri" ? cy + h * 0.17 : cy;
  g += `<text x="${cx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="600" fill="${tc}">${esc(k[3])}</text>`;
  return g;
}
// Намалювати позначку
function drawMk(o) {
  const k = K[o.k] || K.p_in;
  let g =
    `<rect x="${o.x - 2}" y="${o.y - 2}" width="${o.w + 4}" height="${o.h + 4}" fill="transparent"/>` +
    sym(k, o.x, o.y, o.w, o.h);
  if (o.l) g += halo(o.x + o.w / 2, o.y + o.h + 15, o.l, 13, "middle", "var(--ink)");
  return g;
}
// Намалювати стару зону-прямокутник
function drawZone(o) {
  const k = K[o.k] || K.z_mid,
    c = k[4];
  let g = `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="4" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-width="2.5" stroke-dasharray="12 6"/>`;
  g += halo(o.x + 8, o.y + 20, o.l || k[2], 14, "start", c);
  return g;
}
// Намалювати стіну, двері, вікно
function drawSeg(o) {
  const k = K[o.k] || K.w_wall,
    c = k[4],
    wd = k[6] || 5,
    dx = o.x2 - o.x,
    dy = o.y2 - o.y,
    len = Math.hypot(dx, dy) || 1,
    px = (-dy / len) * 10,
    py = (dx / len) * 10;
  let g = `<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="transparent" stroke-width="22" stroke-linecap="round"/>`;
  if (o.k === "w_pass" || o.k === "w_door" || o.k === "w_dlock")
    g += `<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="var(--paper)" stroke-width="${wd + 6}"/>`;
  g += `<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="${c}" stroke-width="${wd}" stroke-linecap="${k[5] ? "butt" : "square"}" ${k[5] ? `stroke-dasharray="${k[5]}"` : ""}/>`;
  if (o.k === "w_door" || o.k === "w_dlock" || o.k === "w_pass")
    for (const [x, y] of [
      [o.x, o.y],
      [o.x2, o.y2],
    ])
      g += `<line x1="${x + px}" y1="${y + py}" x2="${x - px}" y2="${y - py}" stroke="${c}" stroke-width="3"/>`;
  if (o.l) g += halo((o.x + o.x2) / 2, (o.y + o.y2) / 2 - 10, o.l, 13, "middle", c);
  return g;
}
// Намалювати маршрут
function drawRZ(o) {
  const k = RKM[o.rk] || RK[0],
    c = k[2],
    rs = absR(o);
  if (!rs.length) return "";
  let g = rs
    .map(
      r =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="url(#h_${k[0]})" stroke="${c}" stroke-width="2.5" stroke-dasharray="3 4"/>`
    )
    .join("");
  g += halo(rs[0].x + 8, rs[0].y + 20, o.l || k[1], 13, "start", c);
  return g;
}
// Намалювати зону з підписом
function drawZZ(o) {
  const col = phue(o) || (zcol(o) ? ZCOL[zcol(o)][1] : "#7d3c98"),
    rs = absR(o);
  if (!rs.length) return "";
  let g = rs
    .map(
      r =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${col}" fill-opacity=".13" stroke="${col}" stroke-width="2" stroke-dasharray="9 5"/>`
    )
    .join("");
  const zcs = zcodes(o),
    t =
      (zcs.length ? zcs[0] + (zcs.length > 1 ? " +" + (zcs.length - 1) : "") + " · " : "") +
      zname(o) +
      (o.sz ? " — " + o.sz : "");
  g += halo(rs[0].x + 8, rs[0].y + 20, t, 14, "start", col);
  return g;
}
// Запланований кадр для drawSoon
let _raf = 0;
// Перемалювати на наступному кадрі (не частіше 60 разів на секунду)
function drawSoon() {
  if (!_raf)
    _raf = requestAnimationFrame(() => {
      _raf = 0;
      draw();
    });
}
// Перемалювати план і оновити панелі
function draw() {
  if (_raf) {
    cancelAnimationFrame(_raf);
    _raf = 0;
  }
  invalidate();
  let g = `<defs><pattern id="gr" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="var(--grid)" stroke-width="1"/></pattern></defs>${bg.src ? `<image href="${bg.src}" x="${bg.x || 0}" y="${bg.y || 0}" width="${bg.w}" height="${bg.h}" preserveAspectRatio="none" opacity="${bgOp}" pointer-events="none"/>` : ""}${RK.map(k => `<pattern id="h_${k[0]}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="${k[2]}" stroke-width="3" stroke-opacity=".28"/></pattern>`).join("")}<rect width="1260" height="1280" fill="url(#gr)" pointer-events="none"/>`;
  const rank = o => {
    const l = LY(o);
    if (l === "zone") return -3;
    if (l === "route") return -2;
    if (l === "wall") return -1;
    if (l === "eq") return 0;
    if (o.t === "zone") return 1;
    if (o.t === "arrow" || o.t === "pl") return 2;
    return 3;
  };
  const L = S.filter(o => show[LY(o)] && !isHid(o)).sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (LY(a) === act) - (LY(b) === act) ||
      (rank(a) === 0 ? ORDER[a.t] - ORDER[b.t] || (ORDER[a.t] <= 2 ? b.w * b.h - a.w * a.h : 0) : 0)
  );
  g += drawHaz();
  for (const o of L) {
    const on = LY(o) === act,
      isSel = SEL.has(o.id),
      dimO = !on && !isSel && viewL[LY(o)] !== "bright";
    const lk = isLk(o);
    g += `<g data-oid="${o.id}" ${(on || isSel) && !bgMode && !lk ? `data-id="${o.id}" style="cursor:move"` : `${dimO ? `opacity=".35"` : ""} pointer-events="none"`}>`;
    g +=
      o.t === "zz"
        ? drawZZ(o)
        : o.t === "rz"
          ? drawRZ(o)
          : o.t === "pl"
            ? drawPL(o)
            : o.t === "seg"
              ? drawSeg(o)
              : o.t === "arrow"
                ? drawArrow(o)
                : o.t === "mk"
                  ? drawMk(o)
                  : o.t === "zone"
                    ? drawZone(o)
                    : drawEq(o);
    if (hasMat(o) && o.m && MAT[o.m]) {
      const m = MAT[o.m],
        sz = Math.min(14, o.w / 3, o.h / 2.5);
      if (sz >= 7)
        g += `<rect x="${o.x + o.w - sz - 2}" y="${o.y + 2}" width="${sz}" height="${sz}" rx="2" fill="${m[3]}" pointer-events="none"/><text x="${o.x + o.w - sz / 2 - 2}" y="${o.y + 2 + sz / 2}" text-anchor="middle" dominant-baseline="central" font-size="${sz * 0.75}" font-weight="600" fill="#fff">${m[2]}</text>`;
    }

    if (isSel && SEL.size > 1) {
      const b = bbox(o);
      g += `<rect x="${b.x - 5}" y="${b.y - 5}" width="${b.w + 10}" height="${b.h + 10}" fill="none" stroke="var(--sel)" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/>`;
    } else if (isSel) {
      if (isLine(o))
        g += `<circle data-end="1" cx="${o.x}" cy="${o.y}" r="11" fill="var(--sel)" style="cursor:grab"/><circle data-end="2" cx="${o.x2}" cy="${o.y2}" r="11" fill="var(--sel)" fill-opacity=".85" style="cursor:grab"/>`;
      else if (o.t === "pl")
        g += absP(o)
          .map(
            (q, i) =>
              `<circle data-pv="${i}" cx="${q[0]}" cy="${q[1]}" r="8" fill="var(--sel)" fill-opacity="${i ? ".85" : "1"}" style="cursor:grab"/>`
          )
          .join("");
      else if (isZL(o))
        g += absR(o)
          .map(
            (r, i) =>
              `<rect x="${r.x - 3}" y="${r.y - 3}" width="${r.w + 6}" height="${r.h + 6}" fill="none" stroke="var(--sel)" stroke-width="2" stroke-dasharray="8 5" pointer-events="none"/><rect data-zr="${i}" x="${r.x + r.w - 10}" y="${r.y + r.h - 10}" width="20" height="20" rx="4" fill="var(--sel)" style="cursor:nwse-resize"/>`
          )
          .join("");
      else
        g += `<rect x="${o.x - 4}" y="${o.y - 4}" width="${o.w + 8}" height="${o.h + 8}" fill="none" stroke="var(--sel)" stroke-width="2" stroke-dasharray="8 5" pointer-events="none"/><rect data-rz="${o.id}" x="${o.x + o.w - 10}" y="${o.y + o.h - 10}" width="20" height="20" rx="4" fill="var(--sel)" style="cursor:nwse-resize"/>`;
    }
    g += `</g>`;
  }
  if (drag && drag.wall) {
    const a = drag.wall.a,
      c = drag.cur || a,
      k = K[drag.wall.k] || K.w_wall,
      d = Math.hypot(c[0] - a[0], c[1] - a[1]);
    g += `<g pointer-events="none"><line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${k[4]}" stroke-width="${k[6] || 5}" stroke-opacity=".6" stroke-linecap="square" ${k[5] ? `stroke-dasharray="${k[5]}"` : ""}/><circle cx="${a[0]}" cy="${a[1]}" r="5" fill="#e8590c"/><circle cx="${c[0]}" cy="${c[1]}" r="5" fill="#fff" stroke="#e8590c" stroke-width="2"/>${d > 4 ? halo((a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - 12, (d / pxm).toFixed(2) + " м", 13, "middle", "#e8590c") : ""}</g>`;
  }
  {
    const so = SEL.size === 1 && S.find(x => x.id === sel);
    if (so && so.t === "seg" && !(drag && drag.wall)) {
      const d = Math.hypot(so.x2 - so.x, so.y2 - so.y);
      g += `<g pointer-events="none">${halo((so.x + so.x2) / 2, (so.y + so.y2) / 2 - 14, (d / pxm).toFixed(2) + " м", 12, "middle", "#e8590c")}</g>`;
    }
  }
  if (drag && drag.poly) {
    const pp = [...drag.poly.pts];
    if (drag.cur) pp.push(drag.cur);
    const k = K[drag.poly.k] || K.a_pat;
    g += pp.length > 1 ? `<g opacity=".75" pointer-events="none">${plPath(pp, k)}</g>` : "";
    g += drag.poly.pts
      .map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="${k[4]}" pointer-events="none"/>`)
      .join("");
  }
  if (anl) {
    const A = analyze();
    g += A.marks
      .map(
        m =>
          `<g><title>${esc(m.msg)}</title><circle cx="${m.x}" cy="${m.y}" r="12" fill="${m.sev === "med" ? "#d68910" : "#c0392b"}" stroke="#fff" stroke-width="2"/><text x="${m.x}" y="${m.y}" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="700" fill="#fff">!</text></g>`
      )
      .join("");
  }
  if (drag && drag.newz) {
    const n = drag.newz,
      x = Math.min(n.x0, n.x1),
      y = Math.min(n.y0, n.y1);
    g += `<rect x="${x}" y="${y}" width="${Math.abs(n.x1 - n.x0)}" height="${Math.abs(n.y1 - n.y0)}" fill="#7d3c98" fill-opacity=".1" stroke="#7d3c98" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/>`;
  }
  if (drag && drag.lasso) {
    const L2 = drag.lasso,
      x = Math.min(L2.x0, L2.x1),
      y = Math.min(L2.y0, L2.y1);
    g += `<rect x="${x}" y="${y}" width="${Math.abs(L2.x1 - L2.x0)}" height="${Math.abs(L2.y1 - L2.y0)}" fill="var(--sel)" fill-opacity=".08" stroke="var(--sel)" stroke-width="1.5" stroke-dasharray="6 4" pointer-events="none"/>`;
  }
  if (bgMode && bg.src) {
    const bx = bg.x || 0,
      by = bg.y || 0;
    g += `<rect data-bg="1" x="${bx}" y="${by}" width="${bg.w}" height="${bg.h}" fill="transparent" stroke="var(--sel)" stroke-width="3" stroke-dasharray="10 6" style="cursor:move"/><rect data-bgrz="1" x="${bx + bg.w - 14}" y="${by + bg.h - 14}" width="28" height="28" rx="5" fill="var(--sel)" style="cursor:nwse-resize"/>`;
  }
  g += drawCalib();
  cv.innerHTML = g;
  cv.style.width = zoom * 100 + "%";
  panel();
  if (!(drag && drag.moved && !drag.lasso)) {
    tree();
    pass();
  }
  tabs();
  selbar();
  setTb();
  ftb();
  sbHint();
}
// Радіуси і значки ризиків на плані
function drawHaz() {
  if (!KB.hsrc || !showHz || !(mode === "zones" || anl)) return "";
  let g = "";
  const badge = new Map();
  for (const it of hzItems("source")) {
    if (!it.g.r || !PLANHZ.has(it.h.id)) continue;
    const b = it.g.r,
      r = it.rp,
      c = it.h.color;
    if (r > 0)
      g += `<rect x="${b.x - r}" y="${b.y - r}" width="${b.w + 2 * r}" height="${b.h + 2 * r}" rx="${r}" fill="${c}" fill-opacity=".06" stroke="${c}" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="5 5"><title>${esc(it.h.name)}: ${it.rm} м від «${esc(hzName(it.o))}»</title></rect>`;
    const L = badge.get(it.o) || [];
    if (!L.includes(it.h)) L.push(it.h);
    badge.set(it.o, L);
  }
  const tri = (x, y, h) =>
    `<g><title>${esc(h.name)}</title><path d="M${x} ${y - 9}L${x + 9} ${y + 7}H${x - 9}Z" fill="#ffd34d" stroke="${h.color}" stroke-width="2"/><text x="${x}" y="${y + 2}" text-anchor="middle" dominant-baseline="central" font-size="${h.sym.length > 1 ? 7 : 9}" font-weight="700" fill="${h.color}">${esc(h.sym)}</text></g>`;
  for (const [o, L] of badge) {
    const b = bbox(o),
      w = L.length * 13 + 8;
    g += `<g><title>${esc(L.map(h => h.name).join(", "))}</title><rect x="${b.x + b.w / 2 - w / 2}" y="${b.y - 19}" width="${w}" height="16" rx="8" fill="#fff8e1" stroke="#d68910" stroke-width="1.2"/>${L.map((h, i) => `<text x="${b.x + b.w / 2 - w / 2 + 10.5 + i * 13}" y="${b.y - 11}" text-anchor="middle" dominant-baseline="central" font-size="${h.sym.length > 1 ? 7.5 : 10}" font-weight="700" fill="${h.color}">${esc(h.sym)}</text>`).join("")}</g>`;
  }
  for (const z of S.filter(o => o.t === "zz" && o.r && o.r.length && !isHid(o))) {
    const hs = new Set();
    zacts(z).forEach(a =>
      (KB.hsrc["activity:" + a] || []).forEach(r => {
        if (PLANHZ.has(r.hazard_id)) hs.add(r.hazard_id);
      })
    );
    const r0 = absR(z)[0];
    if (!r0) continue;
    [...hs]
      .map(h => KB.hzm[h])
      .filter(Boolean)
      .forEach((h, i) => (g += tri(r0.x + r0.w - 12 - i * 19, r0.y + 14, h)));
  }
  return `<g class="hzl" pointer-events="none">${g}</g>`;
}
// Лінія виміру масштабу
function drawCalib() {
  if (!calib) return "";
  const P = [...calib.pts];
  if (calib.cur && P.length === 1) P.push(calib.cur);
  let g = P.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="6" fill="#c0392b"/>`).join("");
  if (P.length === 2) {
    const d = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
    g +=
      `<line x1="${P[0][0]}" y1="${P[0][1]}" x2="${P[1][0]}" y2="${P[1][1]}" stroke="#c0392b" stroke-width="3" stroke-dasharray="8 5"/>` +
      halo(
        (P[0][0] + P[1][0]) / 2,
        (P[0][1] + P[1][1]) / 2 - 12,
        (d / pxm).toFixed(2) + " м за поточним масштабом",
        13,
        "middle",
        "#c0392b"
      );
  }
  return `<g pointer-events="none">${g}</g>`;
}
