/*
  Дезінфектанти: імпорт таблиці (вставка, CSV, XLSX), розрахунок ціни робочого розчину, перелік засобів і довідка.
*/
// ===== Дезінфектанти: імпорт таблиці і перегляд цін =====
const DZF = [
  ["name", "Назва", ["назва", "засіб", "товар", "продукт", "product", "name"]],
  ["manufacturer", "Виробник", ["виробник", "бренд", "manufacturer"]],
  ["active_text", "Діюча речовина", ["діюча", "речовина", "склад", "active"]],
  ["class_id", "Клас", ["клас", "група", "class"]],
  ["form", "Форма", ["форма", "form"]],
  ["seller", "Продавець", ["продавець", "магазин", "постачальник", "seller", "shop"]],
  ["pack_text", "Фасування", ["фасування", "упаковка", "pack"]],
  ["pack_qty", "Кількість", ["кількість", "обсяг", "к-сть", "qty"]],
  ["pack_unit", "Одиниця", ["одиниця", "од.", "unit"]],
  ["price_uah", "Ціна, грн", ["ціна", "вартість", "price"]],
  ["in_stock", "У наявності", ["наявн", "stock"]],
  ["min_order_uah", "Мін. замовлення, грн", ["мін", "minimum"]],
  ["url", "Посилання", ["посилання", "url", "link", "сторінка"]],
  ["checked_at", "Дата перевірки", ["дата", "date"]],
  ["purpose", "Режим", ["режим", "призначення", "purpose", "для чого"]],
  ["conc_text", "Концентрація", ["концентрація", "розведення", "conc"]],
  ["conc_pct", "Концентрація, %", ["концентрація, %", "концентрація %", "%"]],
  ["contact_min", "Експозиція, хв", ["експозиц", "час дії", "хв", "contact"]],
  ["yield_per_unit", "Вихід, л на 1 од.", ["вихід", "yield"]],
  ["cpv", "Проти CPV", ["cpv", "парво"]],
  ["evidence", "Підтвердження", ["підтвердж", "джерело", "доказ", "evidence"]],
  ["note", "Примітка", ["примітка", "коментар", "note"]],
];
// Поля пропозиції продавця і режиму застосування
const DZOFF = [
    "seller",
    "pack_text",
    "pack_qty",
    "pack_unit",
    "price_uah",
    "in_stock",
    "min_order_uah",
    "url",
    "checked_at",
  ],
  DZREG = ["purpose", "conc_text", "conc_pct", "contact_min", "yield_per_unit", "cpv", "evidence"];
// Нормалізувати текст для порівняння
const dzNorm = s =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[’'`ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
// Число з тексту (кома, пробіли, «грн»)
const dzNum = v => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const t = String(v)
    .replace(/[\s  ]/g, "")
    .replace(/грн|uah|₴/gi, "")
    .replace(",", ".")
    .replace(/[^\d.\-]/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  return isFinite(n) ? n : null;
};
// Так / ні з тексту
const dzBool = v => {
  const t = dzNorm(v);
  if (!t) return null;
  if (/^(так|yes|y|1|\+|true|є|✓|✔|в наявності|у наявності)$/.test(t)) return true;
  if (/^(ні|no|n|0|-|—|false|немає|відсутній|під замовлення)$/.test(t)) return false;
  return null;
};
// Одиниця фасування
const dzUnit = v => {
  const t = dzNorm(v).replace(/\.$/, "");
  if (!t) return null;
  if (/^(л|l|літр|літри|літрів)$/.test(t)) return "л";
  if (/^(мл|ml)$/.test(t)) return "мл";
  if (/^(кг|kg)$/.test(t)) return "кг";
  if (/^(г|g|гр)$/.test(t)) return "г";
  if (/^(табл|таблетки|таблеток|таблетка|tab|tabs)$/.test(t)) return "табл";
  if (/^(шт|pcs|саше)$/.test(t)) return "шт";
  return t;
};
// Перевести мл → л, г → кг
const dzBase = (q, u) =>
  q == null ? null : u === "мл" ? { q: q / 1000, u: "л" } : u === "г" ? { q: q / 1000, u: "кг" } : { q, u };
// Клас засобу з коду, назви або діючої речовини
function dzGuessClass(name, active, cls) {
  const c = dzNorm(cls);
  if (c) {
    if (KB.cls && KB.cls[c]) return c;
    const hit = Object.values(KB.cls || {}).find(
      x => dzNorm(x.name_uk) === c || dzNorm(x.name_en) === c || dzNorm(x.name_uk).includes(c)
    );
    if (hit) return hit.id;
  }
  const a = dzNorm(active + " " + name);
  return /дихлоріз|nadcc|натрієва сіль дихлор/.test(a)
    ? "nadcc"
    : /гіпохлорит|hypochlor|жавел/.test(a)
      ? "naocl"
      : /пероксимоно|пероксомоно|монопероксисульф|peroxymono/.test(a)
        ? "pms"
        : /надоцт|перацет|peracet/.test(a)
          ? "paa"
          : /діоксид хлору|chlorine dioxide/.test(a)
            ? "clo2"
            : /альдегід|aldehyde|глутар/.test(a)
              ? "aldehyde"
              : /пероксид водню|перекис|hydrogen perox/.test(a)
                ? /прискорен|accelerated/.test(a)
                  ? "ahp"
                  : "h2o2"
                : /етанол|спирт|ізопропан|alcohol|ethanol/.test(a)
                  ? "alcohol"
                  : /йод/.test(a)
                    ? "iodophor"
                    : /час\b|амоні|benzalk|бензалк|дидецил|qac/.test(a)
                      ? "qac"
                      : /фенол/.test(a)
                        ? "phenolic"
                        : /молочн/.test(a)
                          ? "lactic"
                          : null;
}
// Розібрати CSV / TSV / вставлені клітинки
function dzParseText(t) {
  t = t.replace(/^﻿/, "");
  const first = t.split(/\r?\n/).find(l => l.trim()) || "";
  const cnt = c => first.split(c).length - 1;
  const d = cnt("\t") > 0 ? "\t" : cnt(";") >= cnt(",") ? ";" : ",";
  const rows = [];
  let row = [],
    f = "",
    q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
      continue;
    }
    if (ch === '"' && f === "") {
      q = true;
      continue;
    }
    if (ch === d) {
      row.push(f);
      f = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
      continue;
    }
    f += ch;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter(r => r.some(c => String(c).trim()));
}
// Прочитати файл (XLSX через SheetJS)
async function dzParseFile(file) {
  const n = file.name.toLowerCase();
  if (/\.(xlsx|xls|ods)$/.test(n)) {
    if (!window.XLSX)
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
        s.onload = res;
        s.onerror = () => rej(new Error("Не вдалося завантажити модуль Excel"));
        document.head.appendChild(s);
      });
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils
      .sheet_to_json(ws, { header: 1, raw: true, defval: "" })
      .filter(r => r.some(c => String(c).trim()));
  }
  return dzParseText(await file.text());
}
// Розпізнати колонки за заголовками
function dzMap(head) {
  const used = new Set(),
    m = head.map(() => null),
    H = head.map(dzNorm);
  H.forEach((h, i) => {
    const f = DZF.find(f => dzNorm(f[1]) === h || f[0] === h);
    if (f && !used.has(f[0])) {
      m[i] = f[0];
      used.add(f[0]);
    }
  });
  H.forEach((h, i) => {
    if (m[i] || !h) return;
    if (/розчин/.test(h) && /ціна|грн/.test(h)) return;
    const f = DZF.find(f => !used.has(f[0]) && f[2].some(s => h.includes(s)));
    if (f) {
      m[i] = f[0];
      used.add(f[0]);
    }
  });
  return m;
}
// Скласти засоби з рядків таблиці і зібрати зауваження
function dzBuild(rows, map) {
  const P = new Map(),
    issues = [];
  rows.forEach((r, ri) => {
    const v = {};
    map.forEach((f, i) => {
      if (f) {
        const x = r[i];
        if (x !== "" && x != null) v[f] = typeof x === "string" ? x.trim() : x;
      }
    });
    const ln = ri + 2;
    if (!v.name) {
      if (Object.keys(v).length) issues.push([ln, "err", "немає назви — рядок пропущено"]);
      return;
    }
    const k = dzNorm(v.name);
    let p = P.get(k);
    if (!p) {
      p = { name: String(v.name), offers: [], regimes: [], rows: [] };
      P.set(k, p);
    }
    p.rows.push(ln);
    for (const f of ["manufacturer", "active_text", "form", "note"])
      if (v[f] && !p[f] && (f !== "note" || !DZOFF.concat(DZREG).some(x => v[x] != null))) p[f] = String(v[f]);
    if (v.class_id || v.active_text) {
      const c = dzGuessClass(v.name, v.active_text || p.active_text || "", v.class_id);
      if (c) p.class_id = c;
      else if (v.class_id) issues.push([ln, "warn", "клас «" + v.class_id + "» не впізнано"]);
    }
    const hasO = DZOFF.some(f => v[f] != null),
      hasR = DZREG.some(f => v[f] != null);
    if (hasO) {
      const u = dzUnit(v.pack_unit),
        q = dzNum(v.pack_qty);
      const o = {
        seller: String(v.seller || ""),
        pack_text: String(v.pack_text || (q != null ? q + " " + (u || "") : "")).trim(),
        pack_qty: q,
        pack_unit: u,
        price_uah: dzNum(v.price_uah),
        in_stock: dzBool(v.in_stock),
        min_order_uah: dzNum(v.min_order_uah),
        url: v.url ? String(v.url) : null,
        checked_at: dzDate(v.checked_at),
        note: hasR ? null : v.note ? String(v.note) : null,
        _ln: ln,
      };
      if (o.price_uah == null) issues.push([ln, "warn", "пропозиція без ціни"]);
      if (o.pack_qty == null || !o.pack_unit)
        issues.push([ln, "warn", "немає кількості або одиниці — ціну за літр не порахую"]);
      p.offers.push(o);
    }
    if (hasR) {
      const c = dzNum(v.conc_pct != null ? v.conc_pct : /%/.test(v.conc_text || "") ? v.conc_text : null);
      const r = {
        purpose: String(v.purpose || ""),
        conc_text: String(v.conc_text || (c != null ? String(c).replace(".", ",") + "%" : "")),
        conc_pct: c,
        contact_min: v.contact_min != null ? String(v.contact_min) : null,
        yield_per_unit: dzNum(v.yield_per_unit),
        cpv: dzBool(v.cpv),
        evidence: v.evidence ? String(v.evidence) : null,
        note: v.note ? String(v.note) : null,
        _ln: ln,
      };
      p.regimes.push(r);
    }
    if (!hasO && !hasR && !p.offers.length && !p.regimes.length)
      issues.push([ln, "info", "лише опис засобу, без ціни і режиму"]);
  });
  for (const p of P.values())
    for (const r of p.regimes) {
      const tabsOnly = p.offers.length && p.offers.every(o => o.pack_unit === "табл" || o.pack_unit === "шт");
      if (r.yield_per_unit == null && tabsOnly)
        issues.push([r._ln, "warn", "для таблеток вкажіть «Вихід, л на 1 од.» — скільки літрів розчину з 1 таблетки"]);
    }
  return { P: [...P.values()], issues };
}
// Дата з тексту або з Excel
function dzDate(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 864e5));
    return d.toISOString().slice(0, 10);
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}
// Вихід робочого розчину на 1 базову одиницю фасування (л / кг / табл)
function dzYield(r, o, p) {
  const tabO = o.pack_unit === "табл" || o.pack_unit === "шт",
    tabP = /табл/.test(p.form || "") || (p.offers || []).some(x => x.pack_unit === "табл");
  if (r.yield_per_unit != null) return tabO === tabP ? +r.yield_per_unit : null;
  if (tabO) return null;
  const b = dzBase(o.pack_qty, o.pack_unit);
  if (!b || (b.u !== "л" && b.u !== "кг")) return null;
  if (r.conc_pct > 0) return 100 / r.conc_pct;
  if (/готов|нерозвед/.test(dzNorm(r.conc_text + " " + (p.form || ""))) && b.u === "л") return 1;
  return null;
}
// Ціна 1 л робочого розчину для пропозиції і режиму
function dzCost(r, o, p) {
  const b = dzBase(o.pack_qty, o.pack_unit),
    y = dzYield(r, o, p);
  if (!b || !y || o.price_uah == null) return null;
  return { perL: o.price_uah / (b.q * y), liters: b.q * y };
}
// Формат ціни
const dzF2 = n =>
  n == null
    ? "—"
    : n < 10
      ? n.toFixed(2).replace(".", ",")
      : n < 100
        ? n.toFixed(1).replace(".", ",")
        : Math.round(n).toLocaleString("uk-UA");
// Заголовки шаблону
const DZH = DZF.map(f => f[1]);
// Зібрати CSV
function dzCsv(rows) {
  return (
    "﻿" +
    rows
      .map(r =>
        r
          .map(c => {
            const s = c == null ? "" : String(c);
            return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          })
          .join(";")
      )
      .join("\r\n")
  );
}
// Завантажити файл у браузері
function dzDownload(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
// Шаблон таблиці
function dzTemplate() {
  const ex = [
    [
      "Бровадез-плюс",
      "Бровафарма",
      "бензалконію хлорид + ДДАХ",
      "qac",
      "концентрат",
      "Zoo-Vet",
      "1 л",
      "1",
      "л",
      "324",
      "так",
      "",
      "https://…",
      "2026-11-23",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      "Бровадез-плюс",
      "Бровафарма",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Профілактика: приміщення, інвентар",
      "0,25%",
      "0,25",
      "30",
      "",
      "ні",
      "інструкція",
      "",
    ],
    [
      "Бланідас 300",
      "",
      "дихлорізоціанурат натрію",
      "nadcc",
      "таблетки",
      "БІОВЕТ",
      "300 табл",
      "300",
      "табл",
      "396",
      "так",
      "",
      "",
      "",
      "Поверхні",
      "0,03% акт. хлору",
      "0,03",
      "30",
      "5",
      "",
      "інструкція",
      "5 л розчину з 1 таблетки",
    ],
  ];
  dzDownload("shablon-dezinfektanty.csv", dzCsv([DZH, ...ex]));
}
// Створити або взяти вікно
function dzDlg(id, cls) {
  let d = $(id);
  if (!d) {
    d = document.createElement("dialog");
    d.id = id;
    d.className = "hlpd dzd " + (cls || "");
    document.body.appendChild(d);
  }
  return d;
}
// Засоби, пропозиції і режими з бази
async function dzLoad() {
  const [p, o, r] = await Promise.all(["product", "product_offer", "product_regime"].map(t => sb.from(t).select("*")));
  if (p.error) throw p.error;
  const P = (p.data || []).map(x => ({
    ...x,
    offers: (o.data || []).filter(y => y.product_id === x.id),
    regimes: (r.data || []).filter(y => y.product_id === x.id),
  }));
  return P.sort((a, b) => a.name.localeCompare(b.name, "uk"));
}
// Вивантажити базу засобів у CSV
async function dzExport() {
  try {
    const P = await dzLoad(),
      rows = [DZH];
    for (const p of P) {
      const base = [p.name, p.manufacturer, p.active_text, p.class_id, p.form];
      if (!p.offers.length && !p.regimes.length)
        rows.push([...base, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", p.note]);
      for (const o of p.offers)
        rows.push([
          ...base,
          o.seller,
          o.pack_text,
          o.pack_qty,
          o.pack_unit,
          o.price_uah,
          o.in_stock == null ? "" : o.in_stock ? "так" : "ні",
          o.min_order_uah,
          o.url,
          o.checked_at,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          o.note,
        ]);
      for (const r of p.regimes)
        rows.push([
          ...base,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          r.purpose,
          r.conc_text,
          r.conc_pct,
          r.contact_min,
          r.yield_per_unit,
          r.cpv == null ? "" : r.cpv ? "так" : "ні",
          r.evidence,
          r.note,
        ]);
    }
    dzDownload(
      "dezinfektanty-" + new Date().toISOString().slice(0, 10) + ".csv",
      dzCsv(rows.map(r => r.map(c => (typeof c === "number" ? String(c).replace(".", ",") : c))))
    );
  } catch (e) {
    alert("Не вдалося вивантажити: " + e.message);
  }
}
// --- Діалог імпорту ---
function dzImport() {
  if (!window.__canEdit) {
    alert("Імпорт доступний після входу редактора.");
    return;
  }
  const d = dzDlg("dzimp", "wide");
  let rows = null,
    map = null;
  d.innerHTML = `<h3>Імпорт таблиці дезінфектантів</h3><p class="hint">Вставте таблицю з Excel чи Google Таблиць (з рядком заголовків) або виберіть файл CSV / XLSX. Один рядок — або пропозиція продавця (ціна, фасування), або режим (концентрація, час), або обидва. Рядки з однаковою назвою — один засіб.</p>
 <details class="dzhelp"><summary>Вимоги до таблиці і підготовка</summary>${dzHelpHtml()}</details>
 <div class="row" style="gap:8px;flex-wrap:wrap"><label class="rb" style="cursor:pointer">Вибрати файл…<input type="file" id="dzf" accept=".csv,.tsv,.txt,.xlsx,.xls,.ods" hidden></label><button type="button" class="rb" id="dztpl">Завантажити шаблон</button><span class="hint" id="dzfn"></span></div>
 <textarea id="dzt" rows="5" placeholder="Або вставте сюди скопійовані клітинки (Ctrl+V)" style="width:100%;box-sizing:border-box;margin-top:8px;font:12px/1.4 ui-monospace,monospace"></textarea>
 <div id="dzprev"></div><div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button type="button" class="rb" id="dzx">Скасувати</button><button type="button" class="rb pri" id="dzgo" disabled>Імпортувати</button></div>`;
  const prev = d.querySelector("#dzprev"),
    go = d.querySelector("#dzgo");
  const show = () => {
    if (!rows || rows.length < 2) {
      prev.innerHTML = rows ? '<p class="hint">Потрібні заголовок і хоча б один рядок.</p>' : "";
      go.disabled = true;
      return;
    }
    const head = rows[0].map(String),
      body = rows.slice(1),
      B = dzBuild(body, map),
      nO = B.P.reduce((a, p) => a + p.offers.length, 0),
      nR = B.P.reduce((a, p) => a + p.regimes.length, 0),
      errs = B.issues.filter(i => i[1] === "err").length;
    const sel = i =>
      `<select data-mi="${i}"><option value="">— не імпортувати —</option>${DZF.map(f => `<option value="${f[0]}"${map[i] === f[0] ? " selected" : ""}>${esc(f[1])}</option>`).join("")}</select>`;
    const miss = ["name"].filter(f => !map.includes(f));
    prev.innerHTML = `<div class="dzsum"><b>${B.P.length}</b> засобів · <b>${nO}</b> пропозицій з цінами · <b>${nR}</b> режимів${errs ? ` · <span style="color:#c0392b">${errs} рядків пропущено</span>` : ""}</div>
  ${miss.length ? '<p style="color:#c0392b">Не знайдено колонку «Назва» — виберіть її нижче.</p>' : ""}
  <details ${miss.length ? "open" : ""}><summary>Колонки: ${map.filter(Boolean).length} з ${head.length} розпізнано</summary><div class="dzmap">${head.map((h, i) => `<label><span>${esc(h || "(без назви)")}</span>${sel(i)}</label>`).join("")}</div></details>
  ${
    B.issues.length
      ? `<details><summary>Зауваження: ${B.issues.length}</summary><ul class="dziss">${B.issues
          .slice(0, 60)
          .map(([l, t, m]) => `<li class="${t}">Рядок ${l}: ${esc(m)}</li>`)
          .join("")}</ul></details>`
      : ""
  }
  <div class="dztw"><table class="dzt"><thead><tr><th>Засіб</th><th>Клас</th><th>Продавець · фасування</th><th>Ціна</th><th>Режим</th><th>Робочий розчин</th></tr></thead><tbody>${B.P.slice(
    0,
    80
  )
    .map(p => {
      const best = dzBest(p);
      return `<tr><td>${esc(p.name)}</td><td>${esc(((KB.cls && KB.cls[p.class_id]) || {}).name_uk || p.class_id || "—")}</td><td>${p.offers.map(o => esc([o.seller, o.pack_text].filter(Boolean).join(" · ")) + (o.in_stock === false ? ' <span class="hint">(немає)</span>' : "")).join("<br>") || "—"}</td><td>${p.offers.map(o => (o.price_uah != null ? dzF2(o.price_uah) + " грн" : "—")).join("<br>") || "—"}</td><td>${p.regimes.map(r => esc([r.purpose, r.conc_text, r.contact_min ? r.contact_min + " хв" : ""].filter(Boolean).join(" · ")) + (r.cpv ? ' <b class="cpv">CPV</b>' : "")).join("<br>") || "—"}</td><td>${best.map(b => (b ? dzF2(b.perL) + " грн/л" : "—")).join("<br>") || "—"}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
    prev.querySelectorAll("select[data-mi]").forEach(
      s =>
        (s.onchange = () => {
          const i = +s.dataset.mi;
          if (s.value) map = map.map(x => (x === s.value ? null : x));
          map[i] = s.value || null;
          show();
        })
    );
    go.disabled = !B.P.length;
    go.textContent = B.P.length ? `Імпортувати ${B.P.length} засобів` : "Імпортувати";
    go.onclick = () => dzSave(B, go, d);
  };
  const take = r => {
    rows = r;
    map = rows && rows.length ? dzMap(rows[0].map(String)) : null;
    show();
  };
  d.querySelector("#dzt").addEventListener("input", e => {
    const t = e.target.value;
    take(t.trim() ? dzParseText(t) : null);
  });
  d.querySelector("#dzt").addEventListener("keydown", e => e.stopPropagation());
  d.querySelector("#dzf").onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    d.querySelector("#dzfn").textContent = f.name;
    try {
      take(await dzParseFile(f));
    } catch (er) {
      prev.innerHTML = `<p style="color:#c0392b">${esc(er.message)}</p>`;
    }
  };
  d.querySelector("#dztpl").onclick = dzTemplate;
  d.querySelector("#dzx").onclick = () => d.close();
  d.showModal();
}
// Найдешевша пропозиція для кожного режиму
function dzBest(p) {
  return p.regimes.map(r => {
    let best = null;
    for (const o of p.offers) {
      const c = dzCost(r, o, p);
      if (c && o.in_stock !== false && (!best || c.perL < best.perL)) best = { ...c, o };
    }
    return best;
  });
}
// Записати засоби в базу
async function dzSave(B, btn, d) {
  btn.disabled = true;
  let done = 0,
    fail = [];
  const tot = B.P.length;
  const clean = o => {
    const x = {};
    for (const [k, v] of Object.entries(o)) if (!k.startsWith("_") && v != null && v !== "") x[k] = v;
    return x;
  };
  for (const p of B.P) {
    btn.textContent = `Записую ${++done} з ${tot}…`;
    const row = clean({
      name: p.name,
      manufacturer: p.manufacturer,
      active_text: p.active_text,
      class_id: p.class_id,
      form: p.form,
      note: p.note,
      updated_at: new Date().toISOString(),
    });
    const r = await sb.from("product").upsert(row, { onConflict: "name_key" }).select("id").single();
    if (r.error || !r.data) {
      fail.push(p.name + ": " + (r.error ? r.error.message : "немає прав"));
      continue;
    }
    const pid = r.data.id;
    for (const o of p.offers) {
      const q = await sb
        .from("product_offer")
        .upsert(
          {
            ...clean(o),
            seller: o.seller || "",
            pack_text: o.pack_text || "",
            product_id: pid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id,seller,pack_text" }
        );
      if (q.error) fail.push(p.name + " / " + o.seller + ": " + q.error.message);
    }
    for (const g of p.regimes) {
      const q = await sb
        .from("product_regime")
        .upsert(
          {
            ...clean(g),
            purpose: g.purpose || "",
            conc_text: g.conc_text || "",
            product_id: pid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id,purpose,conc_text" }
        );
      if (q.error) fail.push(p.name + " / " + g.purpose + ": " + q.error.message);
    }
  }
  d.close();
  if (fail.length) alert("Імпорт завершено із помилками (" + fail.length + "):\n" + fail.slice(0, 12).join("\n"));
  dzList();
}
// --- Перегляд засобів і цін ---
async function dzList() {
  const d = dzDlg("dzlist", "wide");
  d.innerHTML = '<h3>Дезінфектанти і ціни</h3><p class="hint">Завантажую…</p>';
  if (!d.open) d.showModal();
  let P;
  try {
    P = await dzLoad();
  } catch (e) {
    d.innerHTML = `<h3>Дезінфектанти і ціни</h3><p style="color:#c0392b">${esc(e.message)}</p><div class="row" style="justify-content:flex-end"><button type="button" class="rb" onclick="this.closest('dialog').close()">Закрити</button></div>`;
    return;
  }
  const cls = [...new Set(P.map(p => p.class_id).filter(Boolean))];
  d.innerHTML = `<h3>Дезінфектанти і ціни</h3><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input type="search" id="dzq" placeholder="Пошук: назва, речовина, продавець" style="flex:1;min-width:180px"><select id="dzc"><option value="">Усі класи</option>${cls.map(c => `<option value="${c}">${esc(((KB.cls && KB.cls[c]) || {}).name_uk || c)}</option>`).join("")}</select><label><input type="checkbox" id="dzs" checked> лише в наявності</label><label><input type="checkbox" id="dzv"> лише з режимом проти CPV</label></div>
  <div class="dztw" style="max-height:60vh"><table class="dzt"><thead><tr><th>Засіб</th><th>Режим</th><th>Найдешевше</th><th>Ціна робочого розчину</th></tr></thead><tbody id="dzb"></tbody></table></div>
  <p class="hint">Ціна робочого розчину = ціна фасування ÷ скільки літрів розчину з нього виходить за цим режимом. Без доставки і мінімального замовлення.</p>
  <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span class="row" style="gap:8px">${window.__canEdit ? '<button type="button" class="rb" id="dzi">Імпорт таблиці…</button>' : ""}<button type="button" class="rb" id="dze">Завантажити як таблицю</button></span><button type="button" class="rb" id="dzcl">Закрити</button></div>`;
  const body = d.querySelector("#dzb");
  const render = () => {
    const q = dzNorm(d.querySelector("#dzq").value),
      c = d.querySelector("#dzc").value,
      st = d.querySelector("#dzs").checked,
      cv = d.querySelector("#dzv").checked;
    const L = [];
    for (const p of P) {
      if (c && p.class_id !== c) continue;
      if (q && !dzNorm([p.name, p.manufacturer, p.active_text, ...p.offers.map(o => o.seller)].join(" ")).includes(q))
        continue;
      const offs = p.offers.filter(o => !st || o.in_stock !== false);
      const regs = p.regimes.filter(r => !cv || r.cpv);
      if (cv && !regs.length) continue;
      const head = `<b>${esc(p.name)}</b><div class="hint">${esc([p.manufacturer, p.active_text, ((KB.cls && KB.cls[p.class_id]) || {}).name_uk].filter(Boolean).join(" · "))}</div>`;
      if (!regs.length) {
        const o = offs.filter(o => o.price_uah != null).sort((a, b) => a.price_uah - b.price_uah)[0];
        L.push({
          k: 1e9,
          h: `<tr><td>${head}</td><td class="hint">режим не внесено</td><td>${o ? dzOff(o) : "—"}</td><td>—</td></tr>`,
        });
        continue;
      }
      regs.forEach((r, i) => {
        let best = null;
        const all = [];
        for (const o of offs) {
          const x = dzCost(r, o, p);
          if (x) {
            all.push([x, o]);
            if (!best || x.perL < best.perL) best = { ...x, o };
          }
        }
        all.sort((a, b) => a[0].perL - b[0].perL);
        L.push({
          k: best ? best.perL : 1e8,
          h: `<tr><td>${i ? `<span class="hint">${esc(p.name)}</span>` : head}</td><td>${esc(r.purpose || "—")}<div class="hint">${esc([r.conc_text, r.contact_min ? r.contact_min + " хв" : "", r.evidence].filter(Boolean).join(" · "))}${r.cpv ? ' <b class="cpv">CPV</b>' : ""}</div>${r.note ? `<div class="hint">${esc(r.note)}</div>` : ""}</td><td>${best ? dzOff(best.o) : offs.length ? '<span class="hint">не можу порахувати: потрібні кількість і вихід</span>' : "немає в наявності"}</td><td>${
            best
              ? `<b>${dzF2(best.perL)} грн/л</b><div class="hint">${Math.round(best.liters).toLocaleString("uk-UA")} л з фасування</div>${
                  all.length > 1
                    ? `<details><summary class="hint">ще ${all.length - 1}</summary>${all
                        .slice(1)
                        .map(
                          ([x, o]) =>
                            `<div class="hint">${dzF2(x.perL)} грн/л — ${esc([o.seller, o.pack_text].filter(Boolean).join(", "))}</div>`
                        )
                        .join("")}</details>`
                    : ""
                }`
              : "—"
          }</td></tr>`,
        });
      });
    }
    L.sort((a, b) => a.k - b.k);
    body.innerHTML =
      L.map(x => x.h).join("") || '<tr><td colspan="4" class="hint">Нічого не знайдено. Імпортуйте таблицю.</td></tr>';
  };
  ["#dzq", "#dzc", "#dzs", "#dzv"].forEach(s => d.querySelector(s).addEventListener("input", render));
  d.querySelector("#dzq").addEventListener("keydown", e => e.stopPropagation());
  d.querySelector("#dze").onclick = dzExport;
  d.querySelector("#dzcl").onclick = () => d.close();
  const ib = d.querySelector("#dzi");
  if (ib)
    ib.onclick = () => {
      d.close();
      dzImport();
    };
  render();
}
// Опис пропозиції продавця
const dzOff = o =>
  `${esc(o.seller || "—")}<div class="hint">${esc(o.pack_text || "")} · ${o.price_uah != null ? dzF2(o.price_uah) + " грн" : "ціна —"}${o.in_stock === false ? " · немає" : ""}${o.min_order_uah ? " · мін. замовлення " + dzF2(o.min_order_uah) + " грн" : ""}${o.url ? ` · <a href="${esc(o.url)}" target="_blank" rel="noopener">сторінка</a>` : ""}</div>`;
$("dzlb").onclick = dzList;
$("dzib").onclick = dzImport;
// ===== Довідка: як підготувати таблицю засобів =====
function dzHelpHtml() {
  const C = [
    ["Назва", "так", "Назва засобу. Рядки з однаковою назвою — один засіб", "Бланідас 300"],
    ["Виробник", "", "", "Бровафарма"],
    ["Діюча речовина", "", "Склад; з нього визначиться клас, якщо «Клас» порожній", "дихлорізоціанурат натрію"],
    ["Клас", "", "Код або назва класу (див. нижче)", "nadcc"],
    ["Форма", "", "концентрат, порошок, таблетки, готовий", "таблетки"],
    ["Продавець", "для ціни", "Магазин або постачальник", "БІОВЕТ"],
    ["Фасування", "", "Як написано у продавця", "300 табл"],
    ["Кількість", "для ціни/л", "Число з фасування", "300"],
    ["Одиниця", "для ціни/л", "л, мл, кг, г, табл, шт", "табл"],
    ["Ціна, грн", "для ціни", "Ціна за фасування, без доставки", "396"],
    ["У наявності", "", "так / ні; порожньо — невідомо", "так"],
    ["Мін. замовлення, грн", "", "Якщо продавець має мінімум", "300"],
    ["Посилання", "", "Сторінка товару", "https://…"],
    ["Дата перевірки", "", "2026-11-23 або 23.11.2026", "23.11.2026"],
    ["Режим", "для режиму", "Для чого: поверхні, віруси, профілактика…", "Поверхні"],
    ["Концентрація", "", "Як в інструкції", "0,03% акт. хлору"],
    ["Концентрація, %", "для ціни/л", "Лише число, без знака %", "0,03"],
    ["Експозиція, хв", "", "Число або діапазон", "30 або 30–60"],
    ["Вихід, л на 1 од.", "для таблеток", "Скільки літрів розчину з 1 таблетки (для таблеток обов'язково)", "5"],
    ["Проти CPV", "", "так, якщо режим прямо заявлений проти парвовірусу", "так"],
    ["Підтвердження", "", "Звідки режим: інструкція, етикетка, продавець", "інструкція"],
    ["Примітка", "", "Будь-що", ""],
  ];
  return `<p>Перший рядок — заголовки. Назви колонок — як у шаблоні; великі й малі літери не важливі. Якщо колонку названо інакше, у вікні імпорту її можна вибрати вручну. Обов'язкова лише <b>Назва</b>.</p>
 <p><b>Формат:</b> Excel (.xlsx), CSV або TSV у кодуванні UTF-8 (розділювач «;», «,» або табуляція визначиться сам) або просто скопійовані клітинки з Excel чи Google Таблиць.</p>
 <p><b>Що в рядку.</b> Рядок-<i>пропозиція</i> — заповнені Продавець, Фасування, Кількість, Одиниця, Ціна. Рядок-<i>режим</i> — Режим, Концентрація, Експозиція, Вихід. Можна і те, й інше в одному рядку. Кілька продавців чи режимів одного засобу — кілька рядків з тією ж назвою.</p>
 <table class="dzt dzh"><thead><tr><th>Колонка</th><th>Потрібна</th><th>Що писати</th><th>Приклад</th></tr></thead><tbody>${C.map(c => `<tr><td><b>${esc(c[0])}</b></td><td>${esc(c[1])}</td><td>${esc(c[2])}</td><td>${esc(c[3])}</td></tr>`).join("")}</tbody></table>
 <p><b>Числа:</b> кома або крапка («0,25» = «0.25»); пробіли в тисячах і «грн» не заважають.</p>
 <p><b>Клас:</b> nadcc — хлорні таблетки (NaDCC); naocl — гіпохлорит; qac — ЧАС; pms — пероксимоносульфат (Віркон, Екоцид); h2o2 — пероксид водню; ahp — прискорений пероксид; paa — надоцтова кислота; clo2 — діоксид хлору; alcohol — спирти; aldehyde — альдегіди; phenolic — феноли; iodophor — йодофори. Якщо порожньо, клас визначиться з діючої речовини.</p>
 <p><b>Ціна робочого розчину</b> рахується сама: для концентратів і порошків з 1 л чи 1 кг виходить 100 ÷ % літрів (0,25% → 400 л); для готових засобів — 1 л з 1 л. Для таблеток потрібен «Вихід, л на 1 од.»: наприклад, 2 таблетки на 10 л → 5. Без кількості й одиниці фасування ціну за літр не порахує.</p>
 <p><b>Оновлення.</b> Повторний імпорт оновлює, а не дублює: засіб шукається за назвою, пропозиція — за назвою, продавцем і фасуванням, режим — за назвою, режимом і концентрацією. Порожні клітинки старих значень не стирають. Видалити запис імпортом не можна.</p>
 <p><b>Порада:</b> почніть із «Завантажити шаблон» або «Засоби і ціни» → «Завантажити як таблицю», правте в Excel і імпортуйте назад.</p>`;
}
