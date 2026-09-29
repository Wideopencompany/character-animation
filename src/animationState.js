export const CLIP_STORAGE_KEY = 'character-animation-selected-clip-v1';

export const CLIPS = [
  { key: 'idle', label: 'Idle', matcher: /idle/i },
  { key: 'walk', label: 'Walk', matcher: /walk/i },
  { key: 'conversation', label: 'Conversation', matcher: /gesture|talk|listen|agree|call/i },
  { key: 'sit', label: 'Sit', matcher: /sit/i },
];

export function readSelectedClip(storage) {
  const saved = storage.getItem(CLIP_STORAGE_KEY);
  return CLIPS.some((clip) => clip.key === saved) ? saved : 'idle';
}

export function saveSelectedClip(storage, key) {
  if (!CLIPS.some((clip) => clip.key === key)) throw new RangeError(`Unknown clip: ${key}`);
  storage.setItem(CLIP_STORAGE_KEY, key);
}

export function findClip(animations, descriptor) {
  return animations.find((animation) => descriptor.matcher.test(animation.name));
}
