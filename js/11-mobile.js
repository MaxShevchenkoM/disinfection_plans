/*
  Мобільний вигляд: автоматично на вузькому екрані або перемикачем; дотик — довге натискання, рух і масштаб пальцями.
*/
// ===== Мобільний вигляд =====
const MQ = matchMedia("(max-width:760px)");
// Увімкнути або вимкнути мобільний вигляд
function applyMob() {
  let sim = false;
  try {
    sim = localStorage.getItem("zvir-mobsim") === "1";
  } catch (e) {}
  if (/[?&]mobile=1/.test(location.search)) sim = true;
  const on = sim || MQ.matches,
    was = document.body.classList.contains("mob");
  document.body.classList.toggle("mob", on);
  document.body.classList.toggle("mobsim", sim && !MQ.matches);
  $("mobt").setAttribute("aria-pressed", sim);
  if (on && !was && zoom < 2) zoom = 2;
  if (!on && was && zoom === 2) zoom = 1;
  hideCM();
  draw();
}
// Перемикач «Мобільний вигляд» на комп'ютері
function setMobSim(v) {
  try {
    localStorage.setItem("zvir-mobsim", v ? "1" : "0");
  } catch (e) {}
  if (!v && /[?&]mobile=1/.test(location.search)) history.replaceState(null, "", location.pathname);
  applyMob();
}
$("mobt").onclick = () => setMobSim(!document.body.classList.contains("mobsim"));
$("mobx").onclick = () => setMobSim(false);
MQ.addEventListener("change", applyMob);
// Дотик: довге натискання — меню; два пальці — пересунути і масштабувати; один палець по порожньому — пересунути план
{
  const P = new Map();
  let lp = null,
    pan = null,
    pinch = null;
  const W = $("wrap");
  const isMob = () => document.body.classList.contains("mob");
  cv.addEventListener(
    "pointerdown",
    e => {
      if (e.pointerType !== "touch") return;
      P.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
      if (P.size === 2) {
        clearTimeout(lp);
        lp = null;
        if (drag && !drag.poly && !drag.wall) {
          if (drag.moved && hist.length) $("undo").onclick();
          drag = null;
        }
        pan = null;
        const [a, b] = [...P.values()];
        pinch = {
          d: Math.hypot(a.x - b.x, a.y - b.y),
          z: zoom,
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
          sl: W.scrollLeft,
          st: W.scrollTop,
        };
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      const onObj = e.target.closest("[data-id],[data-pv],[data-zr],[data-rz]");
      if (window.__canEdit) {
        lp = setTimeout(() => {
          lp = null;
          if (P.size !== 1 || !CM.hidden) return;
          if (drag && drag.moved) return;
          if (drag && !drag.poly && !drag.wall) drag = null;
          const tg = document.elementFromPoint(e.clientX, e.clientY);
          (tg && cv.contains(tg) ? tg : cv).dispatchEvent(
            new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY })
          );
        }, 550);
      }
      if (isMob() && !onObj && !armK && !calib && (!window.__canEdit || !["zone", "route"].includes(act) || bgMode)) {
        pan = { x: e.clientX, y: e.clientY, sl: W.scrollLeft, st: W.scrollTop };
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  cv.addEventListener(
    "pointermove",
    e => {
      if (e.pointerType !== "touch" || !P.has(e.pointerId)) return;
      const q = P.get(e.pointerId);
      q.x = e.clientX;
      q.y = e.clientY;
      if (lp && Math.hypot(e.clientX - q.x0, e.clientY - q.y0) > 8) {
        clearTimeout(lp);
        lp = null;
      }
      if (pinch && P.size >= 2) {
        const [a, b] = [...P.values()],
          d = Math.hypot(a.x - b.x, a.y - b.y),
          nz = Math.max(0.5, Math.min(4, (pinch.z * d) / pinch.d)),
          cx = (a.x + b.x) / 2,
          cy = (a.y + b.y) / 2;
        if (Math.abs(nz - zoom) > 0.01) {
          const r = W.getBoundingClientRect(),
            fx = (pinch.cx - r.left + pinch.sl) / pinch.z,
            fy = (pinch.cy - r.top + pinch.st) / pinch.z;
          zoom = nz;
          draw();
          W.scrollLeft = fx * nz - (cx - r.left);
          W.scrollTop = fy * nz - (cy - r.top);
        } else {
          W.scrollLeft = pinch.sl - (cx - pinch.cx);
          W.scrollTop = pinch.st - (cy - pinch.cy);
        }
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      if (pan) {
        W.scrollLeft = pan.sl - (e.clientX - pan.x);
        W.scrollTop = pan.st - (e.clientY - pan.y);
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  const up = e => {
    if (e.pointerType !== "touch") return;
    P.delete(e.pointerId);
    clearTimeout(lp);
    lp = null;
    if (P.size < 2) pinch = null;
    if (!P.size) pan = null;
  };
  cv.addEventListener("pointerup", up, true);
  cv.addEventListener("pointercancel", up, true);
}
