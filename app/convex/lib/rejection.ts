// Rejecting a profile must revoke everything an approval granted — several
// access checks only look at is_verified/access_state/is_founder, and a
// rejected founder would otherwise keep holding one of the capped slots.
export const REJECTION_ACCESS_PATCH = {
  is_verified: false,
  creator_verified: undefined,
  is_founder: undefined,
  access_state: undefined,
  trial_starts_at: undefined,
  trial_ends_at: undefined,
};
