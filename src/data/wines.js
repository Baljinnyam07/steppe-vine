// The six wines, with copy taken from the Steppe & Vine Facebook page posts
// (https://www.facebook.com/profile.php?id=61594372082930). Order = pedestal order in
// three/Showcase.jsx PLACES (left to right: back-left, front slab, tall cube, smooth step, back block,
// front sandstone slab).
//
// Visual fields
//   model        optional .glb path in /public: used instead of the procedural bottle
//   shape        'bordeaux' | 'burgundy' | 'tall'   bottle silhouette
//   glassOpacity < 1 = clear flint glass, otherwise dark green glass
//   wine         liquid colour (bottle interior, glass, pour)
//   foil         capsule colour
//   labelBg/Ink/label   paper / text / accent colours for the generated label (labelBg: null = no paper)
//   glass        legacy tint, unused by the current glass material
export const WINES = [
  {
    id: 'frogs-leap-zinfandel',
    price: 259000, // ₮ per bottle
    tagline: 'Гал дээр шарсан махан зоогтой зохицох шүүслэг амт',
    kind: 'Улаан дарс',
    // posters shown in the detail view: [history (tall), expert quote, taste + pairing]
    posters: ['/poster/819571695_122107094859479069_9106929727244089871_n.jpg', '/poster/820064542_122107094883479069_5334449124841700529_n.jpg', '/poster/819571698_122107094913479069_7781061161849439194_n.jpg'],
    name: "Frog's Leap",
    sub: 'Napa Valley',
    year: 2021,
    grape: 'Zinfandel',
    origin: 'Napa Valley, California',
    rating: { score: 92, source: 'Antonio Galloni / Vinous' },
    tasting: 'Интоор, цангис, хар жимсгэнэ, халуун ногоо болон дулаахан шүүслэг шинэхэн жимсний амт.',
    notes: ['Интоор', 'Цангис', 'Хар жимсгэнэ', 'Халуун ногоо'],
    pairing: 'Ил гал дээр шарсан мах, smoked BBQ, халуун ногоотой махан зоог',
    labelImg: '/labels/frogs-leap-zinfandel.jpg', labelSize: [0.8, 1.15], labelY: 0.86, // photo of the real label
    shape: 'bordeaux', wine: '#3e0a14', glass: '#0b1610', glassOpacity: 1, foil: '#1f1c1d',
    labelBg: '#efe6d0', labelInk: '#2a1a0c', label: '#5a3a1a',
    story: {
      title: 'Байгалийн унаган амтыг лонхонд цоожилсон нь',
      paragraphs: [
        '1981 онд Жон Уильямсын үүсгэн байгуулсан Frog\'s Leap эдлэн нь Напа хөндийд органик, хуурай газар тариалангийн dry-farmed аргыг нэвтрүүлсэн анхдагч юм.',
        'Байгалийн унаган амтыг алдагдуулахгүйгээр дарс урладгаараа алдартай энэхүү эдлэнгийн бүтээл нь Калифорнийн нарлаг өдрүүдийн илэрхийлэл билээ.',
        'Зинфанделд байдаг дулаахан мэдрэмж нь гал дээр шарсан махтай нийлэхдээ "Хөөх" гэж дуу алдам зохицлыг бий болгоно. Оройн зоогтоо эрч хүчтэй, амтны тэсрэлт бэлэглээрэй.'
      ],
      quote: 'Эрч хүчтэй хэрнээ гайхалтай цэвэрхэн Зинфандел. Жимсний шүүслэг амт, нарийн амтлагчийн нийлэмж нь Калифорнийн нарлаг өдрүүдийг санагдуулна. — Антонио Галлони / Vinous, 92 оноо'
    }
  },
  {
    id: 'heitz-cellar-cabernet',
    price: 549000, // ₮ per bottle
    tagline: 'Напа хөндийн амьд түүх. Оройн зоогийн оргил үед задлах лонх',
    model: '/bottle/Wine%20bottle.glb', // real 3D model instead of the procedural bottle
    kind: 'Улаан дарс',
    // posters shown in the detail view: [history (tall), expert quote, taste + pairing]
    posters: ['/poster/819483038_122107097007479069_5820519477215037560_n.jpg', '/poster/820114373_122107097013479069_9209346063338926546_n.jpg', '/poster/818813391_122107097049479069_4833541350436137231_n.jpg'],
    name: 'Heitz Cellar',
    sub: 'Established 1961',
    year: 2019,
    grape: 'Cabernet Sauvignon',
    origin: 'Napa Valley, California',
    rating: { score: 94, source: 'Wine Enthusiast' },
    tasting: 'Үхрийн нүд, хар интоор, какао, хуш мод болон тамхины навчны гүн гүнзгий, хүчирхэг амт.',
    notes: ['Үхрийн нүд', 'Хар интоор', 'Какао', 'Хуш мод', 'Тамхины навч'],
    pairing: 'Дээд зэрэглэлийн өөхлөг үхрийн мах, удаан болгосон хонины мах',
    shape: 'bordeaux', wine: '#3a0812', glass: '#0b1610', glassOpacity: 1, foil: '#5a1a24',
    labelBg: '#e8dcc0', labelInk: '#2a1a0c', label: '#5a3a1a',
    story: {
      title: 'Напа хөндийн амьд түүх',
      paragraphs: [
        '1961 онд Жо Хейтцийн үүсгэн байгуулсан энэхүү эдлэн нь Напа хөндийн түүхийг бичилцсэн, хамгийн өндөр нэр хүндтэй брэндүүдийн нэг юм.',
        'Тэдний Каберне нь үеийн үед тансаг, сонгодог байдлын бэлгэ тэмдэг байсаар ирсэн бөгөөд Напагийн амьд түүхийг лонхонд багтаасан оргил бүтээл билээ.',
        'Дарсны хүчирхэг таннин нь хүнд махны өөх тостой төгс нийцтэй. Зоогийн хамгийн чухал үед задлах шилдэг лонх.'
      ],
      quote: 'Бүтэц, хүчирхэг байдал, эрхэмсэг оршихуйн төгс илэрхийлэл. Он цаг өнгөрөх тусам үнэ цэнэ нь нэмэгдэх сонгодог Каберне. — Wine Enthusiast, 94 оноо'
    }
  },
  {
    id: 'dolce-late-harvest',
    price: 489000, // ₮ per bottle
    tagline: 'Үдшийг хамгийн дурсамжтайгаар өндөрлүүлэх хундага дахь шингэн алт',
    kind: 'Амтат (дессерт) дарс',
    // posters shown in the detail view: [history (tall), expert quote, taste + pairing]
    posters: ['/poster/818940390_122107100439479069_8706730569914185173_n.jpg', '/poster/819741355_122107100451479069_41429285872621478_n.jpg', '/poster/821223468_122107100445479069_4073234097729235694_n.jpg'],
    name: 'Dolce',
    sub: 'Late Harvest',
    year: null, // the post gives no vintage
    grape: 'Late Harvest (дессерт дарс)',
    origin: 'Napa Valley, California',
    rating: { score: 93, source: 'Wine Spectator' },
    tasting: 'Зөгийн бал, боловсорсон чангаанз, халуун орны жимс, карамель болон хатаасан жимсний тансаг амт.',
    notes: ['Зөгийн бал', 'Чангаанз', 'Халуун орны жимс', 'Карамель'],
    pairing: 'Бүх төрлийн дессерт, бялуу, зөгийн бал, цөцгий, бяслаг, шинэхэн жимс',
    labelImg: '/labels/dolce.png', labelSize: [0.76, 1.51], labelY: 0.95, // photo of the real label
    shape: 'tall', wine: '#e0a53a', glass: '#d8a848', glassOpacity: 0.5, foil: '#a37419',
    labelBg: null, labelInk: '#7a4e0e', label: '#b8862a',
    story: {
      title: 'Хундага дахь шингэн алт',
      paragraphs: [
        'Алдарт Far Niente эдлэнгийн 1989 онд анх танилцуулсан энэхүү бүтээлийг Напа хөндийн "Шингэн алт" хэмээн нэрийддэг.',
        'Францын алдарт Сотерн (Sauternes) дессерт дарсны арга барилаар, зөвхөн оройтож хураасан, байгалийн чихэрлэг байдал дээд цэгтээ хүрж боловсорсон усан үзмээр хийдэг дэлхийн хэмжээний тансаг дессерт дарс юм.',
        'Зоог өндөрлөсний дараах ширээний ардах яриаг уртасгаж, арга хэмжээгээ хамгийн дурсамжтайгаар хаах онцгой сонголт.'
      ],
      quote: 'Оройн зоогийг төгөлдөржүүлэх хамгийн тансаг унд. Хундага дахь шингэн алт мэт гялалзах энэхүү дарс таны дурсамжид хэзээ ч мартагдашгүй амт үлдээнэ. — Wine Spectator, 93 оноо'
    }
  },
  {
    id: 'duckhorn-merlot',
    price: 289000, // ₮ per bottle
    tagline: 'Ямар ч хоолтой төгс хорших хамгийн баялаг, тэнцвэртэй дарс',
    kind: 'Улаан дарс',
    // posters shown in the detail view: [history (tall), expert quote, taste + pairing]
    posters: ['/poster/795507916_122105904015479069_2500325303936925729_n.jpg', '/poster/797058440_122105904081479069_8379028711600651850_n.jpg', '/poster/818261190_122105904069479069_1138051999570459966_n.jpg'],
    name: 'Duckhorn',
    sub: 'Napa Valley',
    year: 2021,
    grape: 'Merlot',
    origin: 'Napa Valley, California',
    rating: { score: 92, source: 'Wilfred Wong / Wine.com' },
    tasting: 'Боловсорсон чавга, хар интоор, улаан үхрийн нүд, ургамал болон нарийн боовны дулаахан амтлагч.',
    notes: ['Чавга', 'Хар интоор', 'Улаан үхрийн нүд', 'Baking spice'],
    pairing: 'Үхэр, хонины махан стейк, шүүслэг бууз, хуушуур',
    labelImg: '/labels/duckhorn.jpg', labelSize: [0.8, 1.16], labelY: 0.86, // photo of the real label
    shape: 'bordeaux', wine: '#3a0a14', glass: '#0b1610', glassOpacity: 1, foil: '#27100f',
    labelBg: '#efe2c0', labelInk: '#2a1a0c', label: '#4a5a2a',
    story: {
      title: 'Merlot дарсны алтан стандарт',
      paragraphs: [
        'Duckhorn эдлэн нь 1978 онд анхны ургацаа хураан авч, Америкт Merlot усан үзмийг дангаар нь дээд зэрэглэлийн дарс болгон урлаж болохыг дэлхий нийтэд анхлан баталсан анхдагчдын нэг юм.',
        'Хагас зуун жилийн түүхтэй энэхүү эдлэн нь Америк дарсны түүхийг өөрчилсөн, бахархалт алтан стандарт болсон бүтээгдэхүүн билээ.',
        'Хэт эрс тэс биш мөртлөө хангалттай хүчирхэг бүтэцтэй тул махан хоолыг хооронд нь холбох төгс зохицол болно.'
      ],
      quote: 'Merlot дарсны алтан стандарт. Зөөлөн хэр нь баялаг бүтэцтэй, тэнцвэр нь хэн бүхний таашаалд нийцэх төгс ажээ. — Wilfred Wong / Wine.com, 92 оноо'
    }
  },
  {
    id: 'stags-leap-karia',
    price: 229000, // ₮ per bottle
    tagline: 'Амтлах мэдрэхүйг сэргээх тансаг, сэргэг сонголт',
    kind: 'Цагаан дарс',
    // posters shown in the detail view: [history (tall), expert quote, taste + pairing]
    posters: ['/poster/818140232_122105851161479069_9089724457036532358_n.jpg', '/poster/818761222_122105851221479069_7341843786724226245_n.jpg', '/poster/819207757_122105851209479069_4760497911068614950_n.jpg'],
    name: "Stag's Leap KARIA",
    sub: 'Wine Cellars',
    year: null, // the post gives no vintage
    grape: 'Chardonnay',
    origin: 'Napa Valley, California',
    rating: { score: '91–92', source: 'James Suckling' },
    tasting: 'Шинэхэн алим, лийр, нимбэгний хальс, цагаан тоор, хаврын цэцэг болон царс модны зөөлөн аяс.',
    notes: ['Алим', 'Лийр', 'Нимбэгний хальс', 'Цагаан тоор', 'Ваниль'],
    pairing: 'Халуун бууз, жигнэсэн банш, шинэхэн бяслаг, сүүн суурьтай хөнгөн зууш',
    labelImg: '/labels/stags-leap-karia.jpg', labelSize: [0.8, 1.1], labelY: 0.76, // photo of the real label
    shape: 'burgundy', wine: '#e6d58a', glass: '#cfd9b0', glassOpacity: 0.42, foil: '#2c1317',
    labelBg: '#f3f0e6', labelInk: '#2a2418', label: '#7a6a3a',
    story: {
      title: '1976 онд дэлхийг шуугиулсан домогт эдлэнгийн бүтээл',
      paragraphs: [
        'Напа хөндийн нэрийг дэлхийн дарсны газрын зурагт мөнхөлсөн түүхэн "Judgment of Paris" амталгаанд Францын шилдэг дарснуудыг ардаа орхин түрүүлж байсан домогт Stag\'s Leap Wine Cellars-ийн бас нэгэн бахархал.',
        'Грекээр "Төгс, эрхэмсэг" хэмээх утгатай KARIA нь нэрэндээ бүрэн нийцсэн, цагаан дарсны стандартыг шинээр тодорхойлсон бүтээл юм.',
        'Хэт хүнд эсвэл тослог биш учраас хоолны амтыг дарах бус улам тодотгож баяжуулна. Оройн зоогийн ширээгээ "Төгс, эрхэмсэг" эхлэлээр чимээрэй.'
      ],
      quote: 'Шинэхэн зүссэн алим, лийр, нимбэгний хальс, ванилийн хөнгөн аяс. Гайхалтай сэргэг хүчиллэгтэй, маш цэвэрхэн, эрч хүчтэй дарс. — James Suckling, 91–92 оноо'
    }
  },
  {
    id: 'migration-pinot-noir',
    price: 199000, // ₮ per bottle
    tagline: 'Махны амтыг тодотгох уян зөөлөн, хөрслөг урлал',
    kind: 'Улаан дарс',
    // posters shown in the detail view: [history (tall), expert quote, taste + pairing]
    posters: ['/poster/794991875_122105900349479069_8999885654160799527_n.jpg', '/poster/817176677_122105900397479069_5509006948515995770_n.jpg', '/poster/800642479_122105900433479069_5594727857001561267_n.jpg'],
    name: 'Migration',
    sub: 'Sonoma Coast',
    year: 2022,
    grape: 'Pinot Noir',
    origin: 'Sonoma Coast, California',
    rating: { score: 92, source: 'Wine Enthusiast' },
    tasting: 'Интоор, бөөрөлзгөнө, гүзээлзгэний шүүслэг амт, ойн хөрс болон нарийн амтлагчийн анхилуун үнэр.',
    notes: ['Интоор', 'Бөөрөлзгөнө', 'Гүзээлзгэнэ', 'Ойн хөрс'],
    pairing: 'Шарсан хурга, хонины мах, мөөг, ганга өвсөөр амталсан шарсан ногоо',
    labelImg: '/labels/migration.jpg', labelSize: [0.8, 1.07], labelY: 0.76, // photo of the real label
    shape: 'burgundy', wine: '#4a0f1c', glass: '#100a0a', glassOpacity: 0.5, foil: '#4a1923',
    labelBg: '#efe4c6', labelInk: '#2a1a0c', label: '#6a3a1a',
    story: {
      title: 'Далайн сэрүүн салхинд боловсорсон Пино Нуар',
      paragraphs: [
        '2001 онд алдарт Duckhorn брэндийн нэг хэсэг болон үүсгэн байгуулагдсан Migration нь зөвхөн сэрүүн уур амьсгалд ургадаг усан үзмээр шилдэг Пино Нуар урлах зорилготойгоор мэндэлсэн түүхтэй.',
        'Калифорнийн эргийн далайн сэрүүн салхи, хөрсний амьсгал, байгалийн онцлогийг нэгтгэн лонхонд багтаасан энэхүү дарс нь сүүлийн 20 гаруй жилийн турш Пино Нуар сонирхогчдын дуртай сонголт байсаар ирсэн төгс урлал юм.',
        'Хонины махны өвөрмөц амтыг дарахгүй, харин ч төгс баяжуулна. Оройн зоогтоо уян зөөлөн, тансаг мэдрэмжийг нэмээрэй.'
      ],
      quote: 'Улаан дарс заавал хүнд байх албагүйг батлах шилдэг жишээ. Торгомсог зөөлөн бүтэцтэй, хөрслөг бөгөөд хоолтой хорших чадвараараа гоц гойд. — Wine Enthusiast, 92 оноо'
    }
  }
]

/** 259000 -> "259,000 ₮" */
export const fmtPrice = (n) => `${n.toLocaleString('en-US')} ₮`
