# 일본어 공부 앱 데이터 모델 초안

## 목표

첫 MVP는 사용자가 일본어 학습 카드를 보고, 정답 여부를 기록하고, 다음 복습 대상을 다시 보여주는 흐름을 만든다.

핵심 루프:

1. 오늘 배울 카드 목록을 본다.
2. 뜻, 읽기, 예문을 확인하거나 퀴즈를 푼다.
3. 사용자가 `알아요 / 몰라요` 또는 정답 여부를 기록한다.
4. 앱이 다음 복습 시점과 숙련도를 저장한다.

## 저장 전략

초기 단계에서는 PWA + 로컬 저장을 추천한다.

- MVP: IndexedDB 또는 localStorage
- 로그인/기기 동기화가 필요해지는 시점: Supabase/Postgres
- 앱 설치: PWA로 시작 후, 필요하면 React Native/Expo 또는 Tauri로 확장

## 주요 엔티티

### users

사용자 계정 정보다. MVP에서 로그인을 만들지 않는다면 로컬 기본 사용자 1명으로 처리할 수 있다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 사용자 ID |
| display_name | text | 표시 이름 |
| daily_goal | integer | 하루 목표 카드 수 |
| created_at | timestamp | 생성 시간 |
| updated_at | timestamp | 수정 시간 |

### decks

학습 묶음이다. 예: 히라가나, N5 단어, 여행 회화.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 덱 ID |
| title | text | 덱 이름 |
| description | text | 덱 설명 |
| level | text | N5, N4, beginner 등 |
| is_builtin | boolean | 앱 기본 제공 덱 여부 |
| created_at | timestamp | 생성 시간 |
| updated_at | timestamp | 수정 시간 |

### study_items

실제 학습 콘텐츠다. 단어, 문장, 문자 카드를 모두 담을 수 있게 조금 넓게 설계한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 학습 항목 ID |
| deck_id | uuid | 소속 덱 ID |
| item_type | text | kana, word, phrase, kanji |
| japanese | text | 일본어 표기 |
| reading | text | 히라가나 읽기 |
| meaning_ko | text | 한국어 뜻 |
| example_japanese | text | 일본어 예문 |
| example_reading | text | 예문 읽기 |
| example_meaning_ko | text | 예문 뜻 |
| level | text | N5, N4 등 |
| tags | text[] | 태그 |
| created_at | timestamp | 생성 시간 |
| updated_at | timestamp | 수정 시간 |

예시:

| japanese | reading | meaning_ko | example_japanese | example_meaning_ko |
| --- | --- | --- | --- | --- |
| 食べる | たべる | 먹다 | ご飯を食べる | 밥을 먹다 |
| 水 | みず | 물 | 水を飲みます | 물을 마십니다 |

### user_item_progress

사용자별 학습 상태다. 복습 앱의 핵심 테이블이다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 진행 상태 ID |
| user_id | uuid | 사용자 ID |
| item_id | uuid | 학습 항목 ID |
| status | text | new, learning, review, mastered |
| correct_count | integer | 누적 정답 수 |
| wrong_count | integer | 누적 오답 수 |
| streak | integer | 연속 정답 수 |
| ease_factor | numeric | 복습 난이도 계수 |
| interval_days | integer | 다음 복습까지의 일수 |
| last_studied_at | timestamp | 마지막 학습 시간 |
| next_review_at | timestamp | 다음 복습 시간 |
| created_at | timestamp | 생성 시간 |
| updated_at | timestamp | 수정 시간 |

초기 복습 규칙:

- 처음 보는 항목: status = `new`
- 틀림: status = `learning`, interval_days = 0 또는 1
- 맞음 1회: status = `learning`, interval_days = 1
- 연속 정답 2~3회: status = `review`, interval_days = 3, 7, 14 순서로 증가
- 충분히 반복 성공: status = `mastered`

### study_sessions

하루 학습 묶음이다. 통계와 이어하기에 사용한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 세션 ID |
| user_id | uuid | 사용자 ID |
| started_at | timestamp | 시작 시간 |
| ended_at | timestamp | 종료 시간 |
| mode | text | learn, quiz, review |
| total_count | integer | 학습한 카드 수 |
| correct_count | integer | 정답 수 |
| wrong_count | integer | 오답 수 |

### study_answers

각 문제 풀이 기록이다. 나중에 통계를 만들 때 유용하다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | 답변 기록 ID |
| session_id | uuid | 세션 ID |
| user_id | uuid | 사용자 ID |
| item_id | uuid | 학습 항목 ID |
| answer_type | text | self_check, multiple_choice, typing |
| is_correct | boolean | 정답 여부 |
| user_answer | text | 사용자가 입력한 답 |
| answered_at | timestamp | 답변 시간 |

## 로컬 저장 MVP 구조

처음부터 서버 DB를 붙이지 않는다면 아래 키 구조로 시작할 수 있다.

```ts
type StudyItem = {
  id: string;
  deckId: string;
  itemType: "kana" | "word" | "phrase" | "kanji";
  japanese: string;
  reading?: string;
  meaningKo: string;
  exampleJapanese?: string;
  exampleReading?: string;
  exampleMeaningKo?: string;
  level?: string;
  tags: string[];
};

type UserItemProgress = {
  id: string;
  itemId: string;
  status: "new" | "learning" | "review" | "mastered";
  correctCount: number;
  wrongCount: number;
  streak: number;
  easeFactor: number;
  intervalDays: number;
  lastStudiedAt?: string;
  nextReviewAt?: string;
};
```

로컬 저장 키 예시:

| 키 | 내용 |
| --- | --- |
| japanese-study:decks | 덱 목록 |
| japanese-study:items | 학습 콘텐츠 |
| japanese-study:progress | 사용자별 학습 상태 |
| japanese-study:sessions | 학습 세션 |

## Supabase/Postgres 전환 시 테이블

서버 DB로 옮길 때 우선순위:

1. `users`
2. `decks`
3. `study_items`
4. `user_item_progress`
5. `study_sessions`
6. `study_answers`

관계:

- `decks.id` -> `study_items.deck_id`
- `users.id` -> `user_item_progress.user_id`
- `study_items.id` -> `user_item_progress.item_id`
- `users.id` -> `study_sessions.user_id`
- `study_sessions.id` -> `study_answers.session_id`
- `study_items.id` -> `study_answers.item_id`

## 첫 콘텐츠 샘플

MVP에는 너무 많은 데이터를 넣지 말고, 아래 정도로 시작한다.

- 히라가나 46개
- 기본 단어 30개
- 짧은 예문 10개

추천 첫 덱:

| 덱 | 설명 |
| --- | --- |
| Hiragana Basics | 히라가나 문자와 읽기 |
| N5 Starter Words | N5 수준 기본 단어 |
| Daily Phrases | 매일 쓰는 짧은 문장 |

## 다음 작업

1. MVP 기술 스택 결정: Next.js PWA, React PWA, Expo 중 선택
2. 샘플 학습 데이터 작성
3. 카드 학습 화면 설계
4. 정답/오답 저장 로직 구현
5. 오늘 복습할 항목을 계산하는 함수 구현
