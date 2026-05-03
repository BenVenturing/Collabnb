import { useState, useEffect } from "react";
import SavedStore from "@/utils/SavedStore";

export function useListingDetail(listing) {
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllDeliverables, setShowAllDeliverables] = useState(false);
  const [showBrandGuidelines, setShowBrandGuidelines] = useState(false);
  const [showIdealCreator, setShowIdealCreator] = useState(false);
  const [expandedThingsToKnow, setExpandedThingsToKnow] = useState({
    revision: false,
    usage: false,
    dispute: false,
  });

  useEffect(() => {
    if (!listing) return;

    setIsSaved(SavedStore.isSaved(listing.id));

    const unsubscribe = SavedStore.subscribe(() => {
      setIsSaved(SavedStore.isSaved(listing.id));
    });

    return unsubscribe;
  }, [listing]);

  const handleSaveToggle = async () => {
    if (!listing) return;

    const snapshot = {
      id: listing.id,
      title: listing.title,
      location_city: listing.location_city,
      location_country: listing.location_country,
      image: listing.images[0],
      deliverablesSummary: `${listing.deliverables.reduce((sum, d) => sum + d.quantity, 0)} deliverables`,
      offerSummary:
        listing.compensation_type === "free_stay"
          ? `${listing.stay_nights}N free stay`
          : `$${listing.cash_payout} cash`,
    };

    await SavedStore.toggleSaved(snapshot);
  };

  return {
    isSaved,
    currentImageIndex,
    setCurrentImageIndex,
    showAllDeliverables,
    setShowAllDeliverables,
    showBrandGuidelines,
    setShowBrandGuidelines,
    showIdealCreator,
    setShowIdealCreator,
    expandedThingsToKnow,
    setExpandedThingsToKnow,
    handleSaveToggle,
  };
}
