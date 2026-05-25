const PITCH_COUNT_KEY = '@collabnb_creator_pitch_count_v1';
const MAX_PITCHES = 10;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getPitchCount() {
  try {
    const raw = localStorage.getItem(PITCH_COUNT_KEY);
    if (!raw) return { count: 0, month: currentMonth() };
    const parsed = JSON.parse(raw);
    if (parsed.month !== currentMonth()) return { count: 0, month: currentMonth() };
    return parsed;
  } catch {
    return { count: 0, month: currentMonth() };
  }
}

export function canSubmitPitch() {
  const { count } = getPitchCount();
  return { allowed: count < MAX_PITCHES, count };
}

export function incrementPitchCount() {
  try {
    const { count } = getPitchCount();
    const next = { count: count + 1, month: currentMonth() };
    localStorage.setItem(PITCH_COUNT_KEY, JSON.stringify(next));
    return next.count;
  } catch {
    return 0;
  }
}
