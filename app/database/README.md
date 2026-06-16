# Local Data Store

앱의 초기 학습 데이터는 JSON 파일로 분리해 둔다. 브라우저에서는 이 seed 데이터를 읽은 뒤, 사용자의 저장/복습/수정 기록을 `localStorage`에 보관한다.

## Files

- `words.json`: PDF 3개에서 추출한 일본어 단어 목록
- `kanji.json`: 한자 학습 seed 데이터
- `words-by-level/`: 단어를 난이도별로 분리한 JSON 파일
- `kanji-by-level/`: 한자를 난이도별로 분리한 JSON 파일
- `index.json`: 전체 데이터 개수와 난이도별 개수 요약

## Current Counts

### Words

| Level | Count |
| --- | ---: |
| N5 | 499 |
| N4 | 327 |
| N3 | 570 |
| N2 | 119 |
| N1 | 136 |
| Other | 833 |
| Total | 2,484 |

### Kanji

| Level | Count |
| --- | ---: |
| N5 | 7 |
| N3 | 3 |
| Total | 10 |

## Word Shape

```ts
type WordItem = {
  id: string;
  japanese: string;
  reading: string;
  meaningKo: string;
  meaningEn?: string;
  exampleJapanese: string;
  exampleMeaningKo: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1" | "Other";
  source: string;
  sourceDate: string;
  reviewType: "word";
  searchText: string;
};
```

## Kanji Shape

```ts
type KanjiItem = {
  id: string;
  character: string;
  level: string;
  meaningKo: string;
  onyomi: string;
  kunyomi: string;
  examples: Array<{
    word: string;
    reading: string;
    meaningKo: string;
  }>;
  note: string;
};
```
