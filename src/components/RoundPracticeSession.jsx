import { useState, useCallback, useMemo, useEffect } from "react";
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
    const positionInRound = currentGlobalIndex % wordsPerRound;
    return {
      currentRound,           // 当前轮次（从0开始）
      isReviewing: false,     // 是否处于复习阶段
      showModal: false,       // 是否显示轮次完成模态框
      completedRounds: new Set(), // 已完成的轮次
    };
  });

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

  // 处理下一个单词
  const handleNext = useCallback(() => {
    const { isRoundEnd, currentRound, roundStartIndex } = roundInfo;
    
    if (!isRoundEnd) {
      // 轮次还没结束，正常前进
      onNext();
      return;
    }

    // 到达轮末
    if (!roundState.isReviewing) {
      // 第一次背完，显示模态框后开始复习
      setRoundState(prev => ({
        ...prev,
        showModal: true,
      }));
    } else {
      // 复习也完成了，显示模态框后进入下一轮
      setRoundState(prev => ({
        ...prev,
        showModal: true,
        completedRounds: new Set([...prev.completedRounds, currentRound]),
      }));
    }
  }, [roundInfo, roundState.isReviewing, onNext]);

  // 处理模态框的继续按钮
  const handleContinueFromModal = useCallback(() => {
    const { currentRound, roundStartIndex } = roundInfo;
    
    if (!roundState.isReviewing) {
      // 开始复习本轮
      setRoundState(prev => ({
        ...prev,
        isReviewing: true,
        showModal: false,
      }));
      // 跳转到本轮开头
      // 注意：这里需要调用正确的次数来回到轮首
      const stepsToGoBack = currentGlobalIndex - roundStartIndex;
      for (let i = 0; i < stepsToGoBack; i++) {
        onPrev();
      }
    } else {
      // 进入下一轮
      setRoundState(prev => ({
        ...prev,
        currentRound: currentRound + 1,
        isReviewing: false,
        showModal: false,
      }));
      // 前进到下一轮第一个单词
      onNext();
    }
  }, [roundInfo, roundState.isReviewing, currentGlobalIndex, onNext, onPrev]);

  // 监听全局索引变化，更新轮次状态
  useEffect(() => {
    const newRound = Math.floor(currentGlobalIndex / wordsPerRound);
    if (newRound !== roundState.currentRound && !roundState.showModal) {
      // 轮次变化了（可能是用户手动跳转）
      setRoundState(prev => ({
        ...prev,
        currentRound: newRound,
        isReviewing: prev.completedRounds.has(newRound) ? false : prev.isReviewing,
      }));
    }
  }, [currentGlobalIndex, wordsPerRound, roundState.currentRound, roundState.showModal, roundState.completedRounds]);

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
    const { currentRound, totalRounds, wordsInRound } = roundInfo;
    const roundLabel = `第 ${currentRound + 1}/${totalRounds} 轮`;
    const stageLabel = roundState.isReviewing ? "（复习）" : "";
    return `${title} - ${roundLabel}${stageLabel}`;
  }, [title, roundInfo, roundState.isReviewing]);

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
        onResult={onResult}
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
          isFirstPass={!roundState.isReviewing}
          roundNumber={roundInfo.currentRound + 1}
          wordsInRound={roundInfo.wordsInRound}
          onContinue={handleContinueFromModal}
        />
      )}
    </>
  );
}
