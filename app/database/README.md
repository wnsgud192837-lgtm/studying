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
| N5 | 272 |
| N4 | 202 |
| N3 | 410 |
| N2 | 95 |
| N1 | 122 |
| Other | 671 |
| Total | 1,772 |

PDF에서 추출한 원본 항목은 2,484개였고, 같은 `japanese + reading` 기준 중복 712개를 병합했다. 병합된 항목의 출처와 예문은 `sources`, `sourceDates`, `examples` 배열에 보존된다.

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
  usedKanji: string;
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
};
```

한자 데이터는 `docs/일본어_상용한자_2136자.xlsx`의 상용한자 2,136자와
대표단어를 기준으로 한다. `python scripts/import-kanji-xlsx.py`를 실행하면
`kanji.json`, 난이도별 파일, `index.json`의 한자 통계가 갱신된다.
