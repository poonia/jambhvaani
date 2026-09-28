// Plays a single shabad as an "audio stripe": a slice [startTime, endTime) of
// the book's shared audio file. One <audio> element is reused for the whole
// app so navigating away from the shabad view reliably stops playback.
import { timeToSeconds } from './content.js';

const audio = new Audio();
audio.preload = 'auto';

let currentSrc = null;
let bounds = { start: 0, end: 0 };
let listeners = new Set();
let rafId = null;

export function currentState() {
  return {
    playing: !audio.paused && !audio.ended,
    currentTime: audio.currentTime,
    start: bounds.start,
    end: bounds.end,
    duration: Math.max(0, bounds.end - bounds.start),
    position: Math.max(0, audio.currentTime - bounds.start),
    muted: audio.muted,
    volume: audio.volume,
  };
}

function emit() {
  const state = currentState();
  listeners.forEach((fn) => fn(state));
}

function tick() {
  if (audio.currentTime >= bounds.end - 0.05) {
    // Reaching the stripe end is a pause the user didn't ask for; clear the
    // intent too, or the next click would "pause" and look ignored.
    intendedPlaying = false;
    audio.pause();
    audio.currentTime = bounds.end;
    emit();
    stopTicking();
    return;
  }
  emit();
  rafId = requestAnimationFrame(tick);
}

function startTicking() {
  stopTicking();
  rafId = requestAnimationFrame(tick);
}
function stopTicking() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

audio.addEventListener('pause', () => { stopTicking(); emit(); });
audio.addEventListener('play', () => { startTicking(); emit(); });
audio.addEventListener('ended', () => { intendedPlaying = false; stopTicking(); emit(); });
// Seeks deferred until 'loadedmetadata' (see seekAudioTo) land after bind()
// already emitted, so re-emit once they complete to refresh the time labels.
audio.addEventListener('seeked', emit);

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Setting .currentTime before the browser has loaded metadata (readyState
// HAVE_NOTHING) is silently ignored, which happens on the very first bind
// after a fresh page load or whenever the src actually changes. Defer the
// seek to 'loadedmetadata' in that case instead of dropping it.
let pendingSeekHandler = null;
function seekAudioTo(seconds) {
  if (pendingSeekHandler) {
    audio.removeEventListener('loadedmetadata', pendingSeekHandler);
    pendingSeekHandler = null;
  }
  if (audio.readyState >= 1) {
    audio.currentTime = seconds;
  } else {
    pendingSeekHandler = () => { audio.currentTime = seconds; pendingSeekHandler = null; };
    audio.addEventListener('loadedmetadata', pendingSeekHandler, { once: true });
  }
}

/** Bind the player to a shabad. Resets to the shabad's start, does not autoplay. */
export function bind(audioSrc, startTime, endTime) {
  bounds = { start: timeToSeconds(startTime), end: timeToSeconds(endTime) };
  if (currentSrc !== audioSrc) {
    currentSrc = audioSrc;
    audio.src = audioSrc;
  }
  seekAudioTo(bounds.start);
  emit();
}

// Calling audio.pause() while a previous audio.play() promise hasn't
// settled yet (common on a real, slower-to-buffer file — instant with tiny
// test clips, not with a multi-minute mp3) can leave the element in a stuck
// state where a later play() no longer audibly resumes even though .paused
// reports the "right" value. Track our own intended state and only ever
// apply it once any in-flight play() has settled, re-checking the intent
// at that point rather than blindly running a queued action — this is what
// makes rapid play/pause/play clicks land on the correct final state.
let intendedPlaying = false;
let playPromise = null;

function applyPlaybackIntent() {
  if (intendedPlaying) {
    if (audio.currentTime < bounds.start || audio.currentTime >= bounds.end) {
      seekAudioTo(bounds.start);
    }
    playPromise = audio.play();
    playPromise.catch((err) => {
      if (err.name === 'AbortError') return;
      console.warn('[audio] play failed', err);
      intendedPlaying = false;
      emit();
    });
  } else if (playPromise) {
    playPromise.catch(() => {}).finally(() => {
      if (!intendedPlaying) audio.pause();
    });
  } else {
    audio.pause();
  }
}

export function play() {
  intendedPlaying = true;
  applyPlaybackIntent();
}

export function pause() {
  intendedPlaying = false;
  applyPlaybackIntent();
}

export function toggle() {
  if (intendedPlaying) pause();
  else play();
}

/** seekFraction: 0..1 within the shabad stripe. */
export function seekTo(seekFraction) {
  const clamped = Math.min(1, Math.max(0, seekFraction));
  seekAudioTo(bounds.start + clamped * (bounds.end - bounds.start));
  emit();
}

export function setMuted(muted) {
  audio.muted = muted;
  emit();
}

export function setVolume(v) {
  audio.volume = Math.min(1, Math.max(0, v));
  if (audio.volume > 0 && audio.muted) audio.muted = false;
  emit();
}
