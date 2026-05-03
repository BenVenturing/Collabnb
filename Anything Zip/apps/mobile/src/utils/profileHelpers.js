export const getCreatorTier = (followers) => {
  if (followers >= 500000) {
    return "Macro Influencer";
  } else if (followers >= 50000 && followers < 500000) {
    return "Mid-Tier Influencer";
  } else if (followers >= 10000 && followers < 50000) {
    return "Micro Influencer";
  } else if (followers >= 1000 && followers < 10000) {
    return "Nano Influencer";
  } else {
    return "UGC Creator (Beginner)";
  }
};

export const formatFollowers = (count) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};
