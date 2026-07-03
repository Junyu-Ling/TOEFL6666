import FlashCard from "./FlashCard";

export default function PracticeSession({
  title,
  toolbarExtra,
  stats,
  queueLength,
  currentIndex,
  currentWord,
  wordStats,
  wordBankMap,
  micGranted,
  onResult,
  onMemoryTrickGenerated,
  onNext,
  onPrev,
  sessionKey,
  emptyMessage = "本轮练习已完成！",
}) {
  const progress = queueLength ? Math.round(((currentIndex + 1) / queueLength) * 100) : 0;

  return (
    <section className="practice-view">
      <div className="practice-toolbar">
        <div className="practice-toolbar__left">
          <span className="practice-toolbar__title">{title}</span>
          {toolbarExtra}
        </div>
        {stats ? <div className="practice-toolbar__stats">{stats}</div> : null}
      </div>

      <div className="progress-track" aria-label="学习进度">
        <div className="progress-track__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="progress-label">
        {queueLength ? `${currentIndex + 1} / ${queueLength}` : "0 / 0"}
      </p>

      {currentWord ? (
        <FlashCard
          key={sessionKey}
          wordData={currentWord}
          wordStats={wordStats}
          wordBankMap={wordBankMap}
          micGranted={micGranted}
          onResult={onResult}
          onMemoryTrickGenerated={onMemoryTrickGenerated}
          onNext={onNext}
          onPrev={onPrev}
        />
      ) : (
        <div className="word-list-view__empty">
          <span className="empty-icon">🎉</span>
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
