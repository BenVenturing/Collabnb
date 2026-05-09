import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SAMPLE_COLLABORATIONS, SAMPLE_THREADS, MOCK_CREATOR, STAGES } from '../lib/mockData';

const CollabContext = createContext(null);

function loadContracts() {
  try { const raw = localStorage.getItem('collabnb_contracts'); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveContractsToStorage(contracts) {
  try { localStorage.setItem('collabnb_contracts', JSON.stringify(contracts)); } catch {}
}
function saveCollabsToStorage(collabs) {
  try { localStorage.setItem('collabnb_collabs', JSON.stringify(collabs)); } catch {}
}

export function CollabProvider({ children }) {
  const [collabs, setCollabs] = useState(() => {
    try { const raw = localStorage.getItem('collabnb_collabs'); if (raw) return JSON.parse(raw); } catch {}
    return SAMPLE_COLLABORATIONS;
  });
  const [threads, setThreads] = useState(SAMPLE_THREADS);
  const [applyCount, setApplyCount] = useState(() =>
    parseInt(localStorage.getItem('collabnb_apply_count') || '0', 10)
  );
  const [contracts, setContracts] = useState(loadContracts);
  const [collections, setCollections] = useState(() => {
    try { const raw = localStorage.getItem('collabnb_collections'); if (raw) return JSON.parse(raw); } catch {}
    return [{ id: 'col_default', name: 'Saved', listingIds: [] }];
  });
  const [activeCollectionId, setActiveCollectionIdState] = useState(() =>
    localStorage.getItem('collabnb_active_col') || 'col_default'
  );

  // Convex mutations (will be no-op if Clerk/Convex not connected)
  const saveContractCvx = useMutation(api.contracts.save);
  const updateContractCvx = useMutation(api.contracts.update);
  const createCollabCvx = useMutation(api.collaborations.create);
  const createThreadCvx = useMutation(api.threads.create);
  const createCollectionCvx = useMutation(api.collections.create);
  const toggleSaveCvx = useMutation(api.collections.toggleSave);
  const renameCollectionCvx = useMutation(api.collections.rename);
  const deleteCollectionCvx = useMutation(api.collections.deleteCollection);

  const saveCollectionsToStorage = (cols) => {
    try { localStorage.setItem('collabnb_collections', JSON.stringify(cols)); } catch {}
  };

  const savedIds = useMemo(
    () => new Set(collections.flatMap((c) => c.listingIds)),
    [collections]
  );

  const toggleSave = useCallback((listingId) => {
    setCollections((prev) => {
      const inCollection = prev.find((c) => c.listingIds.includes(listingId));
      let updated;
      if (inCollection) {
        updated = prev.map((c) =>
          c.id === inCollection.id
            ? { ...c, listingIds: c.listingIds.filter((id) => id !== listingId) }
            : c
        );
      } else {
        const targetId = activeCollectionId || prev[0]?.id || 'col_default';
        updated = prev.map((c) =>
          c.id === targetId ? { ...c, listingIds: [...c.listingIds, listingId] } : c
        );
      }
      saveCollectionsToStorage(updated);

      // Sync to Convex (fire-and-forget)
      const collection = updated.find(c => c.id === (inCollection?.id || activeCollectionId));
      if (collection) {
        toggleSaveCvx({ collectionId: collection.id, listingId }).catch(() => {});
      }

      return updated;
    });
  }, [activeCollectionId, toggleSaveCvx]);

  const isSaved = useCallback((listingId) => savedIds.has(listingId), [savedIds]);

  const createCollection = useCallback((name) => {
    const newCol = { id: `col_${Date.now()}`, name: name.trim() || 'New Collection', listingIds: [] };
    setCollections((prev) => {
      const updated = [...prev, newCol];
      saveCollectionsToStorage(updated);
      return updated;
    });
    setActiveCollectionIdState(newCol.id);
    localStorage.setItem('collabnb_active_col', newCol.id);

    // Sync to Convex
    createCollectionCvx({ name: newCol.name }).catch(() => {});

    return newCol;
  }, [createCollectionCvx]);

  const setActiveCollection = useCallback((id) => {
    setActiveCollectionIdState(id);
    localStorage.setItem('collabnb_active_col', id);
  }, []);

  const moveToCollection = useCallback((listingId, targetCollectionId) => {
    setCollections((prev) => {
      const removed = prev.map((c) => ({ ...c, listingIds: c.listingIds.filter((id) => id !== listingId) }));
      const updated = removed.map((c) =>
        c.id === targetCollectionId ? { ...c, listingIds: [...c.listingIds, listingId] } : c
      );
      saveCollectionsToStorage(updated);
      return updated;
    });
  }, []);

  const renameCollection = useCallback((id, name) => {
    setCollections((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c));
      saveCollectionsToStorage(updated);
      return updated;
    });

    renameCollectionCvx({ id: id.startsWith('col_') ? id.replace('col_', '') : id, name: name.trim() || name }).catch(() => {});
  }, [renameCollectionCvx]);

  const deleteCollection = useCallback((id) => {
    setCollections((prev) => {
      if (prev.length <= 1) return prev;
      const updated = prev.filter((c) => c.id !== id);
      saveCollectionsToStorage(updated);
      if (activeCollectionId === id) {
        const next = updated[0]?.id || 'col_default';
        setActiveCollectionIdState(next);
        localStorage.setItem('collabnb_active_col', next);
      }
      return updated;
    });

    deleteCollectionCvx({ id: id.startsWith('col_') ? id.replace('col_', '') : id }).catch(() => {});
  }, [activeCollectionId, deleteCollectionCvx]);

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

    // Sync to Convex
    saveContractCvx({
      creatorName: contractData.creator_name || '',
      hostName: contractData.host_name || '',
      propertyName: contractData.property_name,
      location: contractData.location,
      dates: contractData.dates,
      deliverables: contractData.deliverables,
      currency: contractData.currency,
      payment: contractData.payment,
      usageRights: contractData.usage_rights,
      status: contractData.status || 'draft',
      creatorSigned: contractData.creator_signed,
      hostSigned: contractData.host_signed,
      summaryNote: contractData.summary_note,
    }).catch(() => {});

    return newContract;
  }, [saveContractCvx]);

  const updateContract = useCallback((id, updates) => {
    setContracts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveContractsToStorage(updated);
      return updated;
    });

    updateContractCvx({
      id,
      updates: {
        creatorName: updates.creator_name,
        hostName: updates.host_name,
        propertyName: updates.property_name,
        location: updates.location,
        dates: updates.dates,
        deliverables: updates.deliverables,
        currency: updates.currency,
        payment: updates.payment,
        usageRights: updates.usage_rights,
        status: updates.status,
        creatorSigned: updates.creator_signed,
        hostSigned: updates.host_signed,
        summaryNote: updates.summary_note,
      },
    }).catch(() => {});
  }, [updateContractCvx]);

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

    // Sync to Convex
    createThreadCvx({
      listingTitle: contractTitle || 'Contract',
      hostName,
      tag: 'Contract',
      lastMessage: newThread.last_message,
    }).catch(() => {});
  }, [createThreadCvx]);

  const applyToListing = useCallback((listing, pitchMessage) => {
    const stageKeys = ['pending', 'accepted', 'updated', 'uploaded_tagged', 'closed', 'archived'];
    const emptyStages = Object.fromEntries(stageKeys.map(k => [k, { completed: false, date: null, note: '' }]));
    emptyStages.pending = { completed: true, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), note: 'Application sent' };

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
      current_stage: 'pending',
      stages: emptyStages,
      drive_url: '',
      content_stats: null,
      contract_id: null,
      listing_description: listing.about || '',
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
      collab_id: newCollab.id,
    };

    setCollabs((prev) => {
      const updated = [newCollab, ...prev];
      saveCollabsToStorage(updated);
      return updated;
    });
    setThreads((prev) => [newThread, ...prev]);

    const next = applyCount + 1;
    setApplyCount(next);
    localStorage.setItem('collabnb_apply_count', String(next));

    // Sync to Convex
    createCollabCvx({
      listingId: listing.id,
      propertyName: listing.title,
      location: listing.location,
      hostName: MOCK_CREATOR.full_name,
      image: listing.image,
      deliverables: listing.deliverables,
      listingDescription: listing.about,
      pitchMessage,
    }).catch(() => {});

    createThreadCvx({
      listingTitle: listing.title,
      hostName: MOCK_CREATOR.full_name,
      tag: 'Application',
      lastMessage: pitchMessage.slice(0, 100),
    }).catch(() => {});
  }, [applyCount, createCollabCvx, createThreadCvx]);

  const getCollabById = useCallback((id) =>
    collabs.find((c) => c.id === id) || null,
  [collabs]);

  const advanceStage = useCallback((id) => {
    setCollabs((prev) => {
      const collab = prev.find((c) => c.id === id);
      if (!collab) return prev;
      const keys = STAGES.map((s) => s.key);
      const curIdx = keys.indexOf(collab.current_stage);
      if (curIdx === -1 || curIdx >= keys.length - 1) return prev;
      const nextKey = keys[curIdx + 1];
      const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const updated = prev.map((c) =>
        c.id === id
          ? { ...c, current_stage: nextKey, stages: { ...c.stages, [nextKey]: { ...c.stages?.[nextKey], completed: true, date: now } } }
          : c
      );
      saveCollabsToStorage(updated);

      setThreads((tPrev) => {
        const tagMap = { pending: 'Application', accepted: 'Collab', updated: 'Collab', uploaded_tagged: 'Collab', closed: 'Collab', archived: 'Archived' };
        const stageLabel = STAGES.find((s) => s.key === nextKey)?.label || nextKey;
        return tPrev.map((t) =>
          t.collab_id === id
            ? { ...t, tag: tagMap[nextKey] || t.tag, last_message: `Stage advanced to ${stageLabel}`, timestamp: 'Just now' }
            : t
        );
      });

      return updated;
    });
  }, []);

  const updateStageData = useCallback((id, stageKey, updates) => {
    setCollabs((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? { ...c, [stageKey]: updates, stages: { ...c.stages, [stageKey]: { ...c.stages?.[stageKey], ...updates } } }
          : c
      );
      saveCollabsToStorage(updated);
      return updated;
    });
  }, []);

  const toggleCloseCollab = useCallback((id, party) => {
    setCollabs((prev) => {
      const collab = prev.find((c) => c.id === id);
      if (!collab) return prev;
      const stage = collab.stages?.closed || {};
      const creatorClosed = party === 'creator' ? !stage.creator_closed : !!stage.creator_closed;
      const hostClosed = party === 'host' ? !stage.host_closed : !!stage.host_closed;
      const bothClosed = creatorClosed && hostClosed;
      const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const updated = prev.map((c) =>
        c.id === id
          ? { ...c, current_stage: bothClosed ? 'archived' : c.current_stage, status: bothClosed ? 'approved' : c.status, status_text: bothClosed ? 'Closed' : c.status_text, is_active: bothClosed ? false : c.is_active,
              stages: { ...c.stages, closed: { ...stage, creator_closed: creatorClosed, host_closed: hostClosed, completed: bothClosed, date: bothClosed ? now : stage.date },
                archived: bothClosed ? { ...c.stages?.archived, completed: true, date: now, note: 'Collab closed by both parties' } : c.stages?.archived } }
          : c
      );
      saveCollabsToStorage(updated);

      if (bothClosed) {
        setThreads((tPrev) => tPrev.map((t) => t.collab_id === id ? { ...t, tag: 'Archived' } : t));
      }

      return updated;
    });
  }, []);

  const hasApplied = useCallback((listingId) =>
    collabs.some((c) => c.listing_id === listingId),
  [collabs]);

  const createThread = useCallback((listingTitle, hostName, tag = 'Application') => {
    const newId = `t${Date.now()}`;
    const newThread = { id: newId, listing_title: listingTitle, host_name: hostName, host_avatar: null, tag, last_message: 'Start a conversation...', timestamp: 'Just now', unread: 0, is_founder: false };
    setThreads((prev) => [newThread, ...prev]);

    createThreadCvx({ listingTitle, hostName, tag, lastMessage: 'Start a conversation...' }).catch(() => {});
    return newId;
  }, [createThreadCvx]);

  const archiveThread = useCallback((threadId) => {
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, archived: true } : t));
  }, []);

  const updateThreadTag = useCallback((threadId, newTag) => {
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, tag: newTag } : t));
  }, []);

  return (
    <CollabContext.Provider value={{ collabs, threads, contracts, applyCount, savedIds, collections, activeCollectionId, toggleSave, isSaved, createCollection, setActiveCollection, moveToCollection, renameCollection, deleteCollection, applyToListing, hasApplied, saveContract, updateContract, getContracts, sendContractMessage, getCollabById, advanceStage, updateStageData, toggleCloseCollab, createThread, archiveThread, updateThreadTag }}>
      {children}
    </CollabContext.Provider>
  );
}

export function useCollabs() {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error('useCollabs must be used within CollabProvider');
  return ctx;
}
