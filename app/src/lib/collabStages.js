import { STAGES } from './mockData';

export const STAGE_KEYS = STAGES.map((s) => s.key);

// A card may only advance to the immediate next stage — no skipping ahead.
// This is the one reliably real signal available (collaborations.current_stage
// itself, synced from the creator's stage-advance actions); per-stage
// completion sub-flags (drive_url, content_stats, creator_closed/host_closed)
// aren't synced to Convex yet, so dragging isn't gated on those.
export function canAdvanceStage(fromKey, toKey) {
  const fromIdx = STAGE_KEYS.indexOf(fromKey);
  const toIdx = STAGE_KEYS.indexOf(toKey);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}
