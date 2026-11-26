"""Автоматична перевірка застосунку перед викладанням.

Збирає тестову сторінку з index.html, css/ і js/: замість Supabase — заглушка (stub.js)
з довідниками і планом із kb.json. Відкриває її в Chrome (Playwright) на комп'ютерному
і телефонному екрані та проходить основні дії. Будь-яка помилка JavaScript або невиконана
перевірка — тест не пройдено.

Запуск:  python3 tests/run.py            (потрібні playwright і Google Chrome)
"""
import asyncio, json, os, shutil, sys, tempfile
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")


def build(dst):
    """Тестова сторінка: справжні css/js, але база замінена заглушкою."""
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    kb = open(os.path.join(T, "kb.json"), encoding="utf-8").read()
    src = src.replace('<script src="env.js"></script>',
                      '<script>window.PLAN_ENV={name:"preprod",table:"plan_preprod"};window.__KB=' + kb.replace("</", "<\\/") + ";</script>")
    src = src.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>',
                      "<script>" + open(os.path.join(T, "stub.js"), encoding="utf-8").read() + "</script>")
    for d in ("css", "js"):
        shutil.copytree(os.path.join(ROOT, d), os.path.join(dst, d))
    open(os.path.join(dst, "t.html"), "w", encoding="utf-8").write(src)
    return "file://" + os.path.join(dst, "t.html")


def center(sel_js):
    return f"(()=>{{const g={sel_js};const r=g.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}})()"


# Кожен сценарій — назва, телефон (True/False) і кроки.
# Крок: ("js", вираз, очікуване значення або None), ("click", css), ("mclick", x, y), ("rclick", x, y),
#       ("rclick_at", js_координат), ("click_at", js_координат), ("key", клавіша), ("file", css, шлях), ("wait", мс)
SCENARIOS = [
    ("Завантаження і вкладки", False, [
        ("js", "document.querySelectorAll('#cv [data-oid]').length>50", True),
        *[x for t in ["file", "rooms", "zones", "flows", "result", "view"] for x in [("click", f"#rtabs [data-rt={t}]")]],
        ("js", "!!document.querySelector('#result h3')", None),
    ]),
    ("Обладнання: виділення, меню, буфер, скасувати", False, [
        ("click", "#rtabs [data-rt=rooms]"), ("click", "#tabs [data-tab=eq]"),
        ("click_at", center("[...document.querySelectorAll('#cv [data-id]')].find(x=>x.textContent.includes('процедурний'))")),
        ("js", "document.getElementById('sbsel').textContent", "Виділено: 1"),
        ("js", "document.getElementById('ftb').hidden", False),
        ("rclick_at", center("[...document.querySelectorAll('#cv [data-id]')].find(x=>x.textContent.includes('процедурний'))")),
        ("js", "[...document.querySelectorAll('#cm .cmi')].some(x=>x.textContent.includes('Матеріал'))", True),
        ("key", "Escape"),
        ("js", "window.__n0=document.querySelectorAll('#cv [data-oid]').length", None),
        ("key", "Control+c"), ("key", "Control+v"),
        ("js", "document.querySelectorAll('#cv [data-oid]').length===window.__n0+1", True),
        ("key", "Control+z"),
        ("js", "document.querySelectorAll('#cv [data-oid]').length===window.__n0", True),
    ]),
    ("Перетягування мишею", False, [
        ("click", "#rtabs [data-rt=rooms]"), ("click", "#tabs [data-tab=eq]"),
        ("drag", "[...document.querySelectorAll('#cv [data-id]')].find(x=>x.textContent.includes('процедурний'))", 80, 40),
        ("js", "(()=>{const g=[...document.querySelectorAll('#cv [data-id]')].find(x=>x.textContent.includes('процедурний'));const r=g.getBoundingClientRect();return Math.round(r.x)!==Math.round(window.__dx0)})()", True),
    ]),
    ("Стіни ланцюжком", False, [
        ("click", "#rtabs [data-rt=rooms]"), ("click", "#tabs [data-tab=wall]"), ("click", "#presets .ddb"),
        ("js", "[...document.querySelectorAll('#presets .menu button')].find(x=>x.textContent.includes('Перегородка до стелі')).click()", None),
        ("js", "window.__w0=document.querySelectorAll('#cv [data-oid]').length", None),
        ("mclick", 250, 300), ("mclick", 403, 305), ("mclick", 400, 420), ("key", "Enter"), ("key", "Escape"),
        ("js", "document.querySelectorAll('#cv [data-oid]').length-window.__w0", 2),
    ]),
    ("Інструмент стін не переходить у «Рух»", False, [
        ("click", "#rtabs [data-rt=rooms]"), ("click", "#tabs [data-tab=wall]"), ("click", "#presets .ddb"),
        ("js", "[...document.querySelectorAll('#presets .menu button')].find(x=>x.textContent.trim()==='Двері').click()", None),
        ("click", "#rtabs [data-rt=flows]"), ("click", "#tabs [data-tab=flow]"),
        ("js", "!!document.querySelector('#presets .armed')", False),
        ("js", "window.__f0=document.querySelectorAll('#cv [data-oid]').length", None),
        ("mclick", 300, 400), ("mclick", 450, 400), ("key", "Enter"),
        ("js", "document.querySelectorAll('#cv [data-oid]').length===window.__f0", True),
    ]),
    ("Зони: меню, ризики, аналіз", False, [
        ("click", "#rtabs [data-rt=zones]"),
        ("js", "document.querySelectorAll('#cv .hzl rect').length>0", True),
        ("click", "#anl"),
        ("click", "#rtabs [data-rt=result]"),
        ("js", "/Конфлікти потоків і ризиків: \\d+/.test(document.getElementById('result').textContent)", True),
    ]),
    ("Клініка: перейменування подвійним кліком", False, [
        ("js", "document.getElementById('clinb').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));!!document.querySelector('#clinb input')", True),
        ("js", "(()=>{const i=document.querySelector('#clinb input');i.value='Тест';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 1})()", None),
        ("wait", 300), ("js", "document.getElementById('clinn').textContent", "Тест"),
    ]),
    ("Дезінфектанти: імпорт і ціни", False, [
        ("click", "#rtabs [data-rt=file]"), ("click", "#dzib"), ("file", "#dzf", os.path.join(T, "dezinfektanty-test.csv")),
        ("js", "document.querySelector('.dzsum').textContent", "20 засобів · 30 пропозицій з цінами · 25 режимів"),
        ("click", "#dzgo"), ("wait", 1200),
        ("js", "[...document.querySelectorAll('#dzb tr')].some(r=>r.textContent.includes('0,26 грн/л'))", True),
        ("click", "#dzv"),
        ("js", "document.querySelectorAll('#dzb tr').length", 1),
        ("click", "#dzlist .dlgx"), ("js", "document.getElementById('dzlist').open", False),
    ]),
    ("Вікна закриваються", False, [
        ("click", "#help"), ("js", "document.getElementById('hlpd').open", True),
        ("key", "Escape"), ("js", "document.getElementById('hlpd').open", False),
        ("click", "#rtabs [data-rt=file]"), ("click", "#dzib"), ("mclick", 20, 400),
        ("js", "document.getElementById('dzimp').open", False),
    ]),
    ("Телефон: мобільний вигляд, дотик", True, [
        ("js", "document.body.classList.contains('mob')", True),
        ("js", "(()=>{const W=document.getElementById('wrap');W.scrollLeft=100;W.scrollTop=100;const cv=document.getElementById('cv');const r=W.getBoundingClientRect();const x=r.left+20,y=r.top+20;const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{pointerId:7,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:true}));ev('pointerdown',x,y);ev('pointermove',x-40,y-40);ev('pointerup',x-40,y-40);return [W.scrollLeft,W.scrollTop]})()", [140, 140]),
        ("js", "(()=>{const cv=document.getElementById('cv');const r=cv.getBoundingClientRect();cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,pointerType:'touch',clientX:r.left+150,clientY:r.top+150,bubbles:true,cancelable:true}));return 1})()", None),
        ("wait", 800), ("js", "document.getElementById('cm').hidden", False),
    ]),
]


async def run():
    tmp = tempfile.mkdtemp()
    url = build(tmp)
    ok = True
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for name, mobile, steps in SCENARIOS:
            ctx = await b.new_context(**({"viewport": {"width": 390, "height": 844}, "is_mobile": True, "has_touch": True} if mobile else {"viewport": {"width": 1400, "height": 860}}))
            pg = await ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await pg.goto(url)
            await pg.wait_for_timeout(800)
            fail = None
            try:
                for st in steps:
                    k = st[0]
                    if k == "js":
                        r = await pg.evaluate(st[1])
                        if st[2] is not None and r != st[2]:
                            fail = f"{st[1][:70]}… → {r!r}, чекали {st[2]!r}"
                            break
                    elif k == "click":
                        await pg.click(st[1])
                    elif k == "mclick":
                        await pg.mouse.click(st[1], st[2])
                    elif k == "rclick":
                        await pg.mouse.click(st[1], st[2], button="right")
                    elif k in ("click_at", "rclick_at"):
                        x, y = await pg.evaluate(st[1])
                        await pg.mouse.click(x, y, button="right" if k == "rclick_at" else "left")
                    elif k == "drag":
                        x, y = await pg.evaluate(center(st[1]))
                        await pg.evaluate(f"window.__dx0={st[1]}.getBoundingClientRect().x")
                        await pg.mouse.move(x, y); await pg.mouse.down()
                        for i in range(1, 11):
                            await pg.mouse.move(x + st[2] * i / 10, y + st[3] * i / 10)
                        await pg.mouse.up()
                    elif k == "key":
                        await pg.keyboard.press(st[1])
                    elif k == "file":
                        await pg.set_input_files(st[1], st[2])
                    elif k == "wait":
                        await pg.wait_for_timeout(st[1])
                    await pg.wait_for_timeout(120)
            except Exception as e:
                fail = f"{st[0]} {str(st[1])[:60]}: {e}"
            if errs and not fail:
                fail = "помилка JavaScript: " + errs[0]
            print(("✗ " if fail else "✓ ") + name + (f"\n    {fail}" if fail else ""))
            ok = ok and not fail
            await ctx.close()
        await b.close()
    shutil.rmtree(tmp, ignore_errors=True)
    print("Усе пройдено" if ok else "Є помилки")
    return ok


if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run()) else 1)
