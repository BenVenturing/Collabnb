import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './index.css';
import './i18n';
import './lib/pwaInstall'; // registers the beforeinstallprompt listener before any route mounts
import App from './App';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

// A deploy can replace dist/assets/ while a tab is still open on the old
// build, so a lazy route's chunk hash 404s on the next navigation. Reload
// once to pick up the new build; the sessionStorage guard stops a genuine
// repeated failure (e.g. offline) from loop-reloading.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('collabnb_chunk_reload')) return;
  sessionStorage.setItem('collabnb_chunk_reload', '1');
  window.location.reload();
});

function Root() {
  // Global background layers — render on every route, every account
  const bg = (
    <>
      <div aria-hidden="true" className="bg-layers bg-base" />
      <div aria-hidden="true" className="bg-layers bg-gradient" />
      <div aria-hidden="true" className="bg-layers bg-clouds" />
      <div aria-hidden="true" className="bg-grain" />
    </>
  );

  // Clerk not configured — use plain ConvexProvider (dev / mock mode)
  if (!CLERK_KEY) {
    return (
      <React.StrictMode>
        {bg}
        {convex ? (
          <ConvexProvider client={convex}>
            <App />
            <SpeedInsights />
          </ConvexProvider>
        ) : (
          <>
            <App />
            <SpeedInsights />
          </>
        )}
      </React.StrictMode>
    );
  }

  // Clerk + Convex — ConvexProviderWithClerk passes Clerk JWT to Convex automatically
  return (
    <React.StrictMode>
      {bg}
      <ClerkProvider
        publishableKey={CLERK_KEY}
        appearance={{
          layout: { shimmer: false },
          variables: { borderRadius: '16px' },
          elements: {
            card: 'shadow-2xl',
          },
        }}
      >
        {convex ? (
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <App />
            <SpeedInsights />
          </ConvexProviderWithClerk>
        ) : (
          <>
            <App />
            <SpeedInsights />
          </>
        )}
      </ClerkProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
sessionStorage.removeItem('collabnb_chunk_reload');
