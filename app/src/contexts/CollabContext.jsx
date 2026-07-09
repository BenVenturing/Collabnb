import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from './AuthContext';
import { SAMPLE_COLLABORATIONS, SAMPLE_THREADS, MOCK_CREATOR, STAGES } from '../lib/mockData';
import { formatDate } from '../lib/dateUtils';

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

// ─── Collection ID migration ──────────────────────────────────────────────────
// Canonical format: 'default' for the built-in collection, raw Convex _id for
// user-created ones. The old format used a 'col_' prefix — strip it on load.
function migrateCollId(id) {
  if (!id) return 'default';
  if (id === 'col_default') return 'default';
  if (id.startsWith('col_')) return id.slice(4);
  return id;
}
function migrateCollections(cols) {
  return cols.map((c) => ({ ...c, id: migrateCollId(c.id) }));
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
    try {
      const raw = localStorage.getItem('collabnb_collections');
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = migrateCollections(parsed);
        // Persist migrated form so subsequent loads are already clean
        if (JSON.stringify(migrated) !== raw) {
          try { localStorage.setItem('collabnb_collections', JSON.stringify(migrated)); } catch {}
        }
        return migrated;
      }
    } catch {}
    return [{ id: 'default', name: 'Saved', listingIds: [] }];
  });
  const [activeCollectionId, setActiveCollectionIdState] = useState(() => {
    const stored = localStorage.getItem('collabnb_active_col');
    const migrated = migrateCollId(stored);
    if (stored && migrated !== stored) {
      try { localStorage.setItem('collabnb_active_col', migrated); } catch {}
    }
    return migrated;
  });

  // Owner ID for Convex contract ownership
  const { profile } = useAuth();
  const ownerId = profile?._id ? String(profile._id) : null;
  const isHost = profile?.role === 'host';

  // Query Convex for every contract this user is a party to — owner, host, or
  // creator — so a recipient sees contracts sent to them, not just ones they built.
  const convexContractsRaw = useQuery(
    api.contracts.getForParty,
    ownerId ? { userId: ownerId } : 'skip'
  );
  const convexContracts = useMemo(() => {
    if (!convexContractsRaw?.length) return null;
    return convexContractsRaw.map((c) => ({
      id: String(c._id),
      created_at: new Date(c._creationTime).toISOString(),
      creator_name: c.creator_name,
      host_name: c.host_name,
      property_name: c.property_name,
      location: c.location,
      dates: c.dates,
      deliverables: c.deliverables,
      currency: c.currency,
      payment: c.payment,
      usage_rights: c.usage_rights,
      status: c.status,
      creator_signed: c.creator_signed,
      host_signed: c.host_signed,
      summary_note: c.summary_note,
      paid: c.paid,
      sent_at: c.sent_at,
    }));
  }, [convexContractsRaw]);

  // Convex mutations (will be no-op if Clerk/Convex not connected)
  const saveContractCvx = useMutation(api.contracts.save);
  const updateContractCvx = useMutation(api.contracts.update);
  const markSentCvx = useMutation(api.contracts.markSent);
  const createCollabCvx = useMutation(api.collaborations.create);
  const markCollabCompletedCvx = useMutation(api.collaborations.markCompleted);
  const createThreadCvx = useMutation(api.threads.create);
  const createPitchCvx = useMutation(api.pitches.create);
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
        const targetId = activeCollectionId || prev[0]?.id || 'default';
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

  const createCollection = useCallback(async (name) => {
    const trimmedName = name.trim() || 'New Collection';
    // Use a stable temp ID for immediate UI responsiveness
    const tempId = `temp_${Date.now()}`;
    const newCol = { id: tempId, name: trimmedName, listingIds: [] };

    setCollections((prev) => {
      const updated = [...prev, newCol];
      saveCollectionsToStorage(updated);
      return updated;
    });
    setActiveCollectionIdState(tempId);
    localStorage.setItem('collabnb_active_col', tempId);

    // Await Convex to get the canonical _id, then replace the temp ID
    try {
      const convexId = await createCollectionCvx({ name: trimmedName });
      const canonicalId = convexId ? String(convexId) : tempId;
      setCollections((prev) => {
        const updated = prev.map((c) => c.id === tempId ? { ...c, id: canonicalId } : c);
        saveCollectionsToStorage(updated);
        return updated;
      });
      setActiveCollectionIdState(canonicalId);
      localStorage.setItem('collabnb_active_col', canonicalId);
      return { ...newCol, id: canonicalId };
    } catch {
      // Convex unavailable — keep tempId; it's consistent within this session
      return newCol;
    }
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
    // 'default' is local-only; all other IDs are raw Convex _ids
    if (id !== 'default') {
      renameCollectionCvx({ id, name: name.trim() || name }).catch(() => {});
    }
  }, [renameCollectionCvx]);

  const deleteCollection = useCallback((id) => {
    setCollections((prev) => {
      if (prev.length <= 1) return prev;
      const updated = prev.filter((c) => c.id !== id);
      saveCollectionsToStorage(updated);
      if (activeCollectionId === id) {
        const next = updated[0]?.id || 'default';
        setActiveCollectionIdState(next);
        localStorage.setItem('collabnb_active_col', next);
      }
      return updated;
    });
    // 'default' is local-only; all other IDs are raw Convex _ids
    if (id !== 'default') {
      deleteCollectionCvx({ id }).catch(() => {});
    }
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

    // Sync to Convex (fire-and-forget). Stamp the builder onto the correct party
    // field so the server can resolve the counterparty for notifications.
    saveContractCvx({
      ownerId: ownerId || undefined,
      hostId: isHost ? ownerId || undefined : undefined,
      creatorId: isHost ? undefined : ownerId || undefined,
      creatorName: contractData.creator_name || '',
      hostName: contractData.host_name || '',
      propertyName: contractData.property_name,
      location: contractData.location,
      dates: contractData.dates,
      deliverables: contractData.deliverables,
      currency: contractData.currency,
      payment: contractData.payment,
      cashValue: contractData.cash_value,
      usageRights: contractData.usage_rights,
      status: contractData.status || 'draft',
      creatorSigned: contractData.creator_signed,
      hostSigned: contractData.host_signed,
      summaryNote: contractData.summary_note,
    }).catch(() => {});

    return newContract;
  }, [saveContractCvx, ownerId, isHost]);

  const updateContract = useCallback((id, updates) => {
    setContracts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveContractsToStorage(updated);
      return updated;
    });

    updateContractCvx({
      id,
      updates: {
        host_id: updates.host_id,
        creator_id: updates.creator_id,
        creator_name: updates.creator_name,
        host_name: updates.host_name,
        property_name: updates.property_name,
        location: updates.location,
        dates: updates.dates,
        deliverables: updates.deliverables,
        currency: updates.currency,
        payment: updates.payment,
        cash_value: updates.cash_value,
        usage_rights: updates.usage_rights,
        status: updates.status,
        creator_signed: updates.creator_signed,
        host_signed: updates.host_signed,
        summary_note: updates.summary_note,
      },
    }).catch(() => {});
  }, [updateContractCvx]);

  const markContractSent = useCallback((id) => {
    const sentAt = Date.now();
    setContracts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, sent_at: sentAt } : c));
      saveContractsToStorage(updated);
      return updated;
    });
    // A host builder sends to the creator; a creator builder sends to the host.
    markSentCvx({ id, recipientParty: isHost ? 'creator' : 'host' }).catch(() => {});
  }, [markSentCvx, isHost]);

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

  const applyToListing = useCallback(async (listing, pitchMessage, creatorProfile) => {
    const stageKeys = ['pending', 'accepted', 'updated', 'uploaded_tagged', 'closed', 'archived'];
    const emptyStages = Object.fromEntries(stageKeys.map(k => [k, { completed: false, date: null, note: '' }]));
    emptyStages.pending = { completed: true, date: formatDate(new Date()), note: 'Application sent' };

    const creatorId = creatorProfile?._id ? String(creatorProfile._id) : (creatorProfile?.id ? String(creatorProfile.id) : null);
    const listingId = String(listing._id || listing.id);
    // Stable shared key both creator and host can derive from pitch record
    const threadKey = creatorId ? `thread_${listingId}_${creatorId}` : `thread_${listingId}_${Date.now()}`;

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
      thread_key: threadKey,
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

    // Write pitch record so host can see the application
    if (creatorId) {
      createPitchCvx({
        listingId,
        listingTitle: listing.title,
        hostId: listing.host_id ? String(listing.host_id) : undefined,
        creatorId,
        creatorName: creatorProfile.full_name || creatorProfile.name || 'Creator',
        creatorUsername: creatorProfile.username,
        creatorAvatar: creatorProfile.avatar_url,
        creatorTier: creatorProfile.tier,
        creatorFollowers: creatorProfile.follower_count,
        creatorEngagement: creatorProfile.engagement_rate,
        creatorPlatforms: [
          creatorProfile.instagram_handle && 'Instagram',
          creatorProfile.tiktok_handle && 'TikTok',
          creatorProfile.youtube_handle && 'YouTube',
        ].filter(Boolean),
        message: pitchMessage,
        type: 'application',
        threadKey,
      }).catch(() => {});
    }
  }, [applyCount, createCollabCvx, createThreadCvx, createPitchCvx]);

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
      const now = formatDate(new Date());
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

  const removeCollab = useCallback((id) => {
    setCollabs((prev) => {
      const updated = prev.filter((c) => c.id !== id);
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
      const now = formatDate(new Date());
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
        // Persist completion to Convex: sets first_collab_completed, awards the
        // referral month to creator + referrer, and auto-charges the host fee.
        if (ownerId) {
          markCollabCompletedCvx({
            creatorId: ownerId,
            contractId: collab.contract_id ? String(collab.contract_id) : undefined,
          }).catch(() => {});
        }
      }

      return updated;
    });
  }, [ownerId, markCollabCompletedCvx]);

  // TODO: Replace manual entry with Instagram Graph API / TikTok Research API when approved. Target: post-launch v2.
  const submitContentMetrics = useCallback((id, { post_url, views, likes, comments, saves }) => {
    const er = views > 0 ? parseFloat((((likes + comments) / views) * 100).toFixed(2)) : 0;
    setCollabs((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? { ...c, content_metrics: { post_url, views, likes, comments, saves }, content_er: er }
          : c
      );
      saveCollabsToStorage(updated);
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

  const deleteThread = useCallback((threadId) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
  }, []);

  const updateThreadTag = useCallback((threadId, newTag) => {
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, tag: newTag } : t));
  }, []);

  // When authenticated, Convex is the source of truth; fall back to localStorage
  const effectiveContracts = convexContracts ?? contracts;

  return (
    <CollabContext.Provider value={{ collabs, threads, contracts: effectiveContracts, ownerId, applyCount, savedIds, collections, activeCollectionId, toggleSave, isSaved, createCollection, setActiveCollection, moveToCollection, renameCollection, deleteCollection, applyToListing, hasApplied, saveContract, updateContract, markContractSent, getContracts, sendContractMessage, getCollabById, advanceStage, updateStageData, toggleCloseCollab, removeCollab, submitContentMetrics, createThread, archiveThread, deleteThread, updateThreadTag }}>
      {children}
    </CollabContext.Provider>
  );
}

export function useCollabs() {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error('useCollabs must be used within CollabProvider');
  return ctx;
}
