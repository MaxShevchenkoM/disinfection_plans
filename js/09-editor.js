/*
  Редагування мишею і клавіатурою: виділення, перетягування, малювання стін і руху, кнопки стрічки, файли, масштаб.
*/
// Натискання на плані: малювання стін і руху, ручки розміру, виділення, початок перетягування, нова зона, рамка виділення
cv.addEventListener("pointerdown", e => {
  if (!window.__canEdit || e.button === 2) return;
  const mb = e.target.closest("[data-mat]");
  if (mb) {
    e.preventDefault();
    const o = S.find(x => x.id === +mb.dataset.mat);
    if (o) {
      push();
      const order = ["", ...MATS.map(m => m[0])],
        i = order.indexOf(o.m || "");
      const nx = order[(i + 1) % order.length];
      if (nx) o.m = nx;
      else delete o.m;
      draw();
      save();
    }
    return;
  }
  if (armK && act === "wall" && K[armK] && K[armK][1] === "seg" && !bgMode) {
    const p = pt(e),
      q = wallSnap([p.x, p.y], drag && drag.wall ? drag.wall.a : null, e.shiftKey);
    if (drag && drag.wall) {
      const a = drag.wall.a;
      if (Math.hypot(q[0] - a[0], q[1] - a[1]) > 4) {
        push();
        const o = {
          ly: "wall",
          t: "seg",
          k: drag.wall.k,
          l: "",
          x: a[0],
          y: a[1],
          x2: q[0],
          y2: q[1],
          uid: uidv(),
          id: nid(),
        };
        S.push(o);
        drag.wall.n++;
        drag.wall.a = q;
        save();
      }
    } else {
      setSel([]);
      drag = { wall: { k: armK, a: q, n: 0 }, cur: q, moved: false };
    }
    draw();
    e.preventDefault();
    return;
  }
  if (armK && act === "flow" && K[armK] && K[armK][0] === "flow" && !bgMode) {
    const p = pt(e);
    let q = [sn(p.x), sn(p.y)];
    if (drag && drag.poly) {
      const l = drag.poly.pts.at(-1);
      if (e.shiftKey) {
        if (Math.abs(q[0] - l[0]) < Math.abs(q[1] - l[1])) q[0] = l[0];
        else q[1] = l[1];
      }
      if (Math.hypot(l[0] - q[0], l[1] - q[1]) > 4) drag.poly.pts.push(q);
    } else {
      setSel([]);
      drag = { poly: { k: armK, pts: [q] }, cur: q, moved: false };
    }
    draw();
    e.preventDefault();
    return;
  }
  {
    const pv = e.target.getAttribute("data-pv");
    if (pv != null) {
      const o = S.find(x => x.id === sel);
      if (o) {
        push();
        drag = { o, pvi: +pv, moved: false };
        cv.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
      return;
    }
  }
  if (bgMode) {
    if (!bg.src) return;
    const t = e.target.getAttribute("data-bgrz") ? "rz" : e.target.getAttribute("data-bg") ? "mv" : null;
    if (!t) return;
    const p = pt(e);
    drag = { bg: t, px: p.x, py: p.y, ox: bg.x || 0, oy: bg.y || 0, ow: bg.w, oh: bg.h, moved: false };
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  const zr = e.target.getAttribute("data-zr");
  if (zr != null) {
    const o = S.find(x => x.id === sel);
    if (o) {
      push();
      drag = { o, zri: +zr, zsnap: o.t === "zz" ? zSnap([o]) : null, zmoved: [o], moved: false };
      cv.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
    return;
  }
  const rz = e.target.getAttribute("data-rz"),
    end = e.target.getAttribute("data-end"),
    g = e.target.closest("[data-id]");
  if (!g && !rz && (act === "zone" || act === "route")) {
    const p = pt(e),
      one = SEL.size === 1 ? S.find(x => x.id === sel && isZL(x)) : null;
    drag = {
      newz: { x0: sn(p.x), y0: sn(p.y), x1: sn(p.x), y1: sn(p.y) },
      addTo: e.shiftKey ? one : null,
      moved: false,
    };
    if (!e.shiftKey) setSel([]);
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
    draw();
    return;
  }
  if (!g && !rz) {
    const p = pt(e);
    if (e.shiftKey) {
      drag = { lasso: { x0: p.x, y0: p.y, x1: p.x, y1: p.y }, base: new Set(SEL) };
      cv.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else setSel([]);
    draw();
    return;
  }
  const id = +(rz || g.dataset.id),
    o = S.find(x => x.id === id);
  if (e.shiftKey && !rz && !end) {
    const ids = grpOf(id),
      has = SEL.has(id),
      n = new Set(SEL);
    ids.forEach(i => (has ? n.delete(i) : n.add(i)));
    setSel(n);
    draw();
    e.preventDefault();
    return;
  }
  if (!SEL.has(id)) setSel(grpOf(id));
  push();
  const p = pt(e);
  drag = {
    o,
    rz: !!rz,
    end,
    dx: p.x - o.x,
    dy: p.y - o.y,
    px: p.x,
    py: p.y,
    ox: o.x,
    oy: o.y,
    ox2: o.x2,
    oy2: o.y2,
    moved: false,
    multi: SEL.size > 1 && !rz && !end ? selObjs().map(q => ({ q, x: q.x, y: q.y, x2: q.x2, y2: q.y2 })) : null,
  };
  {
    const mz = (drag.multi ? drag.multi.map(m => m.q) : [o]).filter(q => q.t === "zz");
    if (mz.length) {
      drag.zmoved = mz;
      drag.zsnap = zSnap(mz);
    }
  }
  cv.setPointerCapture(e.pointerId);
  draw();
  e.preventDefault();
});
// Рух миші: перетягування, зміна розміру, попередній перегляд стіни чи руху (перемальовує не частіше кадру)
cv.addEventListener("pointermove", e => {
  if (!drag) return;
  const p = pt(e),
    o = drag.o;
  if (drag.wall) {
    drag.cur = wallSnap([p.x, p.y], drag.wall.a, e.shiftKey);
    drawSoon();
    return;
  }
  if (drag.poly) {
    let q = [sn(p.x), sn(p.y)];
    const l = drag.poly.pts.at(-1);
    if (e.shiftKey) {
      if (Math.abs(q[0] - l[0]) < Math.abs(q[1] - l[1])) q[0] = l[0];
      else q[1] = l[1];
    }
    drag.cur = q;
    drawSoon();
    return;
  }
  drag.moved = true;
  if (drag.pvi != null) {
    const pts = absP(o);
    pts[drag.pvi] = [sn(p.x), sn(p.y)];
    setPts(o, pts);
    drawSoon();
    return;
  }
  if (drag.bg) {
    if (drag.bg === "mv") {
      bg.x = Math.round(drag.ox + p.x - drag.px);
      bg.y = Math.round(drag.oy + p.y - drag.py);
    } else {
      const w = Math.max(100, drag.ow + (p.x - drag.px));
      bg.w = Math.round(w);
      bg.h = Math.round((drag.oh * w) / drag.ow);
    }
    drawSoon();
    return;
  }
  if (drag.newz) {
    drag.newz.x1 = sn(p.x);
    drag.newz.y1 = sn(p.y);
    drawSoon();
    return;
  }
  if (drag.zri != null) {
    const rs = absR(o),
      r = rs[drag.zri];
    r.w = Math.max(20, sn(p.x - r.x));
    r.h = Math.max(20, sn(p.y - r.y));
    setAbs(o, rs);
    if (o.t === "zz") zClip([o], drag.zsnap);
    drawSoon();
    return;
  }
  if (drag.lasso) {
    drag.lasso.x1 = p.x;
    drag.lasso.y1 = p.y;
    const L2 = drag.lasso,
      x0 = Math.min(L2.x0, L2.x1),
      x1 = Math.max(L2.x0, L2.x1),
      y0 = Math.min(L2.y0, L2.y1),
      y1 = Math.max(L2.y0, L2.y1);
    const hit = new Set(drag.base);
    S.filter(q => LY(q) === act && show[act] && !isHid(q) && !isLk(q)).forEach(q => {
      const b = bbox(q);
      if (b.x <= x1 && b.x + b.w >= x0 && b.y <= y1 && b.y + b.h >= y0) grpOf(q.id).forEach(i => hit.add(i));
    });
    setSel(hit);
    drawSoon();
    return;
  }
  if (drag.multi) {
    let dx = p.x - drag.px,
      dy = p.y - drag.py;
    if (snap) {
      const ax = drag.o.x,
        ay = drag.o.y;
      dx = sn(drag.ox + dx) - drag.ox;
      dy = sn(drag.oy + dy) - drag.oy;
    } else {
      dx = Math.round(dx);
      dy = Math.round(dy);
    }
    for (const m of drag.multi) {
      m.q.x = m.x + dx;
      m.q.y = m.y + dy;
      if (isLine(m.q)) {
        m.q.x2 = m.x2 + dx;
        m.q.y2 = m.y2 + dy;
      }
    }
    if (drag.zsnap) zClip(drag.zmoved, drag.zsnap);
    drawSoon();
    return;
  }
  if (isLine(o)) {
    if (drag.end) {
      let nx = sn(p.x),
        ny = sn(p.y);
      const fx = drag.end === "1" ? o.x2 : o.x,
        fy = drag.end === "1" ? o.y2 : o.y;
      if (o.t === "seg" || e.shiftKey) {
        if (Math.abs(nx - fx) < 12) nx = fx;
        if (Math.abs(ny - fy) < 12) ny = fy;
        if (o.t === "seg")
          for (const q of S)
            if (q !== o && q.t === "seg")
              for (const [qx, qy] of [
                [q.x, q.y],
                [q.x2, q.y2],
              ])
                if (Math.hypot(qx - nx, qy - ny) < 12) {
                  nx = qx;
                  ny = qy;
                }
      }
      if (drag.end === "1") {
        o.x = nx;
        o.y = ny;
      } else {
        o.x2 = nx;
        o.y2 = ny;
      }
    } else {
      const dx = sn(p.x - drag.px),
        dy = sn(p.y - drag.py);
      o.x = drag.ox + dx;
      o.y = drag.oy + dy;
      o.x2 = drag.ox2 + dx;
      o.y2 = drag.oy2 + dy;
    }
  } else if (drag.rz) {
    o.w = Math.max(16, sn(p.x - o.x));
    o.h = Math.max(16, sn(p.y - o.y));
    if (o.t === "water" || o.t === "mk") o.h = o.w;
  } else {
    o.x = Math.max(0, Math.min(1260 - o.w, sn(p.x - drag.dx)));
    o.y = Math.max(0, Math.min(1280 - o.h, sn(p.y - drag.dy)));
  }
  if (drag.zsnap) zClip(drag.zmoved, drag.zsnap);
  drawSoon();
});
// Завершення перетягування
const endDrag = e => {
  if (drag && (drag.poly || drag.wall)) return;
  if (drag && drag.newz) {
    const n = drag.newz,
      x = Math.min(n.x0, n.x1),
      y = Math.min(n.y0, n.y1),
      w = Math.abs(n.x1 - n.x0),
      h = Math.abs(n.y1 - n.y0),
      to = drag.addTo;
    drag = null;
    if (w >= 20 && h >= 20) {
      push();
      if (to) {
        const rs = absR(to);
        rs.push({ x, y, w, h });
        setAbs(to, rs);
        if (to.t === "zz") zClip([to]);
        zClean();
        setSel([to.id]);
        draw();
        save();
      } else if (act === "route") {
        const z = { ly: "route", t: "rz", rk: "", uid: uidv(), l: "", x, y, w, h, r: [[0, 0, w, h]], id: nid() };
        S.push(z);
        setSel([z.id]);
        draw();
        save();
        rkMenu(z);
      } else {
        const z = { ly: "zone", t: "zz", uid: uidv(), nm: "", x, y, w, h, r: [[0, 0, w, h]], id: nid() };
        S.push(z);
        zClip([z]);
        zClean();
        setSel([z.id]);
        draw();
        save();
        ztMenu(z);
      }
    } else draw();
    return;
  }
  if (drag && drag.zsnap) {
    zClean();
  }
  if (drag) {
    if (!drag.bg && !drag.lasso && !drag.moved) hist.pop();
    const l = drag.lasso;
    if (drag.moved && drag.o) remember(drag.o);
    drag = null;
    if (l) draw();
    else save();
  }
};
// Відпускання кнопки миші
cv.addEventListener("pointerup", endDrag);
cv.addEventListener("pointercancel", endDrag);
// Завершити лінію руху
function finishPoly() {
  const pp = drag.poly.pts.filter((q, i, a) => !i || Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1]) > 4),
    k = drag.poly.k;
  drag = null;
  armK = null;
  presets();
  if (pp.length < 2) {
    draw();
    return;
  }
  push();
  const o = { ly: "flow", t: "pl", k, l: "", uid: uidv(), id: nid() };
  setPts(o, pp);
  S.push(o);
  remember(o);
  setSel([o.id]);
  draw();
  save();
}
// Подвійний клік: закінчити стіну чи рух або перейменувати
cv.addEventListener("dblclick", e => {
  if (!window.__canEdit) return;
  if (drag && drag.wall) {
    e.preventDefault();
    drag = null;
    draw();
    return;
  }
  if (drag && drag.poly) {
    e.preventDefault();
    finishPoly();
    return;
  }
  const g = e.target.closest("[data-id]");
  if (g) {
    setSel([+g.dataset.id]);
    draw();
    $("lbl").focus();
    $("lbl").select();
  }
});
for (const f of ["lbl", "note"]) $(f).addEventListener("focus", () => push());
// Поля панелі властивостей
$("lbl").addEventListener("input", e => {
  const o = S.find(x => x.id === sel);
  if (o) {
    o.l = e.target.value;
    draw();
    save();
  }
});
$("note").addEventListener("input", e => {
  const o = S.find(x => x.id === sel);
  if (o) {
    o.n = e.target.value;
    list();
    save();
  }
});
$("lbl").addEventListener("keydown", e => {
  if (e.key === "Enter") e.target.blur();
});
$("qty").addEventListener("focus", () => push());
$("qty").addEventListener("input", e => {
  const o = S.find(x => x.id === sel);
  if (o) {
    const v = Math.max(1, Math.min(99, parseInt(e.target.value) || 1));
    if (v > 1) o.q = v;
    else delete o.q;
    draw();
    save();
  }
});
$("oti").addEventListener("change", e => {
  const o = S.find(x => x.id === sel);
  if (o) {
    push();
    o.oti = e.target.value || null;
    draw();
    save();
  }
});
$("typ").addEventListener("change", e => {
  const o = S.find(x => x.id === sel);
  if (o) {
    push();
    o.t = e.target.value;
    draw();
    save();
  }
});
$("knd").addEventListener("change", e => {
  const o = S.find(x => x.id === sel);
  if (o) {
    push();
    if (o.t === "rz") o.rk = e.target.value;
    else o.k = e.target.value;
    draw();
    save();
  }
});
// Кнопки панелі і стрічки: повернути, копія, видалити, групування, виділити все
$("rot").onclick = () => {
  const o = S.find(x => x.id === sel);
  if (o && !isLine(o)) {
    push();
    const cx = o.x + o.w / 2,
      cy = o.y + o.h / 2;
    [o.w, o.h] = [o.h, o.w];
    o.x = sn(cx - o.w / 2);
    o.y = sn(cy - o.h / 2);
    draw();
    save();
  }
};
$("dup").onclick = () => {
  const o = S.find(x => x.id === sel);
  if (o) {
    push();
    const n = { ...o, id: nid(), x: o.x + 20, y: o.y + 20 };
    if (isLine(o)) {
      n.x2 = o.x2 + 20;
      n.y2 = o.y2 + 20;
    }
    S.push(n);
    setSel([n.id]);
    draw();
    save();
  }
};
$("del").onclick = () => {
  if (!SEL.size) return;
  push();
  S = S.filter(x => !SEL.has(x.id));
  setSel([]);
  draw();
  save();
};
$("mdel").onclick = $("del").onclick;
$("mdup").onclick = () => {
  if (!SEL.size) return;
  push();
  let id = nid();
  const gm = {},
    ns = selObjs().map(o => {
      const n = { ...o, id: id++, uid: uidv(), x: o.x + 20, y: o.y + 20 };
      if (o.r) n.r = o.r.map(a => [...a]);
      if (o.p) n.p = o.p.map(a => [...a]);
      if (isLine(o)) {
        n.x2 = o.x2 + 20;
        n.y2 = o.y2 + 20;
      }
      if (o.gid) n.gid = gm[o.gid] || (gm[o.gid] = Date.now() + Math.random());
      return n;
    });
  S.push(...ns);
  setSel(ns.map(n => n.id));
  draw();
  save();
};
$("dup").onclick = $("mdup").onclick;
document.querySelectorAll("#mat button").forEach(
  b =>
    (b.onclick = () => {
      const mo = selObjs().filter(hasMat);
      if (!mo.length) return;
      push();
      mo.forEach(o => {
        if (b.dataset.m) o.m = b.dataset.m;
        else delete o.m;
      });
      draw();
      save();
    })
);
$("pxm").onchange = () => {
  const v = +$("pxm").value;
  if (v >= 5) {
    push();
    pxm = v;
    draw();
    save();
  }
};
$("pxm").addEventListener("keydown", e => e.stopPropagation());
$("anl").onclick = () => {
  anl = !anl;
  $("anl").setAttribute("aria-pressed", anl);
  draw();
};
$("grp").onclick = () => {
  if (SEL.size < 2) return;
  push();
  const gid = Date.now();
  selObjs().forEach(o => (o.gid = gid));
  draw();
  save();
};
$("ungrp").onclick = () => {
  push();
  selObjs().forEach(o => {
    delete o.gid;
    delete o.gn;
  });
  draw();
  save();
};
$("sla").onclick = () => {
  show[act] = true;
  setSel(S.filter(o => LY(o) === act && !isHid(o) && !isLk(o)).map(o => o.id));
  draw();
};
$("saa").onclick = () => {
  setSel(S.filter(o => show[LY(o)] && !isHid(o) && !isLk(o)).map(o => o.id));
  draw();
};
// Клавіші редактора: Esc, Enter, Delete, стрілки, Ctrl+Z/A/G
document.addEventListener("keydown", e => {
  if (!window.__canEdit || (e.target.matches && e.target.matches("input,textarea,select"))) return;
  if ((e.key === "Delete" || e.key === "Backspace") && SEL.size) {
    e.preventDefault();
    $("del").onclick();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    $("undo").onclick();
  }
  const k = e.key.toLowerCase(),
    mod = e.ctrlKey || e.metaKey;
  if (mod && k === "a") {
    e.preventDefault();
    (e.shiftKey ? $("saa") : $("sla")).onclick();
    return;
  }
  if (mod && k === "g") {
    e.preventDefault();
    (e.shiftKey ? $("ungrp") : $("grp")).onclick();
    return;
  }
  if (e.key === "Escape") {
    if (drag && drag.wall) {
      drag = null;
      draw();
      return;
    }
    if (drag && drag.poly) {
      drag = null;
    }
    armK = null;
    calib = null;
    presets();
    setSel([]);
    draw();
    return;
  }
  if (e.key === "Enter" && drag && drag.wall) {
    drag = null;
    draw();
    return;
  }
  if (e.key === "Enter" && drag && drag.poly) {
    finishPoly();
    return;
  }
  if (SEL.size && e.key.startsWith("Arrow")) {
    e.preventDefault();
    push();
    const st = snap ? GS : e.shiftKey ? 10 : 2;
    const dx = e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0,
      dy = e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0;
    selObjs().forEach(o => {
      o.x += dx;
      o.y += dy;
      if (isLine(o)) {
        o.x2 += dx;
        o.y2 += dy;
      }
    });
    const mz = selObjs().filter(q => q.t === "zz");
    if (mz.length) {
      zClip(mz);
      zClean();
    }
    draw();
    save();
  }
});
// Фон плану: завантажити, рухати, прибрати
$("bgup").onclick = () => $("bgfile").click();
$("bgfile").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const m = Math.min(1, 1600 / Math.max(im.width, im.height)),
        c = document.createElement("canvas");
      c.width = Math.round(im.width * m);
      c.height = Math.round(im.height * m);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      const src = c.toDataURL("image/jpeg", 0.82),
        s = Math.min(960 / c.width, 1280 / c.height);
      bg = { src, x: 0, y: 0, w: Math.round(c.width * s), h: Math.round(c.height * s) };
      draw();
      save();
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
  e.target.value = "";
};
$("bgmove").onclick = () => {
  bgMode = !bgMode;
  setSel([]);
  $("bgmove").setAttribute("aria-pressed", bgMode);
  draw();
};
$("bgdef").onclick = () => {
  bg = { src: "", w: 960, h: 1280 };
  draw();
  save();
};
// Файл плану: зберегти, відкрити
$("fsave").onclick = async () => {
  const txt = JSON.stringify({ v: 2, items: S, bg: bg.src ? bg : null, pxm }),
    b = $("fsave"),
    old = null;
  let dl = null;
  try {
    dl = window.claude && claude.use ? await claude.use("downloads") : null;
  } catch (e) {}
  if (dl) {
    try {
      await dl.save({ filename: "plan-kliniky.json", data: txt });
      flash(b, "Збережено");
    } catch (e) {
      flash(b, e && e.code === "declined" ? "Скасовано" : "Не вдалося зберегти");
    }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" }));
  a.download = "plan-kliniky.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
};
$("fopen").onclick = () => $("ffile").click();
$("ffile").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  f.text().then(t => {
    try {
      const v = JSON.parse(t),
        items = Array.isArray(v) ? v : v.items;
      if (!Array.isArray(items)) throw 0;
      push();
      S = items;
      setSel([]);
      if (v.bg && v.bg.src) bg = v.bg;
      if (v.pxm) {
        pxm = +v.pxm;
        $("pxm").value = pxm;
      }
      draw();
      save();
    } catch (err) {
      alert("Це не файл плану");
    }
  });
  e.target.value = "";
};
document.getElementById("bgop").oninput = e => {
  bgOp = +e.target.value;
  draw();
};
// Скасувати, масштаб, прив'язка до сітки, JSON для розробника, очищення
$("undo").onclick = () => {
  const h = hist.pop();
  if (h) {
    S = JSON.parse(h);
    setSel([...SEL].filter(i => S.some(x => x.id === i)));
    draw();
    save();
  }
};
$("zin").onclick = () => {
  zoom = Math.min(3, zoom + 0.25);
  draw();
};
$("zout").onclick = () => {
  zoom = Math.max(0.5, zoom - 0.25);
  draw();
};
// Підпис кнопки прив'язки до сітки
const snapLbl = () => {
  $("snap").setAttribute("aria-pressed", snap);
};
snapLbl();
$("snap").onclick = () => {
  snap = !snap;
  try {
    localStorage.setItem("zvir-plan-snap", snap ? "1" : "0");
  } catch (e) {}
  snapLbl();
  if (snap && SEL.size) {
    push();
    selObjs().forEach(o => {
      o.x = sn(o.x);
      o.y = sn(o.y);
      if (isLine(o)) {
        o.x2 = sn(o.x2);
        o.y2 = sn(o.y2);
      } else if (o.t !== "mk") {
        o.w = Math.max(GS, sn(o.w));
        o.h = Math.max(GS, sn(o.h));
      }
    });
    draw();
    save();
  }
};
$("cp").onclick = () => {
  try {
    navigator.clipboard.writeText($("io").value).then(
      () => {
        flash($("cp"), "Скопійовано");
      },
      () => {
        $("io").select();
      }
    );
  } catch (e) {
    $("io").select();
  }
};
$("ld").onclick = () => {
  try {
    const v = JSON.parse($("io").value);
    if (Array.isArray(v)) {
      push();
      S = v;
      setSel([]);
      draw();
      save();
    }
  } catch (e) {
    flash($("ld"), "Помилка в тексті");
  }
};
$("rs").onclick = () => {
  if (!confirm("Очистити план? Усі елементи буде видалено.")) return;
  push();
  S = fresh();
  setSel([]);
  draw();
  save();
};
