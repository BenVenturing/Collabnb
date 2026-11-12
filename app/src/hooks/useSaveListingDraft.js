import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { useListingDraft } from "../contexts/ListingDraftContext";
import { useAuth } from "../contexts/AuthContext";
import { listingDraftFields } from "../lib/listingDraft";

export default function useSaveListingDraft(fallbackError) {
  const { draft, combinedDeliverablesList, totalDeliverables, clearDraft, draftSaveLock } = useListingDraft();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const create = useMutation(api.listings.create);
  const update = useMutation(api.listings.update);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function saveDraft() {
    if (draftSaveLock.current) return;
    draftSaveLock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      if (!profile?._id && !profile?.id) throw new Error("Your account is still loading. Please try saving again.");
      const id = localStorage.getItem("collabnb_editing_listing_id_v1");
      const fields = { ...listingDraftFields(draft, profile, combinedDeliverablesList, totalDeliverables), status: "draft" };
      if (id) await update({ id, ...fields });
      else await create(fields);
    } catch (err) {
      const message = err instanceof ConvexError ? err.data : err?.message;
      setSaveError(typeof message === "string" && message ? message : fallbackError);
      setSaving(false);
      draftSaveLock.current = false;
      return;
    }
    // Clear only after the server confirms persistence; failed saves remain retryable.
    clearDraft();
    navigate("/host");
    draftSaveLock.current = false;
  }
  return { saving, saveError, saveDraft };
}
