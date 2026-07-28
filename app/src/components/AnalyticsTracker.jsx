import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { initAnalytics, trackPageview, setAnalyticsUser } from '../lib/analytics';

// Drives first-party analytics for the app: starts the listeners once, fires a
// pageview on every route change, and attributes the shared session to the
// logged-in profile so the marketing → signup funnel stitches together.
export default function AnalyticsTracker() {
  const location = useLocation();
  const { profile } = useAuth();

  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => { trackPageview(location.pathname); }, [location.pathname]);
  useEffect(() => {
    if (profile?._id) setAnalyticsUser(profile._id, profile.email);
  }, [profile?._id, profile?.email]);

  return null;
}
