import { createContext, useContext, useState, useCallback } from 'react';
import { SAMPLE_COLLABORATIONS, SAMPLE_THREADS, MOCK_CREATOR } from '../lib/mockData';

const CollabContext = createContext(null);

export function CollabProvider({ children }) {
  const [collabs, setCollabs] = useState(SAMPLE_COLLABORATIONS);
  const [threads, setThreads] = useState(SAMPLE_THREADS);
  const [applyCount, setApplyCount] = useState(() =>
    parseInt(localStorage.getItem('collabnb_apply_count') || '0', 10)
  );

  const applyToListing = useCallback((listing, pitchMessage) => {
    const newCollab = {
      id: Date.now(),
      listing_id: listing.id,
      property_name: listing.title,
      location: listing.location,
      host_name: MOCK_CREATOR.full_name,
      image: listing.image,
      status: 'pending',
      status_text: 'Application Sent',
      dates: listing.dates_available,
      deliverables: listing.deliverables,
      days_left: listing.due_days || 30,
      is_active: true,
    };

    const newThread = {
      id: `t_${listing.id}_${Date.now()}`,
      listing_title: listing.title,
      host_name: MOCK_CREATOR.full_name,
      host_avatar: null,
      tag: 'Application',
      last_message: pitchMessage.slice(0, 100),
      timestamp: 'Just now',
      unread: 0,
      is_founder: false,
    };

    setCollabs((prev) => [newCollab, ...prev]);
    setThreads((prev) => [newThread, ...prev]);

    const next = applyCount + 1;
    setApplyCount(next);
    localStorage.setItem('collabnb_apply_count', String(next));
  }, [applyCount]);

  const hasApplied = useCallback((listingId) =>
    collabs.some((c) => c.listing_id === listingId),
  [collabs]);

  return (
    <CollabContext.Provider value={{ collabs, threads, applyCount, applyToListing, hasApplied }}>
      {children}
    </CollabContext.Provider>
  );
}

export function useCollabs() {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error('useCollabs must be used within CollabProvider');
  return ctx;
}
