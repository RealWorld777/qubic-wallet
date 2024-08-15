export interface IStakeHistory {
  lockedEpoch: number;
  lockedAmount: number;
  lockedWeeks: number;
  totalLockedAmountInEpoch: number;
  currentBonusAmountInEpoch: number;
  earlyUnlockPercent: number;
  fullUnlockPercent: number;
}


function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPercent(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export const MOCK_LOCK_DATA: IStakeHistory[] = Array.from({ length: 50 }, (_, index) => ({
  lockedEpoch: index + 1,
  lockedAmount: getRandomInt(1000, 10000),
  lockedWeeks: getRandomInt(10, 52),
  totalLockedAmountInEpoch: getRandomInt(50000, 100000),
  currentBonusAmountInEpoch: getRandomInt(500, 2000),
  earlyUnlockPercent: getRandomPercent(5, 25),
  fullUnlockPercent: getRandomPercent(80, 100),
}));
