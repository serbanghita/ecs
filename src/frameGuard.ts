// Internal to the library: tracks whether a World is in the middle of running
// its systems, so ComponentRegistry.reset() can refuse to pull the registry
// out from under a frame that is still iterating.
let framesInProgress = 0;

export function enterFrame(): void {
  framesInProgress++;
}

export function exitFrame(): void {
  if (framesInProgress > 0) {
    framesInProgress--;
  }
}

export function isFrameRunning(): boolean {
  return framesInProgress > 0;
}
