/*
  Геометрія і зони: координати прямокутників і ліній, перетини, відстані, «прилипання» стін,
  підбір типів і дій зони з каталогу.
*/
// Коди каталогу, вибрані для зони
const zcodes = z => (z.zcs && z.zcs.length ? z.zcs : z.zc ? [z.zc] : []);
// Перший запис каталогу зони
const zcat = z => {
  const c = zcodes(z)[0];
  return c ? KB.zcm[c] : null;
};
// Що роблять у зоні (вибране вручну або з каталогу)
function zacts(z) {
  if (Array.isArray(z.acts)) return new Set(z.acts);
  const a = new Set();
  zcodes(z).forEach(c => (KB.cact[c] || []).forEach(x => a.add(x)));
  return a;
}
// Рівні правил зони (типи з бази)
function zltypes(z) {
  const t = new Set();
  if (z.cust && z.zt) t.add(z.zt);
  zcodes(z).forEach(c => {
    const q = KB.zcm[c];
    if (q && q.zone_type_id) t.add(q.zone_type_id);
  });
  if (!zcodes(z).length && z.zt) t.add(z.zt);
  zacts(z).forEach(a => {
    const q = KB.actm[a];
    if (q && q.zone_type_id) t.add(q.zone_type_id);
  });
  return t;
}
// Основний рівень правил зони
const zlegacy = z => (z.cust ? z.zt || null : zcat(z) ? zcat(z).zone_type_id : z.zt || null);
// Профіль зони
const zprof = z => z.pf || (zcat(z) || {}).profile_id || null;
// Колір зони: свій або з рівнів правил
const zcol = z => z.co || (KB.ztm[zlegacy(z)] || {}).color || null;
// Назва зони для показу
const zname = z => z.nm || (zcat(z) || {}).name || (KB.ztm[z.zt] || {}).name || "Зона без типу";
// Колір профілю зони
const phue = z => ((KB.pfm || {})[zprof(z)] || {}).hue || null;
// Чи це зона або маршрут (складаються з прямокутників)
const isZL = o => o.t === "zz" || o.t === "rz";
// Точки ламаної в координатах плану
const absP = o => (o.p || []).map(a => [o.x + a[0], o.y + a[1]]);
// Записати точки ламаної
function setPts(o, pts) {
  const mx = Math.min(...pts.map(q => q[0])),
    my = Math.min(...pts.map(q => q[1]));
  o.x = mx;
  o.y = my;
  o.p = pts.map(q => [q[0] - mx, q[1] - my]);
  o.w = Math.max(1, Math.max(...pts.map(q => q[0])) - mx);
  o.h = Math.max(1, Math.max(...pts.map(q => q[1])) - my);
}
// Тип об'єкта для правил (вибраний або за назвою)
const otiOf = o => (o.oti !== undefined ? o.oti : LBL2OT[(o.ot || o.l || "").toLowerCase()] || null);
// Прямокутники зони в координатах плану
const absR = z => (z.r || []).map(a => ({ x: z.x + a[0], y: z.y + a[1], w: a[2], h: a[3] }));
// Записати прямокутники зони
function setAbs(z, rs) {
  z.r = [];
  if (!rs.length) {
    return;
  }
  const mx = Math.min(...rs.map(r => r.x)),
    my = Math.min(...rs.map(r => r.y));
  z.x = mx;
  z.y = my;
  z.r = rs.map(r => [r.x - mx, r.y - my, r.w, r.h]);
  z.w = Math.max(...rs.map(r => r.x + r.w)) - mx;
  z.h = Math.max(...rs.map(r => r.y + r.h)) - my;
}
// Відрізати від прямокутника частину, що перекривається іншим
function clipR(r, R2) {
  if (r.x >= R2.x + R2.w || r.x + r.w <= R2.x || r.y >= R2.y + R2.h || r.y + r.h <= R2.y) return r;
  const c = [
    [r.x + r.w - R2.x, "L"],
    [R2.x + R2.w - r.x, "R"],
    [r.y + r.h - R2.y, "T"],
    [R2.y + R2.h - r.y, "B"],
  ].sort((a, b) => a[0] - b[0])[0][1];
  const n = { ...r };
  if (c === "L") n.w = R2.x - r.x;
  if (c === "R") {
    n.x = R2.x + R2.w;
    n.w = r.x + r.w - n.x;
  }
  if (c === "T") n.h = R2.y - r.y;
  if (c === "B") {
    n.y = R2.y + R2.h;
    n.h = r.y + r.h - n.y;
  }
  return n.w < 10 || n.h < 10 ? null : n;
}
// Зони, що рухаються, відсувають сусідні
function zClip(moved, snapZ) {
  const ids = new Set(moved.map(z => z.id)),
    M = moved.flatMap(absR);
  for (const q of S.filter(o => o.t === "zz" && !ids.has(o.id))) {
    if (snapZ) {
      const sz = snapZ[q.id];
      if (sz) {
        q.x = sz.x;
        q.y = sz.y;
        q.r = sz.r.map(a => [...a]);
      }
    }
    let rs = absR(q);
    for (const R2 of M) rs = rs.map(r => r && clipR(r, R2)).filter(Boolean);
    setAbs(q, rs);
  }
}
// Знімок положення інших зон перед перетягуванням
const zSnap = moved => {
  const ids = new Set(moved.map(z => z.id)),
    o = {};
  S.filter(q => q.t === "zz" && !ids.has(q.id)).forEach(q => (o[q.id] = { x: q.x, y: q.y, r: q.r.map(a => [...a]) }));
  return o;
};
// Прибрати порожні зони після обрізання
const zClean = () => {
  S = S.filter(o => !(isZL(o) && !(o.r || []).length));
};
// Чи можна задати матеріал цьому елементу
const hasMat = o => LY(o) === "eq" && !["note", "water", "room", "part", "stair"].includes(o.t);
// Чи це відрізок (стіна або стрілка)
const isLine = o => o.t === "arrow" || o.t === "seg";
// Прямокутник, що охоплює елемент
function bbox(o) {
  if (isLine(o))
    return { x: Math.min(o.x, o.x2), y: Math.min(o.y, o.y2), w: Math.abs(o.x2 - o.x), h: Math.abs(o.y2 - o.y) };
  return o;
}
// Чи центр елемента в межах зони
function inZ(o, z) {
  const b = bbox(o),
    cx = b.x + b.w / 2,
    cy = b.y + b.h / 2;
  return absR(z).some(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
}
// Усі видимі лінії руху
function lines() {
  return S.filter(o => LY(o) === "flow" && show.flow && !isHid(o) && (o.t === "pl" || o.t === "arrow")).map(o => ({
    o,
    k: o.k,
    pts:
      o.t === "pl"
        ? absP(o)
        : [
            [o.x, o.y],
            [o.x2, o.y2],
          ],
  }));
}
// Точка перетину двох відрізків або null
function segX(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]],
    q = [d[0] - c[0], d[1] - c[1]],
    den = r[0] * q[1] - r[1] * q[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den,
    u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}
// Назва виду за ключем
const knm = k => (K[k] || [, , k])[2];
// Відстань між двома прямокутниками
const rrD = (a, b) =>
  Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)));
// Відстань від точки до прямокутника
const prD = (p, b) =>
  Math.hypot(Math.max(0, b.x - p[0], p[0] - (b.x + b.w)), Math.max(0, b.y - p[1], p[1] - (b.y + b.h)));
// Найменша відстань між двома фігурами і де вона
function geoD(A, B) {
  if (A.r && B.r) {
    const d = rrD(A.r, B.r);
    return { d, x: B.r.x + B.r.w / 2, y: B.r.y + B.r.h / 2 };
  }
  const L = A.pts || B.pts,
    R = A.r || B.r;
  if (!R) return null;
  let best = { d: 1e9 };
  for (let i = 0; i < L.length - 1; i++) {
    const [a, b] = [L[i], L[i + 1]],
      n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
    for (let j = 0; j <= n; j++) {
      const p = [a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n],
        d = prD(p, R);
      if (d < best.d) best = { d, x: p[0], y: p[1] };
    }
  }
  return best;
}
// Чи проходить відрізок через зону
function segInZ(a, b, z) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
  for (let j = 0; j <= n; j++) {
    const x = a[0] + ((b[0] - a[0]) * j) / n,
      y = a[1] + ((b[1] - a[1]) * j) / n;
    if (absR(z).some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)) return true;
  }
  return false;
}
// Координати події миші в системі плану
function pt(e) {
  const m = cv.getScreenCTM().inverse(),
    q = cv.createSVGPoint();
  q.x = e.clientX;
  q.y = e.clientY;
  return q.matrixTransform(m);
}
// Точка стіни з урахуванням кінців інших стін і кутів 0/45/90°
function wallSnap(q, from, shift) {
  let [x, y] = q;
  const R = 12;
  let best = null,
    bd = R;
  for (const o of S)
    if (o.t === "seg" && !o.hid)
      for (const e of [
        [o.x, o.y],
        [o.x2, o.y2],
      ]) {
        const d = Math.hypot(e[0] - x, e[1] - y);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
  if (best) return [best[0], best[1]];
  if (from) {
    const dx = x - from[0],
      dy = y - from[1],
      L = Math.hypot(dx, dy);
    if (L > 4) {
      const ang = Math.atan2(dy, dx),
        step = shift ? Math.PI / 2 : Math.PI / 4,
        sa = Math.round(ang / step) * step;
      if (shift || Math.abs(ang - sa) < 0.14) {
        x = from[0] + Math.cos(sa) * L;
        y = from[1] + Math.sin(sa) * L;
      }
    }
    for (const o of S)
      if (o.t === "seg" && !o.hid)
        for (const e of [
          [o.x, o.y],
          [o.x2, o.y2],
        ]) {
          if (Math.abs(e[0] - x) < 8) x = e[0];
          if (Math.abs(e[1] - y) < 8) y = e[1];
        }
  }
  return [Math.round(snap ? sn(x) : x), Math.round(snap ? sn(y) : y)];
}
// Плаваюча панель над виділенням
function selBox() {
  const os = selObjs();
  if (!os.length) return null;
  const bs = os.map(o =>
    o.t === "zz" || o.t === "rz"
      ? (() => {
          const rs = absR(o);
          const x = Math.min(...rs.map(r => r.x)),
            y = Math.min(...rs.map(r => r.y));
          return { x, y, w: Math.max(...rs.map(r => r.x + r.w)) - x, h: Math.max(...rs.map(r => r.y + r.h)) - y };
        })()
      : o.t === "pl"
        ? (() => {
            const P = absP(o),
              xs = P.map(q => q[0]),
              ys = P.map(q => q[1]);
            return {
              x: Math.min(...xs),
              y: Math.min(...ys),
              w: Math.max(...xs) - Math.min(...xs),
              h: Math.max(...ys) - Math.min(...ys),
            };
          })()
        : bbox(o)
  );
  const x = Math.min(...bs.map(b => b.x)),
    y = Math.min(...bs.map(b => b.y));
  return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y };
}
