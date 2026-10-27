import { STAGES } from './mockData';

// Canonical production stage order, shared by the creator's collab stepper
// (CollabDetail) and the host's proposal board (HostProposals).
export const STAGE_KEYS = STAGES.map((s) => s.key);

// Overlay the authoritative Convex collab row (and its signed contract) onto a
// creator's locally cached collab. The local copy is only an optimistic cache —
// the host writes stage, drive link and contract straight to Convex.
export function withServerCollab(local, real, contracts = []) {
  if (!real) return local;
  const contractId = real.contract_id || local.contract_id;
  const contract = contractId ? contracts.find((c) => String(c.id) === String(contractId)) : null;
  const cash = Number(contract?.cash_value);
  return {
    ...local,
    convex_id: String(real._id),
    creator_id: real.creator_id ?? local.creator_id,
    host_id: real.host_id ?? local.host_id,
    current_stage: real.current_stage || local.current_stage,
    stages: typeof real.stages === 'string' ? JSON.parse(real.stages) : (real.stages || local.stages),
    is_active: real.is_active ?? local.is_active,
    drive_url: real.drive_url ?? local.drive_url,
    contract_id: contractId ?? null,
    dates: contract?.dates || real.dates || local.dates,
    payment: cash > 0 ? `$${cash.toLocaleString()}` : (real.payment || local.payment),
  };
}
