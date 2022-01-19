import {SyntheticEvent} from "react";

export const getWindowWidth = () => typeof global.window !== "undefined" ? global.window.innerWidth : 0;
export const getWindowHeight = () => typeof global.window !== "undefined" ? global.window.innerHeight : 0;

const isCrossOriginFrame = () => {
  try {
    return global.window.location.hostname !== global.window.parent.location.hostname;
  } catch (e) {
    return true;
  }
};

// Get the highest window context that isn't cross-origin
// (When in an iframe)
export const getHighestSafeWindowContext = (self: Window = global.window.self): Window => {
  // If we reached the top level, return self
  if (self === global.window.top) {
    return self;
  }

  // If parent is the same origin, we can move up one context
  // Reference: https://stackoverflow.com/a/21965342/1601953
  if (!isCrossOriginFrame()) {
    return getHighestSafeWindowContext(self.parent);
  }

  // If a different origin, we consider the current level
  // as the top reachable one
  return self;
};

export const stopEvent = (e: SyntheticEvent) => {
  e.preventDefault();
};

export const loadableIndexes = (
  length: number,
  activeIndex: number,
  maxLoadAhead: number,
  infiniteScrolling: boolean,
): number[] => {
  maxLoadAhead = Math.min(maxLoadAhead, length);

  // We start from 1 then reduce it by 1
  // Because we cannot have negative and positive 0
  let base = Array.from({length}, (v, idx) => idx + 1);
  if (infiniteScrolling) {
    const negativeBase = base.map(x => -x);
    base = [
      ...negativeBase,
      ...base,
      ...negativeBase,
    ];
  }

  const pos = base.indexOf(activeIndex + 1);
  if (pos < 0)
    return [];

  const start = Math.max(pos - maxLoadAhead, 0);
  const end = Math.min(pos + maxLoadAhead, base.length) + 1;

  return base
    .slice(start, end)
    .map(x => Math.abs(x) - 1)
    .filter((v, i, a) => a.indexOf(v) === i);
};

export const arraySame = <T>(arr1: T[], arr2: T[]) => {
  return arr1.length === arr2.length && arr1.every((val, idx) => val === arr2[idx]);
};
