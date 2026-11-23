/*
  Запуск: виконується останнім, коли всі файли вже завантажені.
*/
if (!GROUPS[act]) act = "eq";
presets();
draw();
load().then(auth);
loadKB();
loadClinics();
applyMob();
