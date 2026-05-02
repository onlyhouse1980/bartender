export type DrinkArtworkSpec = {
  background: [string, string];
  liquid: [string, string];
  glassStyle:
    | 'highball'
    | 'rocks'
    | 'coupe'
    | 'martini'
    | 'wine'
    | 'mug'
    | 'hurricane';
  garnish?:
    | 'orange'
    | 'lime'
    | 'mint'
    | 'coffee'
    | 'pineapple'
    | 'cherry'
    | 'grapefruit'
    | 'lemon';
  bubbles?: boolean;
  ice?: boolean;
  straw?: boolean;
  foam?: boolean;
  saltRim?: boolean;
};

export type Drink = {
  id: string;
  name: string;
  category: string;
  technique: 'Aufbauen' | 'Shaken' | 'Rühren' | 'Blenden';
  difficulty: 'Leicht' | 'Mittel';
  glass: string;
  garnish: string;
  summary: string;
  germanNote: string;
  proTip: string;
  ingredients: Array<{ amount: string; item: string }>;
  method: string[];
  artwork: DrinkArtworkSpec;
  imageUrl?: string;
  sourceId?: string;
  source?: 'seeded' | 'web-import';
};

export const lessons = [
  {
    title: 'Mit cl arbeiten',
    body: 'In deutschen Bars wird meist in Zentilitern gemessen. Ein sauberer 2/4-cl- oder 2,5/5-cl-Jigger sorgt für konstante Drinks und sichere Kalkulation.',
  },
  {
    title: 'Frisches Eis zuerst',
    body: 'Fülle das Servierglas immer zuerst mit frischem Eis. Kalte Gläser und feste Eiswürfel schützen vor zu schneller Verwässerung und halten Kohlensäure länger stabil.',
  },
  {
    title: 'Die Technik kennen',
    body: 'Longdrinks werden im Servierglas aufgebaut, Zitrusdrinks kräftig geshakt und spirituosenbetonte Klassiker gerührt, bis sie seidig und kalt sind.',
  },
  {
    title: 'Verantwortungsvoll servieren',
    body: 'Prüfe im Zweifel das Alter, biete zu starken Drinks Wasser an und halte deine Station ordentlich. Tempo hilft, aber Sicherheit und Klarheit sind wichtiger.',
  },
] as const;

export const glasswareGuide = [
  {
    name: 'Highball-Glas',
    use: 'Hoch, gut gekühlt und voller Eis für Longdrinks wie Mojito, Paloma und Gin Tonic.',
  },
  {
    name: 'Rocks-Glas',
    use: 'Kurzer Tumbler für spirituosenbetonte Drinks oder Crushed-Ice-Serves wie Negroni und Caipirinha.',
  },
  {
    name: 'Weinglas',
    use: 'Große Schale für Spritz-Drinks, damit Schaumwein, Soda, Garnitur und Eis genug Raum haben.',
  },
  {
    name: 'Coupe',
    use: 'Elegantes Stielglas für geshakte Drinks ohne Eis, etwa Margarita oder Espresso Martini.',
  },
  {
    name: 'Martiniglas',
    use: 'Markantes Stielglas für geradlinige Klassiker wie den Cosmopolitan ohne Eis im Glas.',
  },
  {
    name: 'Mule-Becher',
    use: 'Isolierter Becher für Ginger-Beer-Drinks; ein Highball-Glas ist in vielen Bars eine gute Alternative.',
  },
  {
    name: 'Hurricane-Glas',
    use: 'Geschwungenes Tropenglas für geblendete oder saftreiche Drinks wie Piña Colada.',
  },
] as const;

export const drinks: Drink[] = [
  {
    id: 'aperol-spritz',
    name: 'Aperol Spritz',
    category: 'Spritz & Aperitif',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Weinglas',
    garnish: 'Orangenscheibe',
    summary: 'Ein unkomplizierter Spritz mit hohem Absatz, der auf deutschen Terrassen und Aperitifkarten fast überall läuft.',
    germanNote: 'Gäste erwarten meist ein großes Glas voller Eis, deutliche Orangennoten und einen lebendigen Prosecco-Charakter.',
    proTip: 'Baue zuerst den Prosecco und gib das Soda zuletzt dazu, damit die Kohlensäure erhalten bleibt und die Bitterkeit sauber eingebunden ist.',
    ingredients: [
      { amount: '9 cl', item: 'Prosecco' },
      { amount: '6 cl', item: 'Aperol' },
      { amount: '3 cl', item: 'Sodawasser' },
      { amount: '1 Scheibe', item: 'Orange' },
    ],
    method: [
      'Fülle ein Weinglas mit Eiswürfeln.',
      'Gieße zuerst den Prosecco, dann den Aperol ein.',
      'Mit Sodawasser auffüllen und einmal vorsichtig mit dem Barlöffel anheben.',
      'Mit einer Orangenscheibe garnieren.',
    ],
    artwork: {
      background: ['#163A3B', '#D26A2E'],
      liquid: ['#FF8A2A', '#F0552D'],
      glassStyle: 'wine',
      garnish: 'orange',
      bubbles: true,
      ice: true,
      straw: true,
    },
  },
  {
    id: 'hugo',
    name: 'Hugo',
    category: 'Spritz & Aperitif',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Weinglas',
    garnish: 'Minzzweig und Limettenscheibe',
    summary: 'Ein leichter Holunderblüten-Spritz, der sich im Frühling und Sommer im deutschsprachigen Raum sehr gut verkauft.',
    germanNote: 'Der Drink sollte duftig, frisch und nicht zu süß wirken. Minze muss sauber riechen und darf nicht zerdrückt schmecken.',
    proTip: 'Klopfe die Minze einmal zwischen den Händen an, bevor du sie einsetzt. So steigt das Aroma auf, ohne grasig zu werden.',
    ingredients: [
      { amount: '12 cl', item: 'Prosecco' },
      { amount: '2 cl', item: 'Holunderblütensirup' },
      { amount: '2 cl', item: 'Sodawasser' },
      { amount: '1 Scheibe', item: 'Limette' },
      { amount: '1 Zweig', item: 'Minze' },
    ],
    method: [
      'Fülle ein Weinglas mit Eiswürfeln.',
      'Gib Holunderblütensirup und Prosecco ins Glas.',
      'Mit Sodawasser auffüllen und sehr vorsichtig umrühren.',
      'Limettenscheibe und Minzzweig einsetzen.',
    ],
    artwork: {
      background: ['#0E3B3A', '#7FB09B'],
      liquid: ['#E6F5C0', '#C9E686'],
      glassStyle: 'wine',
      garnish: 'mint',
      bubbles: true,
      ice: true,
      straw: true,
    },
  },
  {
    id: 'gin-tonic',
    name: 'Gin Tonic',
    category: 'Highballs & Longdrinks',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Highball-Glas',
    garnish: 'Limettenspalte',
    summary: 'Ein klassischer Call-Drink, bei dem saubere Verdünnung und frisches Tonic wichtiger sind als Komplexität.',
    germanNote: 'Premium-Gin-Tonic-Bestellungen sind häufig. Die Garnitur sollte die Botanicals stützen und nicht überdecken.',
    proTip: 'Nimm gut gekühltes Tonic und gieße es an der Glasinnenseite entlang ein, damit die Kohlensäure länger stehen bleibt.',
    ingredients: [
      { amount: '5 cl', item: 'Gin' },
      { amount: '12 cl', item: 'Tonic Water' },
      { amount: '1 Spalte', item: 'Limette' },
    ],
    method: [
      'Fülle ein Highball-Glas vollständig mit frischem Eis.',
      'Gib den Gin dazu.',
      'Mit Tonic Water auffüllen und einmal vorsichtig von unten anheben.',
      'Die Limettenspalte dazugeben oder leicht ausdrücken und dann ins Glas setzen.',
    ],
    artwork: {
      background: ['#123B4B', '#4A877E'],
      liquid: ['#E9F4DD', '#B8D6A8'],
      glassStyle: 'highball',
      garnish: 'lime',
      bubbles: true,
      ice: true,
    },
  },
  {
    id: 'moscow-mule',
    name: 'Moscow Mule',
    category: 'Highballs & Longdrinks',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Mule-Becher oder Highball-Glas',
    garnish: 'Limettenspalte',
    summary: 'Wodka, Ginger Beer und Limette ergeben einen leicht verkäuflichen Drink mit frischem, scharfem Finish.',
    germanNote: 'Wenn die Bar keine Kupferbecher nutzt, serviere den Drink selbstbewusst im gut gekühlten Highball-Glas mit viel Eis.',
    proTip: 'Ein wenig zusätzliche Limette hebt das Ginger Beer an und verhindert einen flachen Eindruck.',
    ingredients: [
      { amount: '5 cl', item: 'Wodka' },
      { amount: '1,5 cl', item: 'Frischer Limettensaft' },
      { amount: '12 cl', item: 'Ginger Beer' },
      { amount: '1 Spalte', item: 'Limette' },
    ],
    method: [
      'Fülle einen Mule-Becher oder ein Highball-Glas mit Eiswürfeln.',
      'Gib Wodka und frischen Limettensaft dazu.',
      'Mit Ginger Beer auffüllen und einmal von unten nach oben rühren.',
      'Mit einer Limettenspalte garnieren.',
    ],
    artwork: {
      background: ['#152F46', '#A36E2E'],
      liquid: ['#F5CE62', '#E09428'],
      glassStyle: 'mug',
      garnish: 'lime',
      bubbles: true,
      ice: true,
    },
  },
  {
    id: 'mojito',
    name: 'Mojito',
    category: 'Highballs & Longdrinks',
    technique: 'Aufbauen',
    difficulty: 'Mittel',
    glass: 'Highball-Glas',
    garnish: 'Minzkrone und Limettenspalte',
    summary: 'Ein Minz-Rum-Longdrink, an dem du Balance, Kohlensäure und den Umgang mit frischen Kräutern lernst.',
    germanNote: 'Viele Einsteiger zerdrücken die Minze zu stark. In deutschen Bars wird meist ein frischer, klarer Stil erwartet statt bitterer Kräuterigkeit.',
    proTip: 'Drücke die Minze nur sanft mit Sirup und Limettensaft an. Zerrissene Minze macht den Drink schnell bitter.',
    ingredients: [
      { amount: '5 cl', item: 'Weißer Rum' },
      { amount: '2 cl', item: 'Frischer Limettensaft' },
      { amount: '2 cl', item: 'Zuckersirup' },
      { amount: '8 Blätter', item: 'Minze' },
      { amount: '6 cl', item: 'Sodawasser' },
    ],
    method: [
      'Minze, Zuckersirup und Limettensaft in ein Highball-Glas geben.',
      'Die Minze nur leicht andrücken, damit ihr Aroma freikommt.',
      'Rum zugeben, das Glas mit Crushed Ice oder Eiswürfeln füllen und kurz anziehen.',
      'Mit Sodawasser auffüllen, bei Bedarf mehr Eis nachlegen und mit Minze sowie Limettenspalte abschließen.',
    ],
    artwork: {
      background: ['#133F36', '#5F995E'],
      liquid: ['#D9F0A3', '#B5DB74'],
      glassStyle: 'highball',
      garnish: 'mint',
      bubbles: true,
      ice: true,
      straw: true,
    },
  },
  {
    id: 'caipirinha',
    name: 'Caipirinha',
    category: 'Highballs & Longdrinks',
    technique: 'Aufbauen',
    difficulty: 'Mittel',
    glass: 'Rocks-Glas',
    garnish: 'Limettenspalte',
    summary: 'Ein Klassiker mit zerdrückter Limette, an dem du Muddeln, Süße und schnelles Churnen über Eis trainierst.',
    germanNote: 'Der Drink ist in lockeren Bars in Deutschland weiterhin vertraut, sollte aber frisch und nicht sirupartig süß wirken.',
    proTip: 'Muddle nur so stark, dass Saft frei wird. Wenn du das Weiße der Limette zerquetschst, wird der Drink schnell hart und bitter.',
    ingredients: [
      { amount: '6 cl', item: 'Cachaca' },
      { amount: '1 ganze', item: 'Limette in Spalten' },
      { amount: '2 TL', item: 'Weißer Zucker' },
      { amount: 'nach Bedarf', item: 'Crushed Ice' },
    ],
    method: [
      'Limettenspalten und Zucker in ein Rocks-Glas geben.',
      'Kurz, aber bestimmt muddeln, damit Saft austritt.',
      'Das Glas mit Crushed Ice füllen, Cachaca zugeben und alles gleichmäßig anziehen.',
      'Mit weiterem Crushed Ice toppen und nach Wunsch mit einer kleinen Limettenspalte garnieren.',
    ],
    artwork: {
      background: ['#214739', '#C39C3B'],
      liquid: ['#E8E2A2', '#C7B95E'],
      glassStyle: 'rocks',
      garnish: 'lime',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'cuba-libre',
    name: 'Cuba Libre',
    category: 'Highballs & Longdrinks',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Highball-Glas',
    garnish: 'Limettenspalte',
    summary: 'Rum, Cola und Limette richtig gebaut. Die Limette macht aus einem Mischgetränk einen echten Cuba Libre.',
    germanNote: 'Späte Bar-Gäste kennen diesen Drink gut. Er muss schnell gehen, braucht aber trotzdem eine frische Limettennote.',
    proTip: 'Nimm genug Eis, damit die Cola lebendig bleibt und der Drink nicht wässrig endet.',
    ingredients: [
      { amount: '5 cl', item: 'Heller oder goldener Rum' },
      { amount: '1 cl', item: 'Frischer Limettensaft' },
      { amount: '12 cl', item: 'Cola' },
      { amount: '1 Spalte', item: 'Limette' },
    ],
    method: [
      'Ein Highball-Glas mit Eiswürfeln füllen.',
      'Rum und Limettensaft zugeben.',
      'Mit Cola auffüllen und einmal von unten anheben.',
      'Mit einer Limettenspalte garnieren.',
    ],
    artwork: {
      background: ['#241A1B', '#6A4332'],
      liquid: ['#5F3324', '#311813'],
      glassStyle: 'highball',
      garnish: 'lime',
      ice: true,
    },
  },
  {
    id: 'whiskey-sour',
    name: 'Whiskey Sour',
    category: 'Sours & Zitrus',
    technique: 'Shaken',
    difficulty: 'Mittel',
    glass: 'Rocks-Glas',
    garnish: 'Angostura Bitters und Zitronenzeste',
    summary: 'Ein Grundpfeiler unter den Sours, an dem du Textur beim Shaken, Zitrusbalance und den Umgang mit Eiweiß lernst.',
    germanNote: 'Viele moderne Bars in Deutschland servieren ihn auf Eis mit seidiger Schaumkrone und zurückhaltendem Bitters-Muster.',
    proTip: 'Wenn du Eiweiß verwendest, zuerst dry shaken und erst danach mit Eis shaken. So bekommst du Textur und trotzdem Kälte sowie Verdünnung.',
    ingredients: [
      { amount: '5 cl', item: 'Bourbon oder Rye Whiskey' },
      { amount: '3 cl', item: 'Frischer Zitronensaft' },
      { amount: '2 cl', item: 'Zuckersirup' },
      { amount: '2 cl', item: 'Eiweiß (optional)' },
      { amount: '2 Dash', item: 'Angostura Bitters' },
    ],
    method: [
      'Alle flüssigen Zutaten in einen Shaker geben.',
      'Bei Eiweiß zuerst dry shaken, dann Eis zugeben und kräftig shaken.',
      'Doppelt in ein Rocks-Glas auf frisches Eis abseihen.',
      'Mit Bitters auf dem Schaum und etwas Zitronenzeste vollenden.',
    ],
    artwork: {
      background: ['#2A2216', '#A56B2E'],
      liquid: ['#F3C761', '#D18C2E'],
      glassStyle: 'rocks',
      garnish: 'lemon',
      ice: true,
      foam: true,
    },
  },
  {
    id: 'espresso-martini',
    name: 'Espresso Martini',
    category: 'Dessert & Digestif',
    technique: 'Shaken',
    difficulty: 'Mittel',
    glass: 'Coupe',
    garnish: 'Drei Kaffeebohnen',
    summary: 'Ein moderner Klassiker, an dem du hartes Shaken, Kaffee-Frische und eine stabile Crema trainierst.',
    germanNote: 'Das ist ein häufiger Spätabend-Drink. Frischer, heißer Espresso liefert den besten Schaum und die beste Aromatik.',
    proTip: 'Schüttle länger, als du denkst. Die Schaumdecke soll glatt stehen und nicht nur aus wenigen einzelnen Blasen bestehen.',
    ingredients: [
      { amount: '5 cl', item: 'Wodka' },
      { amount: '3 cl', item: 'Kaffeelikör' },
      { amount: '3 cl', item: 'Frischer Espresso' },
      { amount: '1 cl', item: 'Zuckersirup' },
    ],
    method: [
      'Alle Zutaten mit Eis in einen Shaker geben.',
      'Kräftig shaken, bis die Dose deutlich heruntergekühlt und frostig ist.',
      'Doppelt in eine gekühlte Coupe abseihen.',
      'Drei Kaffeebohnen auf die Crema setzen.',
    ],
    artwork: {
      background: ['#271B17', '#7A523C'],
      liquid: ['#533328', '#25120D'],
      glassStyle: 'coupe',
      garnish: 'coffee',
      foam: true,
    },
  },
  {
    id: 'margarita',
    name: 'Margarita',
    category: 'Sours & Zitrus',
    technique: 'Shaken',
    difficulty: 'Mittel',
    glass: 'Coupe',
    garnish: 'Halber Salzrand und Limettenscheibe',
    summary: 'Ein Maßstab für jede Bar: sauberer Sour-Balance und präziser Service in der Coupe.',
    germanNote: 'Ein halber Salzrand ist im Service praktisch, weil der Gast jeden Schluck mit oder ohne Salz wählen kann.',
    proTip: 'Ein frischer Salzrand und eine wirklich kalte Coupe schärfen den Drink stärker als noch mehr Limettensaft.',
    ingredients: [
      { amount: '5 cl', item: 'Tequila Blanco' },
      { amount: '3 cl', item: 'Triple Sec oder Cointreau' },
      { amount: '2,5 cl', item: 'Frischer Limettensaft' },
    ],
    method: [
      'Eine gekühlte Coupe mit halbem Salzrand vorbereiten.',
      'Alle Zutaten mit Eis in einen Shaker geben und kräftig shaken.',
      'Doppelt in die vorbereitete Coupe abseihen.',
      'Mit einer Limettenscheibe oder kleinen Limettenspalte garnieren.',
    ],
    artwork: {
      background: ['#1E3F3A', '#C59A40'],
      liquid: ['#F6E39A', '#E1C667'],
      glassStyle: 'coupe',
      garnish: 'lime',
      saltRim: true,
    },
  },
  {
    id: 'negroni',
    name: 'Negroni',
    category: 'Spirituosenbetont',
    technique: 'Rühren',
    difficulty: 'Leicht',
    glass: 'Rocks-Glas',
    garnish: 'Orangenzeste',
    summary: 'Einer der Drinks, die am leichtesten falsch gebaut werden. Präzision und Verdünnung zählen, weil jede Zutat bitter und stark ist.',
    germanNote: 'Ein sauberer großer Eisblock und eine helle Orangenzeste lassen den Drink sofort hochwertig wirken.',
    proTip: 'Rühre, bis die Kanten weicher werden, und seihe dann auf frisches Eis ab, statt das nasse Rühreis mit zu servieren.',
    ingredients: [
      { amount: '3 cl', item: 'Gin' },
      { amount: '3 cl', item: 'Campari' },
      { amount: '3 cl', item: 'Süßer Wermut' },
    ],
    method: [
      'Alle Zutaten in ein mit Eis gefülltes Rührglas geben.',
      'Rühren, bis der Drink kalt und leicht verdünnt ist.',
      'In ein Rocks-Glas auf frisches Eis abseihen.',
      'Eine Orangenzeste über dem Drink ausdrücken und sauber auflegen.',
    ],
    artwork: {
      background: ['#2A1115', '#7E2F2B'],
      liquid: ['#B22E1A', '#781010'],
      glassStyle: 'rocks',
      garnish: 'orange',
      ice: true,
    },
  },
  {
    id: 'cosmopolitan',
    name: 'Cosmopolitan',
    category: 'Sours & Zitrus',
    technique: 'Shaken',
    difficulty: 'Leicht',
    glass: 'Martiniglas',
    garnish: 'Orangenzeste',
    summary: 'Ein sauberer, pinker Klassiker, an dem du gute Verdünnung beim Shaken und eleganten Stielglas-Service lernst.',
    germanNote: 'Die Farbe soll klar und lebendig bleiben, der Drink eher trocken wirken. Zu viel Cranberry macht daraus Saft.',
    proTip: 'Doppelt abseihen sorgt für eine glatte Oberfläche, und das Glas sollte wirklich gut vorgekühlt sein.',
    ingredients: [
      { amount: '4 cl', item: 'Citrus-Wodka' },
      { amount: '2 cl', item: 'Cointreau' },
      { amount: '1,5 cl', item: 'Frischer Limettensaft' },
      { amount: '3 cl', item: 'Cranberrysaft' },
    ],
    method: [
      'Alle Zutaten mit Eis in einen Shaker geben.',
      'Kräftig shaken, bis die Dose sehr kalt ist.',
      'Doppelt in ein gekühltes Martiniglas abseihen.',
      'Eine kleine Orangenzeste über der Oberfläche ausdrücken.',
    ],
    artwork: {
      background: ['#331B2E', '#9A4F67'],
      liquid: ['#FF7A8D', '#D6466F'],
      glassStyle: 'martini',
      garnish: 'orange',
    },
  },
  {
    id: 'paloma',
    name: 'Paloma',
    category: 'Highballs & Longdrinks',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Highball-Glas',
    garnish: 'Grapefruitspalte',
    summary: 'Ein heller Tequila-Highball, der sich gut an Gäste verkaufen lässt, die etwas Leichteres als eine Margarita suchen.',
    germanNote: 'Wenn die Grapefruit-Soda süß ausfällt, halten eine Prise Salz oder etwas frischere Limette den Drink im Gleichgewicht.',
    proTip: 'Baue den Drink hoch und kalt. Die Kohlensäure soll tragen, nicht zusätzlicher Zuckersirup.',
    ingredients: [
      { amount: '5 cl', item: 'Tequila Blanco' },
      { amount: '1,5 cl', item: 'Frischer Limettensaft' },
      { amount: '12 cl', item: 'Pink-Grapefruit-Soda' },
      { amount: '1 Prise', item: 'Salz (optional)' },
    ],
    method: [
      'Ein Highball-Glas mit Eis füllen.',
      'Tequila und Limettensaft zugeben.',
      'Mit Pink-Grapefruit-Soda und bei Bedarf einer kleinen Prise Salz auffüllen.',
      'Einmal anheben und mit einer Grapefruitspalte garnieren.',
    ],
    artwork: {
      background: ['#2E364A', '#F38C70'],
      liquid: ['#FFB090', '#F16854'],
      glassStyle: 'highball',
      garnish: 'grapefruit',
      bubbles: true,
      ice: true,
    },
  },
  {
    id: 'pina-colada',
    name: 'Piña Colada',
    category: 'Tropisch & Party',
    technique: 'Blenden',
    difficulty: 'Mittel',
    glass: 'Hurricane-Glas',
    garnish: 'Ananasstück und Kirsche',
    summary: 'Cremig, tropisch und ideal, um zu lernen, wie sich Textur beim Blenden oder kräftigen Schütteln verändert.',
    germanNote: 'Auch ohne laufenden Mixer kann kräftiges Schütteln mit Crushed Ice noch ein überzeugendes Servierergebnis liefern.',
    proTip: 'Nutze genug Kokoscreme für Körper, halte das Finish aber mit ausreichend frischer Ananas-Säure lebendig.',
    ingredients: [
      { amount: '5 cl', item: 'Weißer Rum' },
      { amount: '9 cl', item: 'Ananassaft' },
      { amount: '3 cl', item: 'Kokoscreme' },
      { amount: '1 cl', item: 'Frischer Limettensaft' },
      { amount: '1 Tasse', item: 'Crushed Ice' },
    ],
    method: [
      'Alle Zutaten zusammen mit Crushed Ice in einen Blender geben.',
      'Mixen, bis der Drink glatt, cremig und noch gut gießbar ist.',
      'In ein gekühltes Hurricane-Glas gießen.',
      'Mit Ananas und einer Kirsche garnieren.',
    ],
    artwork: {
      background: ['#19443F', '#C26C2E'],
      liquid: ['#FFF4C4', '#E7D48A'],
      glassStyle: 'hurricane',
      garnish: 'pineapple',
      straw: true,
    },
  },
  {
    id: 'sex-on-the-beach',
    name: 'Sex on the Beach',
    category: 'Tropisch & Party',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Highball-Glas',
    garnish: 'Halbe Orangenscheibe',
    summary: 'Ein vertrauter Party-Drink mit Fruchtprofil, an dem du Schichtung, Farbkontrolle und süße Balance lernst.',
    germanNote: 'Der Drink sollte sauberer schmecken, als sein Name vermuten lässt. Halte die Säfte kalt und übergieße den Pfirsichlikör nicht.',
    proTip: 'Cranberry färbt sehr schnell. Gib sie deshalb erst am Ende des Builds vorsichtig dazu.',
    ingredients: [
      { amount: '4 cl', item: 'Wodka' },
      { amount: '2 cl', item: 'Pfirsichlikör' },
      { amount: '4 cl', item: 'Orangensaft' },
      { amount: '4 cl', item: 'Cranberrysaft' },
    ],
    method: [
      'Ein Highball-Glas mit Eis füllen.',
      'Wodka, Pfirsichlikör und Orangensaft zugeben.',
      'Mit Cranberrysaft toppen, damit ein Sunset-Farbverlauf entsteht.',
      'Leicht umrühren und mit Orange garnieren.',
    ],
    artwork: {
      background: ['#2F1E36', '#F07B5B'],
      liquid: ['#FFB56E', '#E7535E'],
      glassStyle: 'highball',
      garnish: 'orange',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'white-russian',
    name: 'White Russian',
    category: 'Dessert & Digestif',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Rocks-Glas',
    garnish: 'Keine oder etwas Muskat',
    summary: 'Ein cremiger Wodka-Klassiker, an dem du Layering und den Einfluss von Sahne auf Mundgefühl und Länge übst.',
    germanNote: 'Serviere ihn kalt und präzise. Wer diesen Drink bestellt, möchte meist etwas Reichhaltiges nach dem Essen und keinen verwässerten Milkshake.',
    proTip: 'Lass die Sahne zuletzt aufschwimmen, wenn du den zweifarbigen Look zeigen willst. Der Gast kann dann selbst entscheiden, wann er umrührt.',
    ingredients: [
      { amount: '5 cl', item: 'Wodka' },
      { amount: '2 cl', item: 'Kaffeelikör' },
      { amount: '3 cl', item: 'Sahne' },
    ],
    method: [
      'Ein Rocks-Glas mit Eis füllen.',
      'Wodka und Kaffeelikör zugeben.',
      'Die Sahne obenauf floaten lassen oder vorsichtig eingießen.',
      'Nur kurz anziehen, wenn der Gast den Drink lieber vollständig integriert mag.',
    ],
    artwork: {
      background: ['#261A17', '#82604E'],
      liquid: ['#F4E2C5', '#7B4E3D'],
      glassStyle: 'rocks',
      foam: true,
      ice: true,
    },
  },
  {
    id: 'tequila-sunrise',
    name: 'Tequila Sunrise',
    category: 'Tropisch & Party',
    technique: 'Aufbauen',
    difficulty: 'Leicht',
    glass: 'Highball-Glas',
    garnish: 'Orangenscheibe und Kirsche',
    summary: 'Ein farbiger Einsteiger-Drink, an dem du kontrolliertes Layering und eine saubere Präsentation lernst.',
    germanNote: 'Baue sorgfältig genug, damit der Übergang von Rot zu Orange beim Servieren sichtbar bleibt.',
    proTip: 'Grenadine kommt zuletzt hinein und wird nicht stark verrührt, damit der Sunrise-Effekt stehen bleibt.',
    ingredients: [
      { amount: '5 cl', item: 'Tequila Blanco' },
      { amount: '10 cl', item: 'Orangensaft' },
      { amount: '1 cl', item: 'Grenadine' },
    ],
    method: [
      'Ein Highball-Glas mit Eis füllen.',
      'Tequila und Orangensaft zugeben und kurz umrühren.',
      'Grenadine langsam eingießen, damit sie durch den Drink nach unten sinkt.',
      'Mit Orange und Kirsche garnieren.',
    ],
    artwork: {
      background: ['#2B2154', '#F38C44'],
      liquid: ['#FFCF69', '#EF4B4B'],
      glassStyle: 'highball',
      garnish: 'cherry',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'mai-tai',
    name: 'Mai Tai',
    category: 'Tropisch & Party',
    technique: 'Shaken',
    difficulty: 'Mittel',
    glass: 'Rocks-Glas',
    garnish: 'Minze und Limettenschale',
    summary: 'Ein tieferer tropischer Klassiker, an dem du Rum-Layering, Nuss-Sirup-Balance und einen kompakten Crushed-Ice-Serve trainierst.',
    germanNote: 'Wenn die Bar mehrere Rums führt, erkläre das Geschmacksprofil sicher. Gäste sehen den Drink oft als Premium-Tropical-Order.',
    proTip: 'Orgeat soll den Drink tragen, nicht dominieren. Halte die Limette präzise und den Rum trocken.',
    ingredients: [
      { amount: '4 cl', item: 'Dunkler Rum' },
      { amount: '2 cl', item: 'Gereifter oder weißer Rum' },
      { amount: '1,5 cl', item: 'Orange Curaçao' },
      { amount: '1,5 cl', item: 'Orgeatsirup' },
      { amount: '2,5 cl', item: 'Frischer Limettensaft' },
    ],
    method: [
      'Alle Zutaten mit Eis in einen Shaker geben.',
      'Kräftig shaken und mitsamt dem Shaker-Eis in ein Rocks-Glas dumpen.',
      'Mit Crushed Ice auffüllen und bei Bedarf vorsichtig swizzeln.',
      'Mit Minze und einer umgedrehten Limettenschale garnieren.',
    ],
    artwork: {
      background: ['#152A3A', '#B65D34'],
      liquid: ['#E0A94F', '#9A421E'],
      glassStyle: 'rocks',
      garnish: 'mint',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'old-fashioned',
    name: 'Old Fashioned',
    category: 'Spirituosenbetont',
    technique: 'Rühren',
    difficulty: 'Leicht',
    glass: 'Rocks-Glas',
    garnish: 'Orangenzeste',
    summary: 'Ein kurzer Whiskey-Klassiker, an dem sich zeigt, ob ein Bartender Verdünnung kontrollieren und einen klaren Spirit-Drink sauber halten kann.',
    germanNote: 'In vielen deutschen Hotel- und Cocktailbars ist das ein Vertrauens-Drink. Gäste merken Überpour, zu viel Zucker und schlampige Garnitur sofort.',
    proTip: 'Ziel ist ein kalter, glatter und nur leicht süßer Drink. Wenn die Bitters zu laut wirken, ist er noch nicht gut genug integriert.',
    ingredients: [
      { amount: '5 cl', item: 'Bourbon oder Rye Whiskey' },
      { amount: '0,75 cl', item: 'Zuckersirup' },
      { amount: '2 Dash', item: 'Angostura Bitters' },
    ],
    method: [
      'Whiskey, Sirup und Bitters in ein Rührglas mit Eis geben.',
      'Rühren, bis der Drink gründlich gekühlt und leicht weicher geworden ist.',
      'In ein Rocks-Glas auf einen großen Eiswürfel abseihen.',
      'Eine Orangenzeste über dem Drink ausdrücken und sauber ins Glas setzen.',
    ],
    artwork: {
      background: ['#1F1712', '#7A4D2B'],
      liquid: ['#C27C31', '#7B3F15'],
      glassStyle: 'rocks',
      garnish: 'orange',
      ice: true,
    },
  },
];

export const categoryLabels = ['Alle', ...new Set(drinks.map((drink) => drink.category))];
