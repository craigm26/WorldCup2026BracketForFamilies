/* World Cup 2026 family bracket — shared data.
   Flags load from flagcdn.com (ISO codes; gb-eng / gb-sct for England/Scotland).
   Facts are written short + simple for a grown-up to read aloud to little kids. */
window.WC = (function () {
  // Online: flagcdn.com. Offline build sets window.FLAG_BASE (e.g. "flags") and
  // we load local PNGs named <code>.png instead.
  const F = (code, w = 320) =>
    window.FLAG_BASE ? `${window.FLAG_BASE}/${code}.png` : `https://flagcdn.com/w${w}/${code}.png`;

  // n=name, c=flag code, r=FIFA world rank (approx), cap=capital,
  // food=famous food, fact=kid fun fact, star=star player
  const T = {
    MEX: { n: "Mexico",        c: "mx",     r: 13, cap: "Mexico City", food: "Tacos",        fact: "Co-hosts! The very first game is in Mexico City's giant Azteca stadium.", star: "Santiago Giménez" },
    RSA: { n: "South Africa",  c: "za",     r: 61, cap: "Pretoria",    food: "Bunny chow",   fact: "Their fans blow long horns called vuvuzelas — super loud!",            star: "Lyle Foster" },
    KOR: { n: "South Korea",   c: "kr",     r: 22, cap: "Seoul",       food: "Bibimbap",     fact: "Son Heung-min is so fast people call him the 'Son-saldo' rocket.",      star: "Son Heung-min" },
    CZE: { n: "Czechia",       c: "cz",     r: 42, cap: "Prague",      food: "Goulash",      fact: "Their castle in Prague is one of the biggest castles on Earth.",        star: "Patrik Schick" },

    CAN: { n: "Canada",        c: "ca",     r: 31, cap: "Ottawa",      food: "Poutine",      fact: "Co-hosts! Their flag has a red maple leaf — like the syrup tree.",      star: "Alphonso Davies" },
    SUI: { n: "Switzerland",   c: "ch",     r: 20, cap: "Bern",        food: "Cheese fondue",fact: "Switzerland is famous for chocolate, mountains, and yummy cheese.",     star: "Granit Xhaka" },
    QAT: { n: "Qatar",         c: "qa",     r: 51, cap: "Doha",        food: "Machboos",     fact: "Qatar hosted the last World Cup back in 2022.",                         star: "Akram Afif" },
    BIH: { n: "Bosnia & Herz.",c: "ba",     r: 71, cap: "Sarajevo",    food: "Ćevapi",       fact: "They knocked out 4-time champ Italy to get here!",                      star: "Edin Džeko" },

    BRA: { n: "Brazil",        c: "br",     r: 5,  cap: "Brasília",    food: "Feijoada",     fact: "Brazil has won the World Cup 5 times — more than anyone!",              star: "Vinícius Jr." },
    MAR: { n: "Morocco",       c: "ma",     r: 12, cap: "Rabat",       food: "Tagine",       fact: "In 2022 Morocco became the first African team to reach the semifinals.",star: "Achraf Hakimi" },
    HAI: { n: "Haiti",         c: "ht",     r: 84, cap: "Port-au-Prince", food: "Griot",     fact: "Haiti's team is back at the World Cup after 52 whole years!",           star: "Frantzdy Pierrot" },
    SCO: { n: "Scotland",      c: "gb-sct", r: 38, cap: "Edinburgh",   food: "Haggis",       fact: "Scotland invented one of the oldest soccer rule books.",                star: "Scott McTominay" },

    USA: { n: "United States", c: "us",     r: 16, cap: "Washington",  food: "Burgers",      fact: "Co-hosts! The USA will play its games out west, like in Los Angeles.", star: "Christian Pulisic" },
    PAR: { n: "Paraguay",      c: "py",     r: 41, cap: "Asunción",    food: "Sopa paraguaya",fact: "Paraguay's flag is special — the front and back look different!",      star: "Miguel Almirón" },
    AUS: { n: "Australia",     c: "au",     r: 24, cap: "Canberra",    food: "Meat pie",     fact: "The team's nickname is the Socceroos — like soccer + kangaroo!",        star: "Mathew Ryan" },
    TUR: { n: "Türkiye",       c: "tr",     r: 26, cap: "Ankara",      food: "Kebab",        fact: "Türkiye sits on two continents at once: Europe and Asia.",              star: "Arda Güler" },

    GER: { n: "Germany",       c: "de",     r: 9,  cap: "Berlin",      food: "Bratwurst",    fact: "Germany has won the World Cup 4 times. They love precise passing.",     star: "Jamal Musiala" },
    CUW: { n: "Curaçao",       c: "cw",     r: 82, cap: "Willemstad",  food: "Keshi yená",   fact: "A tiny island team! One of the smallest places ever to qualify.",       star: "Leandro Bacuna" },
    CIV: { n: "Côte d'Ivoire", c: "ci",     r: 40, cap: "Yamoussoukro",food: "Attiéké",      fact: "Also called the Ivory Coast. The 'Elephants' are their nickname.",      star: "Simon Adingra" },
    ECU: { n: "Ecuador",       c: "ec",     r: 23, cap: "Quito",       food: "Encebollado",  fact: "Ecuador sits right on the equator — the middle line of Earth!",         star: "Moisés Caicedo" },

    NED: { n: "Netherlands",   c: "nl",     r: 7,  cap: "Amsterdam",   food: "Stroopwafel",  fact: "Their bright orange shirts come from the royal family's name.",         star: "Virgil van Dijk" },
    JPN: { n: "Japan",         c: "jp",     r: 17, cap: "Tokyo",       food: "Sushi",        fact: "Japanese fans famously clean up the stadium after every game!",         star: "Takefusa Kubo" },
    SWE: { n: "Sweden",        c: "se",     r: 27, cap: "Stockholm",   food: "Meatballs",    fact: "Home of meatballs and the tallest soccer star, Isak.",                  star: "Alexander Isak" },
    TUN: { n: "Tunisia",       c: "tn",     r: 39, cap: "Tunis",       food: "Couscous",     fact: "Tunisia's team is nicknamed the 'Eagles of Carthage'.",                 star: "Hannibal Mejbri" },

    BEL: { n: "Belgium",       c: "be",     r: 8,  cap: "Brussels",    food: "Waffles",      fact: "Belgium is famous for waffles, fries, and chocolate. Yum!",             star: "Kevin De Bruyne" },
    EGY: { n: "Egypt",         c: "eg",     r: 32, cap: "Cairo",       food: "Koshari",      fact: "Egypt is home to the giant pyramids and Mo Salah's magic feet.",        star: "Mohamed Salah" },
    IRN: { n: "Iran",          c: "ir",     r: 19, cap: "Tehran",      food: "Kebab & rice", fact: "Iran's team is called 'Team Melli'. Cats called Persian cats live there!",star: "Mehdi Taremi" },
    NZL: { n: "New Zealand",   c: "nz",     r: 86, cap: "Wellington",  food: "Hāngī",        fact: "Before games some teams there do a haka — a powerful dance chant.",     star: "Chris Wood" },

    ESP: { n: "Spain",         c: "es",     r: 1,  cap: "Madrid",      food: "Paella",       fact: "Ranked #1 in the world! They win by passing the ball lots and lots.",   star: "Lamine Yamal" },
    CPV: { n: "Cape Verde",    c: "cv",     r: 68, cap: "Praia",       food: "Cachupa",      fact: "A tiny group of islands — first ever World Cup for the 'Blue Sharks'!", star: "Ryan Mendes" },
    KSA: { n: "Saudi Arabia",  c: "sa",     r: 60, cap: "Riyadh",      food: "Kabsa",        fact: "In 2022 Saudi Arabia shocked everyone by beating Argentina!",           star: "Salem Al-Dawsari" },
    URU: { n: "Uruguay",       c: "uy",     r: 14, cap: "Montevideo",  food: "Asado",        fact: "Uruguay won the very first World Cup ever, way back in 1930.",          star: "Federico Valverde" },

    FRA: { n: "France",        c: "fr",     r: 3,  cap: "Paris",       food: "Baguette",     fact: "France won in 2018. Mbappé runs almost as fast as a car in town!",      star: "Kylian Mbappé" },
    SEN: { n: "Senegal",       c: "sn",     r: 18, cap: "Dakar",       food: "Thieboudienne",fact: "The 'Lions of Teranga' — teranga means warm welcome in Wolof.",         star: "Sadio Mané" },
    IRQ: { n: "Iraq",          c: "iq",     r: 58, cap: "Baghdad",     food: "Masgouf",      fact: "Iraq won the big Asian Cup in 2007 and the whole country danced.",      star: "Aymen Hussein" },
    NOR: { n: "Norway",        c: "no",     r: 25, cap: "Oslo",        food: "Salmon",       fact: "Home of Erling Haaland, a giant striker who scores buckets of goals.",  star: "Erling Haaland" },

    ARG: { n: "Argentina",     c: "ar",     r: 2,  cap: "Buenos Aires",food: "Empanadas",    fact: "The champions! Messi led them to win the last World Cup in 2022.",      star: "Lionel Messi" },
    ALG: { n: "Algeria",       c: "dz",     r: 36, cap: "Algiers",     food: "Couscous",     fact: "Algeria's 'Desert Foxes' come from the largest country in Africa.",     star: "Riyad Mahrez" },
    AUT: { n: "Austria",       c: "at",     r: 21, cap: "Vienna",      food: "Schnitzel",    fact: "Austria has snowy Alps mountains and famous music like Mozart.",        star: "Marcel Sabitzer" },
    JOR: { n: "Jordan",        c: "jo",     r: 66, cap: "Amman",       food: "Mansaf",       fact: "First ever World Cup for Jordan! Home of the rose-red city Petra.",     star: "Mousa Al-Taamari" },

    POR: { n: "Portugal",      c: "pt",     r: 6,  cap: "Lisbon",      food: "Pastéis de nata",fact: "Cristiano Ronaldo has scored more goals than almost anyone, ever.",    star: "Cristiano Ronaldo" },
    COD: { n: "DR Congo",      c: "cd",     r: 56, cap: "Kinshasa",    food: "Fufu",         fact: "The 'Leopards' are home to the mighty Congo rainforest and river.",     star: "Cédric Bakambu" },
    UZB: { n: "Uzbekistan",    c: "uz",     r: 50, cap: "Tashkent",    food: "Plov",         fact: "Uzbekistan's very first World Cup ever — a huge moment for them!",      star: "Eldor Shomurodov" },
    COL: { n: "Colombia",      c: "co",     r: 13, cap: "Bogotá",      food: "Arepas",       fact: "Colombia is famous for happy dancing goal celebrations.",               star: "Luis Díaz" },

    ENG: { n: "England",       c: "gb-eng", r: 4,  cap: "London",      food: "Fish & chips", fact: "England invented modern soccer way back in the 1800s.",                 star: "Jude Bellingham" },
    CRO: { n: "Croatia",       c: "hr",     r: 10, cap: "Zagreb",      food: "Peka",         fact: "Their red-and-white checkerboard shirt looks like a picnic blanket!",   star: "Luka Modrić" },
    GHA: { n: "Ghana",         c: "gh",     r: 72, cap: "Accra",       food: "Jollof rice",  fact: "The 'Black Stars' have one of the most fun, drumming fan crowds.",       star: "Mohammed Kudus" },
    PAN: { n: "Panama",        c: "pa",     r: 30, cap: "Panama City", food: "Sancocho",     fact: "Home of the famous Panama Canal where huge ships cut across land.",     star: "Adalberto Carrasquilla" },
  };

  const GROUPS = {
    A: ["MEX","RSA","KOR","CZE"],
    B: ["CAN","SUI","QAT","BIH"],
    C: ["BRA","MAR","HAI","SCO"],
    D: ["USA","PAR","AUS","TUR"],
    E: ["GER","CUW","CIV","ECU"],
    F: ["NED","JPN","SWE","TUN"],
    G: ["BEL","EGY","IRN","NZL"],
    H: ["ESP","CPV","KSA","URU"],
    I: ["FRA","SEN","IRQ","NOR"],
    J: ["ARG","ALG","AUT","JOR"],
    K: ["POR","COD","UZB","COL"],
    L: ["ENG","CRO","GHA","PAN"],
  };

  // New for 2026: head-to-head comes FIRST, drawing of lots is gone.
  const TIEBREAK = [
    { n: 1, t: "Points",            d: "Win = 3, Draw = 1, Loss = 0" },
    { n: 2, t: "Head-to-head",      d: "Points only in games between the tied teams — NEW for 2026!" },
    { n: 3, t: "H2H goal difference",d: "Goal difference in those head-to-head games" },
    { n: 4, t: "H2H goals scored",  d: "Goals scored in those head-to-head games" },
    { n: 5, t: "Goal difference",   d: "Goal difference across all 3 group games" },
    { n: 6, t: "Goals scored",      d: "Total goals scored in all 3 games" },
    { n: 7, t: "Fair play",         d: "Fewest cards: yellow −1, red −4" },
    { n: 8, t: "FIFA ranking",      d: "World ranking — replaces the old coin toss!" },
  ];

  // 16 host cities. pin = number on the map + next to each fixture's city.
  // lon/lat = real coordinates (the map projects these). nat: CA/MX/US (pin color).
  const CITIES = [
    { pin: 1,  city: "Vancouver",     stadium: "BC Place",                nat: "CA", lon: -123.112, lat: 49.277, fact: "Mountains meet the ocean here, and BC Place has a giant retractable roof." },
    { pin: 2,  city: "Seattle",       stadium: "Lumen Field",             nat: "US", lon: -122.332, lat: 47.595, fact: "One of the LOUDEST stadiums on Earth — fans set noise world records!" },
    { pin: 3,  city: "San Francisco", stadium: "Levi's Stadium",          nat: "US", lon: -121.970, lat: 37.403, fact: "Near the Golden Gate Bridge; the stadium sits in Santa Clara." },
    { pin: 4,  city: "Los Angeles",   stadium: "SoFi Stadium",            nat: "US", lon: -118.339, lat: 33.953, fact: "SoFi is a shiny super-stadium under a giant see-through roof." },
    { pin: 5,  city: "Guadalajara",   stadium: "Estadio Akron",           nat: "MX", lon: -103.463, lat: 20.681, fact: "Mexico's second-biggest city and the home of mariachi music!" },
    { pin: 6,  city: "Mexico City",   stadium: "Estadio Azteca",          nat: "MX", lon: -99.150,  lat: 19.303, fact: "The opening game! Azteca has hosted TWO past World Cup finals." },
    { pin: 7,  city: "Monterrey",     stadium: "Estadio BBVA",            nat: "MX", lon: -100.244, lat: 25.669, fact: "Ringed by mountains; nicknamed 'El Gigante de Acero' — the Steel Giant." },
    { pin: 8,  city: "Houston",       stadium: "NRG Stadium",             nat: "US", lon: -95.411,  lat: 29.685, fact: "NRG has a roof and air-conditioning for hot Texas days." },
    { pin: 9,  city: "Dallas",        stadium: "AT&T Stadium",            nat: "US", lon: -97.093,  lat: 32.747, fact: "Home to one of the biggest video screens in the world." },
    { pin: 10, city: "Kansas City",   stadium: "Arrowhead Stadium",       nat: "US", lon: -94.484,  lat: 39.049, fact: "Holds the record for the loudest crowd roar ever measured." },
    { pin: 11, city: "Atlanta",       stadium: "Mercedes-Benz Stadium",   nat: "US", lon: -84.401,  lat: 33.755, fact: "Its roof opens like a camera shutter — super cool to watch!" },
    { pin: 12, city: "Miami",         stadium: "Hard Rock Stadium",       nat: "US", lon: -80.239,  lat: 25.958, fact: "Sunny beaches nearby; also home to the Miami Dolphins." },
    { pin: 13, city: "Toronto",       stadium: "BMO Field",               nat: "CA", lon: -79.418,  lat: 43.633, fact: "Canada's biggest city; the stadium sits right by Lake Ontario." },
    { pin: 14, city: "Boston",        stadium: "Gillette Stadium",        nat: "US", lon: -71.264,  lat: 42.091, fact: "In Foxborough — home of the New England Patriots." },
    { pin: 15, city: "Philadelphia",  stadium: "Lincoln Financial Field", nat: "US", lon: -75.168,  lat: 39.901, fact: "Home of the Liberty Bell and some very passionate fans." },
    { pin: 16, city: "New York/NJ",   stadium: "MetLife Stadium",         nat: "US", lon: -74.074,  lat: 40.814, fact: "The FINAL is here on July 19 — one of the biggest stadiums of all!" },
  ];
  const PIN = {}; CITIES.forEach((c) => (PIN[c.city] = c.pin));

  // Group-stage fixtures: [homeKey, awayKey, "Jun 11", "City"]. Dates & cities
  // follow the official schedule; kickoff times left off (kid-simple).
  const FIXTURES = {
    A: [["MEX","RSA","Jun 11","Mexico City","3:00 PM ET"],["KOR","CZE","Jun 11","Guadalajara","10:00 PM ET"],["CZE","RSA","Jun 18","Atlanta","12:00 PM ET"],["MEX","KOR","Jun 18","Guadalajara","11:00 PM ET"],["CZE","MEX","Jun 24","Mexico City","9:00 PM ET"],["RSA","KOR","Jun 24","Monterrey","9:00 PM ET"]],
    B: [["CAN","BIH","Jun 12","Toronto","3:00 PM ET"],["QAT","SUI","Jun 13","San Francisco","3:00 PM ET"],["SUI","BIH","Jun 18","Los Angeles","3:00 PM ET"],["CAN","QAT","Jun 18","Vancouver","6:00 PM ET"],["SUI","CAN","Jun 24","Vancouver","3:00 PM ET"],["BIH","QAT","Jun 24","Seattle","3:00 PM ET"]],
    C: [["BRA","MAR","Jun 13","New York/NJ","6:00 PM ET"],["HAI","SCO","Jun 13","Boston","9:00 PM ET"],["SCO","MAR","Jun 19","Boston","6:00 PM ET"],["BRA","HAI","Jun 19","Philadelphia","9:00 PM ET"],["SCO","BRA","Jun 24","Miami","6:00 PM ET"],["MAR","HAI","Jun 24","Atlanta","6:00 PM ET"]],
    D: [["USA","PAR","Jun 12","Los Angeles","9:00 PM ET"],["AUS","TUR","Jun 13","Vancouver","12:00 AM ET"],["USA","AUS","Jun 19","Seattle","3:00 PM ET"],["TUR","PAR","Jun 20","San Francisco","12:00 AM ET"],["TUR","USA","Jun 25","Los Angeles","10:00 PM ET"],["PAR","AUS","Jun 25","San Francisco","10:00 PM ET"]],
    E: [["GER","CUW","Jun 14","Houston","1:00 PM ET"],["CIV","ECU","Jun 14","Philadelphia","7:00 PM ET"],["GER","CIV","Jun 20","Toronto","4:00 PM ET"],["ECU","CUW","Jun 20","Kansas City","8:00 PM ET"],["CUW","CIV","Jun 25","Philadelphia","4:00 PM ET"],["ECU","GER","Jun 25","New York/NJ","4:00 PM ET"]],
    F: [["NED","JPN","Jun 14","Dallas","4:00 PM ET"],["SWE","TUN","Jun 14","Monterrey","10:00 PM ET"],["NED","SWE","Jun 20","Houston","1:00 PM ET"],["TUN","JPN","Jun 20","Monterrey","10:00 PM ET"],["JPN","SWE","Jun 25","Dallas","7:00 PM ET"],["TUN","NED","Jun 25","Kansas City","7:00 PM ET"]],
    G: [["BEL","EGY","Jun 15","Seattle","6:00 PM ET"],["IRN","NZL","Jun 16","Los Angeles","12:00 AM ET"],["BEL","IRN","Jun 21","Los Angeles","3:00 PM ET"],["NZL","EGY","Jun 21","Vancouver","9:00 PM ET"],["EGY","IRN","Jun 26","Seattle","11:00 PM ET"],["NZL","BEL","Jun 26","Vancouver","11:00 PM ET"]],
    H: [["ESP","CPV","Jun 15","Atlanta","1:00 PM ET"],["KSA","URU","Jun 15","Miami","6:00 PM ET"],["ESP","KSA","Jun 21","Atlanta","12:00 PM ET"],["URU","CPV","Jun 21","Miami","6:00 PM ET"],["CPV","KSA","Jun 26","Houston","8:00 PM ET"],["URU","ESP","Jun 26","Guadalajara","8:00 PM ET"]],
    I: [["FRA","SEN","Jun 16","New York/NJ","3:00 PM ET"],["IRQ","NOR","Jun 16","Boston","6:00 PM ET"],["FRA","IRQ","Jun 22","Philadelphia","5:00 PM ET"],["NOR","SEN","Jun 22","New York/NJ","8:00 PM ET"],["NOR","FRA","Jun 26","Boston","3:00 PM ET"],["SEN","IRQ","Jun 26","Toronto","3:00 PM ET"]],
    J: [["ARG","ALG","Jun 16","Kansas City","9:00 PM ET"],["AUT","JOR","Jun 17","San Francisco","12:00 AM ET"],["ARG","AUT","Jun 22","Dallas","1:00 PM ET"],["JOR","ALG","Jun 22","San Francisco","11:00 PM ET"],["ALG","AUT","Jun 27","Kansas City","10:00 PM ET"],["JOR","ARG","Jun 27","Dallas","10:00 PM ET"]],
    K: [["POR","COD","Jun 17","Houston","1:00 PM ET"],["UZB","COL","Jun 17","Mexico City","10:00 PM ET"],["POR","UZB","Jun 23","Houston","1:00 PM ET"],["COL","COD","Jun 23","Guadalajara","10:00 PM ET"],["COL","POR","Jun 27","Miami","7:30 PM ET"],["COD","UZB","Jun 27","Atlanta","7:30 PM ET"]],
    L: [["ENG","CRO","Jun 17","Dallas","4:00 PM ET"],["GHA","PAN","Jun 17","Toronto","7:00 PM ET"],["ENG","GHA","Jun 23","Boston","4:00 PM ET"],["PAN","CRO","Jun 23","Toronto","7:00 PM ET"],["PAN","ENG","Jun 27","New York/NJ","5:00 PM ET"],["CRO","GHA","Jun 27","Philadelphia","5:00 PM ET"]],
  };

  // Knockout round dates (kid-simple, no exact times)
  const KO = [
    { r: "Round of 32",   d: "Jun 28 – Jul 3" },
    { r: "Round of 16",   d: "Jul 4 – 7" },
    { r: "Quarter-finals",d: "Jul 9 – 11" },
    { r: "Semi-finals",   d: "Jul 14 & 15" },
    { r: "3rd place",     d: "Jul 18 · Miami" },
    { r: "FINAL",         d: "Jul 19 · New York/NJ" },
  ];

  const PAST_WINNERS = [
    { y: 2022, w: "Argentina", c: "ar" },
    { y: 2018, w: "France",    c: "fr" },
    { y: 2014, w: "Germany",   c: "de" },
    { y: 2010, w: "Spain",     c: "es" },
    { y: 2006, w: "Italy",     c: "it" },
    { y: 2002, w: "Brazil",    c: "br" },
    { y: 1998, w: "France",    c: "fr" },
  ];

  // Fun records for the kids
  const RECORDS = [
    { big: "5", small: "Brazil's wins — the most ever 🏆" },
    { big: "10.8s", small: "Fastest World Cup goal (Hakan Şükür, 2002) ⚡" },
    { big: "48", small: "Teams in 2026 — biggest World Cup ever!" },
    { big: "104", small: "Total games to watch this summer" },
    { big: "16", small: "Host cities across 3 countries!" },
    { big: "32", small: "Teams reach the knockout Round of 32" },
  ];

  const INFO = {
    title: "WORLD CUP 2026",
    sub: "Canada · Mexico · USA",
    dates: "June 11 – July 19, 2026",
    format: "48 teams • 12 groups • top 2 + 8 best 3rd-place teams reach the Round of 32",
  };


  // ---- rotating kid-friendly facts (5 per team), web-verified ----
  const FACTS = {
    MEX: ["Copper Canyon in Mexico is a network of gorges even bigger and deeper than the Grand Canyon!", "Tacos were born in Mexico, and people there enjoy them filled with almost anything yummy. 🌮", "Mexico hosted the whole World Cup twice, in 1970 and 1986 — and is a host again in 2026!", "Monarch butterflies fly thousands of miles to Mexico's forests every winter to rest together. 🦋", "The frothy chocolate drink we love started in ancient Mexico, sipped warm long, long ago!"],
    RSA: ["Flat-topped Table Mountain rises right over Cape Town, sometimes wearing a cloud like a tablecloth! ⛰️", "A favorite South African treat is a braai — a sizzling outdoor barbecue with friends and family.", "South Africa hosted the very first World Cup ever held in Africa, back in 2010!", "South Africa is home to the 'Big Five' animals, including mighty elephants and lions on safari. 🦁", "Fans there blow long horns called vuvuzelas that buzz like a giant swarm of happy bees!"],
    KOR: ["Jeju Island in South Korea has a volcano you can climb to peek into a green, grassy crater!", "Kimchi is a crunchy, tangy South Korean dish made from veggies — families make big batches together. 🥬", "South Korea reached the World Cup semifinals in 2002, the best-ever finish by an Asian team!", "South Korea built giant palaces in Seoul where guards in colorful robes still march at the gates.", "Korea's alphabet, Hangul, was made so simple that you can learn to read it in just one day!"],
    CZE: ["Prague in Czechia has a fairy-tale castle so big it's one of the largest castles in the whole world! 🏰", "A sweet treat sold all over Prague is trdelník — soft dough wrapped on a stick and rolled in sugar.", "Krtek the Little Mole is a cuddly Czech cartoon star who's been loved by kids in over 80 countries!", "Prague's old Astronomical Clock has been ticking and chiming since the year 1410 — over 600 years!", "Czech goalie Petr Čech later swapped his soccer gloves to play goalie in ice hockey too! 🏒"],
    CAN: ["Canada is the second-largest country on Earth, with snowy peaks, big pine forests, and roaming polar bears! 🐻", "Canadians tap maple trees to make sweet, sticky maple syrup — yummy on warm pancakes! 🥞", "In 2022, Alphonso Davies scored Canada's very first World Cup goal, just 68 seconds into the match! ⚽", "The busy little beaver, with its flat tail and big teeth, is one of Canada's most beloved animals. 🦫", "Did you know Canada has the longest coastline on Earth? You could walk beside the sea for years!"],
    SUI: ["Switzerland's snowy Alps tower into the sky, and the pointy Matterhorn looks like a giant pyramid of stone! 🏔️", "Swiss chocolate is famous worldwide, and gooey melted-cheese fondue is dipped with little bread cubes! 🍫", "Way back in 1954, Switzerland hosted the whole World Cup — soccer fans cheered all summer long!", "Switzerland's flag is a white cross on red, and it's one of only two square flags in the world! 🇨🇭", "Tucked among the mountains, Switzerland sparkles with more than 1,500 shimmering blue lakes."],
    QAT: ["Qatar is a sunny land of golden sand dunes that meet the warm, sparkling waters of the sea! 🏜️", "A favorite Qatari dish is machboos — fluffy spiced rice cooked with meat and tasty seasonings. 🍚", "In 2022, Qatar hosted the World Cup — the very first one ever held in the Arab world! ⚽", "The graceful white Arabian oryx is Qatar's national animal, and falcons are its proud national bird. 🦅", "Long ago, brave Qatari divers swam deep into the sea to find shiny pearls inside oyster shells!"],
    BIH: ["Bosnia & Herzegovina is full of green mountains and rushing rivers so clear you can see the bottom! 🏞️", "A tasty treat here is ćevapi — little grilled sausages tucked into warm, soft flatbread. 😋", "In 2014, Bosnia & Herzegovina played its first-ever World Cup, all the way over in Brazil!", "In the town of Mostar, brave divers leap off the old stone bridge into the river far below! 🌉", "Believe it or not, the city of Sarajevo hosted the Winter Olympic Games back in 1984! ⛷️"],
    BRA: ["The Amazon rainforest in Brazil is so huge it makes its own clouds and rain! 🌳", "Brazilians love pão de queijo — warm, chewy little cheese bread balls. Yum! 🧀", "Brazil has won the World Cup 5 times — more than any other country! 🏆", "Brazil is home to the toucan, a bird with a giant, rainbow-bright beak! 🦜", "In Brazil, kids play football on beaches, streets, and parks — it's everywhere you look!"],
    MAR: ["Morocco's Sahara Desert has golden sand dunes taller than tall buildings! 🏜️", "A favorite Moroccan meal is tagine — stew cooked slowly in a cone-shaped clay pot.", "In 2022, Morocco became the first African team ever to reach a World Cup semifinal! ⚽", "In Morocco's blue city, Chefchaouen, the walls and streets are painted sky-blue! 💙", "Camels in Morocco can walk for days across the desert without needing a drink! 🐫"],
    HAI: ["Haiti shares one warm island with another country, ringed by sparkly blue sea! 🏝️", "Haitians love griot — crispy fried pork served with spicy pickled veggies called pikliz.", "Haiti scored a famous goal against Italy at the 1974 World Cup that fans still cheer! ⚽", "High on a mountain sits the Citadelle, a giant stone castle you can explore! 🏰", "Haiti's bouncy music called kompa makes everyone want to get up and dance! 🎶"],
    SCO: ["Scotland has misty lochs (lakes) and rugged green Highlands full of castles! 🏞️", "A cozy Scottish breakfast treat is warm porridge — oats cooked soft and creamy.", "Scotland and England played the very first official international football match, in 1872!", "The shaggy Highland cow has long orange hair and big curly horns — so fluffy! 🐄", "Scotland's national animal is the unicorn, a magical horse with a single horn! 🦄"],
    USA: ["The Grand Canyon in Arizona is over a mile deep, taller than four super-tall skyscrapers stacked up! 🏜️", "The USA is co-hosting the 2026 World Cup with Mexico and Canada, the first ever to have 48 teams!", "The USA helped host the 1994 World Cup, drawing the biggest crowds the tournament had ever seen!", "The bald eagle is America's national bird, and its wings can stretch wider than a tall grown-up! 🦅", "Surprise: when New Yorkers eat breakfast, many people in California are still fast asleep!"],
    PAR: ["Paraguay and Brazil built the giant Itaipu Dam, which makes electricity from a roaring river! 💡", "A favorite Paraguayan snack is chipa, a warm, chewy cheese bread shaped like a little ring.", "Paraguay reached the World Cup quarterfinals in 2010, their best run ever at the tournament!", "Paraguay has two official languages, Spanish and Guaraní, so kids often grow up speaking both! 🗣️", "Surprise: Paraguay's flag looks different on each side, one of the very few flags in the whole world that does."],
    AUS: ["The Great Barrier Reef off Australia is so huge it can be seen from space! 🐠", "Aussies love a 'snag', a sausage grilled on the barbie and tucked into bread with onions.", "Australia's team is nicknamed the Socceroos, after the kangaroos that bounce across the country!", "Cuddly koalas live only in Australia and sleep up to 20 hours a day in gum trees. 🐨", "Surprise: Australia is the only country that is also a whole continent, all on its own!"],
    TUR: ["Türkiye sits on two continents at once, with one city, Istanbul, in both Europe and Asia!", "Turkish kebabs and sweet, sticky baklava pastry are loved by hungry people all over the world.", "Türkiye's Hakan Şükür scored the fastest goal in World Cup history, in just about 11 seconds! ⚡", "The fairy-chimney rock towers of Cappadocia look like a magical land, with hot-air balloons floating above. 🎈", "Surprise: tulips first became famous in Türkiye long before they bloomed in Holland's flower fields."],
    GER: ["Germany's Black Forest is so thick with tall pine trees it looks dark green even at noon! 🌲", "A warm German pretzel is twisty, golden, and sprinkled with big salt crystals — yum!", "Germany has won the World Cup four times, in 1954, 1974, 1990, and 2014!", "The fairy tales of Snow White and Hansel & Gretel were collected long ago by the Brothers Grimm.", "Gummy bears were invented in Germany more than 100 years ago by a candy maker named Hans! 🐻"],
    CUW: ["Curaçao is a sunny island in the Caribbean Sea with warm turquoise water all year round! 🏝️", "A favorite island treat is fresh fish and funchi, a soft yellow cornmeal side dish.", "Curaçao's soccer team won their very first Caribbean Cup trophy back in 2017! 🏆", "Wild pink flamingos wade in the shallow ponds of Curaçao on their long skinny legs! 🦩", "The houses along Willemstad's harbor are painted bright pink, yellow, and blue like candy!"],
    CIV: ["Côte d'Ivoire sits on the warm Atlantic coast of West Africa with sandy palm-lined beaches! 🌴", "A beloved dish is attiéké, fluffy little grains made from cassava, served with grilled fish.", "Côte d'Ivoire won the big Africa Cup as the host country in 2024 — what a party!", "The team is nicknamed Les Éléphants, the Elephants, and real elephants roam the country too! 🐘", "More cocoa for chocolate grows here than anywhere else on Earth — chocolate's home! 🍫"],
    ECU: ["The Galápagos Islands of Ecuador are home to giant tortoises that can live over 100 years! 🐢", "Ecuador serves up locro, a cozy soup of potatoes, cheese, and creamy avocado on top.", "At their first World Cup in 2002, Agustín Delgado scored Ecuador's very first World Cup goal!", "You can stand right on the middle of the Earth, the equator, with one foot in each half! 🌍", "Surprise: those famous 'Panama' hats are really handwoven in Ecuador from toquilla straw!"],
    NED: ["The Netherlands is so flat and low that lots of it sits below sea level, kept dry by walls and pumps! 🌊", "Stroopwafels are two thin waffles glued together with warm gooey caramel inside. So yummy! 🧇", "The Dutch play 'Total Football,' where every player can attack and defend by swapping spots!", "About a thousand old windmills still turn here, and spring fields glow with colorful tulips! 🌷", "People here bike everywhere — there are more bicycles in the Netherlands than people!"],
    JPN: ["Mount Fuji is Japan's tallest peak, a perfect snowy cone you can see from far, far away! 🗻", "Sushi wraps rice and fish in seaweed, and ramen is a warm, slurpy bowl of noodle soup! 🍜", "Japan and South Korea hosted the World Cup together in 2002 — the first one ever held in Asia!", "In spring, pink cherry blossoms bloom everywhere and people picnic under the flowery trees! 🌸", "Bullet trains here zoom up to 320 km/h and almost never run even a minute late! 🚄"],
    SWE: ["Far up north in Sweden you can see the sky glow green and pink with the Northern Lights! ✨", "Swedish meatballs with lingonberry jam are a cozy favorite dish all around the world! 🍽️", "Sweden's soccer team reached the World Cup final back in 1958, when they hosted it at home!", "Sweden is covered in forests and has nearly 100,000 sparkling lakes to splash in! 🌲", "The cinnamon bun is so loved here that Sweden has a special day just to eat them!"],
    TUN: ["Tunisia sits where the giant golden Sahara Desert meets the sparkly blue Mediterranean Sea! 🏜️", "Couscous is Tunisia's national dish — tiny fluffy grains piled with veggies and spices! 🍲", "Tunisia was the very first Arab and African team to win a World Cup game, way back in 1978!", "The seaside town of Sidi Bou Said is famous for bright white houses with blue doors! 💙", "Parts of the Star Wars movies were filmed in Tunisia's real desert sand dunes! ⭐"],
    BEL: ["Belgium has caves and rolling hills called the Ardennes, full of green forests and wild deer! 🦌", "Belgian waffles are famous worldwide — crispy outside, fluffy inside, topped with strawberries and cream! 🧇", "Belgium's national team is nicknamed the Red Devils, and they wear bright red shirts!", "The city of Brussels has a tiny bronze statue of a little boy called Manneken Pis.", "Did you know Belgium makes some of the yummiest chocolate on Earth — over 2,000 chocolate shops! 🍫"],
    EGY: ["Egypt has the Great Pyramids of Giza, built over 4,500 years ago and still standing tall! 🐪", "Egyptians love koshari — a tasty mix of rice, pasta, lentils, and crispy onions in one bowl!", "Egypt's team is called the Pharaohs, named after the kings who ruled long, long ago!", "The mighty Nile is one of the longest rivers in the world, winding right through Egypt!", "Long ago, Egyptians treasured cats so much that royal cats wore shiny golden jewelry! 🐱"],
    IRN: ["Iran has tall snowy mountains AND warm deserts, plus the sparkling blue Caspian Sea! 🏔️", "In Iran, families share fragrant saffron rice and grilled kebabs at big, happy meals!", "Iran's soccer team is nicknamed Team Melli, which simply means 'the National Team'!", "The old city of Persepolis has giant carved stone stairways made thousands of years ago!", "Did you know fluffy, round-faced Persian cats are named after old Persia, which is now Iran? 🐈"],
    NZL: ["New Zealand has bubbling hot springs, snowy peaks, and bright blue glacier lakes! 🏞️", "Kiwis love a hangi — a feast of food cooked slowly in a warm underground oven!", "New Zealand's team, the All Whites, are heading to the 2026 World Cup!", "The kiwi is a fuzzy, round bird that can't fly and snuffles for bugs at night! 🥝", "Did you know the Maori greet each other by gently pressing noses together, called a hongi?"],
    ESP: ["Spain's Mount Teide is a giant volcano so tall its peak peeks above the clouds! 🌋", "Paella is a sunny Spanish rice dish cooked in a huge flat pan, full of tasty bits.", "Spain won the whole World Cup in 2010, lifting the golden trophy for the first time! 🏆", "Barcelona's Sagrada Familia church has been growing taller for over 140 years.", "In one Spanish town, people throw squishy tomatoes at each other in a giant food fight! 🍅"],
    CPV: ["Cape Verde is a group of ten sunny islands floating in the big blue Atlantic Ocean.", "Cachupa is the cozy Cape Verde stew of corn, beans and veggies, simmered slow and yummy.", "In 2026 Cape Verde plays its very first World Cup ever, a huge dream come true! ⚽", "Music called morna fills Cape Verde with gentle songs about the sea and home. 🎶", "Baby sea turtles hatch on Cape Verde's warm beaches and scurry off to the big ocean! 🐢"],
    KSA: ["At Saudi Arabia's 'Edge of the World', steep cliffs drop into a vast golden desert! 🏜️", "Sweet, sticky dates grow on tall palm trees and are a favorite Saudi treat.", "In 2022 Saudi Arabia surprised everyone by beating Argentina 2-1 at the World Cup! ⚽", "Graceful Arabian horses, famous for speed and beauty, come from this desert land. 🐎", "Falcons are so loved here that these clever birds even get their own airplane seats!"],
    URU: ["Uruguay sits by the ocean, and its sandy beaches stretch for sunny mile after mile! 🏖️", "Uruguayans love a tasty grilled meat feast called asado, sizzled over a wood fire.", "Uruguay won the very first World Cup in 1930, and they got to host it too! 🏆", "People sip a leafy green tea called mate from a special cup all day long. 🧉", "Capybaras, the world's biggest cuddly-looking rodents, splash in Uruguay's rivers!"],
    FRA: ["The Eiffel Tower in Paris grows about 15 cm taller on hot summer days! 🗼", "France makes over 1,000 kinds of cheese — a different one for almost every day!", "France has won the World Cup twice, in 1998 and 2018. ⚽", "Sweet, crunchy croissants were perfected in France — flaky and buttery!", "Did you know wild flamingos live in France's Camargue marshes? 🦩"],
    SEN: ["Senegal's Lake Retba can turn pink like strawberry milk! 🌸", "Thieboudienne — fish and tasty rice — is Senegal's much-loved national dish.", "Senegal reached the World Cup quarter-finals in 2002, their very first time!", "The giant baobab is Senegal's national tree — its trunk is huge and hollow! 🌳", "Senegal's team is the Lions of Teranga — Teranga means warm, friendly welcome!"],
    IRQ: ["Iraq sits between two great rivers, the Tigris and the Euphrates. 🌊", "Sweet, sticky date treats are a favorite in Iraq, home to millions of palms!", "Iraq won the 2007 Asian Cup, lifting the trophy as champions of Asia! 🏆", "People wrote some of the world's first words in Iraq, long, long ago.", "The idea of 60 minutes in an hour began long ago in ancient Iraq! ⏰"],
    NOR: ["Norway's deep, blue fjords are giant water valleys carved by ancient ice! ❄️", "Norwegians love brown cheese — sweet, caramel-y, and great on toast!", "Norway scored in their very first World Cup match way back in 1938. ⚽", "Reindeer roam Norway's far north, where the summer sun shines all night long! 🦌", "Norway is a home of skiing — ancient rock carvings show skiers thousands of years ago!"],
    ARG: ["Argentina has Aconcagua, the tallest mountain in all of the Americas — nearly 7,000 m high! 🏔️", "In Argentina, families grill yummy beef called 'asado' and share sweet caramel 'dulce de leche'.", "Argentina has won the World Cup three times — in 1978, 1986, and 2022! ⚽", "Penguins waddle along Argentina's coast, and the wild Andes are home to fuzzy llamas!", "The thundering Iguazú Falls in Argentina have more waterfalls than you could count!"],
    ALG: ["Algeria is the biggest country in all of Africa, with the giant Sahara Desert! 🐪", "In Algeria, families share couscous — tiny fluffy grains topped with veggies and stew.", "Algeria played in its very first World Cup back in 1982 and surprised everyone! ⚽", "Algeria's national animal is the fennec fox — a tiny desert fox with HUGE ears! 🦊", "Algeria's sunny Mediterranean coast has hundreds of beaches to splash and play on! 🏖️"],
    AUT: ["Austria is covered in snowy Alps mountains, perfect for skiing and sledding! ⛷️", "Austria gave the world Wiener schnitzel — crispy breaded meat — and yummy apple strudel.", "Vienna's Schönbrunn is the world's oldest zoo — it opened way back in 1752!", "The snow globe was invented in Austria's capital city, Vienna!", "Austria once won a World Cup game 7-5 — that's 12 goals in one match! ⚽"],
    JOR: ["Jordan has the Dead Sea, so super-salty you float like a cork! 🌊", "Jordan's favorite dish is mansaf — tender lamb with rice and tangy yogurt sauce.", "The 2026 World Cup is Jordan's very first one — how exciting! ⚽", "Jordan has Petra, a whole city carved into pink rock long, long ago!", "Jordan's red Wadi Rum desert looks so much like Mars that movies are filmed there!"],
    POR: ["The Algarve coast has golden cliffs and hidden sea caves you can only reach by boat. 🌊", "Pastel de nata are warm, flaky custard tarts dusted with cinnamon — a Lisbon favorite!", "Eusebio scored 9 goals at the 1966 World Cup and won the Golden Boot for Portugal. ⚽", "Lisbon's old yellow trams clang up steep hills past rows of colorful tiled houses.", "Surfers ride some of the tallest waves on Earth at Nazare — as high as a building!"],
    COD: ["The Congo River is the deepest river on Earth — deeper than a 70-story building! 🌊", "Fufu is soft, stretchy dough you roll into a ball and dip in tasty stew.", "In 1974 the Leopards became the first team from south of the Sahara to play a World Cup. ⚽", "Bonobos, playful cousins of chimps, live in DR Congo's rainforests and nowhere else! 🐒", "The okapi has zebra-striped legs and a long blue tongue it uses to clean its own ears!"],
    UZB: ["Uzbekistan sits on the ancient Silk Road, where traders carried spices and silk long ago.", "Plov is a feast of rice, carrots, and meat cooked together in one huge bubbling pot. 🍚", "The 2026 World Cup is the very first time Uzbekistan has ever played in the finals! ⚽", "Samarkand's domes shimmer with sky-blue tiles that sparkle in the sunshine. 💙", "Uzbekistan is one of only two countries on Earth ringed only by landlocked neighbors!"],
    COL: ["Colombia's Cano Cristales glows red, yellow, and green — the river of five colors! 🌈", "Arepas are warm corn cakes you can fill with cheese, eggs, or anything yummy.", "James Rodriguez won the 2014 World Cup Golden Boot with six goals for Colombia. ⚽", "Colombia grows some of the world's most famous coffee, high up in green mountains. ☕", "The Andean condor, with huge 10-foot wings, soars over Colombia's tall mountains! 🦅"],
    ENG: ["England's white cliffs of Dover shine bright like sugar by the sparkly blue sea! 🪨", "Fish and chips, wrapped warm in paper, is a yummy English seaside treat! 🍟", "England hosted and won the World Cup back in 1966 at Wembley Stadium!", "Big Ben's giant clock tower bongs across London so everyone knows the time! 🕔", "The little robin redbreast is England's favorite garden bird, seen all winter long!"],
    CRO: ["Croatia has over a thousand sunny islands dotted across the sparkling Adriatic Sea! 🏝️", "Crispy fritule are tiny Croatian doughnuts, dusted with sweet sugar!", "Croatia's team wears red-and-white checkers and reached the World Cup final in 2018!", "Dubrovnik has old stone walls you can walk all the way around the city! 🏰", "The fancy necktie was invented in Croatia, which is why it's called a 'cravat'!"],
    GHA: ["Ghana's Lake Volta is one of the biggest people-made lakes on the whole planet! 💧", "Jollof rice, cooked bright orange and tasty, is a favorite meal in Ghana! 🍚", "Ghana's Black Stars thrilled the world by reaching the World Cup quarter-finals in 2010!", "Kente cloth is woven in bright colors and patterns, each one telling its own story!", "Ghana is home to chocolate, growing lots of the cocoa beans that make candy bars! 🍫"],
    PAN: ["The Panama Canal lets giant ships sail from one ocean to the other! 🚢", "Sancocho is a warm Panamanian chicken soup that families love to share! 🍲", "Panama played in its very first World Cup in 2018, a huge proud moment!", "Panama's tiny golden frogs wave their hands to say hello, like a friendly little wiggle! 🐸", "Panama is so curvy you can watch the sun rise over the Pacific and set over the Atlantic!"]
  };
  Object.keys(FACTS).forEach(function (k) { if (T[k]) T[k].facts = FACTS[k]; });

  // ---- 2026 knockout bracket skeleton (official: match #, venue, date, ET kickoff,
  // and which group-finisher / match-winner feeds each slot). Teams unknown until played. ----
  const KO_M = {
    73:{no:73,round:"R32",date:"Jun 28",et:"3:00 PM ET",city:"Los Angeles",stadium:"SoFi Stadium",top:"2A",bottom:"2B",feeds:90},
    74:{no:74,round:"R32",date:"Jun 29",et:"4:30 PM ET",city:"Boston",stadium:"Gillette Stadium",top:"1E",bottom:"3ABCDF",feeds:89},
    75:{no:75,round:"R32",date:"Jun 29",et:"9:00 PM ET",city:"Monterrey",stadium:"Estadio BBVA",top:"1F",bottom:"2C",feeds:90},
    76:{no:76,round:"R32",date:"Jun 29",et:"1:00 PM ET",city:"Houston",stadium:"NRG Stadium",top:"1C",bottom:"2F",feeds:91},
    77:{no:77,round:"R32",date:"Jun 30",et:"5:00 PM ET",city:"New York/NJ",stadium:"MetLife Stadium",top:"1I",bottom:"3CDFGH",feeds:89},
    78:{no:78,round:"R32",date:"Jun 30",et:"1:00 PM ET",city:"Dallas",stadium:"AT&T Stadium",top:"2E",bottom:"2I",feeds:91},
    79:{no:79,round:"R32",date:"Jun 30",et:"9:00 PM ET",city:"Mexico City",stadium:"Estadio Azteca",top:"1A",bottom:"3CEFHI",feeds:92},
    80:{no:80,round:"R32",date:"Jul 1",et:"12:00 PM ET",city:"Atlanta",stadium:"Mercedes-Benz Stadium",top:"1L",bottom:"3EHIJK",feeds:92},
    81:{no:81,round:"R32",date:"Jul 1",et:"8:00 PM ET",city:"San Francisco",stadium:"Levi's Stadium",top:"1D",bottom:"3BEFIJ",feeds:94},
    82:{no:82,round:"R32",date:"Jul 1",et:"4:00 PM ET",city:"Seattle",stadium:"Lumen Field",top:"1G",bottom:"3AEHIJ",feeds:94},
    83:{no:83,round:"R32",date:"Jul 2",et:"7:00 PM ET",city:"Toronto",stadium:"BMO Field",top:"2K",bottom:"2L",feeds:93},
    84:{no:84,round:"R32",date:"Jul 2",et:"3:00 PM ET",city:"Los Angeles",stadium:"SoFi Stadium",top:"1H",bottom:"2J",feeds:93},
    85:{no:85,round:"R32",date:"Jul 2",et:"11:00 PM ET",city:"Vancouver",stadium:"BC Place",top:"1B",bottom:"3EFGIJ",feeds:96},
    86:{no:86,round:"R32",date:"Jul 3",et:"6:00 PM ET",city:"Miami",stadium:"Hard Rock Stadium",top:"1J",bottom:"2H",feeds:95},
    87:{no:87,round:"R32",date:"Jul 3",et:"9:30 PM ET",city:"Kansas City",stadium:"Arrowhead Stadium",top:"1K",bottom:"3DEIJL",feeds:96},
    88:{no:88,round:"R32",date:"Jul 3",et:"2:00 PM ET",city:"Dallas",stadium:"AT&T Stadium",top:"2D",bottom:"2G",feeds:95},
    89:{no:89,round:"R16",date:"Jul 4",et:"5:00 PM ET",city:"Philadelphia",stadium:"Lincoln Financial Field",top:"W74",bottom:"W77",feeds:97},
    90:{no:90,round:"R16",date:"Jul 4",et:"1:00 PM ET",city:"Houston",stadium:"NRG Stadium",top:"W73",bottom:"W75",feeds:97},
    91:{no:91,round:"R16",date:"Jul 5",et:"4:00 PM ET",city:"New York/NJ",stadium:"MetLife Stadium",top:"W76",bottom:"W78",feeds:99},
    92:{no:92,round:"R16",date:"Jul 5",et:"8:00 PM ET",city:"Mexico City",stadium:"Estadio Azteca",top:"W79",bottom:"W80",feeds:99},
    93:{no:93,round:"R16",date:"Jul 6",et:"3:00 PM ET",city:"Dallas",stadium:"AT&T Stadium",top:"W83",bottom:"W84",feeds:98},
    94:{no:94,round:"R16",date:"Jul 6",et:"8:00 PM ET",city:"Seattle",stadium:"Lumen Field",top:"W81",bottom:"W82",feeds:98},
    95:{no:95,round:"R16",date:"Jul 7",et:"12:00 PM ET",city:"Atlanta",stadium:"Mercedes-Benz Stadium",top:"W86",bottom:"W88",feeds:100},
    96:{no:96,round:"R16",date:"Jul 7",et:"4:00 PM ET",city:"Vancouver",stadium:"BC Place",top:"W85",bottom:"W87",feeds:100},
    97:{no:97,round:"QF",date:"Jul 9",et:"4:00 PM ET",city:"Boston",stadium:"Gillette Stadium",top:"W89",bottom:"W90",feeds:101},
    98:{no:98,round:"QF",date:"Jul 10",et:"3:00 PM ET",city:"Los Angeles",stadium:"SoFi Stadium",top:"W93",bottom:"W94",feeds:101},
    99:{no:99,round:"QF",date:"Jul 11",et:"5:00 PM ET",city:"Miami",stadium:"Hard Rock Stadium",top:"W91",bottom:"W92",feeds:102},
    100:{no:100,round:"QF",date:"Jul 11",et:"9:00 PM ET",city:"Kansas City",stadium:"Arrowhead Stadium",top:"W95",bottom:"W96",feeds:102},
    101:{no:101,round:"SF",date:"Jul 14",et:"3:00 PM ET",city:"Dallas",stadium:"AT&T Stadium",top:"W97",bottom:"W98",feeds:104},
    102:{no:102,round:"SF",date:"Jul 15",et:"3:00 PM ET",city:"Atlanta",stadium:"Mercedes-Benz Stadium",top:"W99",bottom:"W100",feeds:104},
    103:{no:103,round:"3RD",date:"Jul 18",et:"5:00 PM ET",city:"Miami",stadium:"Hard Rock Stadium",top:"L101",bottom:"L102",feeds:null},
    104:{no:104,round:"FINAL",date:"Jul 19",et:"3:00 PM ET",city:"New York/NJ",stadium:"MetLife Stadium",top:"W101",bottom:"W102",feeds:null}
  };
  const KO_LAYOUT = {"L": {"SF": [101], "QF": [97, 98], "R16": [89, 90, 93, 94], "R32": [74, 77, 73, 75, 83, 84, 81, 82]}, "R": {"SF": [102], "QF": [99, 100], "R16": [91, 92, 95, 96], "R32": [76, 78, 79, 80, 86, 88, 85, 87]}};
  // Human-friendly feeder label. short=true for tight bracket slots.
  function feeder(code, short) {
    if (!code) return "";
    var m;
    if (m = code.match(/^1([A-L])$/)) return short ? "Win " + m[1] : "Winner Group " + m[1];
    if (m = code.match(/^2([A-L])$/)) return short ? "2nd " + m[1] : "Runner-up Group " + m[1];
    if (m = code.match(/^3([A-L]+)$/)) return (short ? "3rd " : "3rd-place from ") + m[1].split("").join("/");
    if (m = code.match(/^W(\d+)$/)) return (short ? "Win M" : "Winner of Match ") + m[1];
    if (m = code.match(/^L(\d+)$/)) return (short ? "Lose M" : "Loser of Match ") + m[1];
    return code;
  }

  return { T, GROUPS, FIXTURES, KO, TIEBREAK, CITIES, PIN, PAST_WINNERS, RECORDS, INFO, F, KO_M, KO_LAYOUT, feeder };
})();
