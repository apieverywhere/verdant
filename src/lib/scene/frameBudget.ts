/**
 * Adaptive resolution for the redesigned scenes. On a weak GPU (or software rendering) their shading costs more per
 * pixel than the frame allows, so while frames stay slow the render resolution steps down, to half at most. It never
 * steps back up: going back and forth would make the picture visibly pump.
 */
const SLOW_S = 1 / 24; // a running average above this counts as slow
const MIN_SCALE = 0.5;
const STEP = 0.8;
const SETTLE_MS = 1500; // wait between steps (and after start-up, when shaders compile) before judging again

export class FrameBudget {
  /** Multiplier for the renderer's pixel ratio. */
  scale = 1;
  private avg = 1 / 60;
  private settleUntil = performance.now() + SETTLE_MS;

  /** Feed one frame's real duration in seconds; returns true when `scale` changed and the renderer must be resized. */
  tick(dt: number, now: number): boolean {
    if (dt <= 0 || dt > 0.5) return false; // the first frame, or the tab was in the background
    this.avg += (dt - this.avg) * 0.1;
    if (now < this.settleUntil || this.avg < SLOW_S || this.scale <= MIN_SCALE) return false;
    this.scale = Math.max(MIN_SCALE, this.scale * STEP);
    this.avg = SLOW_S / 2; // judge the new resolution afresh
    this.settleUntil = now + SETTLE_MS;
    return true;
  }
}
