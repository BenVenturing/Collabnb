import { STAGES } from './mockData';

// Canonical production stage order, shared by the creator's collab stepper
// (CollabDetail) and the host's proposal board (HostProposals).
export const STAGE_KEYS = STAGES.map((s) => s.key);
