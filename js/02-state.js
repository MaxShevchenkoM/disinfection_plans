/*
  Стан застосунку: елементи плану (S), виділення, шар і вкладка, масштаб, історія для скасування,
  а також дрібні спільні помічники (збереження, екранування тексту, прив'язка до сітки).
*/
// Порожній стартовий набір елементів
const D = [];
// Новий порожній план
const fresh = () => D.map((d, i) => ({ id: i + 1, t: d[0], l: d[1], x: d[2], y: d[3], w: d[4], h: d[5] }));
// Ключ збереження налаштувань вигляду в браузері
const VKEY = "zvir-plan-ui-v1",
  ORDER = { room: 0, sink: 1, part: 2, note: 3, eq: 4, stair: 4, cage: 4, water: 5, door: 6 };
// Фонове зображення плану і масштаб (px на 1 м)
let bg = { src: "", w: 960, h: 1280 },
  pxm = 50;
// Стан редактора: виділення, режим фону, елементи плану, історія, прив'язка, масштаб, перетягування, активний шар, видимість шарів
let SEL = new Set(),
  bgMode = false,
  bgOp = 0.9,
  S,
  sel = null,
  hist = [],
  snap = false,
  zoom = 1,
  drag = null,
  act = "eq",
  show = { wall: true, eq: true, flow: true, risk: true, store: true, vis: true };
S = fresh();
try {
  const v = JSON.parse(localStorage.getItem(VKEY));
  if (v && v.show) show = { ...show, ...v.show };
  if (v && v.act) act = v.act;
} catch (e) {}
// Полотно SVG і скорочення для document.getElementById
const cv = document.getElementById("cv"),
  $ = id => document.getElementById(id);
// Шар, до якого належить елемент
const LY = o => o.ly || "eq";
// Поточна вкладка (режим) і вкладка стрічки
let mode = "rooms",
  rtab = "";
// База знань із Supabase (заповнюється в loadKB)
let KB = {
  ok: false,
  zt: [],
  ztm: {},
  ot: [],
  otm: {},
  mat: [],
  matm: {},
  req: [],
  proc: [],
  steps: {},
  sc: [],
  role: {},
  cls: {},
};
// Активний сценарій тривоги («» — звичайний режим)
let scen = "";
// Стан інструментів: що малюємо, аналіз, буфер, вимір масштабу, радіуси ризиків, контекстне меню, плаваюча панель, нещодавні
let armK = null,
  anl = false,
  clip = null,
  calib = null,
  showHz = true,
  cmPos = null,
  CM = null,
  FTB = null,
  RECENT = [];
// Інструмент малювання (стіна, рух) належить своєму шару: при переході на інший шар чи вкладку його скидаємо
function dropForeignTool() {
  if (armK && (!K[armK] || K[armK][0] !== act)) {
    armK = null;
    if (drag && (drag.wall || drag.poly)) drag = null;
  }
}
// Ключ нещодавніх елементів каталогу
const RECK = "zvir-recent";
// Унікальний ідентифікатор елемента для бази
const uidv = () =>
  crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
// Крок сітки, px
const GS = 20;
try {
  snap = localStorage.getItem("zvir-plan-snap") === "1";
} catch (e) {}
// Змінити виділення
function setSel(ids) {
  SEL = new Set(ids);
  sel = SEL.size === 1 ? [...SEL][0] : null;
}
// Усі елементи групи, до якої належить елемент
const grpOf = id => {
  const o = S.find(x => x.id === id);
  return o && o.gid ? S.filter(x => x.gid === o.gid && !x.hid && !x.lk && !(lockL || {})[LY(x)]).map(x => x.id) : [id];
};
// Виділені елементи
const selObjs = () => S.filter(o => SEL.has(o.id));
// Зберегти план (локально і в базу)
const save = () => {
  invalidate();
  try {
    saveUI();
  } catch (e) {}
  $("io").value = JSON.stringify(S);
  if (window.__dbSave) __dbSave();
};
// Запам'ятати стан для «Скасувати»
const push = () => {
  invalidate();
  hist.push(JSON.stringify(S));
  if (hist.length > 80) hist.shift();
};
// Екранування тексту для HTML
const esc = s =>
  String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Прив'язка координати до сітки (якщо ввімкнено)
const sn = v => (snap ? Math.round(v / GS) * GS : Math.round(v));
// Наступний вільний id
const nid = () => Math.max(0, ...S.map(x => x.id)) + 1;
// Стан дерева: яскравість, замки, розгорнуті шари, згорнуті групи, пошук
let viewL = {},
  lockL = {},
  openL = new Set([act]),
  closedG = new Set(),
  tq = "",
  lastSelKey = "";
// Зберегти налаштування вигляду в браузері
const saveUI = () => {
  try {
    localStorage.setItem(VKEY, JSON.stringify({ show, act, mode, lockL, viewL, openL: [...openL] }));
  } catch (e) {}
};
// Чи схований / заблокований елемент (сам або його шар)
const isHid = o => !!o.hid,
  isLk = o => !!o.lk || !!lockL[LY(o)];
// Чи відкрите меню типу зони
let zmOpen = null;
// Де востаннє з'являвся або стояв елемент — для розміщення наступного
let lastPos = null;
// Тимчасово змінити підпис кнопки («Скопійовано» тощо)
const flash = (b, t) => {
  const sp = b.querySelector("span") || b,
    o = sp.textContent;
  sp.textContent = t;
  setTimeout(() => (sp.textContent = o), 2200);
};
