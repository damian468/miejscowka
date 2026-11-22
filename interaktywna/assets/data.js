/* =====================================================================
   Miejscówka – dane przykładowe prototypu (fikcyjna uczelnia).
   Dostępność miejsc jest generowana deterministycznie, więc każdy
   ekran wygląda tak samo przy każdym otwarciu.
   ===================================================================== */
window.MDATA = (function () {
  "use strict";                                                          // tryb ścisły

  // Czas „teraz” w prototypie: dziś, 13:48 (stały, by ekrany były spójne)
  const NOW = new Date();                                                // bieżąca data
  NOW.setHours(13, 48, 0, 0);                                            // ustalona godzina

  // Sloty po 30 minut od 7:00 do 23:00 (32 sloty)
  const OPEN_HOUR = 7;                                                   // otwarcie
  const SLOTS = 32;                                                      // liczba slotów w ciągu dnia
  const NOW_SLOT = (NOW.getHours() - OPEN_HOUR) * 2 + (NOW.getMinutes() >= 30 ? 1 : 0); // slot bieżący

  /** Godzina slotu, np. 14 -> "14:00". */
  function slotTime(slot) {
    const minutes = OPEN_HOUR * 60 + slot * 30;                          // minuty od północy
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`; // zapis gg:mm
  }

  /** Prosty generator liczb pseudolosowych z ziarnem (zawsze te same wyniki). */
  function rng(seedText) {
    let h = 2166136261;                                                  // początek skrótu FNV
    for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } // skrót tekstu ziarna
    return function () {                                                 // generator mulberry32
      h += 0x6D2B79F5;                                                   // krok stanu
      let t = h;                                                         // kopia stanu
      t = Math.imul(t ^ (t >>> 15), t | 1);                              // mieszanie
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);                         // mieszanie
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;                      // liczba 0–1
    };
  }

  // Budynki kampusu (współrzędne na mapie SVG 1000×640)
  const BUILDINGS = [
    { id: "BG", name: "Biblioteka Główna", address: "ul. Akademicka 1", hours: "7:00–23:00", walk: 3, x: 400, y: 250, w: 220, h: 150 },   // biblioteka
    { id: "CD", name: "Centrum Dydaktyczne", address: "ul. Akademicka 5", hours: "7:00–22:00", walk: 6, x: 690, y: 110, w: 230, h: 130 }, // centrum dydaktyczne
    { id: "WI", name: "Wydział Informatyki", address: "ul. Bitowa 2", hours: "7:30–21:00", walk: 8, x: 120, y: 90, w: 200, h: 140 },     // informatyka
    { id: "SS", name: "Strefa Studenta", address: "pl. Studencki 3", hours: "8:00–23:00", walk: 4, x: 700, y: 360, w: 190, h: 120 },    // strefa studenta
    { id: "WM", name: "Wydział Mechaniczny", address: "ul. Inżynierska 7", hours: "7:30–20:00", walk: 11, x: 110, y: 380, w: 210, h: 150 }, // mechaniczny
  ];

  // Sale: mode "seats" – rezerwacja pojedynczych miejsc, "room" – rezerwacja całej sali
  const ROOMS = [
    { id: "bg-214", b: "BG", floor: 2, name: "Czytelnia cicha 2.14", type: "Czytelnia cicha", mode: "seats", tables: 6, perTable: 4, planCols: 3, amen: ["quiet", "plug", "window", "snow"], pop: .62, fav: true }, // ulubiona
    { id: "bg-120", b: "BG", floor: 1, name: "Strefa ciszy 1.20", type: "Strefa ciszy", mode: "seats", tables: 4, perTable: 4, planCols: 2, amen: ["quiet", "plug"], pop: .55 },
    { id: "bg-014", b: "BG", floor: 0, name: "Czytelnia ogólna 0.14", type: "Czytelnia", mode: "seats", tables: 8, perTable: 4, planCols: 4, amen: ["plug", "wifi", "accessible"], pop: .7 },
    { id: "bg-305", b: "BG", floor: 3, name: "Pokój pracy grupowej 3.05", type: "Pokój grupowy", mode: "room", capacity: 6, amen: ["board", "monitor", "plug"], pop: .6, fav: true }, // ulubiona
    { id: "bg-306", b: "BG", floor: 3, name: "Pokój pracy grupowej 3.06", type: "Pokój grupowy", mode: "room", capacity: 4, amen: ["board", "plug"], pop: .5 },
    { id: "cd-108", b: "CD", floor: 1, name: "Pokój grupowy 1.08", type: "Pokój grupowy", mode: "room", capacity: 8, amen: ["monitor", "board", "accessible", "plug"], pop: 0.9 },
    { id: "cd-010", b: "CD", floor: 0, name: "Open space 0.10", type: "Strefa otwarta", mode: "seats", tables: 9, perTable: 4, planCols: 3, amen: ["plug", "wifi", "accessible"], pop: 1.0 },
    { id: "cd-215", b: "CD", floor: 2, name: "Sala cichej nauki 2.15", type: "Czytelnia cicha", mode: "seats", tables: 5, perTable: 4, planCols: 3, amen: ["quiet", "window"], pop: 0.85 },
    { id: "wi-130", b: "WI", floor: 1, name: "Laboratorium otwarte 1.30", type: "Stanowiska komputerowe", mode: "seats", tables: 6, perTable: 3, planCols: 3, amen: ["monitor", "plug", "snow"], pop: 1.15 },
    { id: "wi-204", b: "WI", floor: 2, name: "Pokój projektowy 2.04", type: "Pokój grupowy", mode: "room", capacity: 6, amen: ["monitor", "board", "plug"], pop: 1.2 },
    { id: "ss-001", b: "SS", floor: 0, name: "Kawiarnia nauki 0.01", type: "Strefa otwarta", mode: "seats", tables: 6, perTable: 4, planCols: 3, amen: ["plug", "wifi"], pop: 1.7 },
    { id: "ss-102", b: "SS", floor: 1, name: "Kapsuły ciszy 1.02", type: "Kapsuły jednoosobowe", mode: "seats", tables: 4, perTable: 2, planCols: 4, amen: ["quiet", "plug", "snow"], pop: 1.6, fav: true }, // ulubiona
    { id: "wm-110", b: "WM", floor: 1, name: "Czytelnia wydziałowa 1.10", type: "Czytelnia", mode: "seats", tables: 5, perTable: 4, planCols: 3, amen: ["plug", "window"], pop: .35 },
    { id: "wm-021", b: "WM", floor: 0, name: "Pokój grupowy 0.21", type: "Pokój grupowy", mode: "room", capacity: 4, amen: ["board", "accessible"], pop: .4 },
  ];

  // Nazwy i ikony udogodnień
  const AMENITIES = {
    quiet: { label: "Strefa ciszy", icon: "quiet" },                     // cisza
    plug: { label: "Gniazdko", icon: "plug" },                           // gniazdko elektryczne
    window: { label: "Przy oknie", icon: "window" },                     // światło dzienne
    monitor: { label: "Monitor", icon: "monitor" },                      // monitor / komputer
    board: { label: "Tablica", icon: "board" },                          // tablica
    wifi: { label: "Wi-Fi 6", icon: "wifi" },                            // szybki internet
    snow: { label: "Klimatyzacja", icon: "snow" },                       // klimatyzacja
    accessible: { label: "Dostęp bez barier", icon: "accessible" },      // dostęp dla wózków
  };

  /** Pojemność sali (liczba miejsc). */
  function capacity(room) {
    return room.mode === "room" ? room.capacity : room.tables * room.perTable; // cała sala lub suma miejsc
  }

  /** Mnożnik popularności zależny od godziny (szczyt 10:00–15:00). */
  function hourLoad(slot) {
    const hour = OPEN_HOUR + slot / 2;                                   // godzina slotu
    if (hour < 9) return .35;                                            // rano luźno
    if (hour < 10) return .6;                                            // wypełnianie
    if (hour < 15.5) return 1;                                           // szczyt
    if (hour < 18) return .8;                                            // popołudnie
    if (hour < 21) return .55;                                           // wieczór
    return .3;                                                           // późny wieczór
  }

  /** Miejsca sali z zajętością slotów dla danego dnia (dayOffset: 0 = dziś). */
  function seats(room, dayOffset = 0) {
    const r = rng(`${room.id}#${dayOffset}`);                            // generator dla sali i dnia
    const count = capacity(room);                                        // liczba miejsc
    const list = [];                                                     // lista miejsc
    for (let n = 1; n <= count; n++) {
      const busy = new Array(SLOTS).fill(false);                         // zajętość slotów
      let s = 0;                                                         // bieżący slot
      while (s < SLOTS) {
        if (r() < room.pop * hourLoad(s) * .2) {                        // początek cudzej rezerwacji
          const len = 2 + Math.floor(r() * 5);                           // długość 1–3 h
          for (let k = s; k < Math.min(SLOTS, s + len); k++) busy[k] = true; // oznaczenie zajętości
          s += len + 1;                                                  // przerwa po rezerwacji
        } else {
          s += 1;                                                        // następny slot
        }
      }
      const tableIndex = room.perTable ? Math.floor((n - 1) / room.perTable) : 0; // numer stołu
      const posInTable = room.perTable ? (n - 1) % room.perTable : 0;   // pozycja przy stole
      list.push({
        n,                                                               // numer miejsca
        busy,                                                            // zajętość slotów
        off: room.mode === "seats" && r() < .04,                         // miejsce wyłączone (serwis)
        plug: room.amen.includes("plug") && (posInTable === 0 || posInTable === room.perTable - 1), // gniazdko przy skrajnych miejscach
        window: room.amen.includes("window") && tableIndex < (room.planCols || 3), // pierwszy rząd przy oknie
      });
    }
    // Miejsce rezerwacji demonstracyjnej (12 w sali 2.14) wolne od cudzych rezerwacji w jej czasie
    if (room.id === "bg-214" && dayOffset === 0) {
      for (let k = 14; k < 18; k++) list[11].busy[k] = false;             // rezerwacje użytkownika nakłada aplikacja
    }
    return list;                                                         // gotowa lista
  }

  /** Liczba wolnych miejsc (albo 1/0 dla sali grupowej) w zakresie slotów [from, to). */
  function freeCount(room, dayOffset, from, to) {
    const list = seats(room, dayOffset);                                 // miejsca
    const free = list.filter(seat => !seat.off && seat.busy.slice(from, to).every(b => !b)).length; // wolne w całym zakresie
    if (room.mode === "room") return free === list.length ? 1 : 0;       // sala grupowa: wolna tylko w całości
    return free;                                                         // liczba wolnych miejsc
  }

  /** Udział wolnych miejsc w każdym slocie dnia (0–1) – do osi czasu. */
  function dayProfile(room, dayOffset) {
    const list = seats(room, dayOffset);                                 // miejsca
    const usable = list.filter(seat => !seat.off);                       // miejsca czynne
    return Array.from({ length: SLOTS }, (_, s) => {
      const free = usable.filter(seat => !seat.busy[s]).length;          // wolne w slocie
      if (room.mode === "room") return free === usable.length ? 1 : 0;   // sala: wolna albo zajęta
      return free / usable.length;                                       // udział wolnych
    });
  }

  /** Obłożenie budynku teraz (0–1). */
  function buildingLoad(buildingId) {
    const rooms = ROOMS.filter(room => room.b === buildingId);           // sale budynku
    let total = 0, busy = 0;                                             // liczniki
    rooms.forEach(room => {
      const list = seats(room, 0);                                       // miejsca dziś
      total += list.length;                                              // wszystkie miejsca
      busy += list.filter(seat => seat.off || seat.busy[NOW_SLOT]).length; // zajęte teraz
    });
    return total ? busy / total : 0;                                     // udział zajętych
  }

  // Zalogowana osoba
  const USER = {
    first: "Anna", last: "Kowalska", initials: "AK",                     // imię i nazwisko
    email: "anna.kowalska@student.pmiejska.edu.pl",                     // e-mail uczelniany (fikcyjny)
    album: "248613", faculty: "Wydział Informatyki", field: "Informatyka, II rok", // dane studenta
    noShows: 1, noShowLimit: 3, activeLimit: 3,                          // limity regulaminu
    week: [2.5, 3, 0, 4, 1.5, 0, 0],                                     // godziny nauki w tym tygodniu (pn–nd)
  };

  // Znajomi do zapraszania
  const PEOPLE = [
    { id: "p1", name: "Michał Nowak", email: "m.nowak@student.pmiejska.edu.pl", initials: "MN" },        // znajomy
    { id: "p2", name: "Aleksandra Wiśniewska", email: "a.wisniewska@student.pmiejska.edu.pl", initials: "AW" }, // znajoma
    { id: "p3", name: "Jakub Zieliński", email: "j.zielinski@student.pmiejska.edu.pl", initials: "JZ" }, // znajomy
    { id: "p4", name: "Natalia Lewandowska", email: "n.lewandowska@student.pmiejska.edu.pl", initials: "NL" }, // znajoma
    { id: "p5", name: "Piotr Kamiński", email: "p.kaminski@student.pmiejska.edu.pl", initials: "PK" },  // znajomy
  ];

  // Rezerwacje zalogowanej osoby (status: pending – czeka na meldowanie, confirmed, active, done, noshow, cancelled)
  const RESERVATIONS = [
    { id: "R-4821", room: "bg-214", seats: [12], day: 0, from: 14, to: 18, status: "pending", people: [], created: "wczoraj, 19:12" },          // dziś 14:00–16:00
    { id: "R-4907", room: "cd-108", seats: [], day: 1, from: 6, to: 10, status: "confirmed", people: ["p1", "p2", "p3"], created: "dziś, 9:40" }, // jutro 10:00–12:00
    { id: "R-4610", room: "ss-102", seats: [3], day: -1, from: 18, to: 22, status: "done", people: [], created: "pn, 8:05" },                  // wczoraj
    { id: "R-4588", room: "bg-120", seats: [7], day: -3, from: 4, to: 8, status: "noshow", people: [], created: "pt, 20:11" },                 // nieobecność
    { id: "R-4502", room: "wi-204", seats: [], day: -5, from: 10, to: 14, status: "done", people: ["p1", "p4"], created: "śr, 12:30" },        // grupowa
    { id: "R-4477", room: "cd-215", seats: [4], day: -6, from: 16, to: 20, status: "cancelled", people: [], created: "wt, 7:55" },             // anulowana
  ];

  // Powiadomienia
  const NOTIFICATIONS = [
    { id: "n1", icon: "timer", unread: true, title: "Zamelduj się do 14:15", text: "Czytelnia cicha 2.14, miejsce 12 – rezerwacja zaczyna się o 14:00.", when: "przed chwilą", go: "/rezerwacje/R-4821" }, // przypomnienie
    { id: "n2", icon: "users", unread: true, title: "Michał zaprasza Cię do nauki", text: "Pokój grupowy 1.08 · jutro 10:00–12:00", when: "1 godz. temu", go: "/rezerwacje/R-4907" }, // zaproszenie
    { id: "n3", icon: "star", unread: false, title: "Zwolniło się miejsce w ulubionej sali", text: "Kapsuły ciszy 1.02 – wolne od 15:00", when: "wczoraj", go: "/sala/ss-102" }, // ulubiona sala
  ];

  // Zgłoszenia problemów (panel administratora)
  const ISSUES = [
    { id: "Z-118", room: "bg-214", text: "Nie działa gniazdko przy miejscu 7", who: "student", when: "dziś, 11:20", open: true },      // zgłoszenie
    { id: "Z-117", room: "cd-010", text: "Za głośno – grupa rozmawia w strefie cichej części sali", who: "student", when: "dziś, 9:02", open: true }, // zgłoszenie
    { id: "Z-115", room: "wi-130", text: "Monitor przy stanowisku 4 nie wykrywa sygnału", who: "pracownik", when: "wczoraj", open: true }, // zgłoszenie
  ];

  // Publiczny interfejs modułu
  return { NOW, NOW_SLOT, SLOTS, OPEN_HOUR, BUILDINGS, ROOMS, AMENITIES, USER, PEOPLE, RESERVATIONS, NOTIFICATIONS, ISSUES, slotTime, seats, freeCount, dayProfile, buildingLoad, capacity, rng };
})();
