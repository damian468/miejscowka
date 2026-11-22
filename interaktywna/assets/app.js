/* =====================================================================
   Miejscówka – logika interaktywnego prototypu (10 widoków).
   Wersja uproszczona: na każdym widoku tylko najważniejsze elementy.
   Czysty JavaScript, bez bibliotek: router oparty na adresie (#/...),
   stan w pamięci, delegacja zdarzeń, okna modalne, powiadomienia.
   ===================================================================== */
(function () {
  "use strict";                                                                  // tryb ścisły

  // ------------------------------------------------------------ skróty
  const D = window.MDATA;                                                        // dane przykładowe
  const icon = window.MICONS.icon;                                               // funkcja ikon
  const logo = window.MICONS.logo;                                               // logo aplikacji
  const ROOT = document.getElementById("app");                                   // kontener aplikacji
  const LOAD = Date.now();                                                       // moment otwarcia prototypu
  const params = new URLSearchParams(location.search);                           // parametry adresu (?wf=1 itd.)

  /** Escapowanie tekstu wstawianego do HTML. */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); // bezpieczny tekst
  /** Sala o identyfikatorze. */
  const roomById = (id) => D.ROOMS.find((r) => r.id === id);                     // wyszukanie sali
  /** Budynek o identyfikatorze. */
  const bld = (id) => D.BUILDINGS.find((b) => b.id === id);                      // wyszukanie budynku
  /** Bieżący czas prototypu (13:48 + czas od otwarcia). */
  const nowMs = () => D.NOW.getTime() + (Date.now() - LOAD);                     // „teraz” w prototypie

  // ------------------------------------------------------------ daty i godziny
  const DAYS = 5;                                                                // ile dni naprzód można rezerwować w prototypie
  const WEEKDAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];        // dni tygodnia
  const WEEKDAYS_SHORT = ["nd", "pn", "wt", "śr", "czw", "pt", "sob"];                                     // skróty dni
  const MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"]; // miesiące (dopełniacz)
  const MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"]; // skróty miesięcy

  /** Data dnia przesuniętego względem dziś. */
  function dayDate(offset) {
    const d = new Date(D.NOW);                                                   // kopia daty „teraz”
    d.setDate(d.getDate() + offset);                                             // przesunięcie o dni
    return d;                                                                    // wynik
  }
  /** Nazwa dnia: Dziś / Jutro / Wczoraj / „czw, 20 lis”. */
  function dayLabel(offset) {
    if (offset === 0) return "Dziś";                                             // dziś
    if (offset === 1) return "Jutro";                                            // jutro
    if (offset === -1) return "Wczoraj";                                         // wczoraj
    const d = dayDate(offset);                                                   // data
    return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; // zapis skrócony
  }
  /** Pełna data, np. „wtorek, 18 listopada”. */
  function longDate(offset) {
    const d = dayDate(offset);                                                   // data
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;    // zapis pełny
  }
  /** Zakres godzin slotów, np. „14:00–16:00”. */
  const range = (from, to) => `${D.slotTime(from)}–${D.slotTime(to)}`;           // zakres godzin
  /** Czas trwania w godzinach, np. „2 h” lub „1,5 h”. */
  const hours = (from, to) => `${String((to - from) / 2).replace(".", ",")} h`;  // długość
  /** Data i godzina początku slotu. */
  function slotDate(day, slot) {
    const d = dayDate(day);                                                      // dzień
    const minutes = D.OPEN_HOUR * 60 + slot * 30;                                // minuty od północy
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);                    // godzina slotu
    return d;                                                                    // wynik
  }
  /** Odliczanie w formacie mm:ss lub g:mm:ss. */
  function clock(ms) {
    const total = Math.max(0, Math.round(ms / 1000));                            // sekundy (nie mniej niż 0)
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60; // rozkład
    const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");      // dopełnienie zer
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;                               // zapis
  }
  /** Pierwszy slot, który jeszcze się nie zaczął (dla dzisiejszego dnia). */
  const firstFreeSlot = (day) => (day === 0 ? D.NOW_SLOT + 1 : 0);              // dziś od najbliższego pełnego/połówkowego

  // ------------------------------------------------------------ stan aplikacji
  const saved = (() => { try { return JSON.parse(localStorage.getItem("miejscowka.settings") || "{}"); } catch { return {}; } })(); // zapisane ustawienia (o ile przeglądarka pozwala)
  const state = {
    role: params.get("role") === "admin" ? "admin" : "student",                  // rola (demo)
    reservations: D.RESERVATIONS.map((r) => ({ ...r, seats: [...r.seats], people: [...r.people] })), // kopia rezerwacji
    roomStatus: {},                                                              // blokady sal (panel administratora)
    search: { day: 0, from: 14, to: 18, people: 1, building: "all", amen: [], groupOnly: false }, // filtry wyszukiwania
    mapBuilding: "BG",                                                           // mapa: wybrany budynek
    sel: null,                                                                   // wybór na planie sali
    wizard: null,                                                                // potwierdzenie rezerwacji
    resTab: "upcoming",                                                          // zakładka „Moje rezerwacje”
    adminBuilding: "BG",                                                         // filtr budynku w panelu administratora (domyślnie budynek administratora)
    settings: Object.assign({ theme: "light", remind: true, weekly: false }, saved), // ustawienia
  };
  if (params.get("theme")) state.settings.theme = params.get("theme");           // motyw z adresu (zrzuty ekranu)

  /** Zapis ustawień w przeglądarce (bezpiecznie – może być niedostępny). */
  function saveSettings() {
    try { localStorage.setItem("miejscowka.settings", JSON.stringify(state.settings)); } catch { /* brak dostępu – ignorujemy */ } // zapis
  }
  /** Zastosowanie motywu (jasny / ciemny / systemowy). */
  function applySettings() {
    const s = state.settings;                                                    // skrót
    const dark = s.theme === "dark" || (s.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches); // czy ciemny
    document.documentElement.dataset.theme = dark ? "dark" : "light";            // motyw
  }

  // ------------------------------------------------------------ rezerwacje i dostępność
  const ACTIVE = ["pending", "confirmed", "active"];                             // statusy „w toku”
  /** Miejsca sali z nałożonymi rezerwacjami użytkownika. */
  function seatsFor(room, day) {
    const list = D.seats(room, day);                                             // miejsca z danych
    state.reservations.filter((r) => r.room === room.id && r.day === day && ACTIVE.includes(r.status)).forEach((r) => { // rezerwacje użytkownika
      const targets = room.mode === "room" ? list : list.filter((s) => r.seats.includes(s.n)); // cała sala lub wybrane miejsca
      targets.forEach((s) => { for (let k = r.from; k < r.to; k++) s.busy[k] = "mine"; }); // oznaczenie jako „Twoje”
    });
    return list;                                                                 // wynik
  }
  /** Czy sala jest zablokowana przez administratora. */
  const blocked = (roomId) => state.roomStatus[roomId] === "blocked";            // blokada
  /** Rezerwacja o identyfikatorze. */
  const resById = (id) => state.reservations.find((r) => r.id === id);           // wyszukanie
  /** Termin meldowania (koniec okna: start + 15 min). */
  const checkinDeadline = (r) => slotDate(r.day, r.from).getTime() + 15 * 60000; // koniec meldowania
  /** Opis statusu rezerwacji: [tekst, wariant odznaki]. */
  function statusInfo(r) {
    return ({
      pending: ["Czeka na meldowanie", "warning"],                               // oczekuje
      confirmed: ["Potwierdzona", "info"],                                       // potwierdzona
      active: ["Trwa – zameldowano", "success"],                                 // aktywna
      done: ["Zakończona", "neutral"],                                           // zakończona
      noshow: ["Nieobecność", "danger"],                                         // nieobecność
      cancelled: ["Anulowana", "neutral"],                                       // anulowana
    })[r.status];                                                                // wynik
  }
  /** Opis miejsca rezerwacji: „miejsce 12” / „cała sala · 4 os.”. */
  function seatText(r) {
    const room = roomById(r.room);                                               // sala
    if (room.mode === "room") return `cała sala · ${r.count || r.people.length + 1} os.`; // pokój grupowy
    return `miejsce ${r.seats[0]}`;                                              // pojedyncze miejsce
  }

  // ------------------------------------------------------------ elementy wspólne
  /** Odznaka statusu. */
  const badge = (text, variant = "neutral", plain = false) => `<span class="badge badge--${variant}${plain ? " badge--plain" : ""}">${esc(text)}</span>`; // odznaka
  /** Kolor i opis obłożenia (0–1). */
  function occInfo(load) {
    if (load < 0.5) return { color: "var(--occ-low)", text: "Niskie" };          // niskie
    if (load < 0.8) return { color: "var(--occ-mid)", text: "Średnie" };         // średnie
    return { color: "var(--occ-high)", text: "Wysokie" };                         // wysokie
  }
  /** Pasek obłożenia z opisem dla czytników ekranu. */
  const occBar = (load) => `<div class="bar" role="img" aria-label="Obłożenie ${Math.round(load * 100)}%, ${occInfo(load).text.toLowerCase()}"><div class="bar__fill" style="width:${Math.round(load * 100)}%;background:${occInfo(load).color}"></div></div>`; // pasek
  /** Numer adnotacji makiety (widoczny tylko w trybie wireframe). */
  const note = (n) => `<span class="wf-note" aria-hidden="true">${n}</span>`;    // znacznik adnotacji
  /** Ilustracja stanu pustego. */
  const emptyArt = () => `<svg class="empty__art ph-cross" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="var(--c-primary-tint)"/><rect x="34" y="62" width="52" height="10" rx="5" fill="var(--c-primary-tint-2)"/><rect x="40" y="72" width="6" height="18" rx="3" fill="var(--c-primary-tint-2)"/><rect x="74" y="72" width="6" height="18" rx="3" fill="var(--c-primary-tint-2)"/><circle cx="66" cy="44" r="14" fill="none" stroke="currentColor" stroke-width="5"/><path d="m76 54 12 12" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>`; // lupa nad stołem

  // Adnotacje makiet (tryb wireframe) – te same treści są w specyfikacji
  const NOTES = {
    V01: ["Logowanie kontem uczelnianym (SSO) – akcja główna, jedno kliknięcie.", "Logowanie e-mailem dla gości – akcja drugorzędna.", "Walidacja pól – komunikat błędu pod polem."],
    V02: ["Najbliższa rezerwacja z odliczaniem i przyciskiem meldowania.", "Szybkie wyszukiwanie – gotowe filtry, jedno kliknięcie do wyników.", "Obłożenie budynków teraz – kolor, procent i opis słowny."],
    V03: ["Filtry: termin, budynek, udogodnienia – wyniki aktualizują się od razu.", "Liczba wyników (ogłaszana czytnikom ekranu).", "Karta sali: budynek, piętro i liczba wolnych miejsc."],
    V04: ["Przełącznik Lista / Mapa – te same filtry.", "Mapa kampusu – kolor budynku oznacza obłożenie.", "Panel wybranego budynku z listą sal."],
    V05: ["Wybór dnia i godziny na osi czasu (sloty po 30 min).", "Plan sali – miejsca jako przyciski: wolne / zajęte / wybrane.", "Podsumowanie wyboru i przycisk rezerwacji (na telefonie pasek u dołu)."],
    V06: ["Podsumowanie rezerwacji z możliwością zmiany.", "Wybór przypomnienia.", "Akceptacja zasad meldowania przed potwierdzeniem."],
    V07: ["Zakładki: nadchodzące / historia.", "Karta rezerwacji z akcjami: szczegóły, meldowanie, anulowanie (z cofnięciem)."],
    V08: ["Status z odliczaniem do końca meldowania.", "Kod QR i meldowanie: skan kodu na stanowisku lub wpisanie kodu.", "Anulowanie rezerwacji."],
    V09: ["Ustawienia powiadomień i motywu – zapis natychmiastowy.", "Dane konta z systemu uczelni – tylko do odczytu.", "Przełącznik roli – tylko w prototypie."],
    V10: ["Wskaźniki dnia: obłożenie, rezerwacje, nieobecności.", "Tabela sal z filtrem budynku.", "Blokada i odblokowanie sali."],
  };
  /** Legenda adnotacji makiety (widoczna tylko w trybie wireframe). */
  const wfLegend = (id) => `<section class="card wf-legend" aria-hidden="true"><h3>Adnotacje – ${id}</h3><ol class="stack" style="--gap:6px;margin:12px 0 0;padding-left:20px">${NOTES[id].map((t) => `<li>${esc(t)}</li>`).join("")}</ol></section>`; // lista adnotacji

  // ------------------------------------------------------------ trasy (10 widoków)
  const ROUTES = [
    { id: "V01", re: /^\/logowanie$/, title: "Logowanie", bare: true, view: vLogin },                       // 1. logowanie
    { id: "V02", re: /^\/pulpit$/, title: "Pulpit", nav: "pulpit", view: vDashboard },                      // 2. pulpit
    { id: "V03", re: /^\/szukaj$/, title: "Znajdź miejsce", nav: "szukaj", view: vSearch },                 // 3. wyszukiwarka
    { id: "V04", re: /^\/mapa(?:\/(\w+))?$/, title: "Mapa kampusu", nav: "mapa", view: vMap },             // 4. mapa
    { id: "V05", re: /^\/sala\/([\w-]+)$/, title: "Plan sali", nav: "szukaj", view: vRoom },                // 5. plan sali
    { id: "V06", re: /^\/rezerwacja$/, title: "Nowa rezerwacja", nav: "szukaj", view: vWizard },            // 6. potwierdzenie rezerwacji
    { id: "V07", re: /^\/rezerwacje$/, title: "Moje rezerwacje", nav: "rezerwacje", view: vReservations },  // 7. moje rezerwacje
    { id: "V08", re: /^\/rezerwacje\/([\w-]+)$/, title: "Szczegóły rezerwacji", nav: "rezerwacje", view: vDetails }, // 8. szczegóły i meldowanie
    { id: "V09", re: /^\/profil$/, title: "Profil i ustawienia", nav: "profil", view: vProfile },           // 9. profil
    { id: "V10", re: /^\/admin$/, title: "Panel administratora", nav: "admin", view: vAdmin },              // 10. panel administratora
  ];
  // Pozycje nawigacji głównej
  const NAV = [
    { key: "pulpit", path: "/pulpit", label: "Pulpit", icon: "home" },                                   // pulpit
    { key: "szukaj", path: "/szukaj", label: "Szukaj", icon: "search" },                                 // wyszukiwarka
    { key: "mapa", path: "/mapa", label: "Mapa", icon: "map" },                                          // mapa
    { key: "rezerwacje", path: "/rezerwacje", label: "Rezerwacje", icon: "calendar" },                   // rezerwacje
    { key: "profil", path: "/profil", label: "Profil", icon: "user" },                                   // profil
  ];
  const ADMIN_NAV = { key: "admin", path: "/admin", label: "Panel admina", icon: "shield" };             // dodatkowa pozycja administratora

  let current = null;                                                            // bieżąca trasa

  /** Przejście do ścieżki. */
  const go = (path) => { location.hash = "#" + path; };                          // zmiana adresu uruchamia router

  /** Router: dopasowanie adresu i narysowanie widoku. */
  function render(focus = true) {
    const path = location.hash.replace(/^#/, "") || "/logowanie";                // ścieżka (domyślnie logowanie)
    let match = null, route = ROUTES.find((r) => (match = path.match(r.re)));    // dopasowanie trasy
    if (!route) { go("/pulpit"); return; }                                       // nieznana ścieżka – pulpit
    closePopover();                                                              // zamknięcie menu
    current = route;                                                             // zapamiętanie trasy
    const view = route.view(...match.slice(1));                                  // zbudowanie widoku
    const title = view.title || route.title;                                     // tytuł (może zależeć od danych)
    document.title = `${title} – Miejscówka`;                                    // tytuł karty przeglądarki
    ROOT.innerHTML = route.bare ? view.html + wfLegend(route.id) : shell(route, view, title); // wstawienie widoku
    if (view.mount) view.mount();                                                // podpięcie logiki widoku
    tickCountdowns();                                                            // pierwsze odliczanie
    window.scrollTo(0, 0);                                                       // na górę strony
    if (focus) document.querySelector("#main h1, h1")?.focus({ preventScroll: true }); // fokus na tytuł (czytniki ekranu)
    parent.postMessage({ type: "mk-route", id: route.id, path, title }, "*");    // informacja dla przeglądarki prototypu
  }

  /** Szkielet aplikacji: menu boczne, górny pasek, dolna nawigacja. */
  function shell(route, view, title) {
    const nav = state.role === "admin" ? [...NAV, ADMIN_NAV] : NAV;              // pozycje menu zależne od roli
    const navLink = (n, cls) => `<a class="${cls}" href="#${n.path}" ${route.nav === n.key ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span></a>`; // link nawigacji
    const crumbs = (view.crumbs || [[title]]).map(([label, path], i, all) => i < all.length - 1 && path ? `<a href="#${path}">${esc(label)}</a>${icon("chevronRight", "icon--sm")}` : `<span aria-current="page">${esc(label)}</span>`).join(""); // okruszki
    return `
      <a class="skip-link" href="#main">Przejdź do treści</a>
      <div class="shell">
        <aside class="sidebar" aria-label="Menu boczne">
          <a class="brand" href="#/pulpit" aria-label="Miejscówka – pulpit">${logo(36)}<span class="brand__text"><span class="brand__name">Miejscówka</span><span class="brand__sub">Politechnika Miejska</span></span></a>
          <nav class="stack" style="--gap:4px" aria-label="Nawigacja główna">${nav.map((n) => navLink(n, "nav-item")).join("")}</nav>
          <div class="sidebar__footer">
            <button class="user-chip" data-action="user-menu" aria-haspopup="menu" aria-expanded="false">
              <span class="avatar">${D.USER.initials}</span>
              <span class="user-chip__text"><strong style="display:block;font-size:14px">${D.USER.first} ${D.USER.last}</strong><span class="subtle">${state.role === "admin" ? "Administrator" : "Studentka"}</span></span>
            </button>
          </div>
        </aside>
        <div class="main">
          <header class="topbar">
            <a class="only-mobile" href="#/pulpit" aria-label="Pulpit">${logo(32)}</a>
            <nav class="breadcrumbs grow" aria-label="Okruszki">${crumbs}</nav>
            <span class="topbar__title only-mobile grow">${esc(title)}</span>
            <button class="icon-btn only-mobile" data-action="user-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Menu konta"><span class="avatar avatar--sm">${D.USER.initials}</span></button>
          </header>
          <main id="main" class="page" tabindex="-1">${view.html}${wfLegend(route.id)}</main>
        </div>
      </div>
      <nav class="bottom-nav" aria-label="Nawigacja główna">${NAV.map((n) => navLink(n, "")).join("")}</nav>
      <div class="grid-overlay" aria-hidden="true"><div class="grid-overlay__inner">${"<i></i>".repeat(12)}</div></div>`; // dolna nawigacja i nakładka siatki
  }

  // ============================================================ V01 Logowanie
  function vLogin() {
    return {
      html: `
      <div class="login">
        <section class="login__art" aria-label="O aplikacji">
          <div class="row" style="--gap:14px">${logo(44)}<div><div class="brand__name" style="font-size:22px">Miejscówka</div><div style="opacity:.8;font-size:14px">Politechnika Miejska</div></div></div>
          <div class="stack" style="--gap:16px">
            <h1 tabindex="-1">Znajdź miejsce do nauki w kilka sekund.</h1>
            <p style="max-width:40ch;font-size:18px;opacity:.9">Sprawdzaj wolne miejsca na kampusie, rezerwuj i melduj się kodem QR.</p>
          </div>
        </section>
        <section class="login__form">
          <div class="login__box stack" style="--gap:22px">
            <div class="stack" style="--gap:6px"><h2>Zaloguj się</h2><p class="muted">Użyj konta uczelnianego – tego samego, co do poczty.</p></div>
            <button class="btn btn--primary btn--lg btn--block" data-action="login-sso">${icon("shield")} Zaloguj kontem uczelnianym ${note(1)}</button>
            <div class="divider">lub e-mail ${note(2)}</div>
            <form class="stack" data-submit="login" novalidate>
              <div class="field">
                <label class="label" for="email">Adres e-mail ${note(3)}</label>
                <div class="input-group">${icon("mail")}<input class="input" id="email" type="email" autocomplete="email" placeholder="imie.nazwisko@pmiejska.edu.pl" aria-describedby="email-err" data-blur="validate-email"></div>
                <div id="email-err" class="error-text" hidden></div>
              </div>
              <div class="field">
                <label class="label" for="pass">Hasło</label>
                <div class="input-group">${icon("lock")}<input class="input" id="pass" type="password" autocomplete="current-password" placeholder="Minimum 8 znaków" aria-describedby="pass-err" style="padding-right:48px"><button type="button" class="icon-btn" data-action="toggle-pass" aria-label="Pokaż hasło" aria-pressed="false" style="position:absolute;right:0;top:0">${icon("eye")}</button></div>
                <div id="pass-err" class="error-text" hidden></div>
              </div>
              <button class="btn btn--secondary btn--block" type="submit">Zaloguj się</button>
            </form>
          </div>
        </section>
      </div>`,
    };
  }

  // ============================================================ V02 Pulpit
  function vDashboard() {
    const next = state.reservations.filter((r) => ACTIVE.includes(r.status)).sort((a, b) => a.day - b.day || a.from - b.from); // nadchodzące
    const first = next[0];                                                       // najbliższa rezerwacja
    const nextCard = first ? (() => {
      const room = roomById(first.room), b = bld(room.b), [st, variant] = statusInfo(first); // dane rezerwacji
      const pending = first.status === "pending";                                // czy czeka na meldowanie
      return `
      <section class="card card--tint span-8" aria-labelledby="next-h">
        <div class="card__header"><div class="stack" style="--gap:4px"><span class="overline">Najbliższa rezerwacja ${note(1)}</span><h2 id="next-h">${esc(room.name)}</h2></div>${badge(st, variant)}</div>
        <div class="row" style="--gap:10px 24px;margin-bottom:20px">
          <span class="row" style="--gap:6px">${icon("calendar", "icon--sm")} ${dayLabel(first.day)}, <strong class="tabular">${range(first.from, first.to)}</strong></span>
          <span class="row" style="--gap:6px">${icon("building", "icon--sm")} ${esc(b.name)}, piętro ${room.floor}</span>
          <span class="row" style="--gap:6px">${icon("pin", "icon--sm")} ${seatText(first)}</span>
        </div>
        ${pending ? `<p class="row" style="--gap:10px;padding:14px 16px;border-radius:12px;background:var(--c-surface);margin-bottom:20px">${icon("timer", "", "")}<span>Zamelduj się w ciągu <strong class="tabular" data-countdown="${checkinDeadline(first)}">27:00</strong>.</span></p>` : ""}
        <div class="row">
          ${pending ? `<button class="btn btn--primary" data-action="checkin" data-id="${first.id}">${icon("qr")} Zamelduj się</button>` : ""}
          <a class="btn btn--secondary" href="#/rezerwacje/${first.id}">Szczegóły</a>
        </div>
      </section>`;
    })() : `<section class="card span-8"><div class="empty">${emptyArt()}<h3>Nie masz nadchodzących rezerwacji</h3><a class="btn btn--primary" href="#/szukaj">Znajdź miejsce</a></div></section>`; // brak rezerwacji
    return {
      title: "Pulpit",
      html: `
      <div class="page-header"><div><h1 tabindex="-1">Dzień dobry, ${D.USER.first}</h1><p>${longDate(0)}</p></div></div>
      <div class="grid">
        ${nextCard}
        <section class="card span-4 t-span-8" aria-labelledby="qs-h">
          <h3 id="qs-h" style="margin-bottom:14px">Szybkie wyszukiwanie ${note(2)}</h3>
          <div class="stack" style="--gap:10px">
            <button class="btn btn--secondary btn--block" style="justify-content:flex-start" data-action="quick" data-preset="now">${icon("clock")} Teraz, na 2 h</button>
            <button class="btn btn--secondary btn--block" style="justify-content:flex-start" data-action="quick" data-preset="quiet">${icon("quiet")} Strefa ciszy</button>
            <button class="btn btn--secondary btn--block" style="justify-content:flex-start" data-action="quick" data-preset="group">${icon("users")} Pokój dla 4 osób</button>
          </div>
        </section>
        <section class="card span-12" aria-labelledby="occ-h">
          <div class="card__header"><h3 id="occ-h">Obłożenie budynków teraz ${note(3)}</h3><a class="subtle" href="#/mapa">Mapa</a></div>
          <ul class="stack" style="--gap:14px;list-style:none;margin:0;padding:0">${D.BUILDINGS.map((b) => { const load = D.buildingLoad(b.id); return `<li><a href="#/mapa/${b.id}" style="color:inherit;text-decoration:none;display:block"><div class="row row--between" style="margin-bottom:6px"><strong>${b.name}</strong><span class="tabular" style="font-weight:650">${Math.round(load * 100)}% <span class="subtle">${occInfo(load).text}</span></span></div>${occBar(load)}</a></li>`; }).join("")}</ul>
        </section>
      </div>`,
    };
  }

  // ============================================================ V03 Wyszukiwarka
  const FILTER_AMEN = ["quiet", "plug", "accessible"];                           // udogodnienia dostępne w filtrach
  /** Wyniki wyszukiwania dla bieżących filtrów. */
  function searchResults() {
    const s = state.search;                                                      // filtry
    return D.ROOMS
      .filter((r) => !blocked(r.id))                                             // bez sal zablokowanych
      .filter((r) => s.building === "all" || r.b === s.building)                 // budynek
      .filter((r) => s.amen.every((a) => r.amen.includes(a)))                    // udogodnienia
      .filter((r) => !s.groupOnly || r.mode === "room")                          // tylko pokoje grupowe
      .filter((r) => r.mode === "seats" || D.capacity(r) >= Math.max(2, s.people)) // pojemność pokoju
      .map((r) => ({ r, free: D.freeCount(r, s.day, s.from, s.to) }))            // wolne w zakresie
      .filter((x) => (x.r.mode === "room" ? x.free === 1 : x.free >= s.people))  // dość miejsc
      .sort((a, b) => (b.r.mode === "room" ? D.capacity(b.r) : b.free) - (a.r.mode === "room" ? D.capacity(a.r) : a.free)); // najwięcej wolnych na górze
  }
  /** Karta wyniku wyszukiwania. */
  function resultCard({ r, free }) {
    const b = bld(r.b);                                                          // budynek
    return `<li><a class="card card--link" href="#/sala/${r.id}" data-action="open-room" data-room="${r.id}" aria-label="${esc(r.name)}, ${b.name}, ${r.mode === "room" ? "sala wolna" : `${free} wolnych miejsc`}">
      <div class="result">
        <div class="stack" style="--gap:6px;min-width:0">
          <div class="row" style="--gap:8px"><h3 style="font-size:18px">${esc(r.name)}</h3>${r.mode === "room" ? badge("Pokój grupowy", "info", true) : ""}</div>
          <div class="result__meta"><span>${icon("building", "icon--sm")} ${b.name}</span><span>${icon("layers", "icon--sm")} piętro ${r.floor}</span></div>
        </div>
        <div class="result__free">${r.mode === "room" ? `<strong style="color:var(--c-success)">${D.capacity(r)} os.</strong><span class="subtle">wolna sala</span>` : `<strong style="color:var(--c-success)">${free}</strong><span class="subtle">wolnych miejsc</span>`}</div>
      </div>
    </a></li>`;                                                                  // karta
  }
  /** Lista wyników (odświeżana bez przebudowy całego widoku). */
  function resultsHtml() {
    const list = searchResults(), s = state.search;                              // wyniki
    const head = `${list.length} ${list.length === 1 ? "sala" : list.length < 5 && list.length > 0 ? "sale" : "sal"} · ${dayLabel(s.day)}, ${range(s.from, s.to)}`; // podsumowanie
    if (!list.length) return { head, html: `<div class="card"><div class="empty">${emptyArt()}<h3>Brak wolnych miejsc dla tych filtrów</h3><p>Zmień godzinę albo usuń część filtrów.</p><button class="btn btn--primary" data-action="clear-filters">Wyczyść filtry</button></div></div>` }; // stan pusty
    return { head, html: `<ul class="stack" style="--gap:12px;list-style:none;margin:0;padding:0">${list.map(resultCard).join("")}</ul>` }; // lista
  }
  /** Opcje godzin dla pól „Od” / „Do”. */
  function timeOptions(from, to, selected) {
    let html = "";                                                               // kod opcji
    for (let s = from; s <= to; s++) html += `<option value="${s}" ${s === selected ? "selected" : ""}>${D.slotTime(s)}</option>`; // opcja
    return html;                                                                 // wynik
  }
  /** Panel filtrów. */
  function filtersHtml() {
    const s = state.search;                                                      // filtry
    return `
    <form class="card filters stack" style="--gap:18px" aria-labelledby="flt-h" data-submit="noop">
      <div class="row row--between"><h2 id="flt-h" class="row" style="--gap:8px;font-size:18px">${icon("filter")} Filtry</h2><button type="button" class="btn btn--ghost btn--sm" data-action="clear-filters">Wyczyść</button></div>
      <div class="field"><label class="label" for="f-day">Dzień</label><select class="select" id="f-day" data-change="search" data-key="day">${Array.from({ length: DAYS }, (_, d) => `<option value="${d}" ${d === s.day ? "selected" : ""}>${dayLabel(d)}</option>`).join("")}</select></div>
      <div class="row row--nowrap" style="--gap:12px">
        <div class="field grow"><label class="label" for="f-from">Od</label><select class="select" id="f-from" data-change="search" data-key="from">${timeOptions(firstFreeSlot(s.day), D.SLOTS - 1, s.from)}</select></div>
        <div class="field grow"><label class="label" for="f-to">Do</label><select class="select" id="f-to" data-change="search" data-key="to">${timeOptions(s.from + 1, Math.min(D.SLOTS, s.from + 8), s.to)}</select></div>
      </div>
      <div class="field"><label class="label" for="f-b">Budynek</label><select class="select" id="f-b" data-change="search" data-key="building"><option value="all">Wszystkie budynki</option>${D.BUILDINGS.map((b) => `<option value="${b.id}" ${s.building === b.id ? "selected" : ""}>${b.name}</option>`).join("")}</select></div>
      <fieldset style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:10px">Udogodnienia</legend><div class="row" style="--gap:8px">${FILTER_AMEN.map((a) => `<button type="button" class="chip" data-action="amen" data-amen="${a}" aria-pressed="${s.amen.includes(a)}"><span class="chip__check">${icon("check", "icon--sm")}</span>${icon(D.AMENITIES[a].icon, "icon--sm")} ${D.AMENITIES[a].label}</button>`).join("")}</div></fieldset>
      <button type="button" class="switch" role="switch" aria-checked="${s.groupOnly}" data-action="group-only"><span class="switch__track"></span><span>Tylko pokoje grupowe</span></button>
    </form>`;                                                                    // formularz filtrów
  }
  /** Przełącznik Lista / Mapa (wspólny dla V03 i V04). */
  const viewSwitch = (map) => `<div class="segmented" role="group" aria-label="Widok wyników"><button aria-pressed="${!map}" ${map ? 'data-action="nav" data-path="/szukaj"' : ""}>${icon("list", "icon--sm")} Lista</button><button aria-pressed="${map}" ${map ? "" : 'data-action="nav" data-path="/mapa"'}>${icon("map", "icon--sm")} Mapa</button></div>`; // przełącznik
  function vSearch() {
    const r = resultsHtml();                                                     // wyniki
    return {
      title: "Znajdź miejsce",
      html: `
      <div class="page-header"><div><h1 tabindex="-1">Znajdź miejsce</h1><p>Wolne miejsca w wybranym terminie.</p></div>${viewSwitch(false)}</div>
      <div class="grid">
        <div class="span-4 t-span-8">${filtersHtml()}${note(1)}</div>
        <section class="span-8 stack" style="--gap:14px" aria-labelledby="res-h">
          <h2 id="res-h" class="sr-only">Wyniki</h2><p id="results-count" aria-live="polite" style="font-weight:600">${r.head} ${note(2)}</p>
          <div id="results">${r.html}</div>${note(3)}
        </section>
      </div>`,
    };
  }
  /** Odświeżenie wyników po zmianie filtrów – z krótkim szkieletem ładowania. */
  function refreshResults(withFilters = false) {
    if (withFilters) { const box = document.querySelector(".filters"); if (box) box.outerHTML = filtersHtml(); } // przebudowa filtrów (np. zakres godzin)
    const target = document.getElementById("results");                          // kontener wyników
    if (!target) return;                                                         // widok zmieniony
    target.innerHTML = `<div class="stack" style="--gap:12px" aria-hidden="true">${'<div class="skeleton" style="height:96px"></div>'.repeat(3)}</div>`; // szkielet
    const r = resultsHtml();                                                     // nowe wyniki
    document.getElementById("results-count").textContent = r.head;              // licznik (ogłaszany czytnikom)
    setTimeout(() => { if (document.getElementById("results")) document.getElementById("results").innerHTML = r.html; }, 280); // podmiana po chwili
  }

  // ============================================================ V04 Mapa kampusu
  function mapSvg() {
    return `<svg viewBox="0 0 1000 640" role="group" aria-label="Mapa kampusu – wybierz budynek">
      <rect x="0" y="0" width="1000" height="640" fill="color-mix(in srgb, var(--occ-low) 9%, var(--c-surface))"/>
      <path d="M0 330 H1000 M560 0 V640 M0 60 H1000" stroke="var(--c-surface-2)" stroke-width="34" fill="none"/>
      ${D.BUILDINGS.map((bb) => { const load = D.buildingLoad(bb.id), o = occInfo(load); return `<g class="bld ${bb.id === state.mapBuilding ? "is-active" : ""}" tabindex="0" role="button" aria-label="${bb.name}, obłożenie ${Math.round(load * 100)}% (${o.text.toLowerCase()})" data-action="map-building" data-id="${bb.id}">
        <rect x="${bb.x}" y="${bb.y}" width="${bb.w}" height="${bb.h}" rx="14" fill="${o.color}" fill-opacity=".22" stroke="${o.color}" stroke-width="2.5"/>
        <text x="${bb.x + 16}" y="${bb.y + 34}" font-size="22" font-weight="750" fill="var(--c-text)" font-family="var(--font)">${bb.id}</text>
        <text x="${bb.x + 16}" y="${bb.y + 58}" font-size="14" fill="var(--c-text-muted)" font-family="var(--font)">${bb.name}</text>
        <rect x="${bb.x + 16}" y="${bb.y + bb.h - 44}" width="86" height="28" rx="14" fill="${o.color}"/>
        <text x="${bb.x + 59}" y="${bb.y + bb.h - 25}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" font-family="var(--font)">${Math.round(load * 100)}%</text></g>`; }).join("")}
    </svg>`;                                                                     // mapa
  }
  function mapPanel() {
    const b = bld(state.mapBuilding), load = D.buildingLoad(b.id), from = firstFreeSlot(0); // budynek i „od teraz”
    return `<div class="stack" style="--gap:16px">
      <div class="stack" style="--gap:4px"><span class="overline">Budynek ${b.id}</span><h2>${b.name}</h2><p class="muted">${b.address} · otwarte ${b.hours}</p></div>
      <div><div class="row row--between" style="margin-bottom:6px"><span>Obłożenie teraz</span><strong class="tabular">${Math.round(load * 100)}% · ${occInfo(load).text}</strong></div>${occBar(load)}</div>
      <ul class="stack" style="--gap:8px;list-style:none;margin:0;padding:0">${D.ROOMS.filter((r) => r.b === b.id).map((r) => { const free = D.freeCount(r, 0, from, from + 4); return `<li><a class="card card--link card--flat" style="padding:12px 14px" href="#/sala/${r.id}" data-action="open-room" data-room="${r.id}"><div class="row row--between row--nowrap"><div class="grow"><strong>${esc(r.name)}</strong><div class="subtle">piętro ${r.floor}${blocked(r.id) ? " · zablokowana" : ""}</div></div><span class="tabular" style="font-weight:700;color:${free ? "var(--c-success)" : "var(--c-text-subtle)"}">${r.mode === "room" ? (free ? "wolna" : "zajęta") : `${free} wolnych`}</span>${icon("chevronRight", "icon--sm")}</div></a></li>`; }).join("")}</ul>
    </div>`;                                                                     // panel budynku
  }
  function vMap(buildingId) {
    if (buildingId && bld(buildingId)) state.mapBuilding = buildingId;          // budynek z adresu
    return {
      title: "Mapa kampusu",
      html: `
      <div class="page-header"><div><h1 tabindex="-1">Mapa kampusu</h1><p>Wybierz budynek, aby zobaczyć sale.</p></div><div class="row" style="--gap:6px">${viewSwitch(true)}${note(1)}</div></div>
      <div class="grid">
        <section class="span-8 stack" style="--gap:12px" aria-label="Mapa">
          <div class="map" id="map">${mapSvg()}${note(2)}</div>
          <div class="legend" aria-label="Legenda obłożenia"><span><i style="width:14px;height:14px;border-radius:4px;background:var(--occ-low)"></i> Niskie (&lt; 50%)</span><span><i style="width:14px;height:14px;border-radius:4px;background:var(--occ-mid)"></i> Średnie (50–80%)</span><span><i style="width:14px;height:14px;border-radius:4px;background:var(--occ-high)"></i> Wysokie (&gt; 80%)</span></div>
        </section>
        <aside class="span-4 t-span-8 card" id="map-panel" aria-live="polite">${mapPanel()}${note(3)}</aside>
      </div>`,
    };
  }
  /** Odświeżenie mapy i panelu po wyborze budynku. */
  function refreshMap() {
    document.getElementById("map").firstElementChild.outerHTML = mapSvg();      // nowa mapa
    document.getElementById("map-panel").innerHTML = mapPanel();                 // nowy panel
  }

  // ============================================================ V05 Plan sali
  /** Ustawienie wyboru dla sali (z filtrów wyszukiwania). */
  function selectRoom(id) {
    if (state.sel && state.sel.roomId === id) return;                           // ta sama sala – zachowaj wybór
    const s = state.search, room = roomById(id);                                // filtry i sala
    state.sel = { roomId: id, day: s.day, from: Math.max(s.from, firstFreeSlot(s.day)), to: s.to, seats: [], people: room.mode === "room" ? Math.min(D.capacity(room), Math.max(2, s.people)) : 1 }; // nowy wybór
    if (state.sel.to <= state.sel.from) state.sel.to = Math.min(D.SLOTS, state.sel.from + 4); // poprawny zakres
  }
  /** Czy miejsce jest wolne w wybranym zakresie. */
  const seatFree = (seat, sel) => !seat.off && seat.busy.slice(sel.from, sel.to).every((b) => !b); // wolne
  /** Problem z bieżącym wyborem (albo null). */
  function selProblem() {
    const sel = state.sel, room = roomById(sel.roomId);                          // wybór i sala
    if (blocked(room.id)) return "Sala jest czasowo zablokowana przez administratora."; // blokada
    if (room.mode === "room") return seatsFor(room, sel.day).every((s) => seatFree(s, sel)) ? null : "Sala jest zajęta w tym czasie – wybierz inną godzinę."; // sala zajęta
    if (!sel.seats.length) return "Wybierz miejsce na planie sali.";             // brak miejsca
    return null;                                                                 // wszystko w porządku
  }
  function timelineHtml() {
    const sel = state.sel, room = roomById(sel.roomId);                          // wybór
    const usable = seatsFor(room, sel.day).filter((s) => !s.off);                // miejsca czynne
    let cells = "";                                                              // sloty
    for (let k = 0; k < D.SLOTS; k++) {
      const free = usable.filter((s) => !s.busy[k]).length / usable.length;     // udział wolnych
      const past = sel.day === 0 && k < firstFreeSlot(0);                        // slot minął
      const full = room.mode === "room" ? free < 1 : free === 0;                 // brak miejsc
      const inRange = k >= sel.from && k < sel.to;                               // w wybranym zakresie
      cells += `<button class="slot ${past ? "past" : full ? "full" : ""} ${inRange ? "in-range" : ""}" data-action="slot" data-slot="${k}" ${past ? "disabled" : ""} aria-label="${D.slotTime(k)}, ${past ? "minęło" : full ? "brak wolnych miejsc" : "dostępne"}" aria-pressed="${inRange}"></button>`; // slot
    }
    return `<div class="timeline-scroll"><div class="timeline-inner"><div class="timeline" role="group" aria-label="Oś czasu – wybierz godzinę rozpoczęcia">${cells}</div>
      <div class="timeline__labels" aria-hidden="true">${Array.from({ length: 16 }, (_, h) => `<span>${7 + h}</span>`).join("")}</div></div></div>`; // oś i etykiety przewijane razem
  }
  function planHtml() {
    const sel = state.sel, room = roomById(sel.roomId);                          // wybór
    const list = seatsFor(room, sel.day);                                        // miejsca
    if (room.mode === "room") {                                                  // pokój grupowy
      const free = list.every((s) => seatFree(s, sel));                          // czy wolny
      return `<div class="plan"><div class="plan__wall"><span>Okna</span><span>${esc(room.name)}</span></div><div class="plan__windows"></div>
        <div class="room-table"><div class="row" style="--gap:6px;justify-content:center">${Array.from({ length: D.capacity(room) }, (_, i) => `<span class="seat ${free ? (i < sel.people ? "seat--sel" : "") : "seat--busy"}" style="cursor:default" aria-hidden="true">${i + 1}</span>`).join("")}</div>
        <div style="width:min(420px,100%);height:56px;border-radius:12px;background:var(--c-border-strong);opacity:.6"></div>
        <p class="muted" style="text-align:center">${free ? `Rezerwujesz całą salę dla <strong>${sel.people}</strong> os. (maks. ${D.capacity(room)})` : "Sala jest zajęta w wybranym czasie"}</p>
        <div class="numstep" role="group" aria-label="Liczba osób"><button data-action="room-people" data-step="-1" aria-label="Mniej osób" ${sel.people <= 2 ? "disabled" : ""}>${icon("minus")}</button><output>${sel.people} os.</output><button data-action="room-people" data-step="1" aria-label="Więcej osób" ${sel.people >= D.capacity(room) ? "disabled" : ""}>${icon("plus")}</button></div></div>
        <div class="plan__wall" style="margin-top:16px"><span>${icon("door", "icon--sm")} Wejście</span><span></span></div></div>`; // plan pokoju
    }
    const tables = Array.from({ length: room.tables }, (_, t) => {
      const seats = list.slice(t * room.perTable, (t + 1) * room.perTable);       // miejsca przy stole
      const btn = (s) => {
        const free = seatFree(s, sel), mine = s.busy.slice(sel.from, sel.to).includes("mine"), chosen = sel.seats.includes(s.n); // stan miejsca
        const cls = chosen ? "seat--sel" : free ? "" : "seat--busy";            // klasa
        const status = chosen ? "wybrane" : mine ? "Twoja rezerwacja" : free ? "wolne" : "zajęte"; // opis
        return `<button class="seat ${cls}" data-action="seat" data-n="${s.n}" ${!free && !chosen ? "disabled" : ""} aria-pressed="${chosen}" aria-label="Miejsce ${s.n}, ${status}" title="Miejsce ${s.n} – ${status}">${mine && !chosen ? "Ty" : s.n}</button>`; // przycisk miejsca
      };
      const half = Math.ceil(seats.length / 2);                                  // miejsca po jednej stronie stołu
      return `<div class="ptable" style="--seats-row:${half}">${seats.slice(0, half).map(btn).join("")}<div class="ptable__top"></div>${seats.slice(half).map(btn).join("")}</div>`; // stół
    }).join("");
    return `<div class="plan"><div class="plan__wall"><span>Okna</span><span>${esc(room.name)}</span></div><div class="plan__windows"></div>
      <div class="plan__tables" style="--plan-cols:${room.planCols}">${tables}</div>
      <div class="plan__wall" style="margin-top:20px"><span>${icon("door", "icon--sm")} Wejście</span><span></span></div></div>`; // plan sali z miejscami
  }
  function summaryHtml() {
    const sel = state.sel, room = roomById(sel.roomId), b = bld(room.b), problem = selProblem(); // dane
    const what = room.mode === "room" ? `${sel.people} os. (cała sala)` : sel.seats.length ? `nr ${sel.seats[0]}` : "—"; // opis wyboru
    return `<div class="stack" style="--gap:14px">
      <div class="summary-details stack" style="--gap:4px"><span class="overline">Twój wybór</span><h3>${esc(room.name)}</h3><span class="subtle">${b.name}, piętro ${room.floor}</span></div>
      <dl class="stack summary-details" style="--gap:10px;margin:0">
        <div class="row row--between"><dt class="muted">Termin</dt><dd style="margin:0;font-weight:600">${dayLabel(sel.day)}</dd></div>
        <div class="row row--between"><dt class="muted">Godziny</dt><dd style="margin:0;font-weight:600" class="tabular">${range(sel.from, sel.to)}</dd></div>
        <div class="row row--between"><dt class="muted">${room.mode === "room" ? "Osoby" : "Miejsce"}</dt><dd style="margin:0;font-weight:600">${what}</dd></div>
      </dl>
      <div class="row row--between only-tablet-down"><strong>${room.mode === "room" ? `Cała sala · ${sel.people} os.` : sel.seats.length ? `Miejsce ${sel.seats[0]}` : "Wybierz miejsce"}</strong><span class="subtle tabular">${dayLabel(sel.day)}, ${range(sel.from, sel.to)}</span></div>
      <button class="btn btn--primary btn--block btn--lg" data-action="to-wizard" ${problem ? "disabled" : ""} aria-describedby="sel-problem">Zarezerwuj ${icon("arrowRight")}</button>
      <p id="sel-problem" class="${problem ? "error-text" : "hint"}">${problem ? `${icon("info", "icon--sm")} ${problem}` : "Zamelduj się najpóźniej 15 min po rozpoczęciu."}</p>
    </div>`;                                                                     // panel podsumowania
  }
  function vRoom(id) {
    const room = roomById(id);                                                   // sala
    if (!room) return { title: "Nie znaleziono", html: `<div class="card"><div class="empty">${emptyArt()}<h1 tabindex="-1">Nie znaleziono sali</h1><a class="btn btn--primary" href="#/szukaj">Wróć do wyszukiwania</a></div></div>` }; // brak sali
    selectRoom(id);                                                              // wybór dla sali
    const b = bld(room.b), sel = state.sel;                                      // dane
    return {
      title: room.name,
      crumbs: [["Szukaj", "/szukaj"], [room.name]],
      html: `
      ${blocked(id) ? `<div class="card" style="background:var(--c-danger-tint);border-color:transparent;margin-bottom:20px"><div class="row">${icon("alert")}<strong>Sala jest czasowo zablokowana. Rezerwacje są wstrzymane.</strong></div></div>` : ""}
      <div class="page-header"><div><span class="overline">${b.name} · piętro ${room.floor}</span><h1 tabindex="-1">${esc(room.name)}</h1><p>${room.mode === "room" ? `Pokój grupowy do ${D.capacity(room)} osób` : `${D.capacity(room)} miejsc`}</p></div></div>
      <div class="grid with-summary-bar">
        <div class="span-8 stack" style="--gap:20px">
          <section class="card" aria-labelledby="t-h">
            <div class="card__header"><h2 id="t-h" style="font-size:18px">1. Termin ${note(1)}</h2><span class="subtle">maks. 4 h</span></div>
            <div class="row" style="--gap:8px;margin-bottom:16px" role="group" aria-label="Dzień">${Array.from({ length: DAYS }, (_, d) => `<button class="chip" data-action="sel-day" data-day="${d}" aria-pressed="${d === sel.day}">${dayLabel(d)}</button>`).join("")}</div>
            <div id="timeline">${timelineHtml()}</div>
            <div class="row row--between" style="margin-top:16px">
              <p id="time-label" aria-live="polite"><strong class="tabular">${range(sel.from, sel.to)}</strong> <span class="muted">· ${hours(sel.from, sel.to)}</span></p>
              <div class="numstep" role="group" aria-label="Czas trwania"><button data-action="duration" data-step="-1" aria-label="Krócej o 30 minut">${icon("minus")}</button><output id="dur-out" class="tabular">${hours(sel.from, sel.to)}</output><button data-action="duration" data-step="1" aria-label="Dłużej o 30 minut">${icon("plus")}</button></div>
            </div>
          </section>
          <section class="card" aria-labelledby="p-h">
            <div class="card__header"><h2 id="p-h" style="font-size:18px">2. ${room.mode === "room" ? "Liczba osób" : "Miejsce"} ${note(2)}</h2></div>
            <div id="plan">${planHtml()}</div>
            ${room.mode === "seats" ? `<div class="legend" style="margin-top:14px" aria-label="Legenda miejsc"><span><i class="seat"></i> Wolne</span><span><i class="seat seat--busy"></i> Zajęte</span><span><i class="seat seat--sel"></i> Wybrane</span></div>` : ""}
          </section>
        </div>
        <aside class="span-4 t-span-8"><div class="card summary-panel" id="summary" aria-live="polite">${summaryHtml()}</div>${note(3)}</aside>
      </div>`,
      mount: scrollTimeline,                                                     // oś czasu przewinięta do wyboru
    };
  }
  /** Przewinięcie osi czasu tak, by wybrany zakres był widoczny (wąskie ekrany). */
  function scrollTimeline() {
    const box = document.querySelector(".timeline-scroll"), slot = document.querySelector(".slot.in-range"); // kontener i pierwszy wybrany slot
    if (box && slot) box.scrollLeft = slot.offsetLeft - box.clientWidth / 3;     // wybrany zakres w pierwszej trzeciej szerokości
  }
  /** Odświeżenie części planu po zmianie wyboru. */
  function refreshRoom() {
    const sel = state.sel;                                                       // wybór
    const keep = document.querySelector(".timeline-scroll")?.scrollLeft || 0;    // bieżące przewinięcie osi
    document.getElementById("timeline").innerHTML = timelineHtml();              // oś czasu
    document.querySelector(".timeline-scroll").scrollLeft = keep;                // zachowanie przewinięcia
    document.getElementById("plan").innerHTML = planHtml();                      // plan
    document.getElementById("summary").innerHTML = summaryHtml();                // podsumowanie
    document.getElementById("time-label").innerHTML = `<strong class="tabular">${range(sel.from, sel.to)}</strong> <span class="muted">· ${hours(sel.from, sel.to)}</span>`; // opis czasu
    document.getElementById("dur-out").textContent = hours(sel.from, sel.to);   // czas trwania
    document.querySelectorAll('[data-action="sel-day"]').forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.day === sel.day))); // dni
  }
  /** Usunięcie z wyboru miejsca zajętego w nowym terminie. */
  function dropBusySeats() {
    const sel = state.sel, room = roomById(sel.roomId);                          // wybór
    const list = seatsFor(room, sel.day);                                        // miejsca
    if (sel.seats.length && !seatFree(list[sel.seats[0] - 1], sel)) {            // wybrane miejsce zajęte w nowym terminie
      toast(`Miejsce ${sel.seats[0]} jest zajęte w nowym terminie – wybierz inne.`); // informacja
      sel.seats = [];                                                            // usunięcie z wyboru
    }
  }

  // ============================================================ V06 Potwierdzenie rezerwacji
  function wizardStart() {
    if (!state.sel || selProblem()) {                                            // brak poprawnego wyboru (np. wejście z adresu)
      state.sel = { roomId: "bg-214", day: 0, from: 18, to: 22, seats: [5], people: 1 }; // wybór przykładowy
    }
    state.wizard = { remind: "15", accepted: false, done: null, error: "" };     // nowe potwierdzenie
  }
  function vWizard() {
    if (!state.wizard) wizardStart();                                            // rozpoczęcie
    if (state.wizard.done) return wizardDone();                                  // ekran sukcesu (wybór jest już wyczyszczony)
    if (!state.sel) wizardStart();                                               // wejście z adresu po zakończonej rezerwacji
    const w = state.wizard, sel = state.sel, room = roomById(sel.roomId), b = bld(room.b); // dane
    return {
      title: "Nowa rezerwacja",
      crumbs: [["Szukaj", "/szukaj"], [room.name, `/sala/${room.id}`], ["Rezerwacja"]],
      html: `
      <div class="narrow">
        <div class="page-header"><div><h1 tabindex="-1">Potwierdź rezerwację</h1><p>Sprawdź dane i potwierdź.</p></div></div>
        <section class="card" aria-label="Rezerwacja">
          <div class="card card--flat" style="background:var(--c-surface-2)"><dl class="stack" style="--gap:12px;margin:0">
            <div class="row row--between"><dt class="muted">Sala ${note(1)}</dt><dd style="margin:0;font-weight:600;text-align:right">${esc(room.name)}<div class="subtle">${b.name}, piętro ${room.floor}</div></dd></div>
            <div class="row row--between"><dt class="muted">Termin</dt><dd style="margin:0;font-weight:600">${longDate(sel.day)}</dd></div>
            <div class="row row--between"><dt class="muted">Godziny</dt><dd style="margin:0;font-weight:600" class="tabular">${range(sel.from, sel.to)} · ${hours(sel.from, sel.to)}</dd></div>
            <div class="row row--between"><dt class="muted">${room.mode === "room" ? "Osoby" : "Miejsce"}</dt><dd style="margin:0;font-weight:600">${room.mode === "room" ? `cała sala, ${sel.people} os.` : `nr ${sel.seats[0]}`}</dd></div>
          </dl></div>
          <a class="btn btn--ghost btn--sm" style="margin-top:12px" href="#/sala/${room.id}">${icon("edit", "icon--sm")} Zmień termin lub miejsce</a>
          <div class="field" style="margin-top:20px"><label class="label" for="remind">Przypomnienie ${note(2)}</label><select class="select" id="remind" data-change="remind"><option value="15" ${w.remind === "15" ? "selected" : ""}>15 minut przed</option><option value="60" ${w.remind === "60" ? "selected" : ""}>1 godzinę przed</option><option value="0" ${w.remind === "0" ? "selected" : ""}>Bez przypomnienia</option></select></div>
          <label class="checkbox" style="margin-top:18px"><input type="checkbox" data-change="accept" ${w.accepted ? "checked" : ""} aria-describedby="accept-err"><span>Zamelduję się najpóźniej <strong>15 minut po rozpoczęciu</strong>, inaczej miejsce wróci do puli. ${note(3)}</span></label>
          ${w.error ? `<p id="accept-err" class="error-text" style="margin-top:10px">${icon("alert", "icon--sm")} ${w.error}</p>` : ""}
          <div class="row row--between" style="margin-top:28px;padding-top:20px;border-top:1px solid var(--c-border)">
            <a class="btn btn--secondary" href="#/sala/${room.id}">${icon("chevronLeft")} Wróć</a>
            <button class="btn btn--primary btn--lg" data-action="wz-confirm">${icon("check")} Potwierdź rezerwację</button>
          </div>
        </section>
      </div>`,
    };
  }
  function wizardDone() {
    const r = resById(state.wizard.done), room = roomById(r.room), b = bld(room.b); // utworzona rezerwacja
    return {
      title: "Zarezerwowano",
      crumbs: [["Moje rezerwacje", "/rezerwacje"], ["Potwierdzenie"]],
      html: `
      <section class="card" style="max-width:640px;margin:0 auto;text-align:center" aria-labelledby="ok-h">
        <div style="width:88px;height:88px;margin:8px auto 16px;border-radius:50%;display:grid;place-items:center;background:var(--c-success-tint);color:var(--c-success)">${icon("checkCircle", "", "")}</div>
        <h1 id="ok-h" tabindex="-1">Gotowe! Miejsce jest Twoje.</h1>
        <p class="muted" style="margin-top:8px">Kod rezerwacji <strong class="tabular">${r.id}</strong>.</p>
        <div class="card card--flat" style="background:var(--c-surface-2);margin:24px 0;text-align:left"><div class="row row--between"><div><strong>${esc(room.name)}</strong><div class="subtle">${b.name} · ${seatText(r)}</div></div><div style="text-align:right"><strong>${dayLabel(r.day)}</strong><div class="subtle tabular">${range(r.from, r.to)}</div></div></div></div>
        <div class="row" style="justify-content:center"><button class="btn btn--secondary" data-action="ics" data-id="${r.id}">${icon("calendarPlus")} Dodaj do kalendarza</button><a class="btn btn--primary" href="#/rezerwacje/${r.id}">Zobacz rezerwację ${icon("arrowRight")}</a></div>
      </section>`,
    };
  }

  // ============================================================ V07 Moje rezerwacje
  function resCard(r) {
    const room = roomById(r.room), b = bld(room.b), [st, variant] = statusInfo(r), d = dayDate(r.day); // dane
    const upcoming = ACTIVE.includes(r.status);                                  // czy nadchodząca
    return `<li class="card" style="padding:18px 20px">
      <div class="row row--nowrap" style="--gap:18px;align-items:flex-start">
        <div style="flex:none;width:64px;text-align:center;padding:8px 0;border-radius:12px;background:${upcoming ? "var(--c-primary-tint)" : "var(--c-surface-2)"};color:${upcoming ? "var(--c-primary)" : "var(--c-text-muted)"}"><div style="font-size:12px;font-weight:650;text-transform:uppercase">${WEEKDAYS_SHORT[d.getDay()]}</div><div style="font-size:26px;font-weight:750;line-height:1.1">${d.getDate()}</div><div style="font-size:12px">${MONTHS_SHORT[d.getMonth()]}</div></div>
        <div class="grow stack" style="--gap:6px">
          <div class="row row--between"><h3 style="font-size:18px">${esc(room.name)}</h3>${badge(st, variant)}</div>
          <div class="result__meta"><span>${icon("clock", "icon--sm")} <span class="tabular">${range(r.from, r.to)}</span></span><span>${icon("building", "icon--sm")} ${b.name}</span><span>${icon("pin", "icon--sm")} ${seatText(r)}</span></div>
          <div class="row" style="--gap:8px;margin-top:8px">
            <a class="btn btn--sm btn--secondary" href="#/rezerwacje/${r.id}">Szczegóły</a>
            ${r.status === "pending" ? `<button class="btn btn--sm btn--primary" data-action="checkin" data-id="${r.id}">${icon("qr", "icon--sm")} Zamelduj się</button>` : ""}
            ${upcoming && r.status !== "active" ? `<button class="btn btn--sm btn--ghost" style="color:var(--c-danger)" data-action="cancel" data-id="${r.id}">${icon("trash", "icon--sm")} Anuluj</button>` : ""}
          </div>
        </div>
      </div></li>`;                                                              // karta rezerwacji
  }
  function vReservations() {
    const groups = {
      upcoming: state.reservations.filter((r) => ACTIVE.includes(r.status)).sort((a, b) => a.day - b.day || a.from - b.from), // nadchodzące
      history: state.reservations.filter((r) => !ACTIVE.includes(r.status)).sort((a, b) => b.day - a.day), // historia (z anulowanymi)
    };
    const tabs = [["upcoming", "Nadchodzące"], ["history", "Historia"]];         // zakładki
    const list = groups[state.resTab];                                           // bieżąca lista
    return {
      title: "Moje rezerwacje",
      html: `
      <div class="narrow">
        <div class="page-header"><div><h1 tabindex="-1">Moje rezerwacje</h1></div><a class="btn btn--primary" href="#/szukaj">${icon("plus")} Nowa rezerwacja</a></div>
        <div class="stack" style="--gap:16px">
          <div class="tabs" role="tablist" aria-label="Rodzaj rezerwacji">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${state.resTab === k}" data-action="res-tab" data-tab="${k}">${l}<span class="count">${groups[k].length}</span></button>`).join("")}${note(1)}</div>
          <div role="tabpanel">${list.length ? `<ul class="stack" style="--gap:12px;list-style:none;margin:0;padding:0">${list.map(resCard).join("")}</ul>${note(2)}` : `<div class="card"><div class="empty">${emptyArt()}<h3>Nic tu jeszcze nie ma</h3>${state.resTab === "upcoming" ? '<a class="btn btn--primary" href="#/szukaj">Znajdź miejsce</a>' : ""}</div></div>`}</div>
        </div>
      </div>`,
    };
  }

  // ============================================================ V08 Szczegóły i meldowanie
  /** Pseudo-kod QR (wizualizacja) z wzorami pozycjonującymi. */
  function qrSvg(seed) {
    const N = 25, r = D.rng(seed), cells = [];                                   // rozmiar i generator
    const finder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7); // obszary wzorów narożnych
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && r() < 0.5) cells.push(`M${x} ${y}h1v1h-1z`); // losowe moduły
    const eye = (x, y) => `<path d="M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><path d="M${x + 2} ${y + 2}h3v3h-3z"/>`; // wzór narożny
    return `<svg class="qr ph-cross" viewBox="-1 -1 27 27" shape-rendering="crispEdges" role="img" aria-label="Kod QR rezerwacji ${seed}"><g fill="#111">${eye(0, 0)}${eye(N - 7, 0)}${eye(0, N - 7)}<path d="${cells.join("")}"/></g></svg>`; // kod
  }
  function vDetails(id) {
    const r = resById(id);                                                       // rezerwacja
    if (!r) return { title: "Nie znaleziono", html: `<div class="card"><div class="empty">${emptyArt()}<h1 tabindex="-1">Nie znaleziono rezerwacji</h1><a class="btn btn--primary" href="#/rezerwacje">Moje rezerwacje</a></div></div>` }; // brak rezerwacji
    const room = roomById(r.room), b = bld(room.b), [st, variant] = statusInfo(r); // dane
    const end = slotDate(r.day, r.to).getTime();                                 // koniec rezerwacji
    let banner = "";                                                             // pasek statusu
    if (r.status === "pending") banner = `<div class="card" style="background:var(--c-warning-tint);border-color:transparent"><div class="row" style="--gap:12px">${icon("timer", "icon--lg")}<div><strong>Zamelduj się w ciągu <span class="tabular" data-countdown="${checkinDeadline(r)}">27:00</span></strong><div class="muted">Potem miejsce wróci do puli.</div></div>${note(1)}</div></div>`; // oczekuje
    if (r.status === "active") banner = `<div class="card" style="background:var(--c-success-tint);border-color:transparent"><div class="row" style="--gap:12px">${icon("checkCircle", "icon--lg")}<div><strong>Zameldowano o ${r.checkedIn || "13:52"}. Miłej nauki!</strong><div class="muted">Do końca: <strong class="tabular" data-countdown="${end}">2:08:00</strong></div></div></div></div>`; // aktywna
    if (r.status === "confirmed") banner = `<div class="card card--tint"><div class="row" style="--gap:12px">${icon("info", "icon--lg")}<div><strong>Rezerwacja potwierdzona</strong><div class="muted">Meldowanie otworzy się 15 min przed rozpoczęciem.</div></div></div></div>`; // potwierdzona
    if (!ACTIVE.includes(r.status)) banner = `<div class="card card--flat" style="background:var(--c-surface-2)"><div class="row" style="--gap:12px">${icon(r.status === "noshow" ? "alert" : "info", "icon--lg")}<strong>${r.status === "noshow" ? "Nie zameldowano się na czas – rezerwacja została zwolniona." : r.status === "cancelled" ? "Rezerwacja została anulowana." : "Rezerwacja zakończona."}</strong></div></div>`; // archiwalna
    return {
      title: `Rezerwacja ${r.id}`,
      crumbs: [["Moje rezerwacje", "/rezerwacje"], [`Rezerwacja ${r.id}`]],
      html: `
      <div class="narrow">
        <div class="page-header"><div><span class="overline">Rezerwacja ${r.id}</span><h1 tabindex="-1">${esc(room.name)}</h1><p>${longDate(r.day)} · <span class="tabular">${range(r.from, r.to)}</span> · ${b.name}, piętro ${room.floor} · ${seatText(r)}</p></div>${badge(st, variant)}</div>
        <div class="stack" style="--gap:20px">${banner}
          <section class="card"><div class="row" style="--gap:28px;align-items:flex-start">${qrSvg(r.id)}
            <div class="stack" style="--gap:12px;flex:1 1 280px"><h2 style="font-size:20px">Meldowanie ${note(2)}</h2><p class="muted">Po przyjściu zeskanuj kod QR na stanowisku ${room.mode === "room" ? "przy wejściu do sali" : `nr ${r.seats[0]}`} albo wpisz 4-cyfrowy kod z naklejki.</p>
              <div class="row">${r.status === "pending" ? `<button class="btn btn--primary" data-action="checkin" data-id="${r.id}">${icon("camera")} Zamelduj się</button>` : ""}<button class="btn btn--secondary" data-action="ics" data-id="${r.id}">${icon("calendarPlus")} Do kalendarza</button></div></div></div></section>
          ${ACTIVE.includes(r.status) && r.status !== "active" ? `<div><button class="btn btn--ghost" style="color:var(--c-danger)" data-action="cancel" data-id="${r.id}">${icon("trash")} Anuluj rezerwację</button>${note(3)}</div>` : ""}
        </div>
      </div>`,
    };
  }

  // ============================================================ V09 Profil i ustawienia
  /** Przełącznik ustawienia (role="switch"). */
  const settingSwitch = (key, label) => `<button class="switch" role="switch" aria-checked="${!!state.settings[key]}" data-action="setting" data-key="${key}" style="justify-content:space-between;width:100%;text-align:left"><span style="font-weight:600">${label}</span><span class="switch__track"></span></button>`; // przełącznik
  function vProfile() {
    const U = D.USER, s = state.settings;                                        // dane
    const seg = (key, options) => `<div class="segmented" role="group">${options.map(([v, l]) => `<button aria-pressed="${String(s[key]) === String(v)}" data-action="segment" data-key="${key}" data-value="${v}">${l}</button>`).join("")}</div>`; // przełącznik segmentowy
    return {
      title: "Profil i ustawienia",
      html: `
      <div class="narrow">
        <div class="page-header"><div class="row" style="--gap:16px"><span class="avatar" style="width:64px;height:64px;font-size:22px">${U.initials}</span><div><h1 tabindex="-1">${U.first} ${U.last}</h1><p>${U.field}</p></div></div><button class="btn btn--secondary" data-action="logout">${icon("logout")} Wyloguj</button></div>
        <div class="stack" style="--gap:20px">
          <section class="card" aria-labelledby="set-h"><h2 id="set-h" style="font-size:20px;margin-bottom:8px">Ustawienia ${note(1)}</h2>
            <div class="stack" style="--gap:4px">
              ${settingSwitch("remind", "Przypomnienie przed rezerwacją")}
              ${settingSwitch("weekly", "Podsumowanie tygodnia e-mailem")}
            </div>
            <div class="row row--between" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--c-border)"><strong style="font-weight:600">Motyw</strong>${seg("theme", [["light", "Jasny"], ["dark", "Ciemny"], ["system", "Systemowy"]])}</div>
          </section>
          <section class="card" aria-labelledby="ka-h"><h2 id="ka-h" style="font-size:20px;margin-bottom:14px">Konto ${note(2)}</h2>
            <dl class="stack" style="--gap:10px;margin:0">
              <div class="row row--between"><dt class="muted">E-mail</dt><dd style="margin:0;word-break:break-all">${U.email}</dd></div>
              <div class="row row--between"><dt class="muted">Nr albumu</dt><dd style="margin:0">${U.album}</dd></div>
            </dl>
            <p class="hint" style="margin-top:12px">${icon("lock", "icon--sm")} Dane pochodzą z systemu uczelni.</p>
          </section>
          <section class="card card--tint"><div class="row row--between"><div><strong>Tryb demonstracyjny ${note(3)}</strong><div class="muted" style="font-size:14px">Przełącz rolę, aby zobaczyć panel administratora.</div></div><div class="segmented" role="group"><button aria-pressed="${state.role === "student"}" data-action="role" data-role="student">Studentka</button><button aria-pressed="${state.role === "admin"}" data-action="role" data-role="admin">Administrator</button></div></div></section>
        </div>
      </div>`,
    };
  }

  // ============================================================ V10 Panel administratora
  function adminRows() {
    return D.ROOMS.filter((r) => state.adminBuilding === "all" || r.b === state.adminBuilding).map((r) => {
      const list = seatsFor(r, 0), load = list.filter((s) => s.off || s.busy[D.NOW_SLOT]).length / list.length; // obłożenie teraz
      const isBlocked = blocked(r.id);                                           // blokada
      return `<tr><td data-label="Sala"><strong>${esc(r.name)}</strong></td><td data-label="Budynek" class="hide-mobile">${r.b}</td>
        <td data-label="Obłożenie" style="min-width:140px"><div class="row row--nowrap" style="--gap:8px"><div class="grow">${occBar(load)}</div><span class="tabular">${Math.round(load * 100)}%</span></div></td>
        <td data-label="Status">${isBlocked ? badge("Zablokowana", "danger") : badge("Otwarta", "success")}</td>
        <td data-label="Akcja">${isBlocked ? `<button class="btn btn--sm btn--secondary" data-action="unblock" data-room="${r.id}">${icon("lockOff", "icon--sm")} Odblokuj</button>` : `<button class="btn btn--sm btn--ghost" data-action="block" data-room="${r.id}">${icon("lock", "icon--sm")} Zablokuj</button>`}</td></tr>`; // wiersz tabeli
    }).join("");                                                                 // wszystkie wiersze
  }
  function vAdmin() {
    if (state.role !== "admin") return {                                         // brak uprawnień
      title: "Panel administratora",
      html: `<div class="card" style="max-width:560px;margin:40px auto"><div class="empty">${icon("shield", "empty__art")}<h1 tabindex="-1" style="font-size:24px">Brak dostępu</h1><p>Panel jest dostępny dla administratorów budynków.</p><button class="btn btn--primary" data-action="role" data-role="admin">Przełącz na administratora (demo)</button></div></div>`,
    };
    const avg = D.BUILDINGS.reduce((a, b) => a + D.buildingLoad(b.id), 0) / D.BUILDINGS.length; // średnie obłożenie
    const kpi = (label, value, extra = "") => `<section class="card"><span class="subtle">${label}${extra}</span><div class="kpi__value" style="margin-top:6px">${value}</div></section>`; // karta wskaźnika
    return {
      title: "Panel administratora",
      html: `
      <div class="page-header"><div><h1 tabindex="-1">Panel administratora</h1><p>${longDate(0)}</p></div></div>
      <div class="stack" style="--gap:var(--gutter)">
        <div class="kpis">
          ${kpi("Obłożenie teraz", `${Math.round(avg * 100)}%`, note(1))}
          ${kpi("Rezerwacje dziś", "412")}
          ${kpi("Nieobecności (30 dni)", "6,8%")}
        </div>
        <section class="card" aria-labelledby="rm-h"><div class="card__header"><h2 id="rm-h" style="font-size:18px">Sale ${note(2)}</h2>
          <select class="select" style="width:auto" data-change="admin-building" aria-label="Budynek"><option value="all">Wszystkie budynki</option>${D.BUILDINGS.map((b) => `<option value="${b.id}" ${state.adminBuilding === b.id ? "selected" : ""}>${b.name}</option>`).join("")}</select></div>
          <div class="table-wrap"><table class="table table--stack"><thead><tr><th>Sala</th><th class="hide-mobile">Budynek</th><th>Obłożenie teraz</th><th>Status</th><th>Akcja ${note(3)}</th></tr></thead><tbody id="admin-rows">${adminRows()}</tbody></table></div></section>
      </div>`,
    };
  }

  // ============================================================ okna, menu, powiadomienia
  let lastFocus = null;                                                          // element z fokusem przed otwarciem okna
  /** Otwiera okno modalne (na telefonie – arkusz od dołu). */
  function openModal(title, body, actions) {
    closeModal();                                                                // tylko jedno okno naraz
    lastFocus = document.activeElement;                                          // zapamiętanie fokusu
    const root = document.getElementById("modal-root");                          // kontener okien
    root.innerHTML = `<div class="overlay" data-action="overlay"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="row row--between row--nowrap" style="margin-bottom:12px"><h2 id="m-title" style="font-size:20px">${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="Zamknij">${icon("x")}</button></div><div id="m-body">${body}</div><div class="modal__actions">${actions}</div></div></div>`; // okno
    const focusable = root.querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea, a[href]'); // elementy fokusowalne
    (focusable[1] || focusable[0])?.focus();                                     // fokus na pierwszy element treści
  }
  /** Zamyka okno modalne i przywraca fokus. */
  function closeModal() {
    const root = document.getElementById("modal-root");                          // kontener okien
    if (!root || !root.innerHTML) return;                                        // nic do zamknięcia
    root.innerHTML = "";                                                         // usunięcie okna
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();            // przywrócenie fokusu
  }
  /** Krótki komunikat u dołu ekranu (z opcjonalną akcją „Cofnij”). */
  function toast(text, undo) {
    const root = document.getElementById("toast-root");                          // kontener komunikatów
    const el = document.createElement("div");                                    // nowy komunikat
    el.className = "toast";                                                      // styl
    el.setAttribute("role", "status");                                           // ogłaszany czytnikom ekranu
    el.innerHTML = `${icon("checkCircle")}<span>${text}</span>${undo ? '<button class="btn btn--ghost btn--sm">Cofnij</button>' : ""}`; // treść
    if (undo) el.querySelector("button").addEventListener("click", () => { undo(); el.remove(); }); // akcja cofnięcia
    root.appendChild(el);                                                        // pokazanie
    setTimeout(() => el.remove(), undo ? 7000 : 4000);                           // automatyczne zniknięcie
  }
  let popover = null;                                                            // otwarte menu
  /** Zamyka menu rozwijane. */
  function closePopover() {
    if (!popover) return;                                                        // nic otwartego
    popover.el.remove();                                                         // usunięcie
    popover.btn.setAttribute("aria-expanded", "false");                          // stan przycisku
    popover = null;                                                              // wyczyszczenie
  }
  /** Otwiera menu przy przycisku. */
  function openPopover(btn, html, width = 260) {
    closePopover();                                                              // zamknięcie poprzedniego
    const el = document.createElement("div");                                    // kontener menu
    el.className = "menu";                                                       // styl
    el.style.width = `${Math.min(width, innerWidth - 16)}px`;                    // szerokość (mieści się w oknie)
    el.innerHTML = html;                                                         // treść
    document.body.appendChild(el);                                               // dodanie do strony
    const rect = btn.getBoundingClientRect();                                    // położenie przycisku
    const left = Math.min(Math.max(8, rect.right - el.offsetWidth), innerWidth - el.offsetWidth - 8); // wyrównanie do prawej krawędzi przycisku
    const top = rect.bottom + 8 + el.offsetHeight > innerHeight ? rect.top - el.offsetHeight - 8 : rect.bottom + 8; // nad lub pod przyciskiem
    el.style.left = `${left + scrollX}px`;                                       // pozycja pozioma
    el.style.top = `${top + scrollY}px`;                                         // pozycja pionowa
    btn.setAttribute("aria-expanded", "true");                                   // stan przycisku
    popover = { el, btn };                                                       // zapamiętanie
    el.querySelector("button, a")?.focus();                                      // fokus na pierwszą pozycję
  }

  /** Okno meldowania (skan kodu lub wpisanie kodu). */
  function checkinModal(id) {
    openModal("Meldowanie", `<div class="segmented" role="group" style="margin-bottom:16px"><button aria-pressed="true" data-action="ci-mode" data-mode="scan">${icon("camera", "icon--sm")} Skanuj</button><button aria-pressed="false" data-action="ci-mode" data-mode="code">Wpisz kod</button></div>
      <div id="ci-scan"><div class="ph-cross" style="position:relative;height:220px;border-radius:14px;background:#0E1120;overflow:hidden;display:grid;place-items:center"><div style="width:150px;height:150px;border:3px solid #fff;border-radius:16px;box-shadow:0 0 0 9999px rgba(0,0,0,.35)"></div><div style="position:absolute;left:20%;right:20%;height:2px;background:#5BD394;animation:scanline 1.6s ease-in-out infinite alternate"></div></div><p class="muted" style="margin-top:12px">Skieruj aparat na kod QR na stanowisku.</p></div>
      <div id="ci-code" hidden><div class="field"><label class="label" for="ci-input">Kod z naklejki na stanowisku</label><input class="input tabular" id="ci-input" inputmode="numeric" maxlength="4" placeholder="np. 4821" aria-describedby="ci-err" style="font-size:24px;letter-spacing:.3em;text-align:center"><span class="hint">W prototypie poprawny kod to 4821.</span><div id="ci-err" class="error-text" hidden></div></div></div>
      <style>@keyframes scanline{from{top:22%}to{top:78%}}</style>`,
      `<button class="btn btn--secondary" data-action="close-modal">Anuluj</button><button class="btn btn--primary" data-action="ci-confirm" data-id="${id}">${icon("check")} Symuluj skan</button>`); // przyciski okna
  }
  /** Zameldowanie rezerwacji. */
  function doCheckin(id) {
    const r = resById(id);                                                       // rezerwacja
    const t = new Date(nowMs());                                                 // czas meldowania
    r.status = "active";                                                         // status aktywny
    r.checkedIn = `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;  // godzina meldowania
    closeModal();                                                                // zamknięcie okna
    toast("Zameldowano. Miłej nauki!");                                          // komunikat
    if (current.id === "V08") render(false); else go(`/rezerwacje/${id}`);       // przejście do szczegółów
  }
  /** Okno blokady sali (administrator). */
  function blockModal(roomId) {
    const room = roomById(roomId);                                               // sala
    openModal("Zablokuj salę", `<div class="stack" style="--gap:14px"><p><strong>${esc(room.name)}</strong> <span class="muted">· ${bld(room.b).name}</span></p>
      <div class="field"><label class="label" for="bl-why">Powód</label><select class="select" id="bl-why"><option>Serwis techniczny</option><option>Egzamin</option><option>Wydarzenie</option></select></div>
      <label class="checkbox"><input type="checkbox" checked><span>Powiadom osoby z rezerwacjami w tej sali</span></label></div>`,
      `<button class="btn btn--secondary" data-action="close-modal">Anuluj</button><button class="btn btn--danger" data-action="block-confirm" data-room="${roomId}">${icon("lock")} Zablokuj salę</button>`); // przyciski
  }
  /** Plik kalendarza .ics dla rezerwacji. */
  function icsFor(r) {
    const pad = (n) => String(n).padStart(2, "0");                               // dopełnienie zer
    const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`; // format daty iCalendar
    const room = roomById(r.room), b = bld(room.b);                              // sala i budynek
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Miejscowka//PL", "BEGIN:VEVENT", `UID:${r.id}@miejscowka.pmiejska.edu.pl`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(slotDate(r.day, r.from))}`, `DTEND:${fmt(slotDate(r.day, r.to))}`, `SUMMARY:Nauka – ${room.name}`, `LOCATION:${b.name}\\, piętro ${room.floor}`, "DESCRIPTION:Zamelduj się najpóźniej 15 min po rozpoczęciu.", "END:VEVENT", "END:VCALENDAR"]; // treść pliku
    const a = document.createElement("a");                                       // link pobierania
    a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" })); // adres pliku
    a.download = `rezerwacja-${r.id}.ics`;                                       // nazwa pliku
    a.click();                                                                   // pobranie
    toast("Pobrano plik kalendarza.");                                           // komunikat
  }

  // ============================================================ akcje (delegacja kliknięć)
  const ACTIONS = {
    nav: (el) => go(el.dataset.path),                                            // przejście
    "login-sso": (el) => { el.classList.add("is-loading"); setTimeout(() => go("/pulpit"), 700); }, // logowanie SSO (symulacja przekierowania)
    "toggle-pass": (el) => { const input = document.getElementById("pass"), show = input.type === "password"; input.type = show ? "text" : "password"; el.setAttribute("aria-pressed", String(show)); el.setAttribute("aria-label", show ? "Ukryj hasło" : "Pokaż hasło"); }, // pokaż / ukryj hasło
    "close-modal": () => closeModal(),                                           // zamknięcie okna
    overlay: (el, e) => { if (e.target === el) closeModal(); },                  // kliknięcie w tło zamyka okno
    "user-menu": (el) => openPopover(el, `<div class="row" style="padding:10px"><span class="avatar">${D.USER.initials}</span><div><strong>${D.USER.first} ${D.USER.last}</strong><div class="subtle">${state.role === "admin" ? "Administrator" : "Studentka"}</div></div></div><div class="menu__sep"></div><a class="menu__item" href="#/profil">${icon("user")} Profil i ustawienia</a><button class="menu__item" data-action="theme-toggle">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")} Motyw ${document.documentElement.dataset.theme === "dark" ? "jasny" : "ciemny"}</button><div class="menu__sep"></div><button class="menu__item" data-action="logout">${icon("logout")} Wyloguj</button>`), // menu konta
    "theme-toggle": () => { state.settings.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; saveSettings(); applySettings(); closePopover(); }, // szybka zmiana motywu
    logout: () => { closePopover(); go("/logowanie"); },                         // wylogowanie
    role: (el) => { state.role = el.dataset.role; toast(state.role === "admin" ? "Przełączono na rolę administratora (demo)." : "Przełączono na widok studenta."); if (state.role === "admin") go("/admin"); else render(false); }, // zmiana roli
    quick: (el) => { const s = state.search, p = el.dataset.preset; Object.assign(s, { day: 0, from: firstFreeSlot(0), to: firstFreeSlot(0) + 4, people: 1, building: "all", amen: [], groupOnly: false }); if (p === "quiet") s.amen = ["quiet"]; if (p === "group") Object.assign(s, { people: 4, groupOnly: true }); go("/szukaj"); }, // gotowe ustawienia wyszukiwania
    "clear-filters": () => { Object.assign(state.search, { building: "all", amen: [], groupOnly: false, people: 1 }); refreshResults(true); }, // wyczyszczenie filtrów
    amen: (el) => { const a = el.dataset.amen, list = state.search.amen; state.search.amen = list.includes(a) ? list.filter((x) => x !== a) : [...list, a]; el.setAttribute("aria-pressed", String(state.search.amen.includes(a))); refreshResults(); }, // udogodnienie
    "group-only": (el) => { state.search.groupOnly = !state.search.groupOnly; el.setAttribute("aria-checked", String(state.search.groupOnly)); refreshResults(); }, // tylko pokoje grupowe
    "open-room": (el) => { state.sel = null; selectRoom(el.dataset.room); },     // otwarcie sali (link przejdzie dalej)
    "map-building": (el) => { state.mapBuilding = el.dataset.id; refreshMap(); }, // wybór budynku na mapie
    "sel-day": (el) => { const sel = state.sel; sel.day = +el.dataset.day; const len = sel.to - sel.from; if (sel.from < firstFreeSlot(sel.day)) sel.from = firstFreeSlot(sel.day); sel.to = Math.min(D.SLOTS, sel.from + len); dropBusySeats(); refreshRoom(); }, // zmiana dnia
    slot: (el) => { const sel = state.sel, len = sel.to - sel.from; sel.from = +el.dataset.slot; sel.to = Math.min(D.SLOTS, sel.from + len); if (sel.to - sel.from < 1) sel.from = sel.to - 1; dropBusySeats(); refreshRoom(); }, // wybór godziny startu
    duration: (el) => { const sel = state.sel, len = Math.min(8, Math.max(1, sel.to - sel.from + +el.dataset.step)); if (sel.from + len > D.SLOTS) return; sel.to = sel.from + len; dropBusySeats(); refreshRoom(); }, // czas trwania
    seat: (el) => { const sel = state.sel, n = +el.dataset.n; sel.seats = sel.seats.includes(n) ? [] : [n]; document.getElementById("plan").innerHTML = planHtml(); document.getElementById("summary").innerHTML = summaryHtml(); document.querySelector(`[data-action="seat"][data-n="${n}"]`)?.focus(); }, // wybór jednego miejsca
    "room-people": (el) => { const sel = state.sel, room = roomById(sel.roomId); sel.people = Math.min(D.capacity(room), Math.max(2, sel.people + +el.dataset.step)); document.getElementById("plan").innerHTML = planHtml(); document.getElementById("summary").innerHTML = summaryHtml(); }, // liczba osób w pokoju
    "to-wizard": () => { if (state.reservations.filter((r) => ACTIVE.includes(r.status)).length >= D.USER.activeLimit) { openModal("Osiągnięto limit rezerwacji", `<p class="muted">Masz już ${D.USER.activeLimit} aktywne rezerwacje. Anuluj jedną z nich, aby zarezerwować kolejne miejsce.</p>`, '<a class="btn btn--secondary" href="#/rezerwacje" data-action="close-modal">Moje rezerwacje</a><button class="btn btn--primary" data-action="close-modal">Rozumiem</button>'); return; } wizardStart(); go("/rezerwacja"); }, // przejście do potwierdzenia (z kontrolą limitu)
    "wz-confirm": (el) => { const w = state.wizard; if (!w.accepted) { w.error = "Zaznacz akceptację zasad meldowania."; render(false); document.querySelector('[data-change="accept"]')?.focus(); return; } el.classList.add("is-loading"); setTimeout(() => { const sel = state.sel, room = roomById(sel.roomId), id = `R-${5000 + state.reservations.length * 7}`; const start = slotDate(sel.day, sel.from).getTime(); state.reservations.push({ id, room: sel.roomId, seats: [...sel.seats], count: room.mode === "room" ? sel.people : 1, day: sel.day, from: sel.from, to: sel.to, status: start - nowMs() <= 15 * 60000 ? "pending" : "confirmed", people: [] }); w.done = id; state.sel = null; render(); }, 900); }, // potwierdzenie (symulacja zapisu)
    ics: (el) => icsFor(resById(el.dataset.id)),                                 // plik kalendarza
    "res-tab": (el) => { state.resTab = el.dataset.tab; render(false); document.querySelector(`[data-tab="${state.resTab}"]`)?.focus(); }, // zakładka rezerwacji
    cancel: (el) => { const r = resById(el.dataset.id), room = roomById(r.room); openModal("Anulować rezerwację?", `<p>${esc(room.name)}<br><span class="muted">${dayLabel(r.day)}, ${range(r.from, r.to)} · ${seatText(r)}</span></p><p class="hint" style="margin-top:12px">Anulowanie przed rozpoczęciem nie liczy się jako nieobecność.</p>`, `<button class="btn btn--secondary" data-action="close-modal">Zostaw</button><button class="btn btn--danger" data-action="cancel-confirm" data-id="${r.id}">${icon("trash")} Anuluj rezerwację</button>`); }, // pytanie o anulowanie
    "cancel-confirm": (el) => { const r = resById(el.dataset.id), prev = r.status; r.status = "cancelled"; closeModal(); render(false); toast(`Anulowano rezerwację ${r.id}.`, () => { r.status = prev; render(false); }); }, // anulowanie z możliwością cofnięcia
    checkin: (el) => checkinModal(el.dataset.id),                                // okno meldowania
    "ci-mode": (el) => { const code = el.dataset.mode === "code"; document.getElementById("ci-scan").hidden = code; document.getElementById("ci-code").hidden = !code; el.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); const btn = document.querySelector('[data-action="ci-confirm"]'); btn.innerHTML = `${icon("check")} ${code ? "Zamelduj" : "Symuluj skan"}`; if (code) document.getElementById("ci-input").focus(); }, // tryb meldowania
    "ci-confirm": (el) => { const codeBox = document.getElementById("ci-code"); if (codeBox && !codeBox.hidden) { const input = document.getElementById("ci-input"), err = document.getElementById("ci-err"); if (input.value.trim() !== "4821") { input.setAttribute("aria-invalid", "true"); err.hidden = false; err.innerHTML = `${icon("alert", "icon--sm")} Nieprawidłowy kod. Sprawdź naklejkę na stanowisku.`; input.focus(); return; } } doCheckin(el.dataset.id); }, // potwierdzenie meldowania
    setting: (el) => { const k = el.dataset.key; state.settings[k] = !state.settings[k]; el.setAttribute("aria-checked", String(state.settings[k])); saveSettings(); }, // przełącznik ustawienia
    segment: (el) => { const k = el.dataset.key; state.settings[k] = el.dataset.value; el.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === el))); saveSettings(); applySettings(); }, // przełącznik segmentowy (motyw)
    block: (el) => blockModal(el.dataset.room),                                  // okno blokady
    "block-confirm": (el) => { state.roomStatus[el.dataset.room] = "blocked"; closeModal(); document.getElementById("admin-rows").innerHTML = adminRows(); toast(`Zablokowano salę ${roomById(el.dataset.room).name}.`); }, // blokada sali
    unblock: (el) => { delete state.roomStatus[el.dataset.room]; document.getElementById("admin-rows").innerHTML = adminRows(); toast("Sala ponownie dostępna do rezerwacji."); }, // odblokowanie
  };

  // Kliknięcia: delegacja do akcji z atrybutu data-action
  document.addEventListener("click", (e) => {
    if (popover && !popover.el.contains(e.target) && !popover.btn.contains(e.target)) closePopover(); // kliknięcie poza menu zamyka je
    const el = e.target.closest("[data-action]");                                // element z akcją
    if (!el || el.disabled) return;                                              // brak akcji
    const action = ACTIONS[el.dataset.action];                                   // funkcja akcji
    if (!action) return;                                                         // nieznana akcja
    if (popover && popover.btn === el) { closePopover(); return; }               // ponowne kliknięcie przycisku zamyka menu
    action(el, e);                                                               // wykonanie akcji
  });
  // Klawiatura: Esc zamyka okna/menu, Enter/spacja aktywuje budynki na mapie, Tab zamknięty w oknie
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (popover) { const b = popover.btn; closePopover(); b.focus(); } else closeModal(); } // Esc
    if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-action]')) { e.preventDefault(); e.target.click(); } // aktywacja elementów SVG
    if (e.key === "Tab" && document.getElementById("modal-root").innerHTML) {    // pułapka fokusu w oknie
      const items = [...document.querySelectorAll("#modal-root button:not([disabled]), #modal-root input:not([disabled]), #modal-root select, #modal-root textarea, #modal-root a[href]")].filter((x) => x.offsetParent); // elementy okna
      const first = items[0], last = items[items.length - 1];                    // pierwszy i ostatni
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } // zawinięcie do końca
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } // zawinięcie do początku
    }
  });
  // Zmiany pól wyboru (data-change)
  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-change]");                                // pole ze zmianą
    if (!el) return;                                                             // brak
    const kind = el.dataset.change;                                              // rodzaj zmiany
    if (kind === "search") {                                                     // filtr wyszukiwania
      const k = el.dataset.key, s = state.search;                                // klucz filtra
      s[k] = ["day", "from", "to"].includes(k) ? +el.value : el.value;           // nowa wartość
      if (k === "day" && s.from < firstFreeSlot(s.day)) { const len = s.to - s.from; s.from = firstFreeSlot(s.day); s.to = Math.min(D.SLOTS, s.from + len); } // dziś – bez minionych godzin
      if (k === "from") s.to = Math.min(D.SLOTS, Math.max(s.from + 1, Math.min(s.to, s.from + 8))); // poprawny zakres „Do”
      refreshResults(true);                                                      // odświeżenie filtrów i wyników
    }
    if (kind === "remind") state.wizard.remind = el.value;                       // przypomnienie
    if (kind === "accept") { state.wizard.accepted = el.checked; if (el.checked && state.wizard.error) { state.wizard.error = ""; render(false); } } // akceptacja zasad
    if (kind === "admin-building") { state.adminBuilding = el.value; document.getElementById("admin-rows").innerHTML = adminRows(); } // filtr budynku (panel)
  });
  // Walidacja pola e-mail po opuszczeniu pola
  document.addEventListener("focusout", (e) => {
    if (e.target.dataset && e.target.dataset.blur === "validate-email" && e.target.value) validateLogin(true); // walidacja tylko e-maila
  });
  // Wysyłanie formularzy (data-submit)
  document.addEventListener("submit", (e) => {
    e.preventDefault();                                                          // bez przeładowania strony
    if (e.target.dataset.submit === "login" && validateLogin(false)) { e.target.querySelector('[type="submit"]').classList.add("is-loading"); setTimeout(() => go("/pulpit"), 700); } // logowanie e-mailem
  });
  /** Walidacja formularza logowania; zwraca true, gdy poprawny. */
  function validateLogin(emailOnly) {
    const email = document.getElementById("email"), pass = document.getElementById("pass"); // pola
    const set = (input, errId, msg) => { const err = document.getElementById(errId); input.setAttribute("aria-invalid", String(!!msg)); err.hidden = !msg; err.innerHTML = msg ? `${icon("alert", "icon--sm")} ${msg}` : ""; }; // pokazanie błędu
    const emailMsg = !email.value.trim() ? "Podaj adres e-mail." : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim()) ? "Adres e-mail ma niepoprawny format, np. jan.kowalski@pmiejska.edu.pl" : ""; // błąd e-maila
    set(email, "email-err", emailMsg);                                           // komunikat e-maila
    if (emailOnly) return !emailMsg;                                             // tylko e-mail
    const passMsg = pass.value.length < 8 ? "Hasło musi mieć co najmniej 8 znaków." : ""; // błąd hasła
    set(pass, "pass-err", passMsg);                                              // komunikat hasła
    if (emailMsg) email.focus(); else if (passMsg) pass.focus();                 // fokus na pierwsze błędne pole
    return !emailMsg && !passMsg;                                                // wynik
  }

  // ============================================================ odliczania
  /** Aktualizacja wszystkich liczników na ekranie. */
  function tickCountdowns() {
    const now = nowMs();                                                         // „teraz”
    document.querySelectorAll("[data-countdown]").forEach((el) => { el.textContent = clock(+el.dataset.countdown - now); }); // liczniki
  }
  setInterval(tickCountdowns, 1000);                                             // co sekundę

  // ============================================================ przeglądarka prototypu (ramka)
  window.addEventListener("message", (e) => {
    const m = e.data || {};                                                      // wiadomość
    if (m.type !== "mk") return;                                                 // tylko nasze wiadomości
    if (m.cmd === "go") {                                                        // przejście do widoku
      if (m.role) state.role = m.role;                                           // rola demonstracyjna (panel administratora)
      if (location.hash === `#${m.path}`) render(false); else go(m.path);        // ten sam adres – tylko przerysowanie
    }
    if (m.cmd === "toggle") document.documentElement.classList.toggle(m.name, !!m.on); // hotspoty / siatka / makieta
    if (m.cmd === "theme") { state.settings.theme = m.value; applySettings(); }  // motyw
  });
  // Tryby z adresu (dla automatycznych zrzutów ekranu)
  if (params.get("wf") === "1") document.documentElement.classList.add("wf");   // makieta
  if (params.get("grid") === "1") document.documentElement.classList.add("show-grid"); // siatka
  if (params.get("hotspots") === "1") document.documentElement.classList.add("show-hotspots"); // hotspoty

  // ============================================================ start
  applySettings();                                                               // wygląd z ustawień
  window.addEventListener("hashchange", () => render(true));                     // zmiana adresu
  render(false);                                                                 // pierwszy widok
  window.MK = { state, go, render };                                             // dostęp do stanu dla testów automatycznych
})();
