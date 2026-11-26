/*
  Аналіз: конфлікти потоків, джерела ризиків і що в їхньому радіусі, вимоги й процедури для зони.
  Результати кешуються до наступного оновлення плану.
*/
// Кеш аналізу: рахуємо один раз на оновлення екрана; скидається в draw(), push() і save()
let _anC = null,
  _hzC = {};
// Аналіз з кешу
function analyze() {
  return _anC || (_anC = analyzeNow());
}
// Джерела або приймачі ризиків з кешу
function hzItems(role) {
  return _hzC[role] || (_hzC[role] = hzItemsNow(role));
}
// Скинути кеш аналізу
function invalidate() {
  _anC = null;
  _hzC = {};
}
// Конфлікти: перетини брудних і чистих потоків, рух через захищені зони, ризики поруч із чистим
function analyzeNow() {
  const L = lines(),
    zs = S.filter(o => o.t === "zz" && o.r && o.r.length && !isHid(o)),
    marks = [],
    through = {},
    zc = {};
  const inR = (x, y, z) => absR(z).some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  for (const l of L) {
    const hit = new Set();
    for (let i = 0; i < l.pts.length - 1; i++) {
      const [a, b] = [l.pts[i], l.pts[i + 1]],
        n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
      for (let j = 0; j <= n; j++) {
        const x = a[0] + ((b[0] - a[0]) * j) / n,
          y = a[1] + ((b[1] - a[1]) * j) / n;
        for (const z of zs) {
          if (hit.has(z.id) || !inR(x, y, z)) continue;
          hit.add(z.id);
          (through[z.id] = through[z.id] || new Set()).add(l.k);
          const pf = zprof(z);
          if ((DIRTYK.has(l.k) && PROTP.has(pf)) || (l.k === "a_sus" && pf === "P04")) {
            const msg = `«${knm(l.k)}» проходить через зону «${zname(z)}» (${pf})`;
            marks.push({ x, y, msg });
            (zc[z.id] = zc[z.id] || []).push(msg);
          }
        }
      }
    }
  }
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length; j++) {
      const A = L[i],
        B = L[j];
      const bad =
        (DIRTYK.has(A.k) && CLEANK.has(B.k)) ||
        (DIRTYK.has(B.k) && CLEANK.has(A.k)) ||
        (A.k === "a_sus") !== (B.k === "a_sus");
      if (!bad) continue;
      for (let a = 0; a < A.pts.length - 1; a++)
        for (let b = 0; b < B.pts.length - 1; b++) {
          const x = segX(A.pts[a], A.pts[a + 1], B.pts[b], B.pts[b + 1]);
          if (x) {
            const msg = `Перетин: «${knm(A.k)}» і «${knm(B.k)}»`;
            marks.push({ x: x[0], y: x[1], msg });
            zs.filter(z => inR(x[0], x[1], z)).forEach(z => (zc[z.id] = zc[z.id] || []).push(msg + " у зоні"));
          }
        }
    }
  for (const m of hzConflicts(zs)) {
    marks.push(m);
    zs.filter(z => (m.z ? z.id === m.z : inR(m.x, m.y, z))).forEach(z => (zc[z.id] = zc[z.id] || []).push(m.msg));
  }
  const sk = new Set(),
    um = marks.filter(m => {
      const k = Math.round(m.x / 6) + "," + Math.round(m.y / 6) + m.msg;
      if (sk.has(k)) return false;
      sk.add(k);
      return true;
    });
  for (const k in zc) zc[k] = [...new Set(zc[k])];
  return { marks: um, through, zc };
}
// Кольорова мітка ризику
const hzChip = (id, t) => {
  const h = (KB.hzm || {})[id];
  return h
    ? `<span class="hzc" style="background:${h.color}" title="${esc(h.name)}">${esc(h.sym)}</span>${t ? " " + esc(h.name) : ""}`
    : "";
};
// Ключ елемента для пошуку його ризиків у базі
const hzKey = o => {
  const l = LY(o);
  if (l === "eq") {
    const t = otiOf(o);
    return t ? "object_type:" + t : null;
  }
  if (l === "store") return "store:" + o.k;
  if (l === "flow" && (o.t === "pl" || o.t === "arrow")) return "flow:" + o.k;
  return null;
};
// Назва елемента в повідомленнях про ризик
const hzName = o => (LY(o) === "eq" ? o.l || (KB.otm[otiOf(o)] || {}).name || "обладнання" : knm(o.k));
// Фігура елемента для відстаней
const hzGeo = o =>
  o.t === "pl" || o.t === "arrow"
    ? {
        pts:
          o.t === "pl"
            ? absP(o)
            : [
                [o.x, o.y],
                [o.x2, o.y2],
              ],
      }
    : { r: bbox(o) };
// Усі джерела або приймачі ризиків на плані з радіусами
function hzItemsNow(role) {
  if (!KB.hsrc) return [];
  const M = role === "source" ? KB.hsrc : KB.hrec,
    out = [];
  for (const o of S) {
    if (isHid(o) || !show[LY(o)]) continue;
    const k = hzKey(o);
    if (!k || !M[k]) continue;
    for (const r of M[k]) {
      const h = KB.hzm[r.hazard_id];
      if (!h) continue;
      const rm = r.radius_m != null ? +r.radius_m : +(h.radius_m || 0);
      out.push({ o, h, rm, rp: rm * pxm, sev: r.severity, note: r.note, g: hzGeo(o) });
    }
  }
  return out;
}
// Ризики в зоні і звідки вони
function zoneHaz(z) {
  const m = new Map(),
    add = (h, what) => {
      if (!KB.hzm || !KB.hzm[h]) return;
      if (!m.has(h)) m.set(h, new Set());
      m.get(h).add(what);
    };
  if (!KB.hsrc) return m;
  for (const it of hzItems("source")) {
    if (it.g.r) {
      if (inZ(it.o, z)) add(it.h.id, hzName(it.o));
    } else if (it.g.pts.some((p, i) => i < it.g.pts.length - 1 && segInZ(p, it.g.pts[i + 1], z)))
      add(it.h.id, "потік: " + hzName(it.o));
  }
  zacts(z).forEach(a =>
    (KB.hsrc["activity:" + a] || []).forEach(r => add(r.hazard_id, "дія: " + ((KB.actm[a] || {}).name || a)))
  );
  return m;
}
// Чисте в радіусі джерела ризику
function hzConflicts(zs) {
  const out = [];
  if (!KB.hsrc) return out;
  const src = hzItems("source"),
    rec = hzItems("receptor");
  for (const R of rec)
    for (const Sx of src) {
      if (Sx.h.id !== R.h.id || Sx.o === R.o || !(Sx.rp > 0)) continue;
      if (Sx.g.pts && R.g.pts) continue;
      const q = geoD(Sx.g, R.g);
      if (!q || q.d >= Sx.rp) continue;
      out.push({
        x: q.x,
        y: q.y,
        sev: R.sev || "med",
        h: R.h.id,
        msg: `«${hzName(R.o)}» у радіусі ризику «${R.h.name}» від «${hzName(Sx.o)}»: ${(q.d / pxm).toFixed(1)} м < ${Sx.rm} м`,
      });
    }
  for (const z of zs) {
    const acts = [...zacts(z)];
    for (const R of rec) {
      if (R.sev !== "high" || !ZWIDE.has(R.h.id) || !R.g.r || !inZ(R.o, z)) continue;
      for (const a of acts)
        if ((KB.hsrc["activity:" + a] || []).some(r => r.hazard_id === R.h.id)) {
          const b = R.g.r;
          out.push({
            x: b.x + b.w / 2,
            y: b.y + b.h / 2,
            sev: "med",
            h: R.h.id,
            z: z.id,
            msg: `«${hzName(R.o)}» у зоні, де ${((KB.actm[a] || {}).name || a).toLowerCase()} — ризик «${R.h.name}»`,
          });
          break;
        }
    }
  }
  const sk = new Set();
  return out.filter(m => {
    if (sk.has(m.msg)) return false;
    sk.add(m.msg);
    return true;
  });
}
// Для зони: обладнання, процедури, вимоги (що є, чого бракує, що перевірити)
function zoneEval(z) {
  const col = zcol(z),
    objs = S.filter(o => LY(o) === "eq" && !isHid(o) && inZ(o, z)),
    types = new Set(objs.map(otiOf).filter(Boolean)),
    acts = zacts(z),
    lts = zltypes(z),
    zh = zoneHaz(z);
  const cols = new Set(z.co ? [z.co] : [...lts].map(t => (KB.ztm[t] || {}).color).filter(Boolean));
  const fm = z.fm || [],
    wm = z.wm || [],
    matOk = m => !m || fm.includes(m) || wm.includes(m);
  const zMatch = r =>
    r.hazard_id
      ? zh.has(r.hazard_id)
      : r.activity_id
        ? acts.has(r.activity_id)
        : r.zone_type_id
          ? lts.has(r.zone_type_id)
          : !r.color || cols.has(r.color);
  const has = t => {
    const ot = KB.otm[t];
    return types.has(t) || (ot && ot.is_inventory);
  };
  const L = KB.pl || { zt: {}, col: {}, act: {}, hz: {}, ot: {}, sc: {} },
    g = (m, id) => m[id] || [];
  const pMatch = p => {
    const zt = g(L.zt, p.id),
      co = g(L.col, p.id),
      ac = g(L.act, p.id),
      hz = g(L.hz, p.id),
      ots = g(L.ot, p.id),
      sc = g(L.sc, p.id);
    const n = zt.length + co.length + ac.length + hz.length,
      inS =
        !n ||
        zt.some(x => lts.has(x)) ||
        co.some(x => cols.has(x)) ||
        ac.some(x => acts.has(x)) ||
        hz.some(x => zh.has(x));
    return inS && (!ots.length || ots.some(has)) && matOk(p.material_id) && (!sc.length || sc.includes(scen));
  };
  const procs = KB.proc.filter(pMatch);
  const cnt = t => objs.filter(o => otiOf(o) === t).reduce((a, o) => a + (+o.q || 1), 0);
  const qty = t =>
    t === "status_card"
      ? Math.max(
          1,
          ["cage", "heated_box", "exam_table", "proc_table", "or_table"].reduce((a, k) => a + cnt(k), 0)
        )
      : t === "patient_tag"
        ? Math.max(1, cnt("cage") + cnt("heated_box"))
        : 1;
  const LBLS = new Set(["zone_sign", "floor_tape", "status_card", "patient_tag"]);
  const seen = new Set(),
    reqs = KB.req
      .filter(zMatch)
      .filter(r => {
        const k = (r.object_type_id || "") + "|" + r.item;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(r => {
        const ot = r.object_type_id ? KB.otm[r.object_type_id] : null;
        let st;
        if (r.kind === "інструктаж") st = "train";
        else if (!ot) st = "check";
        else if (ot.is_inventory || LBLS.has(ot.id)) st = "prep";
        else st = types.has(ot.id) ? "ok" : "miss";
        return { ...r, st, qty: st === "prep" ? qty(ot.id) : 0 };
      });
  return { col, objs, types, procs, reqs, acts, lts, zh };
}
