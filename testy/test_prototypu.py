"""Test funkcjonalny prototypu Miejscówka – automatyczny „użytkownik” klika kluczowe ścieżki.

Wymagania:  pip install playwright   (używa zainstalowanej przeglądarki Chrome)
Uruchomienie:  python testy/test_prototypu.py
"""
import pathlib
import sys

from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent / "interaktywna"      # folder prototypu (względnie do testu)
APP = (ROOT / "app.html").as_uri()
ok = []
sys.stdout.reconfigure(encoding="utf-8")                                      # polskie znaki i ✓ w konsoli Windows


def step(name):
    ok.append(name)
    print("✓", name)


with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    page = b.new_page(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # V01 – walidacja i logowanie
    page.goto(APP + "#/logowanie")
    page.click("button[type=submit]")
    expect(page.locator("#email-err")).to_contain_text("Podaj adres e-mail")
    page.fill("#email", "zly-adres")
    page.fill("#pass", "123")
    page.click("button[type=submit]")
    expect(page.locator("#email-err")).to_contain_text("niepoprawny format")
    expect(page.locator("#pass-err")).to_contain_text("co najmniej 8")
    step("V01 walidacja formularza")
    page.click('[data-action="login-sso"]')
    page.wait_for_url("**#/pulpit")
    step("V01 → V02 logowanie SSO")

    # V02 – odliczanie i szybkie wyszukiwanie
    t1 = page.locator("[data-countdown]").first.text_content()
    page.wait_for_timeout(1300)
    assert page.locator("[data-countdown]").first.text_content() != t1, "odliczanie stoi"
    step("V02 odliczanie meldowania na żywo")
    page.click('[data-action="quick"][data-preset="group"]')
    page.wait_for_url("**#/szukaj")
    page.wait_for_timeout(400)
    cards = page.locator("#results li").count()
    assert cards > 0 and page.locator('[data-action="group-only"]').get_attribute("aria-checked") == "true"
    step(f"V02 → V03 szybkie wyszukiwanie „Pokój dla 4 osób” ({cards} wyników)")

    # V03 – filtry
    page.click('[data-action="clear-filters"]')
    page.wait_for_timeout(400)
    before = page.locator("#results li").count()
    page.click('[data-action="amen"][data-amen="quiet"]')
    page.wait_for_timeout(400)
    after = page.locator("#results li").count()
    assert after < before, (before, after)
    step(f"V03 filtr „Strefa ciszy” zawęża wyniki ({before} → {after})")
    page.select_option('[data-key="building"]', "WM")
    page.wait_for_timeout(400)
    expect(page.locator("#results")).to_contain_text("Brak wolnych miejsc")
    step("V03 stan pusty przy filtrach bez wyników")
    page.click('#results [data-action="clear-filters"]')
    page.wait_for_timeout(400)

    # V04 – mapa: wybór budynku zmienia panel
    page.goto(APP + "#/mapa")
    page.wait_for_timeout(300)
    page.click('[data-action="map-building"][data-id="CD"]')
    expect(page.locator("#map-panel")).to_contain_text("Centrum Dydaktyczne")
    step("V04 wybór budynku na mapie pokazuje jego sale")

    # V05 – plan sali
    page.goto(APP + "#/sala/bg-214")
    page.wait_for_timeout(300)
    assert page.locator('[data-action="to-wizard"]').is_disabled()
    free = page.locator('button.seat:not([disabled])').first
    n = free.get_attribute("data-n")
    free.click()
    expect(page.locator("#summary")).to_contain_text(n)
    assert page.locator('[data-action="to-wizard"]').is_enabled()
    step(f"V05 wybór miejsca {n} aktywuje rezerwację")
    page.click('[data-action="duration"][data-step="1"]')
    expect(page.locator("#time-label")).to_contain_text("2,5 h")
    step("V05 zmiana czasu trwania (+30 min)")

    # V06 – potwierdzenie rezerwacji
    page.click('[data-action="to-wizard"]')
    page.wait_for_url("**#/rezerwacja")
    page.click('[data-action="wz-confirm"]')
    expect(page.locator("#accept-err")).to_contain_text("Zaznacz akceptację")
    step("V06 walidacja akceptacji zasad")
    page.check('[data-change="accept"]')
    page.click('[data-action="wz-confirm"]')
    expect(page.locator("#ok-h")).to_contain_text("Gotowe", timeout=3000)
    with page.expect_download() as dl:
        page.click('[data-action="ics"]')
    assert dl.value.suggested_filename.endswith(".ics")
    step("V06 potwierdzenie rezerwacji + plik .ics")

    # Limit 3 aktywnych rezerwacji
    page.goto(APP + "#/sala/bg-120")
    page.wait_for_timeout(300)
    page.locator('button.seat:not([disabled])').first.click()
    page.click('[data-action="to-wizard"]')
    expect(page.locator("#m-title")).to_contain_text("limit")
    page.click('[data-action="close-modal"] >> nth=0')
    step("V05 kontrola limitu 3 aktywnych rezerwacji")

    # V07 – anulowanie z cofnięciem
    page.goto(APP + "#/rezerwacje")
    page.wait_for_timeout(300)
    count = page.locator('[role="tabpanel"] li').count()
    page.locator('[data-action="cancel"]').first.click()
    page.click('[data-action="cancel-confirm"]')
    page.wait_for_timeout(200)
    assert page.locator('[role="tabpanel"] li').count() == count - 1
    page.click(".toast button")
    page.wait_for_timeout(200)
    assert page.locator('[role="tabpanel"] li').count() == count
    step("V07 anulowanie i „Cofnij”")

    # V08 – meldowanie: zły i dobry kod
    page.goto(APP + "#/rezerwacje/R-4821")
    page.wait_for_timeout(300)
    page.locator('[data-action="checkin"]').first.click()
    page.click('[data-action="ci-mode"][data-mode="code"]')
    page.fill("#ci-input", "1111")
    page.click('[data-action="ci-confirm"]')
    expect(page.locator("#ci-err")).to_contain_text("Nieprawidłowy kod")
    page.fill("#ci-input", "4821")
    page.click('[data-action="ci-confirm"]')
    expect(page.locator(".page-header")).to_contain_text("Trwa")
    step("V08 meldowanie (błędny kod → poprawny 4821)")

    # V09 – motyw ciemny
    page.goto(APP + "#/profil")
    page.click('[data-action="segment"][data-key="theme"][data-value="dark"]')
    assert page.evaluate("document.documentElement.dataset.theme") == "dark"
    page.click('[data-action="segment"][data-key="theme"][data-value="light"]')
    step("V09 zmiana motywu na żywo")

    # V10 – blokada sali wpływa na wyszukiwarkę
    page.click('[data-action="role"][data-role="admin"]')
    page.wait_for_url("**#/admin")
    page.click('[data-action="block"][data-room="bg-214"]')
    page.click('[data-action="block-confirm"]')
    expect(page.locator("#admin-rows")).to_contain_text("Zablokowana")
    page.goto(APP + "#/szukaj")
    page.wait_for_timeout(400)
    assert "Czytelnia cicha 2.14" not in page.locator("#results").text_content()
    step("V10 blokada sali → sala znika z wyszukiwarki")

    # Klawiatura – Esc zamyka okno, fokus wraca
    page.goto(APP + "#/rezerwacje")
    page.wait_for_timeout(200)
    page.locator('[data-action="cancel"]').first.focus()
    page.keyboard.press("Enter")
    expect(page.locator(".modal")).to_be_visible()
    page.keyboard.press("Escape")
    expect(page.locator(".modal")).to_have_count(0)
    assert page.evaluate("document.activeElement.dataset.action") == "cancel"
    step("Klawiatura: Enter otwiera okno, Esc zamyka, fokus wraca")

    print("\nbłędy JS:", errors or "brak")
    print(f"zaliczone kroki: {len(ok)}")
    b.close()
