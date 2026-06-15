"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "japanese-study:progress";

const starterItems = [
  {
    id: "word-tabemasu",
    japanese: "食べる",
    reading: "たべる",
    meaningKo: "먹다",
    exampleJapanese: "ご飯を食べる",
    exampleMeaningKo: "밥을 먹다",
    level: "N5"
  },
  {
    id: "word-mizu",
    japanese: "水",
    reading: "みず",
    meaningKo: "물",
    exampleJapanese: "水を飲みます",
    exampleMeaningKo: "물을 마십니다",
    level: "N5"
  },
  {
    id: "word-kiku",
    japanese: "聞く",
    reading: "きく",
    meaningKo: "듣다, 묻다",
    exampleJapanese: "音楽を聞きます",
    exampleMeaningKo: "음악을 듣습니다",
    level: "N5"
  },
  {
    id: "phrase-ohayou",
    japanese: "おはようございます",
    reading: "おはようございます",
    meaningKo: "좋은 아침입니다",
    exampleJapanese: "先生、おはようございます",
    exampleMeaningKo: "선생님, 좋은 아침입니다",
    level: "Daily"
  }
];

function getInitialProgress(items) {
  return items.reduce((acc, item) => {
    acc[item.id] = {
      itemId: item.id,
      status: "new",
      correctCount: 0,
      wrongCount: 0,
      streak: 0,
      intervalDays: 0,
      lastStudiedAt: null,
      nextReviewAt: null
    };
    return acc;
  }, {});
}

function nextProgress(current, isCorrect) {
  const now = new Date().toISOString();
  const streak = isCorrect ? current.streak + 1 : 0;
  const intervalDays = isCorrect ? Math.min(Math.max(streak, 1) * 2 - 1, 14) : 1;
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  return {
    ...current,
    status: streak >= 4 ? "mastered" : streak >= 2 ? "review" : "learning",
    correctCount: current.correctCount + (isCorrect ? 1 : 0),
    wrongCount: current.wrongCount + (isCorrect ? 0 : 1),
    streak,
    intervalDays,
    lastStudiedAt: now,
    nextReviewAt: nextReview.toISOString()
  };
}

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [progress, setProgress] = useState(() => getInitialProgress(starterItems));

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProgress({ ...getInitialProgress(starterItems), ...JSON.parse(saved) });
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const activeItem = starterItems[activeIndex];
  const activeProgress = progress[activeItem.id];

  const stats = useMemo(() => {
    const values = Object.values(progress);
    const studied = values.filter((item) => item.lastStudiedAt).length;
    const mastered = values.filter((item) => item.status === "mastered").length;
    const correct = values.reduce((sum, item) => sum + item.correctCount, 0);
    const wrong = values.reduce((sum, item) => sum + item.wrongCount, 0);
    return { studied, mastered, correct, wrong };
  }, [progress]);

  function answer(isCorrect) {
    setProgress((current) => ({
      ...current,
      [activeItem.id]: nextProgress(current[activeItem.id], isCorrect)
    }));
    setIsRevealed(false);
    setActiveIndex((current) => (current + 1) % starterItems.length);
  }

  function resetProgress() {
    setProgress(getInitialProgress(starterItems));
    setIsRevealed(false);
    setActiveIndex(0);
  }

  return (
    <main className="app-shell">
      <section className="study-panel" aria-label="일본어 카드 학습">
        <header className="topbar">
          <div>
            <p className="eyebrow">Japanese Study</p>
            <h1>오늘의 카드</h1>
          </div>
          <button className="ghost-button" type="button" onClick={resetProgress}>
            초기화
          </button>
        </header>

        <div className="stats-grid" aria-label="학습 통계">
          <span>
            <strong>{stats.studied}</strong>
            학습
          </span>
          <span>
            <strong>{stats.mastered}</strong>
            숙련
          </span>
          <span>
            <strong>{stats.correct}</strong>
            정답
          </span>
          <span>
            <strong>{stats.wrong}</strong>
            오답
          </span>
        </div>

        <article className="flashcard">
          <div className="card-meta">
            <span>{activeItem.level}</span>
            <span>{activeProgress.status}</span>
          </div>

          <p className="japanese">{activeItem.japanese}</p>
          <p className="reading">{activeItem.reading}</p>

          {isRevealed ? (
            <div className="answer">
              <p>{activeItem.meaningKo}</p>
              <small>{activeItem.exampleJapanese}</small>
              <small>{activeItem.exampleMeaningKo}</small>
            </div>
          ) : (
            <button className="reveal-button" type="button" onClick={() => setIsRevealed(true)}>
              정답 보기
            </button>
          )}
        </article>

        <div className="actions">
          <button className="miss-button" type="button" onClick={() => answer(false)}>
            몰라요
          </button>
          <button className="know-button" type="button" onClick={() => answer(true)}>
            알아요
          </button>
        </div>
      </section>
    </main>
  );
}
