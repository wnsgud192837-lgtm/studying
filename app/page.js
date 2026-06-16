"use client";

import { useEffect, useMemo, useState } from "react";
import { initialKanji, initialWords, reviewIntervals } from "./data";

const STORE = {
  words: "japanese-study:words",
  kanji: "japanese-study:kanji",
  savedWords: "japanese-study:saved-words",
  progress: "japanese-study:progress-v2",
  studyDates: "japanese-study:study-dates"
};

const ratingLabels = {
  forgot: "모름",
  hard: "어려움",
  know: "알고 있음",
  perfect: "완벽히 암기"
};

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

function addDays(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function isDue(progress) {
  if (!progress?.nextReviewAt) return true;
  return new Date(progress.nextReviewAt) <= new Date();
}

function progressKey(type, id) {
  return `${type}:${id}`;
}

function createProgress(previous, rating) {
  const isCorrect = rating === "know" || rating === "perfect";
  const wrongCount = (previous?.wrongCount || 0) + (isCorrect ? 0 : 1);
  const correctCount = (previous?.correctCount || 0) + (isCorrect ? 1 : 0);

  return {
    attempts: (previous?.attempts || 0) + 1,
    correctCount,
    wrongCount,
    lastRating: rating,
    lastStudiedAt: new Date().toISOString(),
    nextReviewAt: addDays(reviewIntervals[rating]),
    status: rating === "perfect" ? "mastered" : rating === "forgot" ? "learning" : "review"
  };
}

function useLocalStudyState() {
  const [words, setWords] = useState(initialWords);
  const [kanji, setKanji] = useState(initialKanji);
  const [savedWords, setSavedWords] = useState([]);
  const [progress, setProgress] = useState({});
  const [studyDates, setStudyDates] = useState([]);

  useEffect(() => {
    setWords(safeRead(STORE.words, initialWords));
    setKanji(safeRead(STORE.kanji, initialKanji));
    setSavedWords(safeRead(STORE.savedWords, []));
    setProgress(safeRead(STORE.progress, {}));
    setStudyDates(safeRead(STORE.studyDates, []));
  }, []);

  function persistWords(next) {
    setWords(next);
    save(STORE.words, next);
  }

  function persistKanji(next) {
    setKanji(next);
    save(STORE.kanji, next);
  }

  function persistSavedWords(next) {
    setSavedWords(next);
    save(STORE.savedWords, next);
  }

  function recordReview(type, id, rating) {
    const key = progressKey(type, id);
    const nextProgress = {
      ...progress,
      [key]: createProgress(progress[key], rating)
    };
    const dates = Array.from(new Set([...studyDates, todayKey()]));
    setProgress(nextProgress);
    setStudyDates(dates);
    save(STORE.progress, nextProgress);
    save(STORE.studyDates, dates);
  }

  return {
    words,
    kanji,
    savedWords,
    progress,
    studyDates,
    persistWords,
    persistKanji,
    persistSavedWords,
    recordReview
  };
}

function getStreak(dates) {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (set.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getStats(progress, studyDates) {
  const values = Object.values(progress);
  const attempts = values.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correct = values.reduce((sum, item) => sum + (item.correctCount || 0), 0);
  const due = values.filter(isDue).length;

  return {
    due,
    studied: values.filter((item) => item.lastStudiedAt).length,
    streak: getStreak(studyDates),
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0
  };
}

function RatingButtons({ onRate }) {
  return (
    <div className="rating-grid">
      {Object.entries(ratingLabels).map(([rating, label]) => (
        <button key={rating} type="button" onClick={() => onRate(rating)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function PhoneStatus() {
  return (
    <div className="phone-status" aria-hidden="true">
      <span>9:41</span>
      <span>●●●  Wi-Fi  ▰</span>
    </div>
  );
}

function BottomNav({ onHome, active = "home" }) {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {[
        ["home", "홈"],
        ["review", "복습"],
        ["record", "기록"],
        ["profile", "마이"]
      ].map(([key, label]) => (
        <button key={key} className={active === key ? "active" : ""} type="button" onClick={key === "home" ? onHome : undefined}>
          <span>{key === "home" ? "⌂" : key === "review" ? "◇" : key === "record" ? "✎" : "○"}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}

function StatStrip({ stats }) {
  return (
    <div className="stats-grid" aria-label="학습 통계">
      <span>
        <strong>{stats.due}</strong>
        오늘 복습
      </span>
      <span>
        <strong>{stats.studied}</strong>
        학습 항목
      </span>
      <span>
        <strong>{stats.streak}</strong>
        연속 일수
      </span>
      <span>
        <strong>{stats.accuracy}%</strong>
        정답률
      </span>
    </div>
  );
}

function HomeScreen({ onSelect }) {
  return (
    <main className="home-screen">
      <section className="phone-shell home-inner" aria-label="학습 선택">
        <PhoneStatus />
        <div className="home-hero">
          <p className="eyebrow">おはようございます</p>
          <h1>오늘도 함께<br />일본어를 배워요</h1>
          <p>매일 조금씩, 나의 일본어를 키워요.</p>
          <div className="window-scene" aria-hidden="true">
            <span className="sun" />
            <span className="plant one" />
            <span className="plant two" />
            <span className="book" />
            <span className="cup" />
          </div>
        </div>
        <div className="daily-card">
          <div className="progress-ring">
            <strong>65%</strong>
          </div>
          <div>
            <p className="eyebrow">오늘의 학습</p>
            <strong>20 / 30분</strong>
            <small>목표까지 조금만 더</small>
          </div>
        </div>
        <div className="home-actions">
          <button type="button" onClick={() => onSelect("kanji")}>
            한자 공부하기
          </button>
          <button type="button" onClick={() => onSelect("japanese")}>
            일본어 공부하기
          </button>
        </div>
        <BottomNav onHome={() => onSelect("home")} />
      </section>
    </main>
  );
}

function JapaneseStudy({ state, onBack }) {
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    japanese: "",
    reading: "",
    meaningKo: "",
    exampleJapanese: "",
    exampleMeaningKo: ""
  });

  const stats = useMemo(() => getStats(state.progress, state.studyDates), [state.progress, state.studyDates]);
  const savedSet = new Set(state.savedWords);
  const savedItems = state.words.filter((word) => savedSet.has(word.id));
  const searchable = query.trim().toLowerCase();
  const searchResults = state.words.filter((word) => {
    if (!searchable) return true;
    return [word.meaningKo, word.japanese, word.reading, word.exampleMeaningKo]
      .join(" ")
      .toLowerCase()
      .includes(searchable);
  });
  const reviewItems = savedItems.filter((word) => isDue(state.progress[progressKey("word", word.id)]));
  const wrongItems = state.words.filter((word) => (state.progress[progressKey("word", word.id)]?.wrongCount || 0) >= 2);
  const cardItems = savedItems.length ? savedItems : state.words;
  const activeCard = cardItems[cardIndex % cardItems.length];

  function saveWord(word) {
    if (savedSet.has(word.id)) return;
    state.persistSavedWords([...state.savedWords, word.id]);
  }

  function submitWord(event) {
    event.preventDefault();
    const id = editing || `custom-word-${Date.now()}`;
    const nextWord = { id, source: "직접 추가", ...form };
    const exists = state.words.some((word) => word.id === id);
    const next = exists ? state.words.map((word) => (word.id === id ? nextWord : word)) : [nextWord, ...state.words];
    state.persistWords(next);
    if (!savedSet.has(id)) state.persistSavedWords([...state.savedWords, id]);
    setEditing(null);
    setForm({ japanese: "", reading: "", meaningKo: "", exampleJapanese: "", exampleMeaningKo: "" });
  }

  function editWord(word) {
    setEditing(word.id);
    setForm({
      japanese: word.japanese,
      reading: word.reading,
      meaningKo: word.meaningKo,
      exampleJapanese: word.exampleJapanese,
      exampleMeaningKo: word.exampleMeaningKo
    });
    setTab("manage");
  }

  function deleteWord(id) {
    state.persistWords(state.words.filter((word) => word.id !== id));
    state.persistSavedWords(state.savedWords.filter((wordId) => wordId !== id));
  }

  function rateWord(word, rating) {
    state.recordReview("word", word.id, rating);
    setRevealed(false);
    setCardIndex((index) => index + 1);
  }

  return (
    <main className="app-shell">
      <section className="phone-shell study-panel wide" aria-label="일본어 공부">
        <PhoneStatus />
        <header className="section-header">
          <button className="ghost-button" type="button" onClick={onBack}>
            ‹
          </button>
          <div>
            <p className="eyebrow">Japanese Words</p>
            <h1>일본어 공부하기</h1>
          </div>
        </header>

        <StatStrip stats={stats} />

        <nav className="tabs" aria-label="일본어 공부 메뉴">
          {[
            ["search", "검색"],
            ["saved", "단어장"],
            ["cards", "플래시카드"],
            ["review", "복습"],
            ["wrong", "오답노트"],
            ["manage", "관리"]
          ].map(([key, label]) => (
            <button key={key} className={tab === key ? "active" : ""} type="button" onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>

        {tab === "search" ? (
          <section className="stack">
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="한국어, 일본어, 히라가나로 검색"
            />
            <div className="item-grid">
              {searchResults.map((word) => (
                <WordCard key={word.id} word={word} saved={savedSet.has(word.id)} onSave={saveWord} onEdit={editWord} />
              ))}
            </div>
          </section>
        ) : null}

        {tab === "saved" ? (
          <section className="item-grid">
            {savedItems.map((word) => (
              <WordCard key={word.id} word={word} saved onSave={saveWord} onEdit={editWord} />
            ))}
            {!savedItems.length ? <p className="empty">저장한 단어가 없습니다.</p> : null}
          </section>
        ) : null}

        {tab === "cards" && activeCard ? (
          <section className="flashcard">
            <p className="source-label">{activeCard.source}</p>
            <button className="audio-button" type="button" onClick={() => speak(activeCard.japanese)}>
              듣기
            </button>
            <p className="japanese">{activeCard.japanese}</p>
            <p className="reading">{activeCard.reading}</p>
            {revealed ? (
              <div className="answer">
                <p>{activeCard.meaningKo}</p>
                <small>{activeCard.exampleJapanese}</small>
                <small>{activeCard.exampleMeaningKo}</small>
              </div>
            ) : (
              <button className="reveal-button" type="button" onClick={() => setRevealed(true)}>
                정답 보기
              </button>
            )}
            <RatingButtons onRate={(rating) => rateWord(activeCard, rating)} />
          </section>
        ) : null}

        {tab === "review" ? (
          <section className="stack">
            {reviewItems.map((word) => (
              <ReviewRow key={word.id} title={word.japanese} subtitle={word.reading} meaning={word.meaningKo} onRate={(rating) => rateWord(word, rating)} />
            ))}
            {!reviewItems.length ? <p className="empty">오늘 복습할 단어가 없습니다.</p> : null}
          </section>
        ) : null}

        {tab === "wrong" ? (
          <section className="item-grid">
            {wrongItems.map((word) => (
              <WordCard key={word.id} word={word} saved={savedSet.has(word.id)} onSave={saveWord} onEdit={editWord} />
            ))}
            {!wrongItems.length ? <p className="empty">자주 틀린 단어가 아직 없습니다.</p> : null}
          </section>
        ) : null}

        {tab === "manage" ? (
          <section className="manage-layout">
            <WordForm form={form} setForm={setForm} editing={editing} onSubmit={submitWord} onCancel={() => setEditing(null)} />
            <div className="stack">
              {state.words.map((word) => (
                <div className="compact-row" key={word.id}>
                  <span>{word.japanese}</span>
                  <button type="button" onClick={() => editWord(word)}>
                    수정
                  </button>
                  <button type="button" onClick={() => deleteWord(word.id)}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <BottomNav onHome={onBack} active={tab === "review" ? "review" : "home"} />
      </section>
    </main>
  );
}

function WordCard({ word, saved, onSave, onEdit }) {
  return (
    <article className="study-card">
      <div className="card-actions">
        <span>{word.source}</span>
        <button type="button" onClick={() => speak(word.japanese)}>
          듣기
        </button>
      </div>
      <h2>{word.japanese}</h2>
      <p className="reading">{word.reading}</p>
      <p>{word.meaningKo}</p>
      <small>{word.exampleJapanese}</small>
      <small>{word.exampleMeaningKo}</small>
      <div className="inline-actions">
        <button type="button" onClick={() => onSave(word)} disabled={saved}>
          {saved ? "저장됨" : "저장"}
        </button>
        <button type="button" onClick={() => onEdit(word)}>
          수정
        </button>
      </div>
    </article>
  );
}

function WordForm({ form, setForm, editing, onSubmit, onCancel }) {
  return (
    <form className="edit-form" onSubmit={onSubmit}>
      <h2>{editing ? "단어 수정" : "단어 추가"}</h2>
      {[
        ["japanese", "일본어"],
        ["reading", "히라가나"],
        ["meaningKo", "뜻"],
        ["exampleJapanese", "예문"],
        ["exampleMeaningKo", "예문 뜻"]
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={key !== "exampleMeaningKo"} />
        </label>
      ))}
      <div className="inline-actions">
        <button type="submit">{editing ? "저장" : "추가"}</button>
        {editing ? (
          <button type="button" onClick={onCancel}>
            취소
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ReviewRow({ title, subtitle, meaning, onRate }) {
  return (
    <article className="review-row">
      <button type="button" onClick={() => speak(title)}>
        듣기
      </button>
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <p>{meaning}</p>
      </div>
      <RatingButtons onRate={onRate} />
    </article>
  );
}

function KanjiStudy({ state, onBack }) {
  const [tab, setTab] = useState("list");
  const [level, setLevel] = useState("all");
  const [activeId, setActiveId] = useState(state.kanji[0]?.id);
  const [form, setForm] = useState({ character: "", level: "N5", meaningKo: "", onyomi: "", kunyomi: "", note: "" });
  const [editing, setEditing] = useState(null);

  const stats = useMemo(() => getStats(state.progress, state.studyDates), [state.progress, state.studyDates]);
  const levels = ["all", ...Array.from(new Set(state.kanji.map((item) => item.level)))];
  const visible = level === "all" ? state.kanji : state.kanji.filter((item) => item.level === level);
  const active = state.kanji.find((item) => item.id === activeId) || visible[0] || state.kanji[0];
  const reviewItems = state.kanji.filter((item) => isDue(state.progress[progressKey("kanji", item.id)]));
  const wrongItems = state.kanji.filter((item) => (state.progress[progressKey("kanji", item.id)]?.wrongCount || 0) >= 2);

  function rateKanji(item, rating) {
    state.recordReview("kanji", item.id, rating);
  }

  function submitKanji(event) {
    event.preventDefault();
    const id = editing || `custom-kanji-${Date.now()}`;
    const examples = form.examplesText
      ? form.examplesText.split(",").map((value) => ({ word: value.trim(), reading: "", meaningKo: "" }))
      : [];
    const nextKanji = { id, ...form, examples };
    const exists = state.kanji.some((item) => item.id === id);
    state.persistKanji(exists ? state.kanji.map((item) => (item.id === id ? nextKanji : item)) : [nextKanji, ...state.kanji]);
    setEditing(null);
    setForm({ character: "", level: "N5", meaningKo: "", onyomi: "", kunyomi: "", note: "", examplesText: "" });
  }

  function editKanji(item) {
    setEditing(item.id);
    setForm({
      character: item.character,
      level: item.level,
      meaningKo: item.meaningKo,
      onyomi: item.onyomi,
      kunyomi: item.kunyomi,
      note: item.note,
      examplesText: item.examples.map((example) => example.word).join(", ")
    });
    setTab("manage");
  }

  function deleteKanji(id) {
    state.persistKanji(state.kanji.filter((item) => item.id !== id));
  }

  return (
    <main className="app-shell">
      <section className="phone-shell study-panel wide" aria-label="한자 공부">
        <PhoneStatus />
        <header className="section-header">
          <button className="ghost-button" type="button" onClick={onBack}>
            ‹
          </button>
          <div>
            <p className="eyebrow">Kanji Study</p>
            <h1>한자 공부하기</h1>
          </div>
        </header>

        <StatStrip stats={stats} />

        <nav className="tabs" aria-label="한자 공부 메뉴">
          {[
            ["list", "목록"],
            ["detail", "상세"],
            ["review", "복습"],
            ["wrong", "오답노트"],
            ["manage", "관리"]
          ].map(([key, label]) => (
            <button key={key} className={tab === key ? "active" : ""} type="button" onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>

        {tab === "list" ? (
          <section className="kanji-layout">
            <div className="level-list">
              {levels.map((item) => (
                <button key={item} className={level === item ? "active" : ""} type="button" onClick={() => setLevel(item)}>
                  {item === "all" ? "전체" : item}
                </button>
              ))}
            </div>
            <div className="kanji-grid">
              {visible.map((item) => (
                <button
                  key={item.id}
                  className={active?.id === item.id ? "active" : ""}
                  type="button"
                  onClick={() => {
                    setActiveId(item.id);
                    setTab("detail");
                  }}
                >
                  {item.character}
                  <span>{item.meaningKo}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "detail" && active ? (
          <KanjiDetail item={active} onRate={(rating) => rateKanji(active, rating)} onEdit={() => editKanji(active)} />
        ) : null}

        {tab === "review" ? (
          <section className="stack">
            {reviewItems.map((item) => (
              <ReviewRow key={item.id} title={item.character} subtitle={`${item.onyomi} / ${item.kunyomi}`} meaning={item.meaningKo} onRate={(rating) => rateKanji(item, rating)} />
            ))}
            {!reviewItems.length ? <p className="empty">오늘 복습할 한자가 없습니다.</p> : null}
          </section>
        ) : null}

        {tab === "wrong" ? (
          <section className="kanji-grid">
            {wrongItems.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveId(item.id)}>
                {item.character}
                <span>{item.meaningKo}</span>
              </button>
            ))}
            {!wrongItems.length ? <p className="empty">자주 틀린 한자가 아직 없습니다.</p> : null}
          </section>
        ) : null}

        {tab === "manage" ? (
          <section className="manage-layout">
            <KanjiForm form={form} setForm={setForm} editing={editing} onSubmit={submitKanji} />
            <div className="stack">
              {state.kanji.map((item) => (
                <div className="compact-row" key={item.id}>
                  <span>{item.character}</span>
                  <button type="button" onClick={() => editKanji(item)}>
                    수정
                  </button>
                  <button type="button" onClick={() => deleteKanji(item.id)}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <BottomNav onHome={onBack} active={tab === "review" ? "review" : "home"} />
      </section>
    </main>
  );
}

function KanjiDetail({ item, onRate, onEdit }) {
  return (
    <article className="kanji-detail">
      <div className="kanji-main">
        <button className="audio-button" type="button" onClick={() => speak(item.character)}>
          듣기
        </button>
        <p>{item.character}</p>
        <span>{item.level}</span>
      </div>
      <div className="kanji-info">
        <h2>{item.meaningKo}</h2>
        <dl>
          <div>
            <dt>음독</dt>
            <dd>{item.onyomi}</dd>
          </div>
          <div>
            <dt>훈독</dt>
            <dd>{item.kunyomi}</dd>
          </div>
        </dl>
        <p>{item.note}</p>
        <div className="example-list">
          {item.examples.map((example) => (
            <button key={example.word} type="button" onClick={() => speak(example.word)}>
              {example.word}
              <span>{example.reading}</span>
              <small>{example.meaningKo}</small>
            </button>
          ))}
        </div>
        <RatingButtons onRate={onRate} />
        <button className="ghost-button" type="button" onClick={onEdit}>
          수정
        </button>
      </div>
    </article>
  );
}

function KanjiForm({ form, setForm, editing, onSubmit }) {
  return (
    <form className="edit-form" onSubmit={onSubmit}>
      <h2>{editing ? "한자 수정" : "한자 추가"}</h2>
      {[
        ["character", "한자"],
        ["level", "레벨"],
        ["meaningKo", "뜻"],
        ["onyomi", "음독"],
        ["kunyomi", "훈독"],
        ["examplesText", "예시 단어"],
        ["note", "메모"]
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={key !== "note"} />
        </label>
      ))}
      <button type="submit">{editing ? "저장" : "추가"}</button>
    </form>
  );
}

export default function Home() {
  const state = useLocalStudyState();
  const [screen, setScreen] = useState("home");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (screen === "kanji") {
    return <KanjiStudy state={state} onBack={() => setScreen("home")} />;
  }

  if (screen === "japanese") {
    return <JapaneseStudy state={state} onBack={() => setScreen("home")} />;
  }

  return <HomeScreen onSelect={setScreen} />;
}
