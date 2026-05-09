import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import './index.css';
import App from './App';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

function Root() {
  // Clerk not configured — render app directly with mock data
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

  // Clerk configured — wrap with ClerkProvider
  return (
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_KEY}>
        {convex ? (
          <ConvexProvider client={convex}>
            <App />
          </ConvexProvider>
        ) : (
          <App />
        )}
      </ClerkProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
