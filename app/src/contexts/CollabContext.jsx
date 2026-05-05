import { createContext, useContext, useState, useCallback } from 'react';
import { SAMPLE_COLLABORATIONS, SAMPLE_THREADS, MOCK_CREATOR } from '../lib/mockData';

const CollabContext = createContext(null);

function loadContracts() {
  try {
    const raw = localStorage.getItem('collabnb_contracts');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveContractsToStorage(contracts) {
  try {
    localStorage.setItem('collabnb_contracts', JSON.stringify(contracts));
  } catch {}
}

export function CollabProvider({ children }) {
  const [collabs, setCollabs] = useState(SAMPLE_COLLABORATIONS);
  const [threads, setThreads] = useState(SAMPLE_THREADS);
  const [applyCount, setApplyCount] = useState(() =>
    parseInt(localStorage.getItem('collabnb_apply_count') || '0', 10)
  );
  const [contracts, setContracts] = useState(loadContracts);

  const saveContract = useCallback((contractData) => {
    const newContract = {
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      ...contractData,
      status: contractData.status || 'draft',
    };
    setContracts((prev) => {
      const updated = [...prev, newContract];
      saveContractsToStorage(updated);
      return updated;
    });
    return newContract;
  }, []);

  const updateContract = useCallback((id, updates) => {
    setContracts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveContractsToStorage(updated);
      return updated;
    });
  }, []);

  const getContracts = useCallback(() => contracts, [contracts]);

  const sendContractMessage = useCallback(({ hostName, contractId, contractTitle }) => {
    const newThread = {
      id: `t_contract_${contractId}_${Date.now()}`,
      listing_title: contractTitle || 'Contract',
      host_name: hostName,
      host_avatar: null,
      tag: 'Contract',
      last_message: `📄 Contract "${contractTitle || 'Agreement'}" sent for signing — view and sign in Contracts.`,
      timestamp: 'Just now',
      unread: 1,
      is_founder: false,
    };
    setThreads((prev) => [newThread, ...prev]);
  }, []);

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
    <CollabContext.Provider value={{ collabs, threads, contracts, applyCount, applyToListing, hasApplied, saveContract, updateContract, getContracts, sendContractMessage }}>
      {children}
    </CollabContext.Provider>
  );
}

export function useCollabs() {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error('useCollabs must be used within CollabProvider');
  return ctx;
}
