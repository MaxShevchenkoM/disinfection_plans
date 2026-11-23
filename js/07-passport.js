/*
  Паспорт зони (вимоги, процедури, ризики), меню вибору типу зони і вкладка «Результат».
*/
// Кроки процедури
function stepsHtml(p) {
  const st = KB.steps[p.id] || [];
  return `<ol class="steps">${st.map(x => `<li>${esc(x.action)}${x.class_id ? ` <span class="hint">· ${esc((KB.cls[x.class_id] || {}).name_uk || x.class_id)}${x.conc_text ? " · " + esc(x.conc_text) : ""}${x.contact_min ? " · " + x.contact_min + " хв" : ""}</span>` : ""}${x.alternatives ? ` <span class="hint">(або: ${esc(x.alternatives)})</span>` : ""}</li>`).join("")}</ol>`;
}
// Значок рівня контролю
const ctl = l => (CTRL[l] ? `<span class="ctl" title="${CTRL[l][1]}">${CTRL[l][0]}</span>` : "");
// Мітка кольору зони
const ctag = c =>
  c
    ? `<span class="cls" style="background:${ZCOL[c][1]}">${ZCOL[c][0]}</span>`
    : `<span class="cls" style="background:#999">без типу</span>`;
// Процедура з кроками
function procHtml(p) {
  return `<details class="pr"><summary>${ctl(p.control_level)}<span class="pn">${esc(p.name)}</span><span class="hint">${esc(p.frequency || p.trigger || "")}</span></summary><div class="pd">${(() => {
    const L = KB.pl || { sc: {}, hz: {} },
      sc = L.sc[p.id] || [],
      hz = L.hz[p.id] || [];
    return (
      (sc.length
        ? `<div><b>Сценарій:</b> ${esc(sc.map(id => (KB.sc.find(x => x.id === id) || {}).name || id).join("; "))}</div>`
        : "") + (hz.length ? `<div><b>Від ризиків:</b> ${hz.map(hzChip).join(" ")}</div>` : "")
    );
  })()}<div><b>Хто:</b> ${esc(KB.role[p.role_id] || p.role_id || "—")}${p.ppe ? ` · <b>ЗІЗ:</b> ${esc(p.ppe)}` : ""}</div>${p.trigger && p.frequency ? `<div><b>Коли:</b> ${esc(p.trigger)}</div>` : ""}${stepsHtml(p)}</div></details>`;
}
// Вибір сценарію тривоги
function scenSel(id) {
  return `<select id="${id}" class="scen"><option value="">Звичайний режим</option>${KB.sc.map(x => `<option value="${x.id}"${x.id === scen ? " selected" : ""}>Тривога: ${esc(x.name)}</option>`).join("")}</select>`;
}
// Паспорт зони або перелік зон
function pass() {
  const box = $("pass");
  if (mode !== "zones") return;
  {
    const ae = document.activeElement;
    if (box.contains(ae) && ae.tagName === "INPUT" && ae.type !== "checkbox") return;
  }
  if (!KB.ok) {
    box.innerHTML = `<div class="pl">Завантажую базу знань…</div>`;
    return;
  }
  const ed = !!window.__canEdit,
    z = SEL.size === 1 ? S.find(x => x.id === sel && x.t === "zz") : null,
    zs = S.filter(o => o.t === "zz" && o.r.length);
  let h = `<div class="row">${scenSel("zscen")}</div>`;
  if (!z) {
    h +=
      `<h3>Зони: ${zs.length}</h3>` +
      (zs.length
        ? zs
            .map(q => {
              const e = zoneEval(q),
                miss = e.reqs.filter(r => r.st === "miss").length;
              const pq = KB.pfm[zprof(q)];
              return `<div class="zl" data-z="${q.id}"><span class="cls" style="background:${pq ? pq.hue : "#999"}">${pq ? pq.id : "—"}</span><span>${q.zc ? `<span class="hint">${q.zc}</span> ` : ""}${esc(zname(q))}</span><span class="hint" style="margin-left:auto">${e.procs.length} проц.${miss ? ` · <b style="color:#c0392b">бракує ${miss}</b>` : ""}</span></div>`;
            })
            .join("")
        : `<div class="pl">Перейдіть на шар «Зони» і тягніть мишкою по плану, щоб намалювати першу зону.</div>`);
    box.innerHTML = h;
    box.querySelectorAll("[data-z]").forEach(
      d =>
        (d.onclick = () => {
          if (act !== "zone") {
            act = "zone";
            presets();
          }
          setSel([+d.dataset.z]);
          draw();
        })
    );
    bindScen();
    return;
  }
  const e = zoneEval(z),
    dis = ed ? "" : " disabled",
    lt = zlegacy(z),
    ztc = (KB.ztm[lt] || {}).color,
    zc = zcat(z),
    grp = zc ? KB.zgm[zc.group_id] : null,
    pf = zprof(z);
  const matChips = (kind, key) =>
    KB.mat
      .filter(m => m.kind === kind || (kind === "floor" && m.kind === "joint"))
      .filter(m => m.parent_id)
      .map(
        m =>
          `<label class="chip"><input type="checkbox" data-mk="${key}" value="${m.id}"${(z[key] || []).includes(m.id) ? " checked" : ""}${dis}>${esc(m.name)}</label>`
      )
      .join("");
  const ptag = id => {
    const q = KB.pfm[id];
    return q
      ? `<span class="cls" style="background:${q.hue}" title="${esc(q.descr || "")}">${q.id} · ${esc(q.name)}</span>`
      : `<span class="cls" style="background:#999">профіль не задано</span>`;
  };
  h += `<div class="row">${ptag(pf)}<button type="button" id="zback" style="margin-left:auto;min-height:28px;font-size:12px">← Усі зони</button></div>
 <div class="ztype">${z.cust ? `<div class="zcode">Своя зона</div>` : ""}${
   zcodes(z)
     .map((c, i) => {
       const q = KB.zcm[c] || {},
         g = KB.zgm[q.group_id] || {};
       return `<div class="zpre"><div><div class="zcode">${esc(c)} · ${esc(g.name || "")}</div><div class="${i ? "zt2" : "zt1"}">${esc(q.name || c)}</div></div>${ed ? `<button type="button" class="zx" data-rmc="${esc(c)}" title="Прибрати тип">✕</button>` : ""}</div>`;
     })
     .join("") || (!z.cust ? `<div class="zt1">Тип не вибрано</div>` : "")
 }${ed ? `<div class="row"><button type="button" id="zchg" class="rb">${zcodes(z).length ? "Змінити основний тип…" : "Вибрати тип…"}</button><button type="button" id="zadd" class="rb">+ Додати тип</button></div>` : ""}</div>
 ${grp && grp.note ? `<div class="note">${esc(grp.note)}</div>` : ""}
 <div class="row"><label>Назва</label><input id="znm" placeholder="${esc(zc ? zc.name : "Назва зони")}" value="${esc(z.nm || "")}"${dis}></div>
 ${zc && zc.subzones.length ? `<div class="row"><label>Підзона</label><select id="zsz"${dis}><option value="">— уся зона —</option>${zc.subzones.map(x => `<option${x === z.sz ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></div>` : ""}
 <div class="row"><label>Профіль</label><select id="zpf"${dis}>${z.cust ? "" : `<option value="">з типу${zc && zc.profile_id ? " (" + zc.profile_id + ")" : ""}</option>`}${KB.pf.map(q => `<option value="${q.id}"${z.pf === q.id ? " selected" : ""}>${q.id} · ${esc(q.name)}</option>`).join("")}</select></div>
 ${z.cust ? `<div class="row"><label>Правила як у</label><select id="zlt"${dis}><option value="">— лише загальні —</option>${KB.zt.map(t => `<option value="${t.id}"${t.id === z.zt ? " selected" : ""}>${esc(t.name)}</option>`).join("")}</select></div>` : ""}
 <div class="row"><label>Рівень правил</label><select id="zco"${dis}><option value="">${ztc ? "з типу (" + ZCOL[ztc][0].toLowerCase() + ")" : "не задано"}</option>${Object.entries(
   ZCOL
 )
   .map(([k, v]) => `<option value="${k}"${z.co === k ? " selected" : ""}>${v[0]}</option>`)
   .join("")}</select></div>
 ${z.co ? `<div class="row"><label>Причина</label><input id="zwhy" value="${esc(z.why || "")}" placeholder="Чому рівень змінено вручну"${dis}></div>` : ""}
 <details class="mats"><summary>Підлога: ${esc((z.fm || []).map(id => (KB.matm[id] || {}).name || id).join(", ") || "не задано")}</summary><div class="chips">${matChips("floor", "fm")}</div></details>
 <details class="mats"><summary>Стіни: ${esc((z.wm || []).map(id => (KB.matm[id] || {}).name || id).join(", ") || "не задано")}</summary><div class="chips">${matChips("wall", "wm")}</div></details>`;
  {
    const AG = KB.ag || [];
    h += `<details class="sec acts"${Array.isArray(z.acts) ? " open" : ""}><summary><h3>Що тут роблять: ${e.acts.size}</h3>${Array.isArray(z.acts) ? ` <span class="hint">налаштовано вручну</span>` : ` <span class="hint">з типів</span>`}</summary><div class="agrid">${AG.map(
      g => {
        const it = KB.act.filter(a => a.group_id === g.id);
        return `<div class="ag"><div class="rgh">${esc(g.name)}</div>${it.map(a => `<label class="chk"><input type="checkbox" data-act="${a.id}"${e.acts.has(a.id) ? " checked" : ""}${dis}>${esc(a.name)}</label>`).join("")}</div>`;
      }
    ).join(
      ""
    )}</div>${ed && Array.isArray(z.acts) ? `<button type="button" id="zactr" class="rb">Скинути до типів</button>` : ""}</details>`;
  }
  if (e.zh.size) {
    h +=
      `<details class="sec" open><summary><h3>Ризики в зоні: ${e.zh.size}</h3></summary>` +
      [...e.zh.entries()]
        .sort((a, b) => (KB.hzm[a[0]].sort || 0) - (KB.hzm[b[0]].sort || 0))
        .map(([id, src]) => {
          const hh = KB.hzm[id],
            tg = (KB.ht[id] || []).map(r => (KB.tgm[r.target_id] || {}).name || r.target_id);
          return `<div class="hzr"><div>${hzChip(id, true)}${+hh.radius_m ? ` <span class="hint">· ${hh.radius_m} м (${esc(hh.radius_basis || "")})</span>` : ""}</div><div class="hint">Звідки: ${esc([...src].join("; "))}</div>${tg.length ? `<div class="hint">Збудники: ${esc(tg.join(", "))}</div>` : ""}<div class="hint">Що робити: ${esc(hh.control || "")}</div></div>`;
        })
        .join("") +
      `</details>`;
  }
  {
    const A = analyze(),
      th = [...(A.through[z.id] || [])],
      cf = A.zc[z.id] || [];
    if (th.length || cf.length)
      h += `<h3>Рух і розміщення</h3><div class="flowl">${th.map(k => `<span class="fk"><span class="sw" style="background:${(K[k] || [])[4]};border-color:${(K[k] || [])[4]}"></span>${esc(knm(k))}</span>`).join("")}</div>${cf.map(m => `<div class="cf">⚠ ${esc(m)}</div>`).join("")}`;
  }
  const cntm = {};
  e.objs.forEach(o => {
    const k = (o.ot || o.l || "без назви").toLowerCase();
    cntm[k] = (cntm[k] || 0) + (+o.q || 1);
  });
  h += `<details class="sec"><summary><h3>Вміст: ${e.objs.length}</h3></summary>${
    e.objs.length
      ? `<ul>${Object.entries(cntm)
          .sort()
          .map(([k, v]) => `<li>${esc(k)}${v > 1 ? " × " + v : ""}</li>`)
          .join("")}</ul>`
      : `<div class="pl">Обладнання немає (рахується за центром об’єкта).</div>`
  }</details>`;
  const G = [
    ["miss", "Бракує на плані"],
    ["prep", "Підготувати"],
    ["check", "Перевірити на місці"],
    ["train", "Інструктаж"],
    ["ok", "Є"],
  ];
  h +=
    `<h3>Вимоги</h3>` +
    G.map(([k, n]) => {
      const it = e.reqs.filter(r => r.st === k);
      if (!it.length) return "";
      return `<div class="rg rg-${k}"><div class="rgh">${n}: ${it.length}</div>${it.map(r => `<div class="rq">${ctl(r.control_level)}<span>${esc(r.item)}${r.qty > 1 ? ` <b>× ${r.qty}</b>` : ""}</span>${k === "miss" && ed && CATOT[r.object_type_id] ? `<button type="button" class="put" data-put="${r.object_type_id}">+ поставити</button>` : ""}</div>`).join("")}</div>`;
    }).join("");
  h +=
    `<h3>Процедури: ${e.procs.length}</h3>` +
    KINDS.map(k => {
      const it = e.procs.filter(p => p.kind === k);
      return it.length ? `<div class="rgh">${k}</div>${it.map(procHtml).join("")}` : "";
    }).join("");
  if (ed)
    h += `<div class="row"><button type="button" id="zdelr"${z.r.length < 2 ? " disabled" : ""}>Прибрати останній прямокутник</button><button type="button" id="zdel">Видалити зону</button></div>`;
  box.innerHTML = h;
  bindScen();
  const ch = (id, f) => {
    const el = box.querySelector("#" + id);
    if (el)
      el.onchange = () => {
        push();
        f(el.value);
        draw();
        save();
      };
  };
  box.querySelector("#zback").onclick = () => {
    setSel([]);
    draw();
  };
  ch("znm", v => (z.nm = v.trim()));
  ch("zsz", v => (z.sz = v));
  ch("zpf", v => {
    if (v) z.pf = v;
    else delete z.pf;
  });
  ch("zlt", v => (z.zt = v));
  {
    const zb = box.querySelector("#zchg");
    if (zb) zb.onclick = () => ztMenu(z);
    const za = box.querySelector("#zadd");
    if (za) za.onclick = () => ztMenu(z, true);
    const zr = box.querySelector("#zactr");
    if (zr)
      zr.onclick = () => {
        push();
        delete z.acts;
        draw();
        save();
      };
  }
  box.querySelectorAll("[data-rmc]").forEach(
    b =>
      (b.onclick = () => {
        push();
        z.zcs = zcodes(z).filter(c => c !== b.dataset.rmc);
        delete z.zc;
        if (!z.zcs.length) delete z.sz;
        draw();
        save();
      })
  );
  box.querySelectorAll("[data-act]").forEach(
    c =>
      (c.onchange = () => {
        push();
        const a = zacts(z);
        c.checked ? a.add(c.dataset.act) : a.delete(c.dataset.act);
        z.acts = [...a];
        draw();
        save();
      })
  );
  ch("zco", v => {
    if (v) z.co = v;
    else {
      delete z.co;
      delete z.why;
    }
  });
  ch("zwhy", v => (z.why = v));
  box.querySelectorAll("[data-mk]").forEach(
    c =>
      (c.onchange = () => {
        push();
        const k = c.dataset.mk,
          a = new Set(z[k] || []);
        c.checked ? a.add(c.value) : a.delete(c.value);
        z[k] = [...a];
        draw();
        save();
      })
  );
  box.querySelectorAll("[data-put]").forEach(
    b =>
      (b.onclick = () => {
        const it = CATOT[b.dataset.put],
          r0 = absR(z)[0];
        add({
          t: it[1],
          ot: it[0],
          oti: b.dataset.put,
          l: it[0].toLowerCase(),
          x: Math.round(r0.x + r0.w / 2 - it[2] / 2),
          y: Math.round(r0.y + r0.h / 2 - it[3] / 2),
          w: it[2],
          h: it[3],
        });
        setSel([z.id]);
        draw();
      })
  );
  const dr = box.querySelector("#zdelr");
  if (dr)
    dr.onclick = () => {
      push();
      const rs = absR(z);
      rs.pop();
      setAbs(z, rs);
      draw();
      save();
    };
  const dz = box.querySelector("#zdel");
  if (dz)
    dz.onclick = () => {
      push();
      S = S.filter(o => o !== z);
      setSel([]);
      draw();
      save();
    };
}
// Обробка вибору сценарію
function bindScen() {
  document.querySelectorAll("select.scen").forEach(
    el =>
      (el.onchange = () => {
        scen = el.value;
        draw();
        if (mode === "result") result();
      })
  );
}
// Поставити меню біля зони
function placeMenu(m, z) {
  const r = cv.getBoundingClientRect(),
    k = r.width / 1260,
    rs = absR(z)[0];
  m.hidden = false;
  const x = r.left + (rs.x + rs.w) * k + 8,
    y = r.top + rs.y * k;
  m.style.left = Math.max(8, Math.min(x, innerWidth - m.offsetWidth - 8)) + "px";
  m.style.top = Math.max(8, Math.min(y, innerHeight - m.offsetHeight - 8)) + "px";
}
// Меню вибору типу зони з каталогу
function ztMenu(z, addMode) {
  if (!KB.ok) return;
  const m = $("ztm");
  m.classList.add("zmw");
  const render = q => {
    q = (q || "").trim().toLowerCase();
    const it = t =>
      `<div class="zi"><button type="button" class="zib" data-c="${t.code}"><span class="cls" style="background:${(KB.pfm[t.profile_id] || {}).hue || "#999"}">${t.profile_id || ""}</span><span class="hint">${t.code}</span> ${esc(t.name)}</button>${t.subzones.length > 1 ? `<div class="szs">${t.subzones.map(sz => `<button type="button" data-c="${t.code}" data-s="${esc(sz)}">${esc(sz)}</button>`).join("")}</div>` : ""}</div>`;
    let h = `<div class="zmh"><input id="ztq" placeholder="Пошук типу зони" value="${esc(q)}"><button type="button" data-cust="1">+ Своя зона</button><button type="button" data-c="" title="Закрити">✕</button></div><div class="zml">`;
    if (q) {
      const f = KB.zc.filter(t => (t.code + " " + t.name + " " + t.subzones.join(" ")).toLowerCase().includes(q));
      h += f.length ? f.map(it).join("") : `<div class="hint" style="padding:8px">Нічого не знайдено</div>`;
    } else
      h += KB.zg
        .map(g => {
          const op = zmOpen === g.id;
          return `<button type="button" class="zg${op ? " op" : ""}" data-g="${g.id}"><span>${op ? "▾" : "▸"}</span>${g.id}. ${esc(g.name)}<span class="hint" style="margin-left:auto">${KB.zc.filter(t => t.group_id === g.id).length}</span></button>${
            op
              ? KB.zc
                  .filter(t => t.group_id === g.id)
                  .map(it)
                  .join("")
              : ""
          }`;
        })
        .join("");
    m.innerHTML = h + "</div>";
    const inp = m.querySelector("#ztq");
    inp.oninput = () => {
      const v = inp.value,
        p = inp.selectionStart;
      render(v);
      const n = m.querySelector("#ztq");
      n.focus();
      n.setSelectionRange(p, p);
    };
    m.querySelectorAll("[data-g]").forEach(
      b =>
        (b.onclick = () => {
          zmOpen = zmOpen === b.dataset.g ? null : b.dataset.g;
          render("");
        })
    );
    m.querySelectorAll("[data-c]").forEach(
      b =>
        (b.onclick = () => {
          m.hidden = true;
          m.classList.remove("zmw");
          const c = b.dataset.c;
          if (!c) return;
          push();
          const cur = zcodes(z);
          if (addMode) {
            z.zcs = [...new Set([...cur, c])];
          } else {
            z.zcs = [c, ...cur.slice(1).filter(x => x !== c)];
            z.sz = b.dataset.s || "";
            delete z.pf;
          }
          delete z.zc;
          delete z.cust;
          delete z.zt;
          draw();
          save();
        })
    );
    m.querySelector("[data-cust]").onclick = () => {
      m.hidden = true;
      m.classList.remove("zmw");
      push();
      z.cust = true;
      delete z.zc;
      delete z.sz;
      z.pf = z.pf || "P03";
      z.nm = z.nm || "Своя зона";
      draw();
      save();
      setTimeout(() => {
        const n = $("znm");
        if (n) {
          n.focus();
          n.select();
        }
      }, 50);
    };
  };
  if (z.zc) zmOpen = (KB.zcm[z.zc] || {}).group_id || zmOpen;
  render("");
  placeMenu(m, z);
  setTimeout(() => {
    const n = m.querySelector("#ztq");
    if (n) n.focus();
  }, 30);
}
// Меню «що рухається» для маршруту
function rkMenu(z) {
  const m = $("ztm");
  m.classList.remove("zmw");
  m.innerHTML =
    `<div class="h">Що рухається цією ділянкою</div>` +
    RK.map(
      k =>
        `<button type="button" data-k="${k[0]}"><span class="sw" style="background:${k[2]};border-color:${k[2]}"></span>${esc(k[1])}</button>`
    ).join("");
  m.querySelectorAll("[data-k]").forEach(
    b =>
      (b.onclick = () => {
        m.hidden = true;
        push();
        z.rk = b.dataset.k;
        draw();
        save();
      })
  );
  placeMenu(m, z);
}
// Вкладка «Результат»: що підготувати, чого бракує, конфлікти, процедури
function result() {
  const box = $("result"),
    zs = S.filter(o => o.t === "zz" && o.r.length);
  if (!KB.ok) {
    box.innerHTML = `<p class="hint">Завантажую базу знань…</p>`;
    return;
  }
  const ev = zs.map(z => [z, zoneEval(z)]);
  const prep = {},
    miss = {},
    chk = {};
  ev.forEach(([z, e]) =>
    e.reqs.forEach(r => {
      const key = r.object_type_id || r.item,
        bag = r.st === "prep" ? prep : r.st === "miss" ? miss : r.st === "check" ? chk : null;
      if (!bag) return;
      const nm = r.object_type_id ? (KB.otm[r.object_type_id] || {}).name || r.item : r.item;
      bag[key] = bag[key] || { nm, q: 0, z: [] };
      bag[key].q += r.st === "prep" ? r.qty : 1;
      bag[key].z.push(zname(z));
    })
  );
  const tbl = (o, h) => {
    const rows = Object.values(o).sort((a, b) => a.nm.localeCompare(b.nm, "uk"));
    return rows.length
      ? `<table><thead><tr><th>${h}</th><th>К-сть</th><th>Зони</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.nm)}</td><td>${r.q}</td><td class="hint">${esc([...new Set(r.z)].join(", "))}</td></tr>`).join("")}</tbody></table>`
      : `<p class="hint">—</p>`;
  };
  box.innerHTML = `<div class="row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:20px">Результат</h2>${scenSel("rscen")}<button type="button" onclick="print()">Друк</button></div>
 ${zs.length ? "" : `<p class="hint">Зон ще немає. Намалюйте їх у вкладці «Зони і рух».</p>`}
 <h3>Підготувати</h3>${tbl(prep, "Що")}<h3>Бракує на плані</h3>${tbl(miss, "Обладнання")}<h3>Перевірити на місці</h3>${tbl(chk, "Вимога")}
 ${(() => {
   const A = analyze();
   return A.marks.length
     ? `<h3>Конфлікти потоків і ризиків: ${A.marks.length}</h3><ul>${[...new Set(A.marks.map(m => m.msg))].map(m => `<li>${esc(m)}</li>`).join("")}</ul>`
     : "";
 })()}
 <h3>Процедури по зонах</h3>${ev
   .map(
     ([z, e]) =>
       `<details class="rz" open><summary>${ctag(e.col)} <b>${esc(zname(z))}</b> <span class="hint">${e.procs.length} процедур</span></summary>${KINDS.map(
         k => {
           const it = e.procs.filter(p => p.kind === k);
           return it.length ? `<div class="rgh">${k}</div>${it.map(procHtml).join("")}` : "";
         }
       ).join("")}</details>`
   )
   .join("")}
 <p class="hint">Позначки контролю: ● завжди · ◐ за подією · ○ за графіком.</p>`;
  bindScen();
}
// Закривати меню типу зони кліком поза ним
document.addEventListener(
  "pointerdown",
  e => {
    if (!$("ztm").hidden && !e.target.closest("#ztm")) $("ztm").hidden = true;
  },
  true
);
