/* =====================================================================
   Miejscówka – zestaw ikon liniowych (siatka 24×24, obrys 1,75 px,
   zaokrąglone końce). Ikony narysowane na potrzeby projektu.
   ===================================================================== */
window.MICONS = (function () {
  "use strict";                                                    // tryb ścisły

  // Ścieżki SVG ikon: nazwa -> zawartość elementu <svg>
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',                         // pulpit
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',                                  // wyszukiwanie
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',                    // mapa
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',       // kalendarz
    calendarPlus: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>', // dodaj do kalendarza
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',                                      // czas
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',                         // profil
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.6 3.5 5.7"/>', // osoby
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4l2-2Z"/><path d="M10 21h4"/>',                          // powiadomienia
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v.01M14 20.5h.01M17 17h4v4h-4"/>', // kod QR
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',                                                         // zatwierdzenie
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.5 9.5"/>',                 // sukces
    x: '<path d="M6 6l12 12M18 6 6 18"/>',                                                                // zamknij
    plus: '<path d="M12 5v14M5 12h14"/>',                                                                 // dodaj
    minus: '<path d="M5 12h14"/>',                                                                        // odejmij
    plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',                              // przedłuż
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',                                                            // wstecz
    chevronRight: '<path d="m9 6 6 6-6 6"/>',                                                             // dalej
    chevronDown: '<path d="m6 9 6 6 6-6"/>',                                                              // rozwiń
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',                                                      // przejdź
    filter: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>', // filtry
    list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',                               // widok listy
    plug: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8Z"/><path d="M12 17v4"/>',          // gniazdko
    quiet: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="m17 9.5 4 5M21 9.5l-4 5"/>',                     // strefa ciszy
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',              // monitor
    board: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="m7 20 2-4M17 20l-2-4M7 9h6M7 12h9"/>', // tablica
    window: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/>',           // przy oknie
    accessible: '<circle cx="11" cy="4.5" r="1.6"/><path d="M11 8v5h5l2.5 5.5"/><path d="M8.5 10.5a5.5 5.5 0 1 0 6.9 7.6"/>', // dostęp dla wózków
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>', // wi-fi
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',                                          // klimatyzacja
    building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M11 21v-3h2v3"/>', // budynek
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',                                // piętro
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',                                 // informacja
    alert: '<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4M12 17h.01"/>',                        // ostrzeżenie
    star: '<path d="m12 3.2 2.7 5.5 6 .9-4.3 4.2 1 6L12 17l-5.4 2.8 1-6-4.3-4.2 6-.9L12 3.2Z"/>',          // ulubione
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>', // lokalizacja
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',                               // edycja
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',                                              // usuń / anuluj
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',                                                // pobierz
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', // motyw jasny
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/>',                                  // motyw ciemny
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',          // ustawienia
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="m10 8-4 4 4 4M6 12h10"/>',       // wyloguj
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',                                               // statystyki
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',        // administrator
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',                     // e-mail
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',         // hasło
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',  // pokaż hasło
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',                   // skaner
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',                                                        // zgłoszenie
    door: '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18"/><path d="M15 12h.01"/>',          // wejście
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',                              // odliczanie
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',                                // odśwież
    lockOff: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',      // odblokuj
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>',                    // przybliż
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',                          // oddal
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>', // moja lokalizacja
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13v4H6a2 2 0 0 1-2-2Z"/>', // nauka
  };

  /**
   * Zwraca kod SVG ikony.
   * @param {string} name nazwa ikony z zestawu
   * @param {string} cls dodatkowe klasy CSS (np. "icon--sm")
   * @param {string} label opis dla czytników ekranu (pusty = ikona dekoracyjna)
   */
  function icon(name, cls = "", label = "") {
    const body = P[name] || P.info;                                                    // nieznana nazwa -> ikona informacji
    const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';   // dostępność: opis albo ukrycie
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" ${a11y}>${body}</svg>`;        // gotowy element SVG
  }

  /** Logo aplikacji – znacznik miejsca z otwartą książką. */
  function logo(size = 36) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--c-primary)"/>
      <path d="M20 33s9-8 9-15a9 9 0 0 0-18 0c0 7 9 15 9 15Z" fill="none" stroke="var(--c-on-primary)" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M15.5 15.5c1.6-.8 3.1-.8 4.5 0 1.4-.8 2.9-.8 4.5 0v5c-1.6-.8-3.1-.8-4.5 0-1.4-.8-2.9-.8-4.5 0v-5ZM20 15.5v5" fill="none" stroke="var(--c-accent)" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;                                                                           // pinezka (miejsce) + książka (nauka)
  }

  // Publiczny interfejs modułu
  return { icon, logo, names: Object.keys(P) };
})();
