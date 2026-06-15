export const reviewIntervals = {
  forgot: 1,
  hard: 3,
  know: 7,
  perfect: 30
};

export const initialWords = [
  {
    id: "pdf-gomibako",
    japanese: "ゴミ箱",
    reading: "ごみばこ",
    meaningKo: "쓰레기통",
    exampleJapanese: "日本ってさ、全然ゴミ箱なくない?",
    exampleMeaningKo: "일본은 정말 쓰레기통이 거의 없지 않아?",
    source: "PDF 20260603"
  },
  {
    id: "pdf-machinaka",
    japanese: "街中",
    reading: "まちなか",
    meaningKo: "시내, 거리 한복판",
    exampleJapanese: "街中に本当にゴミ箱がないよね。",
    exampleMeaningKo: "시내에는 정말 쓰레기통이 없지.",
    source: "PDF 20260603"
  },
  {
    id: "pdf-kazegimi",
    japanese: "風邪気味",
    reading: "かぜぎみ",
    meaningKo: "감기 기운",
    exampleJapanese: "まだ僕、風邪気味なんだよね。",
    exampleMeaningKo: "아직 나는 감기 기운이 있어.",
    source: "PDF 20260603"
  },
  {
    id: "pdf-sankoubunken",
    japanese: "参考文献",
    reading: "さんこうぶんけん",
    meaningKo: "참고 문헌",
    exampleJapanese: "今日の参考文献は結構たくさんあるよ。",
    exampleMeaningKo: "오늘 참고 문헌은 꽤 많이 있어.",
    source: "PDF 20260603"
  },
  {
    id: "pdf-hizashi",
    japanese: "日差し",
    reading: "ひざし",
    meaningKo: "햇살, 햇볕",
    exampleJapanese: "日差しが毎日強くなってきている。",
    exampleMeaningKo: "햇살이 매일 강해지고 있다.",
    source: "PDF 20260606"
  },
  {
    id: "pdf-hiyake",
    japanese: "日焼け",
    reading: "ひやけ",
    meaningKo: "선탠, 햇볕에 탐",
    exampleJapanese: "僕は基本的に日焼けしたくない。",
    exampleMeaningKo: "나는 기본적으로 햇볕에 타고 싶지 않다.",
    source: "PDF 20260606"
  },
  {
    id: "pdf-tenkiyohou",
    japanese: "天気予報",
    reading: "てんきよほう",
    meaningKo: "일기예보",
    exampleJapanese: "天気予報を見ればいいだけの話なんだけどね。",
    exampleMeaningKo: "일기예보를 보면 되는 이야기이긴 하지만.",
    source: "PDF 20260606"
  },
  {
    id: "pdf-tsuyu",
    japanese: "梅雨",
    reading: "つゆ",
    meaningKo: "장마",
    exampleJapanese: "梅雨の季節になるよね、これから。",
    exampleMeaningKo: "이제 장마철이 되겠지.",
    source: "PDF 20260606"
  },
  {
    id: "pdf-kokuhaku",
    japanese: "告白",
    reading: "こくはく",
    meaningKo: "고백",
    exampleJapanese: "日本の恋愛における告白文化って知ってるかな?",
    exampleMeaningKo: "일본 연애에서의 고백 문화를 알고 있을까?",
    source: "PDF 20260611"
  },
  {
    id: "pdf-renai",
    japanese: "恋愛",
    reading: "れんあい",
    meaningKo: "연애",
    exampleJapanese: "今日は日本の恋愛の告白文化について話します。",
    exampleMeaningKo: "오늘은 일본 연애의 고백 문화에 대해 이야기합니다.",
    source: "PDF 20260611"
  },
  {
    id: "pdf-tsukiau",
    japanese: "付き合う",
    reading: "つきあう",
    meaningKo: "사귀다",
    exampleJapanese: "好きです。付き合ってください。",
    exampleMeaningKo: "좋아합니다. 사귀어 주세요.",
    source: "PDF 20260611"
  },
  {
    id: "pdf-shinmitsu",
    japanese: "親密",
    reading: "しんみつ",
    meaningKo: "친밀함",
    exampleJapanese: "より親密な関係性になっていくんだよ。",
    exampleMeaningKo: "더 친밀한 관계가 되어 가는 거야.",
    source: "PDF 20260611"
  }
];

export const initialKanji = [
  {
    id: "kanji-hi",
    character: "日",
    level: "N5",
    meaningKo: "날, 해, 일본",
    onyomi: "ニチ, ジツ",
    kunyomi: "ひ, か",
    examples: [
      { word: "日本", reading: "にほん", meaningKo: "일본" },
      { word: "今日", reading: "きょう", meaningKo: "오늘" }
    ],
    note: "해가 떠 있는 모양에서 온 한자라 날짜와 태양의 뜻으로 자주 쓰인다."
  },
  {
    id: "kanji-hon",
    character: "本",
    level: "N5",
    meaningKo: "책, 근본",
    onyomi: "ホン",
    kunyomi: "もと",
    examples: [
      { word: "本", reading: "ほん", meaningKo: "책" },
      { word: "日本", reading: "にほん", meaningKo: "일본" }
    ],
    note: "나무의 뿌리 부분을 표시한 모양에서 근본, 책의 뜻으로 넓어졌다."
  },
  {
    id: "kanji-go",
    character: "語",
    level: "N5",
    meaningKo: "말, 언어",
    onyomi: "ゴ",
    kunyomi: "かたる",
    examples: [
      { word: "日本語", reading: "にほんご", meaningKo: "일본어" },
      { word: "英語", reading: "えいご", meaningKo: "영어" }
    ],
    note: "말씀 언(言)이 들어가서 말과 언어에 관련된 단어에 많이 쓰인다."
  },
  {
    id: "kanji-mizu",
    character: "水",
    level: "N5",
    meaningKo: "물",
    onyomi: "スイ",
    kunyomi: "みず",
    examples: [
      { word: "水", reading: "みず", meaningKo: "물" },
      { word: "水曜日", reading: "すいようび", meaningKo: "수요일" }
    ],
    note: "흐르는 물의 모양에서 온 한자다."
  },
  {
    id: "kanji-tabemono",
    character: "食",
    level: "N5",
    meaningKo: "먹다, 음식",
    onyomi: "ショク",
    kunyomi: "たべる, くう",
    examples: [
      { word: "食べる", reading: "たべる", meaningKo: "먹다" },
      { word: "食事", reading: "しょくじ", meaningKo: "식사" }
    ],
    note: "음식과 먹는 행동에 관련된 단어에 자주 등장한다."
  },
  {
    id: "kanji-kiku",
    character: "聞",
    level: "N5",
    meaningKo: "듣다, 묻다",
    onyomi: "ブン, モン",
    kunyomi: "きく",
    examples: [
      { word: "聞く", reading: "きく", meaningKo: "듣다, 묻다" },
      { word: "新聞", reading: "しんぶん", meaningKo: "신문" }
    ],
    note: "문 안에 귀가 있는 형태로, 듣는다는 뜻을 떠올리기 쉽다."
  },
  {
    id: "kanji-koi",
    character: "恋",
    level: "N3",
    meaningKo: "사랑, 그리워하다",
    onyomi: "レン",
    kunyomi: "こい",
    examples: [
      { word: "恋愛", reading: "れんあい", meaningKo: "연애" },
      { word: "初恋", reading: "はつこい", meaningKo: "첫사랑" }
    ],
    note: "마음 심(心)이 들어가 사랑과 감정에 관련된 단어에 쓰인다."
  },
  {
    id: "kanji-ai",
    character: "愛",
    level: "N3",
    meaningKo: "사랑",
    onyomi: "アイ",
    kunyomi: "まな",
    examples: [
      { word: "愛", reading: "あい", meaningKo: "사랑" },
      { word: "恋愛", reading: "れんあい", meaningKo: "연애" }
    ],
    note: "소중히 여기고 아끼는 마음을 나타내는 한자다."
  },
  {
    id: "kanji-kokuhaku",
    character: "告",
    level: "N3",
    meaningKo: "알리다, 고하다",
    onyomi: "コク",
    kunyomi: "つげる",
    examples: [
      { word: "告白", reading: "こくはく", meaningKo: "고백" },
      { word: "報告", reading: "ほうこく", meaningKo: "보고" }
    ],
    note: "무언가를 말로 알리는 뜻을 가진다."
  },
  {
    id: "kanji-shiro",
    character: "白",
    level: "N5",
    meaningKo: "희다, 흰색",
    onyomi: "ハク, ビャク",
    kunyomi: "しろ, しろい",
    examples: [
      { word: "白い", reading: "しろい", meaningKo: "하얗다" },
      { word: "告白", reading: "こくはく", meaningKo: "고백" }
    ],
    note: "밝고 흰색인 것을 나타내며, 여러 단어에서 색이나 드러냄의 느낌을 만든다."
  }
];
