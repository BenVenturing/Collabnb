import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import './index.css';
import App from './App';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

function Root() {
  // Clerk not configured — use plain ConvexProvider (dev / mock mode)
  if (!CLERK_KEY) {
    return (
      <React.StrictMode>
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
      <ClerkProvider publishableKey={CLERK_KEY}>
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
