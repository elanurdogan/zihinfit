// Kelime Bağlamı oyununun Türkçe sözlüğü. Bir kelime yalnızca tek kategoride bulunur (birim testle doğrulanır).
// "kelime|anlam" biçimindeki girdiler daha az bilinen kelimelerdir; oyun sonunda anlamları gösterilir.

const RAW = {
    'RENK': 'kırmızı mavi sarı yeşil mor siyah beyaz turuncu pembe kahverengi gri lacivert bordo turkuaz',
    'HAYVAN': 'kedi köpek aslan kaplan ayı kurt tilki tavşan zürafa fil sincap kirpi yunus baykuş kartal penguen çakal',
    'MEYVE': 'elma armut muz çilek kiraz karpuz kavun üzüm erik şeftali kayısı ayva nar incir mandalina ananas portakal dut',
    'SEBZE': 'domates salatalık patlıcan biber havuç ıspanak pırasa kabak brokoli karnabahar lahana bezelye bamya kereviz turp',
    'MESLEK': 'doktor öğretmen mühendis avukat aşçı pilot hemşire berber terzi marangoz itfaiyeci eczacı mimar veteriner çiftçi kuyumcu',
    'TAŞIT': 'otobüs tren uçak gemi bisiklet motosiklet kamyon tramvay metro taksi helikopter minibüs vapur feribot kayık',
    'MÜZİK ALETİ': 'piyano gitar keman davul flüt bağlama ud klarnet trompet akordeon tef darbuka arp çello',
    'SPOR': 'futbol basketbol voleybol tenis yüzme güreş boks okçuluk hentbol golf judo atletizm badminton',
    'MUTFAK EŞYASI': 'tencere tava kaşık çatal bıçak tabak bardak kepçe süzgeç rende cezve demlik sürahi',
    'ORGAN': 'kalp akciğer böbrek karaciğer mide beyin bağırsak',
    'HAVA OLAYI': 'yağmur kar dolu sis rüzgâr fırtına şimşek yıldırım kasırga sağanak',
    'DUYGU': 'mutluluk üzüntü korku öfke şaşkınlık heyecan kıskançlık özlem merak utanç sevgi umut hüzün gurur pişmanlık huzur',
};

const RARE = {
    'RENK': ['eflatun|Açık mor, leylak rengi', 'haki|Toprak rengiyle yeşil arası, asker giysisi rengi', 'fildişi|Sarımsı, kirli beyaz renk'],
    'HAYVAN': ['vaşak|Kulak uçları püsküllü, orta boy yabani kedi', 'sansar|Uzun gövdeli, kısa bacaklı, kürkü değerli küçük yırtıcı'],
    'MEYVE': ['muşmula|Kahverengi, olgunlaşınca yumuşayan ekşimsi tatlı meyve', 'trabzonhurması|Turuncu, olgunlaşınca bal gibi tatlanan meyve'],
    'SEBZE': ['enginar|Dikenli çiçek tomurcuğu biçiminde, kalbi yenen sebze', 'semizotu|Etli yapraklı, salata ve yemeği yapılan ot'],
    'MESLEK': ['nalbant|At nalı çakan zanaatkâr', 'yorgancı|Yorgan diken zanaatkâr', 'kalaycı|Bakır kapları kalaylayan usta'],
    'TAŞIT': ['fayton|Atla çekilen, dört tekerli yolcu arabası', 'teleferik|Halata asılı kabinlerle yolcu taşıyan sistem'],
    'MÜZİK ALETİ': ['ney|Kamıştan yapılan, üflemeli Türk çalgısı', 'zurna|Düğünlerde davulla çalınan, keskin sesli üflemeli çalgı', 'kemençe|Karadeniz\'e özgü, yayla çalınan küçük telli çalgı'],
    'SPOR': ['eskrim|Kılıç benzeri silahlarla yapılan dövüş sporu', 'cirit|Atlı oyuncuların birbirine değnek attığı geleneksel spor'],
    'MUTFAK EŞYASI': ['oklava|Hamur açmaya yarayan uzun, ince değnek', 'kevgir|Kızartma çıkarmaya yarayan delikli, yayvan kepçe', 'havan|İçinde baharat dövülen kalın kap'],
    'ORGAN': ['dalak|Kanla ilgili görevleri olan, midenin yanındaki organ', 'pankreas|Sindirim enzimleri ve insülin salgılayan organ', 'gırtlak|Ses tellerinin bulunduğu boğaz bölümü'],
    'HAVA OLAYI': ['kırağı|Soğuk gecelerde yeryüzünde oluşan ince buz tabakası', 'tipi|Kar ile kuvvetli rüzgârın birlikte görüldüğü fırtına', 'çisenti|İnce ve hafif yağan yağmur', 'poyraz|Kuzeydoğudan esen soğuk rüzgâr', 'lodos|Güneybatıdan esen ılık ve sert rüzgâr'],
    'DUYGU': ['haset|Başkasının sahip olduğunu çekememe', 'hayranlık|Birine ya da bir şeye karşı duyulan derin beğeni'],
};

export const FILLERS = 'dün hızlıca büyük güzel ev yol ağaç deniz kitap masa koştu pencere kapı sabah gece kalem defter şehir köprü dağ orman sokak anahtar saat ayna yastık mektup bahçe sandalye gazete'.split(' ');

export const WORD_CATEGORIES = Object.fromEntries(Object.keys(RAW).map(cat => [cat, [
    ...RAW[cat].split(' ').map(word => ({ word })),
    ...(RARE[cat] || []).map(entry => {
        const [word, meaning] = entry.split('|');
        return { word, meaning };
    }),
]]));
