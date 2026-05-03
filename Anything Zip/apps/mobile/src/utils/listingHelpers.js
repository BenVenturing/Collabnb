export const getTierLabel = (tier) => {
  const labels = {
    ugc_beginner: "UGC Beginner",
    ugc_pro: "UGC Pro",
    micro: "Micro Influencer",
    mid: "Mid-tier Creator",
  };
  return labels[tier] || tier;
};

export const getLoadLabel = (load) => {
  const labels = {
    light: "Light (1-3 deliverables)",
    moderate: "Moderate (4-7 deliverables)",
    heavy: "Heavy (8+ deliverables)",
  };
  return labels[load] || load;
};

export const getDaysUntilDue = (dueDate) => {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getTotalDeliverables = (deliverables) => {
  return deliverables.reduce((sum, d) => sum + d.quantity, 0);
};
