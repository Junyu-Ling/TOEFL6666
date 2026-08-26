import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import PracticeSession from "./PracticeSession";
import RoundCompleteModal from "./RoundCompleteModal";

/**
 * 分轮练习组件 - 包装 PracticeSession 实现循环复习功能
 * 
 * 功能：
 * 1. 每N个单词为一轮
 * 2. 第一次背完一轮后，回到轮首重新背一遍（复习）
 * 3. 复习完成后显示模态框，用户点击继续才进入下一轮
 */
export default function RoundPracticeSession({
  title,
  toolbarExtra,
  stats,
  queue = [],
  currentGlobalIndex,
  currentWord,
  wordStats,
  wordBankMap,
  micGranted,
  onResult,
  onMemoryTrickGenerated,
  onNext,
  onPrev,
  sessionKey,
  emptyMessage,
  tabId,
  disableAutoRead = false,
}) {
  const { settings } = useSettings();
  const { wordsPerRound, enableRoundReview } = settings;

  // 轮次管理状态
  const [roundState, setRoundState] = useState(() => {
    const currentRound = Math.floor(currentGlobalIndex / wordsPerRound);
    return {
      currentRound,           // 当前轮次（从0开始）
      showModal: false,       // 是否显示轮次完成模态框
      roundStats: {           // 本轮统计
        correctCount: 0,
        wrongCount: 0,
      },
    };
  });

  // 追踪本轮的答题情况
  const roundResultsRef = useRef(new Map()); // key: wordIndex, value: isCorrect

  // 如果禁用了分轮功能，直接使用原组件
  if (!enableRoundReview || wordsPerRound >= queue.length) {
    return (
      <PracticeSession
        title={title}
        toolbarExtra={toolbarExtra}
        stats={stats}
        queueLength={queue.length}
        currentIndex={currentGlobalIndex}
        currentWord={currentWord}
        wordStats={wordStats}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onResult={onResult}
        onMemoryTrickGenerated={onMemoryTrickGenerated}
        onNext={onNext}
        onPrev={onPrev}
        sessionKey={sessionKey}
        emptyMessage={emptyMessage}
        tabId={tabId}
        disableAutoRead={disableAutoRead}
      />
    );
  }

  // 计算当前轮次信息
  const roundInfo = useMemo(() => {
    const totalRounds = Math.ceil(queue.length / wordsPerRound);
    const currentRound = Math.floor(currentGlobalIndex / wordsPerRound);
    const roundStartIndex = currentRound * wordsPerRound;
    const roundEndIndex = Math.min(roundStartIndex + wordsPerRound, queue.length);
    const wordsInRound = roundEndIndex - roundStartIndex;
    const positionInRound = currentGlobalIndex % wordsPerRound;
    
    // 是否到达轮末
    const isRoundEnd = currentGlobalIndex === roundEndIndex - 1;
    
    return {
      totalRounds,
      currentRound,
      roundStartIndex,
      roundEndIndex,
      wordsInRound,
      positionInRound,
      isRoundEnd,
    };
  }, [currentGlobalIndex, queue.length, wordsPerRound]);

  // 处理答题结果，追踪统计
  const handleResult = useCallback((result) => {
    const { isRoundEnd, roundStartIndex } = roundInfo;
    const wordIndexInRound = currentGlobalIndex - roundStartIndex;
    
    // 记录本单词的答题结果
    if (result?.is_correct !== undefined) {
      roundResultsRef.current.set(wordIndexInRound, result.is_correct);
    }
    
    // 传递给父组件
    onResult?.(result);
  }, [currentGlobalIndex, roundInfo, onResult]);

  // 处理下一个单词
  const handleNext = useCallback(() => {
    const { isRoundEnd, currentRound, roundStartIndex, wordsInRound } = roundInfo;
    
    if (!isRoundEnd) {
      // 轮次还没结束，正常前进
      onNext();
      return;
    }

    // 到达轮末，计算本轮统计
    let correctCount = 0;
    let wrongCount = 0;
    
    for (let i = 0; i < wordsInRound; i++) {
      const result = roundResultsRef.current.get(i);
      if (result === true) correctCount++;
      else if (result === false) wrongCount++;
    }

    // 显示结算模态框
    setRoundState(prev => ({
      ...prev,
      showModal: true,
      roundStats: { correctCount, wrongCount },
    }));
  }, [roundInfo, onNext]);

  // 处理"复习本轮"
  const handleReviewAgain = useCallback(() => {
    const { roundStartIndex } = roundInfo;
    
    // 清空本轮的答题记录，准备重新开始
    roundResultsRef.current.clear();
    
    setRoundState(prev => ({
      ...prev,
      showModal: false,
      roundStats: { correctCount: 0, wrongCount: 0 },
    }));
    
    // 跳转到本轮开头
    const stepsToGoBack = currentGlobalIndex - roundStartIndex;
    for (let i = 0; i < stepsToGoBack; i++) {
      onPrev();
    }
  }, [roundInfo, currentGlobalIndex, onPrev]);

  // 处理"继续下一轮"
  const handleNextRound = useCallback(() => {
    const { currentRound } = roundInfo;
    
    // 清空本轮的答题记录
    roundResultsRef.current.clear();
    
    setRoundState(prev => ({
      ...prev,
      currentRound: currentRound + 1,
      showModal: false,
      roundStats: { correctCount: 0, wrongCount: 0 },
    }));
    
    // 前进到下一轮第一个单词
    onNext();
  }, [roundInfo, onNext]);

  // 监听全局索引变化，更新轮次状态
  useEffect(() => {
    const newRound = Math.floor(currentGlobalIndex / wordsPerRound);
    if (newRound !== roundState.currentRound && !roundState.showModal) {
      // 轮次变化了（可能是用户手动跳转）
      // 清空之前轮次的记录
      roundResultsRef.current.clear();
      
      setRoundState(prev => ({
        ...prev,
        currentRound: newRound,
        roundStats: { correctCount: 0, wrongCount: 0 },
      }));
    }
  }, [currentGlobalIndex, wordsPerRound, roundState.currentRound, roundState.showModal]);

  // 计算显示给用户的进度
  const displayProgress = useMemo(() => {
    const { roundStartIndex, wordsInRound } = roundInfo;
    const indexInRound = currentGlobalIndex - roundStartIndex;
    return {
      current: indexInRound + 1,
      total: wordsInRound,
    };
  }, [currentGlobalIndex, roundInfo]);

  // 构造标题提示
  const enhancedTitle = useMemo(() => {
    const { currentRound, totalRounds } = roundInfo;
    const roundLabel = `第 ${currentRound + 1}/${totalRounds} 轮`;
    return `${title} - ${roundLabel}`;
  }, [title, roundInfo]);

  return (
    <>
      <PracticeSession
        title={enhancedTitle}
        toolbarExtra={toolbarExtra}
        stats={stats}
        queueLength={displayProgress.total}
        currentIndex={displayProgress.current - 1}
        currentWord={currentWord}
        wordStats={wordStats}
        wordBankMap={wordBankMap}
        micGranted={micGranted}
        onResult={handleResult}
        onMemoryTrickGenerated={onMemoryTrickGenerated}
        onNext={handleNext}
        onPrev={onPrev}
        sessionKey={sessionKey}
        emptyMessage={emptyMessage}
        tabId={tabId}
        disableAutoRead={disableAutoRead}
      />
      
      {roundState.showModal && (
        <RoundCompleteModal
          roundNumber={roundInfo.currentRound + 1}
          wordsInRound={roundInfo.wordsInRound}
          correctCount={roundState.roundStats.correctCount}
          wrongCount={roundState.roundStats.wrongCount}
          onReviewAgain={handleReviewAgain}
          onNextRound={handleNextRound}
        />
      )}
    </>
  );
}
