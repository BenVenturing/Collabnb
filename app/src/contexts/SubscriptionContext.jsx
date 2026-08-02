import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);
export const useSubscription = () => useContext(SubscriptionContext);

// Gate logic:
//   - Founder → always allowed
//   - access_state !== 'limited' → still inside the 30-day trial → allowed
//   - subscription active + not expired → allowed
//   - Otherwise (trial ended, no active plan) → blocked, show SubscriptionModal
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

  // Trial length (not first-collab completion) is what ends the free window —
  // founders, lifetime members, and active subscribers are always allowed.
  const isLimited =
    profile?.access_state === 'limited' &&
    profile?.role === 'creator' &&
    profile?.is_admin !== true;

  const isSubscribed = isFounder || isLifetime || isActive || !isLimited;

  const createBillingPortalSession = useAction(api.stripe.createBillingPortalSession);
  const portalRedirecting = useRef(false);

  // Active subscribers should never see the $10/$60 plan picker (it only ever
  // creates a brand-new Stripe subscription, so it would double-charge them).
  // Send them to the billing portal to manage their existing plan instead.
  const openModal = useCallback(() => {
    if (isActive && !portalRedirecting.current) {
      portalRedirecting.current = true;
      const profileId = profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : undefined);
      createBillingPortalSession({ profileId, returnUrl: `${window.location.origin}/profile` })
        .then(({ url }) => { if (url) window.location.href = url; else setIsModalOpen(true); })
        .catch(() => setIsModalOpen(true))
        .finally(() => { portalRedirecting.current = false; });
      return;
    }
    setIsModalOpen(true);
  }, [isActive, profile, createBillingPortalSession]);
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
