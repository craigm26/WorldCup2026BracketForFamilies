/* Panini FIFA World Cup 2026 sticker album — structural data (no copyrighted art).
   Authoritative checklist (laststicker.com / checklistinsider): 980 base stickers —
   20 specials (00 + FWC1..FWC19) and 48 teams x 20 (codes like MEX1, ARG20).
   Per team: X1 = Emblem (foil), X13 = Team Photo, the rest = players.
   Sticker ids ("n") are STRING CODES, matching what's printed on each sticker.
   Player names are real; position/club/fun-fact enrichment is added separately (Phase 2).
   Dual export: window.WCSTK (browser) + module.exports (Node tests). */
(function (root, factory) {
  const data = factory();
  if (typeof window !== 'undefined') window.WCSTK = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(this, function () {
  // [group, code, country, flagIso?] — 4 teams per group, A..L. flagIso only when the
  // code doesn't match WC.T's key (BIH isn't in WC.T → 'ba').
  const TEAMS = [
    ['A', 'MEX', 'Mexico'],        ['A', 'RSA', 'South Africa'], ['A', 'KOR', 'South Korea'],   ['A', 'CZE', 'Czechia'],
    ['B', 'CAN', 'Canada'],        ['B', 'BIH', 'Bosnia and Herzegovina', 'ba'], ['B', 'QAT', 'Qatar'], ['B', 'SUI', 'Switzerland'],
    ['C', 'BRA', 'Brazil'],        ['C', 'MAR', 'Morocco'],      ['C', 'HAI', 'Haiti'],          ['C', 'SCO', 'Scotland'],
    ['D', 'USA', 'United States'], ['D', 'PAR', 'Paraguay'],     ['D', 'AUS', 'Australia'],       ['D', 'TUR', 'Türkiye'],
    ['E', 'GER', 'Germany'],       ['E', 'CUW', 'Curaçao'],      ['E', 'CIV', 'Ivory Coast'],     ['E', 'ECU', 'Ecuador'],
    ['F', 'NED', 'Netherlands'],   ['F', 'JPN', 'Japan'],        ['F', 'SWE', 'Sweden'],          ['F', 'TUN', 'Tunisia'],
    ['G', 'BEL', 'Belgium'],       ['G', 'EGY', 'Egypt'],        ['G', 'IRN', 'Iran'],            ['G', 'NZL', 'New Zealand'],
    ['H', 'ESP', 'Spain'],         ['H', 'CPV', 'Cape Verde'],   ['H', 'KSA', 'Saudi Arabia'],    ['H', 'URU', 'Uruguay'],
    ['I', 'FRA', 'France'],        ['I', 'SEN', 'Senegal'],      ['I', 'IRQ', 'Iraq'],            ['I', 'NOR', 'Norway'],
    ['J', 'ARG', 'Argentina'],     ['J', 'ALG', 'Algeria'],      ['J', 'AUT', 'Austria'],         ['J', 'JOR', 'Jordan'],
    ['K', 'POR', 'Portugal'],      ['K', 'COD', 'DR Congo'],     ['K', 'UZB', 'Uzbekistan'],      ['K', 'COL', 'Colombia'],
    ['L', 'ENG', 'England'],       ['L', 'CRO', 'Croatia'],      ['L', 'GHA', 'Ghana'],           ['L', 'PAN', 'Panama'],
  ];

  // Per-team 20 names in code order (index 0 => code <CODE>1). "Emblem" + "Team Photo" are not players.
  const ROSTER = {
    MEX: ['Emblem','Luis Malagón','Johan Vasquez','Jorge Sánchez','Cesar Montes','Jesus Gallardo','Israel Reyes','Diego Lainez','Carlos Rodriguez','Edson Alvarez','Orbelin Pineda','Marcel Ruiz','Team Photo','Érick Sánchez','Hirving Lozano','Santiago Giménez','Raúl Jiménez','Alexis Vega','Roberto Alvarado','Cesar Huerta'],
    RSA: ['Emblem','Ronwen Williams','Sipho Chaine','Aubrey Modiba','Samukele Kabini','Mbekezeli Mbokazi','Khulumani Ndamane','Siyabonga Ngezana','Khuliso Mudau','Nkosinathi Sibisi','Teboho Mokoena','Thalente Mbatha','Team Photo','Bathusi Aubaas','Yaya Sithole','Sipho Mbule','Lyle Foster','Iqraam Rayners','Mohau Nkota','Oswin Appollis'],
    KOR: ['Emblem','Hyeon-woo Jo','Seung-Gyu Kim','Min-jae Kim','Yu-min Cho','Young-woo Seol','Han-beom Lee','Tae-seok Lee','Myung-jae Lee','Jae-sung Lee','In-beom Hwang','Kang-in Lee','Team Photo','Seung-ho Paik','Jens Castrop','Dongg-yeong Lee','Gue-sung Cho','Heung-min Son','Hee-chan Hwang','Hyeon-Gyu Oh'],
    CZE: ['Emblem','Matej Kovar','Jindrich Stanek','Ladislav Krejci','Vladimir Coufal','Jaroslav Zeleny','Tomas Holes','David Zima','Michal Sadilek','Lukas Provod','Lukas Cerv','Tomas Soucek','Team Photo','Pavel Sulc','Matej Vydra','Vasil Kusej','Tomas Chory','Vaclav Cerny','Adam Hlozek','Patrik Schick'],
    CAN: ['Emblem','Dayne St.Clair','Alphonso Davies','Alistair Johnston','Samuel Adekugbe','Richie Laryea','Derek Cornelius','Moïse Bombito','Kamal Miller','Stephen Eustáquio','Ismaël Koné','Jonathan Osorio','Team Photo','Jacob Shaffelburg','Mathieu Choinière','Niko Sigur','Tajon Buchanan','Liam Millar','Cyle Larin','Jonathan David'],
    BIH: ['Emblem','Nikola Vasilj','Amer Dedic','Sead Kolasinac','Tarik Muharemovic','Nihad Mujakic','Nikola Katic','Amir Hadziahmetovic','Benjamin Tahirovic','Armin Gigovic','Ivan Sunjic','Ivan Basic','Team Photo','Dzenis Burnic','Esmir Bajraktarevic','Amar Memic','Ermedin Demirovic','Edin Dzeko','Samed Bazdar','Haris Tabakovic'],
    QAT: ['Emblem','Meshaal Barsham','Sultan Albrake','Lucas Mendes','Homam Ahmed','Boualem Khoukhi','Pedro Miguel','Tarek Salman','Mohamed Al-Mannai','Karim Boudiaf','Assim Madibo','Ahmed Fatehi','Team Photo','Mohammed Waad','Abdulaziz Hatem','Hassan Al-Haydos','Edmilson Junior','Akram Hassan Afif','Ahmed Al Ganehi','Almoez Ali'],
    SUI: ['Emblem','Gregor Kobel','Yvon Mvogo','Manuel Akanji','Ricardo Rodriguez','Nico Elvedi','Aurèle Amenda','Silvan Widmer','Granit Xhaka','Denis Zakaria','Remo Freuler','Fabian Rieder','Team Photo','Ardon Jashari','Johan Manzambi','Michel Aebischer','Breel Embolo','Ruben Vargas','Dan Ndoye','Zeki Amdouni'],
    BRA: ['Emblem','Alisson','Bento','Marquinhos','Éder Militão','Gabriel Magalhães','Danilo','Wesley','Lucas Paquetá','Casemiro','Bruno Guimarães','Luiz Henrique','Team Photo','Vinicius Júnior','Rodrygo','João Pedro','Matheus Cunha','Gabriel Martinelli','Raphinha','Estévão'],
    MAR: ['Emblem','Yassine Bounou','Munir El Kajoui','Achraf Hakimi','Noussair Mazraoui','Nayef Aguerd','Romain Saïss','Jawad El Yamiq','Adam Masina','Sofyan Amrabat','Azzedine Ounahi','Eliesse Ben Seghir','Team Photo','Bilal El Khannouss','Ismael Saibari','Youssef En-Nesyri','Abde Ezzalzouli','Soufiane Rahimi','Brahim Diaz','Ayoub El Kaabi'],
    HAI: ['Emblem','Johny Placide','Carlens Arcus','Martin Expérience','Jean-Kevin Duverne','Ricardo Adé','Duke Lacroix','Garven Metusala','Hannes Delcroix','Leverton Pierre','Danley Jean Jacques','Jean-Ricner Bellegarde','Team Photo','Christopher Attys','Derrick Etienne Jr','Josue Casimir','Ruben Providence','Duckens Nazon','Louicius Deedson','Frantzdy Pierrot'],
    SCO: ['Emblem','Angus Gunn','Jack Hendry','Kieran Tierney','Aaron Hickey','Andrew Robertson','Scott McKenna','John Souttar','Anthony Ralston','Grant Hanley','Scott McTominay','Billy Gilmour','Team Photo','Lewis Ferguson','Ryan Christie','Kenny McLean','John McGinn','Lyndon Dykes','Che Adams','Ben Gannon-Doak'],
    USA: ['Emblem','Matt Freese','Chris Richards','Tim Ream','Mark McKenzie','Alex Freeman','Antonee Robinson','Tyler Adams','Tanner Tessmann','Weston McKenny','Christian Roldan','Timothy Weah','Team Photo','Diego Luna','Malik Tillman','Christian Pulisic','Brenden Aaronson','Ricardo Pepi','Haji Wright','Folarin Balogun'],
    PAR: ['Emblem','Roberto Fernandez','Orlando Gill','Gustavo Gomez','Fabián Balbuena','Juan José Cáceres','Omar Alderete','Junior Alonso','Mathías Villasanti','Diego Gomez','Damián Bobadilla','Andres Cubas','Team Photo','Matias Galarza Fonda','Julio Enciso','Alejandro Romero Gamarra','Miguel Almirón','Ramon Sosa','Angel Romero','Antonio Sanabria'],
    AUS: ['Emblem','Mathew Ryan','Joe Gauci','Harry Souttar','Alessandro Circati','Jordan Bos','Aziz Behich','Cameron Burgess','Lewis Miller','Milos Degenek','Jackson Irvine','Riley McGree','Team Photo',"Aiden O'Neill",'Connor Metcalfe','Patrick Yazbek','Craig Goodwin','Kusini Yengi','Nestory Irankunda','Mohamed Touré'],
    TUR: ['Emblem','Ugurcan Cakir','Mert Muldur','Zeki Celik','Abdulkerim Bardakci','Caglar Soyuncu','Merih Demiral','Ferdi Kadioglu','Kaan Ayhan','Ismail Yuksek','Hakan Calhanoglu','Orkun Kokcu','Team Photo','Arda Guler','Irfan Can Kahveci','Yunus Akgun','Can Uzun','Baris Alper Yilmaz','Kerem Akturkoglu','Kenan Yildiz'],
    GER: ['Emblem','Marc-André ter Stegen','Jonathan Tah','David Raum','Nico Schlotterbeck','Antonio Rüdiger','Waldemar Anton','Ridle Baku','Maximilian Mittelstadt','Joshua Kimmich','Florian Wirtz','Felix Nmecha','Team Photo','Leon Goretzka','Jamal Musiala','Serge Gnabry','Kai Havertz','Leroy Sane','Karim Adeyemi','Nick Woltemade'],
    CUW: ['Emblem','Eloy Room','Armando Obispo','Sherel Floranus','Jurien Gaari','Joshua Brenet','Roshon Van Eijma','Shurandy Sambo','Livano Comenencia','Godfried Roemeratoe','Juninho Bacuna','Leandro Bacuna','Team Photo','Tahith Chong','Kenji Gorre','Jearl Margaritha','Jurgen Locadia','Jeremy Antonisse','Gervane Kastaneer','Sontje Hansen'],
    CIV: ['Emblem','Yahia Fofana','Ghislain Konan','Wilfried Singo','Odilon Kossounou','Evan Ndicka','Willy Boly','Emmanuel Agbadou','Ousmane Diomande','Franck Kessie','Seko Fofana','Ibrahim Sangare','Team Photo','Jean-Philippe Gbamin','Amad Diallo','Sébastien Haller','Simon Adingra','Yan Diomande','Evann Guessand','Oumar Diakite'],
    ECU: ['Emblem','Hernán Galíndez','Gonzalo Valle','Piero Hincapié','Pervis Estupiñán','Willian Pacho','Ángelo Preciado','Joel Ordóñez','Moises Caicedo','Alan Franco','Kendry Paez','Pedro Vite','Team Photo','John Yeboah','Leonardo Campana','Gonzalo Plata','Nilson Angulo','Alan Minda','Kevin Rodriguez','Enner Valencia'],
    NED: ['Emblem','Bart Verbruggen','Virgil van Dijk','Micky van de Ven','Jurrien Timber','Denzel Dumfries','Nathan Aké','Jeremie Frimpong','Jan Paul van Hecke','Tijjani Reijnders','Ryan Gravenberch','Teun Koopmeiners','Team Photo','Frenkie de Jong','Xavi Simons','Justin Kluivert','Memphis Depay','Donyell Malen','Wout Weghorst','Cody Gakpo'],
    JPN: ['Emblem','Zion Suzuki','Henry Heroki Mochizuki','Ayumu Seko','Junnosuke Suzuki','Shogo Taniguchi','Tsuyoshi Watanabe','Kaishu Sano','Yuki Soma','Ao Tanaka','Daichi Kamada','Takefusa Kubo','Team Photo','Ritsu Doan','Keito Nakamura','Takumi Minamino','Shuto Machino','Junya Ito','Koki Ogawa','Ayase Ueda'],
    SWE: ['Emblem','Victor Johansson','Isak Hien','Gabriel Gudmundsson','Emil Holm','Victor Nilsson Lindelöf','Gustaf Lagerbielke','Lucas Bergvall','Hugo Larsson','Jesper Karlström','Yasin Ayari','Mattias Svanberg','Team Photo','Daniel Svensson','Ken Sema','Roony Bardghji','Dejan Kulusevski','Anthony Elanga','Alexander Isak','Viktor Gyökeres'],
    TUN: ['Emblem','Bechir Ben Said','Aymen Dahmen','Yan Valery','Montassar Talbi','Yassine Meriah','Ali Abdi','Dylan Bronn','Ellyes Skhiri','Aissa Laidouni','Ferjani Sassi','Mohamed Ali Ben Romdhane','Team Photo','Hannibal Mejbri','Elias Achouri','Elias Saad','Hazem Mastouri','Ismael Gharbi','Sayfallah Ltaief','Naim Sliti'],
    BEL: ['Emblem','Thibaut Courtois','Arthur Theate','Timothy Castagne','Zeno Debast','Brandon Mechele','Maxim De Cuyper','Thomas Meunier','Youri Tielemans','Amadou Onana','Nicolas Raskin','Alexis Saelemaekers','Team Photo','Hans Vanaken','Kevin De Bruyne','Jérémy Doku','Charles De Ketelaere','Leandro Trossard','Loïs Openda','Romelu Lukaku'],
    EGY: ['Emblem','Mohamed El Shenawy','Mohamed Hany','Mohamed Hamdy','Yasser Ibrahim','Khaled Sobhi','Ramy Rabia','Hossam Abdelmaguid','Ahmed Fatouh','Marwan Attia','Zizo','Hamdy Fathy','Team Photo','Mohamed Lasheen','Emam Ashour','Osama Faisal','Mohamed Salah','Mostafa Mohamed','Trezeguet','Omar Marmoush'],
    IRN: ['Emblem','Alireza Beiranvand','Morteza Pouraliganji','Ehsan Hajsafi','Milad Mohammadi','Shojae Khalilzadeh','Ramin Rezaeian','Hossein Kanaani','Sadegh Moharrami','Saleh Hardani','Saeed Ezatolahi','Saman Ghoddos','Team Photo','Omid Noorafkan','Roozbeh Cheshmi','Mohammad Mohebi','Sardar Azmoun','Mehdi Taremi','Alireza Jahanbakhsh','Ali Gholizadeh'],
    NZL: ['Emblem','Max Crocombe','Alex Paulsen','Michael Boxall','Liberato Cacace','Tim Payne','Tyler Bindon','Francis de Vries','Finn Surman','Joe Bell','Sarpreet Singh','Ryan Thomas','Team Photo','Matthew Garbett','Marko Stamenić','Ben Old','Chris Wood','Elijah Just','Callum McCowatt','Kosta Barbarouses'],
    ESP: ['Emblem','Unai Simon','Robin Le Normand','Aymeric Laporte','Dean Huijsen','Pedro Porro','Dani Carvajal','Marc Cucurella','Martín Zubimendi','Rodri','Pedri','Fabian Ruiz','Team Photo','Mikel Merino','Lamine Yamal','Dani Olmo','Nico Williams','Ferran Torres','Álvaro Morata','Mikel Oyarzabal'],
    CPV: ['Emblem','Vozinha','Logan Costa','Pico','Diney','Steven Moreira','Wagner Pina','Joao Paulo','Yannick Semedo','Kevin Pina','Patrick Andrade','Jamiro Monteiro','Team Photo','Deroy Duarte','Garry Rodrigues','Jovane Cabral','Ryan Mendes','Dailon Livramento','Willy Semedo','Bebe'],
    KSA: ['Emblem','Nawaf Alaqidi','Abdulrahman Al-Sanbi','Saud Abdulhamid','Nawaf Bouwashl','Jihad Thakri','Moteb Al-Harbi','Hassan Altambakti','Musab Aljuwayr','Ziyad Aljohani','Abdullah Alkhaibari','Nasser Aldawsari','Team Photo','Saleh Abu Alshamat','Marwan Alsahafi','Salem Aldawsari','Abdulrahman Al-Aboud','Feras Akbrikan','Saleh Alshehri','Abdullah Al-Hamdan'],
    URU: ['Emblem','Sergio Rochet','Santiago Mele','Ronald Araujo','José María Giménez','Sebastian Caceres','Mathias Olivera','Guillermo Varela','Nahitan Nandez','Federico Valverde','Giorgian De Arrascaeta','Rodrigo Bentancur','Team Photo','Manuel Ugarte','Nicolás de la Cruz','Maxi Araujo','Darwin Núñez','Federico Viñas','Rodrigo Aguirre','Facundo Pellistri'],
    FRA: ['Emblem','Mike Maignan','Theo Hernandez','William Saliba','Jules Kounde','Ibrahima Konate','Dayot Upamecano','Lucas Digne','Aurélien Tchouaméni','Eduardo Camavinga','Manu Kone','Adrien Rabiot','Team Photo','Michael Olise','Ousmane Dembele','Bradley Barcola','Désiré Doué','Kingsley Coman','Hugo Ekitike','Kylian Mbappe'],
    SEN: ['Emblem','Édouard Mendy','Yehvann Diouf','Moussa Niakhaté','Abdoulaye Seck','Ismail Jakobs','El Hadji Malick Diouf','Kalidou Koulibaly','Idrissa Gana Gueye','Pape Matar Sarr','Pape Gueye','Habib Diarra','Team Photo','Lamine Camara','Sadio Mane','Ismaïla Sarr','Boulaye Dia','Iliman Ndiaye','Nicolas Jackson','Krepin Diatta'],
    IRQ: ['Emblem','Jalal Hassan','Rebin Sulaka','Hussein Ali','Akam Hashem','Merchas Doski','Zaid Tahseen','Manaf Younis','Zidane Iqbal','Amir Al-Ammari','Ibrahim Bayesh','Ali Jasim','Team Photo','Youssef Amyn','Aimar Sher','Marko Farji','Osama Rashid','Ali Al-Hamadi','Aymen Hussein','Mohanad Ali'],
    NOR: ['Emblem','Orjan Nyland','Julian Ryerson','Leo Ostigård','Kristoffer Vassbakk Ajer','Marcus Holmgren Pedersen','David Møller Wolfe','Torbjørn Heggem','Morten Thorsby','Martin Ødegaard','Sander Berge','Andreas Schjelderup','Team Photo','Patrick Berg','Erling Haaland','Alexander Sørloth','Aron Dønnum','Jorgen Strand Larsen','Antonio Nusa','Oscar Bobb'],
    ARG: ['Emblem','Emiliano Martinez','Nahuel Molina','Cristian Romero','Nicolas Otamendi','Nicolas Tagliafico','Leonardo Balerdi','Enzo Fernandez','Alexis Mac Allister','Rodrigo De Paul','Exequiel Palacios','Leandro Paredes','Team Photo','Nico Paz','Franco Mastantuono','Nico Gonzalez','Lionel Messi','Lautaro Martinez','Julian Alvarez','Giuliano Simeone'],
    ALG: ['Emblem','Alexis Guendouz','Ramy Bensebaini','Youcef Atal','Rayan Aït-Nouri','Mohamed Amine Tougai','Aïssa Mandi','Ismael Bennacer','Houssem Aouar','Hicham Boudaoui','Ramiz Zerrouki','Nabil Bentaleb','Team Photo','Farés Chaibi','Riyad Mahrez','Said Benrahma','Anis Hadj Moussa','Amine Gouiri','Baghdad Bounedjah','Mohammed Amoura'],
    AUT: ['Emblem','Alexander Schlager','Patrick Pentz','David Alaba','Kevin Danso','Philipp Lienhart','Stefan Posch','Phillipp Mwene','Alexander Prass','Xaver Schlager','Marcel Sabitzer','Konrad Laimer','Team Photo','Florian Grillitsch','Nicolas Seiwald','Romano Schmid','Patrick Wimmer','Christoph Baumgartner','Michael Gregoritsch','Marko Arnautović'],
    JOR: ['Emblem','Yazeed Abulaila','Ihsan Haddad','Mohammad Abu Hashish','Yazan Al-Arab','Abdallah Nasib','Saleem Obaid','Mohammad Abualnadi','Ibrahim Saadeh','Nizar Al-Rashdan','Noor Al-Rawabdeh','Mohannad Abu Taha','Team Photo','Amer Jamous','Musa Al-Taamari','Yazan Al-Naimat','Mahmoud Al-Mardi','Ali Olwan','Mohammad Abu Zrayq','Ibrahim Sabra'],
    POR: ['Emblem','Diogo Costa','José Sá','Ruben Dias','João Cancelo','Diogo Dalot','Nuno Mendes','Gonçalo Inácio','Bernardo Silva','Bruno Fernandes','Ruben Neves','Vitinha','Team Photo','João Neves','Cristiano Ronaldo','Francisco Trincao','João Felix','Gonçalo Ramos','Pedro Neto','Rafael Leão'],
    COD: ['Emblem','Lionel Mpasi-Nzau','Aaron Wan-Bissaka','Axel Tuanzebe','Arthur Masuaku','Chancel Mbemba','Joris Kayembe','Charles Pickel',"Ngal'ayel Mukau",'Edo Kayembe','Samuel Moutoussamy','Noah Sadiki','Team Photo','Théo Bongonda','Meschak Elia','Yoane Wissa','Brian Cipenga','Fiston Mayele','Cédric Bakambu','Nathanaël Mbuku'],
    UZB: ['Emblem','Utkir Yusupov','Farrukh Savfiev','Sherzod Nasrullaev','Umar Eshmurodov','Husniddin Aliqulov','Rustamjon Ashurmatov','Khojiakbar Alijonov','Abdukodir Khusanov','Odiljon Hamrobekov','Otabek Shukurov','Jamshid Iskanderov','Team Photo','Azizbek Turgunboev','Khojimat Erkinov','Eldor Shomurodov','Oston Urunov','Jaloliddin Masharipov','Igor Sergeev','Abbosbek Fayzullaev'],
    COL: ['Emblem','Camilo Vargas','David Ospina','Dávinson Sánchez','Yerry Mina','Daniel Munoz','Johan Mojica','Jhon Lucumí','Santiago Arias','Jefferson Lerma','Kevin Castaño','Richard Rios','Team Photo','James Rodriguez','Juan Fernando Quintero','Jorge Carrascal','Jhon Arias','Jhon Cordova','Luis Suarez','Luis Diaz'],
    ENG: ['Emblem','Jordan Pickford','John Stones','Marc Guéhi','Ezri Konsa','Trent Alexander-Arnold','Reece James','Dan Burn','Jordan Henderson','Declan Rice','Jude Bellingham','Cole Palmer','Team Photo','Morgan Rogers','Anthony Gordon','Phil Foden','Bukayo Saka','Harry Kane','Marcus Rashford','Ollie Watkins'],
    CRO: ['Emblem','Dominik Livaković','Duje Caleta-Car','Josko Gvardiol','Josip Stanišić','Luka Vušković','Josip Sutalo','Kristijan Jakic','Luka Modrić','Mateo Kovacic','Martin Baturina','Lovro Majer','Team Photo','Mario Pasalic','Petar Sucic','Ivan Perišić','Marco Pasalic','Ante Budimir','Andrej Kramarić','Franjo Ivanovic'],
    GHA: ['Emblem','Lawrence Ati Zigi','Tariq Lamptey','Mohammed Salisu','Alidu Seidu','Alexander Djiku','Gideon Mensah','Caleb Yirenkyi','Abdul Issahaku Fatawu','Thomas Partey','Salis Abdul Samed','Kamaldeen Sulemana','Team Photo','Mohammed Kudus','Inaki Williams','Jordan Ayew','André Ayew','Joseph Paintsil','Osman Bukari','Antoine Semenyo'],
    PAN: ['Emblem','Orlando Mosquera','Luis Mejia','Fidel Escobar','Andres Andrade','Michael Amir Murillo','Eric Davis','Jose Cordoba','Cesar Blackman','Cristian Martinez','Aníbal Godoy','Adalberto Carrasquilla','Team Photo','Édgar Bárcenas','Carlos Harvey','Ismael Díaz','Jose Fajardo','Cecilio Waterman','Jose Luiz Rodriguez','Alberto Quintero'],
  };

  // Specials: opening foils + FIFA World Cup history. [code, name, type]
  const SPECIALS_OPENING = [
    ['00', 'Panini Logo', 'special'], ['FWC1', 'Official Emblem 1', 'special'], ['FWC2', 'Official Emblem 2', 'special'],
    ['FWC3', 'Official Mascots', 'special'], ['FWC4', 'Official Slogan', 'special'], ['FWC5', 'Official Ball', 'special'],
    ['FWC6', 'Host: Canada', 'special'], ['FWC7', 'Host: Mexico', 'special'], ['FWC8', 'Host: USA', 'special'],
  ];
  const SPECIALS_HISTORY = [
    ['FWC9', 'Italy 1934', 'legend'], ['FWC10', 'Uruguay 1950', 'legend'], ['FWC11', 'West Germany 1954', 'legend'],
    ['FWC12', 'Brazil 1962', 'legend'], ['FWC13', 'West Germany 1974', 'legend'], ['FWC14', 'Argentina 1986', 'legend'],
    ['FWC15', 'Brazil 1994', 'legend'], ['FWC16', 'Brazil 2002', 'legend'], ['FWC17', 'Italy 2006', 'legend'],
    ['FWC18', 'Germany 2014', 'legend'], ['FWC19', 'Argentina 2022', 'legend'],
  ];

  const slotType = (name) => name === 'Emblem' ? 'badge' : name === 'Team Photo' ? 'special' : 'player';

  const pages = [];

  // Specials pages (foils).
  pages.push({ page: 1, section: 'opening', group: null, title: 'Welcome & Hosts', team: null, cols: 3, rows: 3,
    confirmed: true, slots: SPECIALS_OPENING.map((s) => ({ n: s[0], name: s[1], type: s[2], foil: true, confirmed: true })) });
  pages.push({ page: 2, section: 'history', group: null, title: 'FIFA World Cup History', team: null, cols: 4, rows: 3,
    confirmed: true, slots: SPECIALS_HISTORY.map((s) => ({ n: s[0], name: s[1], type: s[2], foil: true, confirmed: true })) });

  // One page per team.
  TEAMS.forEach((t, ti) => {
    const group = t[0], code = t[1], country = t[2], flag = t[3] || null;
    const names = ROSTER[code] || [];
    const slots = names.map((name, i) => {
      const type = slotType(name);
      const slot = { n: code + (i + 1), name: name, type: type, confirmed: true };
      if (type === 'badge') slot.foil = true;
      return slot;
    });
    pages.push({ page: ti + 3, section: group, group: group, title: country,
      team: code, flag: flag, cols: 4, rows: 5, confirmed: true, slots: slots });
  });

  let total = 0;
  pages.forEach((p) => { total += p.slots.length; });

  return { meta: { title: 'Panini FIFA World Cup 2026', total: total, confirmed: true,
                   teams: TEAMS.length, perTeam: 20, updated: '2026-06-06' },
           pages: pages };
});
