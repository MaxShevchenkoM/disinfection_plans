/*
  Бічна панель: властивості виділеного, дерево об'єктів за шарами, вкладки стрічки.
*/
// Рядок стану: що виділено
function selbar() {
  const n = SEL.size,
    os = selObjs();
  const mo = os.filter(hasMat),
    cur = mo.length && mo.every(o => (o.m || "") === (mo[0].m || "")) ? mo[0].m || "" : null;
  document.querySelectorAll("#mat button").forEach(b => {
    b.disabled = !mo.length;
    b.classList.toggle("on", !!mo.length && cur !== null && cur === b.dataset.m && b.dataset.m !== "");
  });
  $("grp").disabled = n < 2;
  $("ungrp").disabled = !os.some(o => o.gid);
  $("mdup").disabled = !n;
  $("mdel").disabled = !n;
}
// Властивості виділеного елемента
function panel() {
  const o = S.find(x => x.id === sel),
    p = $("panel"),
    isEq = o && LY(o) === "eq";
  p.style.display = act === "zone" || !o || o.t === "zz" ? "none" : "";
  p.classList.toggle("off", !o);
  for (const id of ["lbl", "typ", "knd", "rot", "dup", "del", "note", "oti"]) $(id).disabled = !o;
  if (!o) {
    $("oti").hidden = true;
    $("qtyl").hidden = true;
  }
  $("typ").hidden = !!o && !isEq;
  $("knd").hidden = !o || isEq;
  $("note").hidden = !o || isEq;
  $("rot").hidden = !!o && (isLine(o) || o.t === "mk" || isZL(o));
  if (!o) {
    $("lbl").value = "";
    $("lbl").placeholder = "Оберіть елемент на плані";
    return;
  }
  $("lbl").placeholder = isEq ? "Назва" : "Підпис на плані (можна порожнім)";
  if (document.activeElement !== $("lbl")) $("lbl").value = o.l || "";
  $("qtyl").hidden = !(isEq && o.t === "cage");
  if (isEq && o.t === "cage" && document.activeElement !== $("qty")) $("qty").value = o.q || 1;
  $("oti").hidden = !isEq;
  if (isEq) {
    $("typ").value = o.t;
    $("oti").value = otiOf(o) || "";
    return;
  }
  if (o.t === "rz") {
    $("knd").innerHTML = RK.map(k => `<option value="${k[0]}">Маршрут: ${k[1]}</option>`).join("");
    $("knd").value = o.rk || "animal";
    $("note").value = o.n || "";
    return;
  }
  const grp = v => (["arrow", "zone", "seg"].includes(v) ? v : "mk"),
    og = o.t === "mk" ? "mk" : o.t === "pl" ? "arrow" : o.t;
  const opts = Object.entries(K).filter(([kk, v]) => v[0] === LY(o) && grp(v[1]) === og);
  $("knd").innerHTML = opts
    .map(([kk, v]) => `<option value="${kk}">${v[3] ? v[3] + " — " : ""}${v[2]}</option>`)
    .join("");
  $("knd").value = o.k;
  if (document.activeElement !== $("note")) $("note").value = o.n || "";
}
try {
  const v = JSON.parse(localStorage.getItem(VKEY));
  if (v && v.lockL) lockL = v.lockL;
  if (v && MODES[v.mode]) mode = v.mode;
  if (mode === "result") mode = "rooms";
  if (!MODES[mode].includes(act)) act = MODES[mode][0];
  if (v && v.viewL) viewL = v.viewL;
  if (v && v.openL) openL = new Set(v.openL);
} catch (e) {}
// Назва елемента для списків
const oname = o =>
  o.t === "pl"
    ? (K[o.k] || [, , "Рух"])[2] + (o.l ? " · " + o.l : "")
    : LY(o) === "eq" && o.q > 1
      ? (o.l || "без назви") + " × " + o.q
      : o.t === "rz"
        ? o.l || (RKM[o.rk] || [, , ""])[1] || "Маршрут"
        : LY(o) === "eq"
          ? o.l || "без назви"
          : (o.l ? o.l + " · " : "") + ((K[o.k] || [])[2] || "");
// Значок елемента в дереві
function oicon(o) {
  if (o.t === "rz") {
    const k = RKM[o.rk] || RK[0];
    return `<span class="ti" style="background:${k[2]}"></span>`;
  }
  if (LY(o) === "eq") {
    const c =
      {
        room: "var(--wall)",
        part: "var(--wall)",
        cage: "var(--tealk)",
        sink: "var(--bluek)",
        water: "var(--bluek)",
        door: "var(--ambk)",
        note: "var(--mute)",
      }[o.t] || "var(--mute)";
    return `<span class="ti" style="background:${c}"></span>`;
  }
  const k = K[o.k] || [];
  return k[3]
    ? `<span class="ti" style="background:${k[1] === "tri" ? "#ffd34d" : k[1] === "doc" ? "transparent" : k[4]};color:${k[1] === "tri" ? "#1d2326" : k[1] === "doc" ? k[4] : "#fff"};${k[1] === "doc" ? `border:1.5px solid ${k[4]}` : ""}">${esc(k[3])}</span>`
    : `<span class="ti" style="background:${k[4]}"></span>`;
}
// Кнопка-значок у дереві (око, замок)
const ib = (kind, on, attrs, ed = true) =>
  `<button type="button" class="ib${on ? " set" : ""}${ed ? " ed" : ""}" ${attrs} title="${kind === "eye" ? (on ? "Показати" : "Сховати") : on ? "Розблокувати" : "Заблокувати"}">${kind === "eye" ? (on ? ICO.noeye : ICO.eye) : on ? ICO.lock : ICO.unlock}</button>`;
// Дерево об'єктів за шарами
function tree() {
  const box = $("tnodes"),
    q = tq.trim().toLowerCase(),
    match = o =>
      !q ||
      oname(o).toLowerCase().includes(q) ||
      (o.gn || "").toLowerCase().includes(q) ||
      (o.n || "").toLowerCase().includes(q);
  const allG = [...new Set(S.filter(o => o.gid).map(o => o.gid))],
    gname = g => (S.find(o => o.gid === g && o.gn) || {}).gn || "Група " + (allG.indexOf(g) + 1);
  const row = (o, d) =>
    `<div class="tn${SEL.has(o.id) ? " on" : ""}${isHid(o) || !show[LY(o)] ? " off" : ""}" style="--d:${d}" data-id="${o.id}"><span class="car x"></span>${oicon(o)}<span class="nm">${esc(oname(o))}</span>${o.m && MAT[o.m] ? `<span class="mt" style="background:${MAT[o.m][3]}" title="${MAT[o.m][1]}">${MAT[o.m][2]}</span>` : ""}${ib("lock", !!o.lk, `data-lk="${o.id}"`)}${ib("eye", isHid(o), `data-hd="${o.id}"`)}</div>`;
  let h = "",
    any = false;
  const zm = mode === "zones";
  $("tnodes").hidden = zm;
  document.querySelector(".tree .ts").hidden = zm;
  $("pass").hidden = !zm;
  if (zm) return;
  for (const [lid, lname, lcol] of LAYERS.filter(l => (MODES[mode] || MODES.rooms).includes(l[0]))) {
    const items = S.filter(o => LY(o) === lid && match(o));
    if (q && !items.length) continue;
    any = true;
    const open = q ? true : openL.has(lid);
    h += `<div class="tn layer${lid === act ? " act" : ""}${show[lid] ? "" : " off"}" style="--d:0" data-l="${lid}"><button type="button" class="car" data-cl="${lid}">${open ? "▾" : "▸"}</button><span class="ti" style="background:${lcol}"></span><span class="nm">${esc(lname)}</span><span class="ct">${S.filter(o => LY(o) === lid).length}</span><button type="button" class="ib${viewL[lid] === "bright" ? " set" : ""}" data-lv="${lid}" title="${viewL[lid] === "bright" ? "Яскраво (коли шар не активний). Клік — приглушити" : "Приглушено (коли шар не активний). Клік — яскраво"}">${viewL[lid] === "bright" ? "●" : "◐"}</button>${ib("lock", !!lockL[lid], `data-ll="${lid}"`)}${ib("eye", !show[lid], `data-lh="${lid}"`, false)}</div>`;
    if (!open) continue;
    const gs = [...new Set(items.filter(o => o.gid).map(o => o.gid))].sort((a, b) =>
      gname(a).localeCompare(gname(b), "uk")
    );
    for (const g of gs) {
      const mem = items.filter(o => o.gid === g),
        allm = S.filter(o => o.gid === g),
        gk = lid + ":" + g,
        go = q ? true : !closedG.has(gk),
        on = allm.every(o => SEL.has(o.id));
      const hid = allm.every(isHid),
        lk = allm.every(o => o.lk);
      h += `<div class="tn${on ? " on" : ""}${hid ? " off" : ""}" style="--d:1" data-g="${g}"><button type="button" class="car" data-cg="${gk}">${go ? "▾" : "▸"}</button><span class="ti">📁</span><span class="nm">${esc(gname(g))}</span><span class="ct">${mem.length}${allm.length > mem.length ? "/" + allm.length : ""}</span>${ib("lock", lk, `data-gl="${g}"`)}${ib("eye", hid, `data-gh="${g}"`)}</div>`;
      if (go) for (const o of mem) h += row(o, 2);
    }
    const free = items.filter(o => !o.gid).sort((a, b) => oname(a).localeCompare(oname(b), "uk"));
    for (const o of free) h += row(o, 1);
    if (!items.length) h += `<div class="tempty" style="padding-left:30px">порожньо</div>`;
  }
  box.innerHTML = any ? h : `<div class="tempty">Нічого не знайдено</div>`;
  const key = [...SEL].join(",");
  if (key !== lastSelKey) {
    lastSelKey = key;
    const el = box.querySelector(".tn.on");
    if (el) {
      const r = el.getBoundingClientRect(),
        br = box.getBoundingClientRect();
      if (r.top < br.top || r.bottom > br.bottom) el.scrollIntoView({ block: "nearest" });
    }
  }
}
// Старе ім'я tree()
const list = tree;
// Пошук у дереві
$("tq").addEventListener("input", e => {
  tq = e.target.value;
  tree();
});
$("tq").addEventListener("keydown", e => e.stopPropagation());
// Змінити кілька елементів з дерева
function setObjs(objs, f) {
  if (!window.__canEdit) return;
  push();
  objs.forEach(f);
  const gone = objs.filter(o => isHid(o) || isLk(o)).map(o => o.id);
  if (gone.length) setSel([...SEL].filter(i => !gone.includes(i)));
  draw();
  save();
}
// Клік у дереві: вибрати, сховати, заблокувати, розгорнути
$("tnodes").addEventListener("click", e => {
  const t = e.target.closest("button,[data-id],[data-g],[data-l]");
  if (!t) return;
  const d = t.dataset;
  if (d.cl) {
    openL.has(d.cl) ? openL.delete(d.cl) : openL.add(d.cl);
    saveUI();
    tree();
    return;
  }
  if (d.cg) {
    closedG.has(d.cg) ? closedG.delete(d.cg) : closedG.add(d.cg);
    tree();
    return;
  }
  if (d.lh) {
    show[d.lh] = !show[d.lh];
    setSel([...SEL].filter(i => show[LY(S.find(x => x.id === i) || {})]));
    draw();
    save();
    return;
  }
  if (d.lv) {
    viewL[d.lv] = viewL[d.lv] === "bright" ? "dim" : "bright";
    saveUI();
    draw();
    return;
  }
  if (d.ll) {
    if (!window.__canEdit) return;
    lockL[d.ll] = !lockL[d.ll];
    setSel([...SEL].filter(i => !isLk(S.find(x => x.id === i) || {})));
    saveUI();
    draw();
    return;
  }
  if (d.hd) {
    const o = S.find(x => x.id === +d.hd);
    setObjs([o], o => (o.hid = !o.hid));
    return;
  }
  if (d.lk) {
    const o = S.find(x => x.id === +d.lk);
    setObjs([o], o => (o.lk = !o.lk));
    return;
  }
  if (d.gh) {
    const m = S.filter(o => String(o.gid) === d.gh),
      v = !m.every(isHid);
    setObjs(m, o => (o.hid = v));
    return;
  }
  if (d.gl) {
    const m = S.filter(o => String(o.gid) === d.gl),
      v = !m.every(o => o.lk);
    setObjs(m, o => (o.lk = v));
    return;
  }
  if (d.l) {
    if (act !== d.l) {
      act = d.l;
      show[act] = true;
      openL.add(act);
      setSel([]);
      presets();
      saveUI();
      draw();
    }
    return;
  }
  let ids = d.g ? S.filter(o => String(o.gid) === d.g).map(o => o.id) : [+d.id];
  const first = S.find(o => o.id === ids[0]);
  if (!window.__canEdit) {
    cv.querySelector(`[data-oid="${ids[0]}"]`)?.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: "smooth",
    });
    return;
  }
  ids = ids.filter(i => {
    const o = S.find(x => x.id === i);
    return o && !isHid(o) && !isLk(o) && show[LY(o)];
  });
  if (!ids.length) return;
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    const n = new Set(SEL),
      all = ids.every(i => SEL.has(i));
    ids.forEach(i => (all ? n.delete(i) : n.add(i)));
    setSel(n);
  } else {
    if (d.id && first && first.gid && !e.altKey) ids = [+d.id];
    setSel(ids);
    if (first && LY(first) !== act && ids.length === 1) {
      act = LY(first);
      presets();
      saveUI();
    }
  }
  draw();
  cv.querySelector(`[data-oid="${ids[0]}"]`)?.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "smooth",
  });
});
$("tnodes").addEventListener("dblclick", e => {
  if (!window.__canEdit) return;
  const t = e.target.closest("[data-id],[data-g]");
  if (!t || e.target.closest("button")) return;
  const nm = t.querySelector(".nm"),
    isG = !!t.dataset.g,
    o = isG ? null : S.find(x => x.id === +t.dataset.id);
  const cur = isG ? nm.textContent : o.l || "";
  const inp = document.createElement("input");
  inp.className = "rn";
  inp.value = cur;
  nm.replaceWith(inp);
  inp.focus();
  inp.select();
  let done = false;
  const fin = ok => {
    if (done) return;
    done = true;
    if (ok && inp.value.trim() !== cur) {
      push();
      const v = inp.value.trim();
      if (isG) S.filter(x => String(x.gid) === t.dataset.g).forEach(x => (x.gn = v));
      else o.l = v;
      draw();
      save();
    } else tree();
  };
  inp.addEventListener("keydown", ev => {
    ev.stopPropagation();
    if (ev.key === "Enter") fin(true);
    if (ev.key === "Escape") fin(false);
  });
  inp.addEventListener("blur", () => fin(true));
  inp.addEventListener("click", ev => ev.stopPropagation());
});
// Висота верхньої панелі для CSS
const setTb = () =>
  document.documentElement.style.setProperty("--tb", document.querySelector(".top").offsetHeight + "px");
addEventListener("resize", setTb);
// Вкладки стрічки і групи кнопок
function tabs() {
  const RT = [
    ["file", "Файл"],
    ["rooms", "Приміщення"],
    ["zones", "Зони"],
    ["flows", "Потоки і зберігання"],
    ["result", "Результат"],
    ["view", "Вигляд"],
  ];
  if (!rtab) rtab = mode;
  $("rtabs").innerHTML = RT.map(
    ([k, n]) =>
      `<button type="button" role="tab" class="${k === "file" ? "file" : ""}" data-rt="${k}" aria-selected="${k === rtab}">${n}</button>`
  ).join("");
  document.querySelectorAll("#ribbon .rbg").forEach(g => (g.hidden = !g.dataset.rt.split(" ").includes(rtab)));
  $("ribbon").hidden = ![...document.querySelectorAll("#ribbon .rbg")].some(
    g => !g.hidden && !(document.body.classList.contains("ro") && g.classList.contains("edit"))
  );
  $("sbmode").textContent =
    MODEN[mode] + (MODES[mode].length ? " · шар «" + (LAYERS.find(l => l[0] === act) || [, ""])[1] + "»" : "");
  $("sbsel").textContent = SEL.size ? "Виділено: " + SEL.size : "";
  $("sbzoom").textContent = Math.round(zoom * 100) + "%";
  $("zval").textContent = Math.round(zoom * 100) + "%";
  $("rtabs")
    .querySelectorAll("[data-rt]")
    .forEach(
      b =>
        (b.onclick = () => {
          const k = b.dataset.rt;
          rtab = k;
          if (!MODES[k] || mode === k) {
            tabs();
            setTb();
            return;
          }
          mode = k;
          if (MODES[mode].length) {
            act = MODES[mode][0];
            show[act] = true;
            openL.add(act);
          }
          document.body.classList.toggle("m-result", mode === "result");
          if (mode === "result") result();
          setSel([]);
          $("ztm").hidden = true;
          presets();
          draw();
          save();
          setTb();
        })
    );
  $("tabs").innerHTML = LAYERS.filter(l => MODES[mode].includes(l[0]))
    .map(([id, n, c]) => {
      const cnt = S.filter(o => LY(o) === id).length;
      return `<span class="tab" style="--tc:${c}" aria-current="${id === act}"><button type="button" data-tab="${id}">${esc(n)} <span class="hint">${cnt}</span></button><input type="checkbox" data-vis="${id}" ${show[id] ? "checked" : ""} aria-label="Показувати шар ${esc(n)}"></span>`;
    })
    .join("");
  $("tabs")
    .querySelectorAll("[data-tab]")
    .forEach(
      b =>
        (b.onclick = () => {
          act = b.dataset.tab;
          show[act] = true;
          openL.add(act);
          setSel([]);
          presets();
          draw();
          save();
        })
    );
  $("tabs")
    .querySelectorAll("[data-vis]")
    .forEach(
      c =>
        (c.onchange = () => {
          show[c.dataset.vis] = c.checked;
          setSel([...SEL].filter(i => show[LY(S.find(x => x.id === i) || {})]));
          draw();
          save();
        })
    );
}
// Список типів для правил у панелі
function fillOti() {
  $("oti").innerHTML =
    `<option value="">Тип для правил: не враховується</option>` +
    KB.ot
      .filter(t => !t.is_inventory || CATOT[t.id])
      .map(t => `<option value="${t.id}">Тип для правил: ${esc(t.name)}</option>`)
      .join("");
  panel();
}
