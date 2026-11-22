# Projekt 3 – Miejscówka: specyfikacja i interaktywny projekt graficzny

**Temat:** webowa aplikacja uczelni do wyszukiwania, rezerwowania i meldowania się na miejscach do nauki
w bibliotece i salach kampusu (fikcyjna „Politechnika Miejska”).

- **Platforma:** aplikacja webowa, responsywna (RWD, PWA).
- **Minimalna rozdzielczość:** 360 × 640 px. Treść przelewa się bez przewijania w poziomie od 320 px.
- **Progi:** telefon 360–767 px, tablet 768–1199 px, desktop od 1200 px.
- **Widoki:** 10 (V01–V10).

## Co jest w folderze

| Plik / folder | Zawartość |
|---|---|
| `interaktywna/app.html` | **Interaktywny prototyp** – aplikacja z 10 widokami, działa po dwukrotnym kliknięciu |
| `interaktywna.zip` | Ten sam prototyp spakowany do oddania |
| `interaktywna/assets/miejscowka.css` | System projektowy: tokeny (kolory, typografia, odstępy) i komponenty – jedno źródło dla prototypu i przewodnika stylów |
| `interaktywna/assets/icons.js` | Własny zestaw ikon liniowych |
| `specyfikacja/specyfikacja.pdf` | **Specyfikacja** (A4, 39 stron, Times New Roman) |
| `specyfikacja/specyfikacja.docx` | Ta sama specyfikacja w wersji Word (edytowalna) |
| `specyfikacja/specyfikacja.html` | Ta sama specyfikacja w przeglądarce (z prawdziwymi komponentami w przewodniku stylów) |
| `specyfikacja/img/` | Wireframe'y i projekty wszystkich widoków (komputer, telefon), stany interaktywne, motyw ciemny |
| `testy/test_prototypu.py` | Automatyczny test prototypu: 17 kroków, które klikają kluczowe ścieżki |

## Jak otworzyć

1. Kliknij dwukrotnie `interaktywna/app.html`. Działa w Chrome, Edge i Firefox, bez internetu i bez serwera.
2. Zacznij od logowania i klikaj jak w prawdziwej aplikacji. Wersję na telefon zobaczysz, zwężając okno albo w trybie urządzeń przeglądarki (F12).
3. Specyfikację otwórz jako `specyfikacja/specyfikacja.pdf` (albo `.docx` w Wordzie).

## Zawartość specyfikacji (dokładnie punkty z wytycznych, w tej samej kolejności)

1. **Ogólny opis tematu projektu** – problem, rozwiązanie, użytkownicy, typ aplikacji, minimalna rozdzielczość, urządzenia, lista 10 widoków.
2. **Diagramy przepływu użytkowników** – F1 logowanie, F2 wyszukanie i rezerwacja, F3 meldowanie, F4 anulowanie, F5 blokada sali, stany rezerwacji.
3. **Diagramy nawigacji** – struktura aplikacji, przejścia między widokami, elementy nawigacji.
4. **Wireframes** – 10 widoków (komputer i telefon) z adnotacjami.
5. **Style Guide** – logo, kolorystyka (z kontrastami WCAG), typografia, ikonografia, siatka i odstępy, komponenty.
6. **Design aplikacji** – 10 widoków (komputer i telefon), stany elementów interaktywnych, motyw ciemny, obsługa prototypu.

> Przed oddaniem uzupełnij pole **Autor** na stronie tytułowej: najprościej w `specyfikacja.docx` (Word), wyszukaj tekst `[imię i nazwisko]`.
> Wersję PDF z Worda zapiszesz przez Plik → Zapisz jako → PDF.

## Test automatyczny (opcjonalnie)

```bat
pip install playwright
python testy/test_prototypu.py
```

Test przechodzi kluczowe ścieżki w zainstalowanej przeglądarce Chrome:
- walidacja logowania;
- filtry wyszukiwania;
- wybór budynku na mapie;
- wybór miejsca;
- potwierdzenie rezerwacji z plikiem .ics;
- limit rezerwacji;
- anulowanie z „Cofnij”;
- meldowanie kodem;
- motyw ciemny;
- blokada sali przez administratora;
- obsługa klawiaturą.
