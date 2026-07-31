import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);
export const useSubscription = () => useContext(SubscriptionContext);

// Gate logic:
//   - Founder → always allowed
//   - first_collab_completed === false/undefined → still on free first collab → allowed
//   - free_months_balance > 0 → referral credits remaining → allowed
//   - first_collab_completed === true AND subscription active + not expired → allowed
//   - Otherwise → blocked, show SubscriptionModal
export function SubscriptionProvider({ children }) {
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isFounder  = profile?.is_founder === true;
  const isLifetime = profile?.is_lifetime === true;
  const firstCollabCompleted = profile?.first_collab_completed === true;
  const freeMonthsBalance = profile?.free_months_balance ?? 0;
  const hasFreeMonths = freeMonthsBalance > 0;
  const expiresAt = profile?.subscription_expires_at;
  const isActive =
    profile?.subscription_status === 'active' &&
    (!expiresAt || Date.now() < expiresAt);

  // A trial-ended (limited) creator loses the free-first-collab / free-months
  // grants — they must subscribe to keep messaging and applying. Founders,
  // lifetime members, and active subscribers are always allowed.
  const isLimited =
    profile?.access_state === 'limited' &&
    profile?.role === 'creator' &&
    profile?.is_admin !== true;

  const isSubscribed =
    isFounder || isLifetime || isActive ||
    (!isLimited && (!firstCollabCompleted || hasFreeMonths));

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <SubscriptionContext.Provider value={{
      isSubscribed,
      isFounder,
      isLifetime,
      firstCollabCompleted,
      freeMonthsBalance,
      isModalOpen,
      openModal,
      closeModal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
