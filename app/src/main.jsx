import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
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
          </ConvexProvider>
        ) : (
          <App />
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
          variables: {
            borderRadius: '16px',
            colorBackground: '#ffffff',
            colorInputBackground: '#ffffff',
          },
          elements: {
            card: {
              background: '#ffffff',
              boxShadow: '0 24px 60px rgba(20,30,28,0.14), 0 2px 6px rgba(20,30,28,0.06)',
            },
            cardBox: { background: '#ffffff', boxShadow: '0 24px 60px rgba(20,30,28,0.14)' },
            footer: { background: '#fafaf9' },
            formButtonPrimary: {
              background: 'linear-gradient(180deg, rgba(74,98,100,0.78), rgba(44,64,66,0.92))',
              backdropFilter: 'blur(14px) saturate(180%)',
              WebkitBackdropFilter: 'blur(14px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '999px',
              boxShadow:
                'inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -8px 14px rgba(255,255,255,0.08), 0 8px 20px rgba(44,64,66,0.28)',
              textShadow: '0 1px 1px rgba(0,0,0,0.25)',
            },
            socialButtonsBlockButton: {
              background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(240,244,243,0.6))',
              backdropFilter: 'blur(14px) saturate(180%)',
              WebkitBackdropFilter: 'blur(14px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.9)',
              borderRadius: '999px',
              boxShadow:
                'inset 0 1.5px 0 rgba(255,255,255,1), inset 0 -6px 12px rgba(120,140,138,0.08), 0 6px 16px rgba(20,30,28,0.12), 0 0 0 1px rgba(20,30,28,0.06)',
            },
            formFieldInput: { borderRadius: '999px', background: '#ffffff' },
          },
        }}
      >
        {convex ? (
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <App />
          </ConvexProviderWithClerk>
        ) : (
          <App />
        )}
      </ClerkProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
sessionStorage.removeItem('collabnb_chunk_reload');
