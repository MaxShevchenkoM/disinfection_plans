/*
  Робота з базою (Supabase): довідники, клініки, завантаження і збереження плану, вхід редактора, синхронізація зон.
*/
/* ---- база даних ---- */
// Середовище (прод чи препрод) і доступ до Supabase
const ENV = window.PLAN_ENV || { name: "prod", table: "plan_prod" },
  SB_URL = "https://yyqlldeadajhhcwvjocj.supabase.co",
  SB_KEY = "sb_publishable_Wz4vFrtTpOTF7APubvBolg_8dqdvR-f";
// Клієнт Supabase
const sb = supabase.createClient(SB_URL, SB_KEY);
// План у вигляді JSON для збереження
const docJ = () => JSON.stringify({ items: S, bg: bg.src ? bg : null, pxm });
// Завантажити базу знань
async function loadKB() {
  try {
    const q = t => sb.from(t).select("*");
    const [
      zt,
      ot,
      mat,
      req,
      proc,
      st,
      sc,
      rl,
      cl,
      zp,
      zg,
      zc,
      agr,
      ac,
      zca,
      hz,
      hl,
      ht,
      tg,
      pzt,
      pco,
      pac,
      phz,
      pot,
      psc,
    ] = await Promise.all(
      [
        "zone_type",
        "object_type",
        "material",
        "zone_requirement",
        "procedure_std",
        "procedure_step",
        "scenario",
        "staff_role",
        "substance_class",
        "zone_profile",
        "zone_group",
        "zone_catalog",
        "activity_group",
        "activity",
        "zone_catalog_activity",
        "hazard",
        "hazard_link",
        "hazard_target",
        "target",
        "procedure_zone_type",
        "procedure_color",
        "procedure_activity",
        "procedure_hazard",
        "procedure_object_type",
        "procedure_scenario",
      ].map(t => q(t))
    );
    KB.hz = (hz.data || []).sort((a, b) => a.sort - b.sort);
    KB.hzm = Object.fromEntries(KB.hz.map(x => [x.id, x]));
    KB.hsrc = {};
    KB.hrec = {};
    (hl.data || []).forEach(r => {
      const m = r.role === "source" ? KB.hsrc : KB.hrec,
        k = r.ref_kind + ":" + r.ref_id;
      (m[k] = m[k] || []).push(r);
    });
    KB.ht = {};
    (ht.data || []).forEach(r => (KB.ht[r.hazard_id] = KB.ht[r.hazard_id] || []).push(r));
    KB.tgm = Object.fromEntries((tg.data || []).map(x => [x.id, x]));
    const grpL = (d, f) => {
      const m = {};
      (d.data || []).forEach(r => (m[r.procedure_id] = m[r.procedure_id] || []).push(r[f]));
      return m;
    };
    KB.pl = {
      zt: grpL(pzt, "zone_type_id"),
      col: grpL(pco, "color"),
      act: grpL(pac, "activity_id"),
      hz: grpL(phz, "hazard_id"),
      ot: grpL(pot, "object_type_id"),
      sc: grpL(psc, "scenario_id"),
    };
    KB.ag = (agr.data || []).sort((a, b) => a.sort - b.sort);
    KB.act = (ac.data || []).sort((a, b) => a.sort - b.sort);
    KB.actm = Object.fromEntries(KB.act.map(x => [x.id, x]));
    KB.cact = {};
    (zca.data || []).forEach(r => (KB.cact[r.code] = KB.cact[r.code] || []).push(r.activity_id));
    KB.pf = (zp.data || []).sort((a, b) => a.id.localeCompare(b.id));
    KB.pfm = Object.fromEntries(KB.pf.map(x => [x.id, x]));
    KB.zg = (zg.data || []).sort((a, b) => a.sort - b.sort);
    KB.zgm = Object.fromEntries(KB.zg.map(x => [x.id, x]));
    KB.zc = (zc.data || []).sort((a, b) => a.group_id.localeCompare(b.group_id) || a.sort - b.sort);
    KB.zcm = Object.fromEntries(KB.zc.map(x => [x.code, x]));
    KB.zt = (zt.data || []).sort((a, b) => a.sort - b.sort);
    KB.ztm = Object.fromEntries(KB.zt.map(x => [x.id, x]));
    KB.ot = ot.data || [];
    KB.otm = Object.fromEntries(KB.ot.map(x => [x.id, x]));
    KB.mat = mat.data || [];
    KB.matm = Object.fromEntries(KB.mat.map(x => [x.id, x]));
    KB.req = req.data || [];
    KB.proc = (proc.data || []).sort((a, b) => a.code.localeCompare(b.code));
    KB.steps = {};
    (st.data || [])
      .sort((a, b) => a.step_no - b.step_no)
      .forEach(x => (KB.steps[x.procedure_id] = KB.steps[x.procedure_id] || []).push(x));
    KB.sc = sc.data || [];
    KB.role = Object.fromEntries((rl.data || []).map(x => [x.id, x.name]));
    KB.cls = Object.fromEntries((cl.data || []).map(x => [x.id, x]));
    KB.ok = true;
    fillOti();
    draw();
    if (mode === "result") result();
  } catch (e) {
    console.error(e);
  }
}
// Поточна клініка (з адреси або з браузера)
let CLINIC =
  new URLSearchParams(location.search).get("c") ||
  (() => {
    try {
      return localStorage.getItem("zvir-clinic");
    } catch (e) {}
  })() ||
  "zvirpolis_1";
// Таймер синхронізації і список клінік
let syncT = null,
  clinics = [];
// Завантажити клініки
async function loadClinics() {
  const { data } = await sb.from("clinic").select("id,name").order("id");
  clinics = data || [];
  renderClinics();
}
// Список клінік у верхній панелі
function renderClinics() {
  const cur = clinics.find(c => c.id === CLINIC);
  if ($("clinn") && !$("clinb").querySelector("input")) $("clinn").textContent = cur ? cur.name || cur.id : CLINIC;
  const m = $("clinm");
  if (!m) return;
  m.innerHTML = "";
  for (const c of clinics) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cmi";
    b.dataset.id = c.id;
    b.innerHTML = `<span class="cmc">${c.id === CLINIC ? "✓" : ""}</span><span class="cmt">${esc(c.name || c.id)}</span>${window.__canEdit ? '<span class="cmk" title="Перейменувати">✎</span>' : ""}`;
    let tm = null;
    b.onclick = e => {
      e.stopPropagation();
      if (e.target.closest(".cmk")) {
        renClinic(c.id, b.querySelector(".cmt"));
        return;
      }
      clearTimeout(tm);
      tm = setTimeout(() => {
        m.hidden = true;
        if (c.id !== CLINIC) switchClinic(c.id);
      }, 230);
    };
    b.ondblclick = e => {
      e.stopPropagation();
      clearTimeout(tm);
      renClinic(c.id, b.querySelector(".cmt"));
    };
    m.appendChild(b);
  }
  if (window.__canEdit) {
    const s = document.createElement("div");
    s.className = "cms";
    m.appendChild(s);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cmi";
    b.innerHTML = '<span class="cmc">+</span><span class="cmt">Нова клініка…</span>';
    b.onclick = e => {
      e.stopPropagation();
      m.hidden = true;
      newClinic();
    };
    m.appendChild(b);
    const h = document.createElement("div");
    h.className = "cmh";
    h.style.fontWeight = "400";
    h.textContent = "Подвійний клік по назві — перейменувати";
    m.appendChild(h);
  }
}
// Перейменувати клініку прямо в списку
function renClinic(id, el) {
  if (!window.__canEdit || !el) return;
  const c = clinics.find(x => x.id === id);
  if (!c) return;
  const old = c.name || c.id;
  const inp = document.createElement("input");
  inp.className = "clinr";
  inp.value = old;
  el.replaceChildren(inp);
  inp.focus();
  inp.select();
  let done = false;
  const fin = async ok => {
    if (done) return;
    done = true;
    const v = inp.value.trim();
    if (ok && v && v !== old) {
      c.name = v;
      const r = await sb.from("clinic").update({ name: v }).eq("id", id).select("id");
      if (r.error || !r.data || !r.data.length) {
        c.name = old;
        alert("Не вдалося перейменувати: " + (r.error ? r.error.message : "немає прав"));
      }
    }
    inp.remove();
    renderClinics();
  };
  inp.onkeydown = e => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      fin(true);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      fin(false);
    }
  };
  inp.onblur = () => fin(true);
  ["click", "dblclick", "pointerdown"].forEach(t => inp.addEventListener(t, e => e.stopPropagation()));
}
// Створити клініку
async function newClinic() {
  const name = prompt("Назва нової клініки / філії");
  if (!name) return;
  const id =
    (name
      .toLowerCase()
      .replace(/[^a-zа-яіїєґ0-9]+/gi, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30) || "clinic") +
    "_" +
    Date.now().toString(36);
  const r = await sb.from("clinic").insert({ id, name });
  if (r.error) {
    alert(r.error.message);
    return;
  }
  for (const t of ["plan_prod", "plan_preprod"]) {
    const q = await sb.from(t).insert({ id, doc: { items: [] } });
    if (q.error) {
      alert(q.error.message);
      return;
    }
  }
  await loadClinics();
  switchClinic(id);
}
// Кнопка вибору клініки: один клік — список, подвійний — перейменувати
{
  let tm = null;
  $("clinb").onclick = e => {
    e.stopPropagation();
    clearTimeout(tm);
    tm = setTimeout(
      () => {
        const m = $("clinm");
        m.hidden = !m.hidden;
        if (!m.hidden) {
          renderClinics();
          const f = m.querySelector(".cmi");
          f && f.focus({ preventScroll: true });
        }
      },
      window.__canEdit ? 230 : 0
    );
  };
  $("clinb").ondblclick = e => {
    e.stopPropagation();
    clearTimeout(tm);
    $("clinm").hidden = true;
    renClinic(CLINIC, $("clinn"));
  };
  document.addEventListener("pointerdown", e => {
    if (!e.target.closest(".clinw")) $("clinm").hidden = true;
  });
  $("clinm").addEventListener("keydown", e => {
    if (e.key === "Escape") {
      $("clinm").hidden = true;
      $("clinb").focus();
    }
  });
}
// Перейти до іншої клініки
async function switchClinic(id) {
  if (dirty) await flush();
  CLINIC = id;
  try {
    localStorage.setItem("zvir-clinic", id);
  } catch (e) {}
  renderClinics();
  setSel([]);
  await load();
  draw();
}
// Записати зони й обладнання в таблиці бази
async function syncDB() {
  if (!window.__canEdit) return;
  const env = ENV.name === "prod" ? "prod" : "preprod";
  const zs = S.filter(o => o.t === "zz" && o.r.length && o.uid);
  const rows = zs.map(z => ({
    id: z.uid,
    clinic_id: CLINIC,
    env,
    name: zname(z),
    zone_type_id: zlegacy(z),
    catalog_code: z.cust ? null : zcodes(z)[0] || null,
    catalog_codes: z.cust ? [] : zcodes(z),
    activity_ids: [...zacts(z)],
    subzone: z.sz || null,
    profile_id: zprof(z),
    is_custom: !!z.cust,
    rects: absR(z),
    floor_material_ids: z.fm || [],
    wall_material_ids: z.wm || [],
    color_override: z.co || null,
    override_reason: z.co ? z.why || null : null,
  }));
  try {
    if (rows.length) {
      const r = await sb.from("zone").upsert(rows);
      if (r.error) throw r.error;
    }
    let d = sb.from("zone").delete().eq("env", env).eq("clinic_id", CLINIC);
    if (rows.length) d = d.not("id", "in", `(${rows.map(r => r.id).join(",")})`);
    const r2 = await d;
    if (r2.error) throw r2.error;
    await sb.from("site_object").delete().eq("env", env).eq("clinic_id", CLINIC);
    const so = S.filter(o => LY(o) === "eq" && o.uid && otiOf(o)).map(o => {
      const z = zs.find(q => inZ(o, q));
      return { clinic_id: CLINIC, env, item_uid: o.uid, object_type_id: otiOf(o), zone_id: z ? z.uid : null };
    });
    if (so.length) {
      const r3 = await sb.from("site_object").insert(so);
      if (r3.error) throw r3.error;
    }
  } catch (e) {
    console.warn("sync", e);
    st("Зони не синхронізовано з базою: " + (e.message || e), true);
  }
}
// Стан збереження: версія, зміни, таймер, конфлікт
let migr = false,
  last = "",
  ver = null,
  dirty = false,
  timer = null,
  saving = false,
  conflict = false;
window.__canEdit = false;
// Напис про збереження у верхній панелі
const st = (t, err) => {
  $("save").textContent = t;
  $("save").classList.toggle("err", !!err);
};
if (ENV.name !== "prod") {
  $("envb").innerHTML = `<span class="badge">ПРЕПРОД — тестові дані</span>`;
  $("copyprod").hidden = false;
}
// Відкрити план із бази
function applyDoc(row) {
  ver = row.version;
  const d = row.doc || {};
  S = Array.isArray(d.items) ? d.items : [];
  migr = false;
  S.forEach(o => {
    if (!o.uid) {
      o.uid = uidv();
      migr = true;
    }
    if (LY(o) === "eq" && !o.ot && o.l) {
      o.ot = o.l;
      migr = true;
    }
  });
  bg = d.bg && d.bg.src ? d.bg : { src: "", w: 960, h: 1280 };
  pxm = +d.pxm || 50;
  if ($("pxm")) $("pxm").value = pxm;
  hist = [];
  setSel([]);
  draw();
  $("io").value = JSON.stringify(S);
  last = docJ();
}
// Завантажити план поточної клініки
async function load() {
  st("Завантаження…");
  const { data, error } = await sb
    .from(ENV.table)
    .select("doc,version,updated_at,updated_by")
    .eq("id", CLINIC)
    .maybeSingle();
  if (error) {
    st("Не вдалося завантажити: " + error.message, true);
    return;
  }
  if (!data) {
    if (CLINIC !== "zvirpolis_1") {
      CLINIC = "zvirpolis_1";
      return load();
    }
    st("План не знайдено", true);
    return;
  }
  applyDoc(data);
  conflict = false;
  st(data.updated_by ? `Збережено ${new Date(data.updated_at).toLocaleString("uk-UA")} · ${data.updated_by}` : "");
}
// Зберегти зміни в базу (з перевіркою версії)
async function flush() {
  if (!dirty || saving || conflict || !window.__canEdit) return;
  saving = true;
  dirty = false;
  st("Зберігаю…");
  const j = docJ();
  const { data, error } = await sb
    .from(ENV.table)
    .update({ doc: JSON.parse(j) })
    .eq("id", CLINIC)
    .eq("version", ver)
    .select("version,updated_at");
  saving = false;
  if (error) {
    dirty = true;
    st("Помилка збереження: " + error.message, true);
    return;
  }
  if (!data.length) {
    conflict = true;
    st("План щойно змінив хтось інший. Ваші останні зміни не збережено — натисніть «Перезавантажити».", true);
    $("save").insertAdjacentHTML("beforeend", ' <button id="rl">Перезавантажити</button>');
    $("rl").onclick = load;
    return;
  }
  ver = data[0].version;
  last = j;
  clearTimeout(syncT);
  syncT = setTimeout(syncDB, 500);
  st("Збережено " + new Date(data[0].updated_at).toLocaleTimeString("uk-UA"));
  if (dirty) flush();
}
window.__dbSave = () => {
  if (!window.__canEdit || docJ() === last) return;
  dirty = true;
  st("Є незбережені зміни…");
  clearTimeout(timer);
  timer = setTimeout(flush, 1000);
};
// Не втратити незбережене при закритті сторінки
addEventListener("beforeunload", e => {
  if (dirty) {
    flush();
    e.preventDefault();
  }
});
// Перевірити вхід і права редактора
async function auth() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  const email = session?.user?.email;
  let ed = false;
  if (email) {
    const r = await sb.rpc("is_editor");
    ed = r.data === true;
  }
  window.__canEdit = ed;
  if (typeof renderClinics === "function") renderClinics();
  if (ed && migr) {
    migr = false;
    setTimeout(() => {
      last = "";
      __dbSave();
    }, 50);
  }
  document.body.classList.toggle("ro", !ed);
  $("who").textContent = email
    ? ed
      ? `Редагуєте як ${email}`
      : `${email} — немає права редагування, лише перегляд`
    : "Перегляд";
  $("login").hidden = !!email;
  $("logout").hidden = !email;
  if (!ed) setSel([]);
  draw();
}
// Вхід за посиланням на пошту і вихід
$("login").onclick = async () => {
  const email = prompt("Ваша пошта. Надішлемо посилання для входу.");
  if (!email) return;
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  alert(error ? "Не вдалося: " + error.message : "Перевірте пошту і відкрийте посилання з листа на цьому пристрої.");
};
$("logout").onclick = async () => {
  await flush();
  await sb.auth.signOut();
  auth();
};
$("copyprod").onclick = async () => {
  if (!confirm("Замінити дані препроду поточними даними з проду?")) return;
  const { data, error } = await sb.from("plan_prod").select("doc").eq("id", CLINIC).single();
  if (error) {
    alert(error.message);
    return;
  }
  const d = data.doc || {};
  S = d.items || [];
  bg = d.bg && d.bg.src ? d.bg : { src: "", w: 960, h: 1280 };
  draw();
  save();
};
sb.auth.onAuthStateChange(() => setTimeout(auth, 0));
document.body.classList.add("ro");
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !dirty && !saving) load();
});
