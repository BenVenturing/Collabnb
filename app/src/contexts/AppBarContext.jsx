import { createContext, useContext, useState } from 'react';

const AppBarContext = createContext({
  compactSearch: false, setCompactSearch: () => {},
  hideNav: false, setHideNav: () => {},
  mapDestination: '', setMapDestination: () => {},
  mapAreaDisplay: '', setMapAreaDisplay: () => {},
});

export function AppBarProvider({ children }) {
  const [compactSearch, setCompactSearch] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  // Destination typed in the nav search — the Explore map flies to it.
  const [mapDestination, setMapDestination] = useState('');
  // Current map area (from "Search this area" / clicking a listing) — shown in the nav search.
  const [mapAreaDisplay, setMapAreaDisplay] = useState('');
  return (
    <AppBarContext.Provider value={{ compactSearch, setCompactSearch, hideNav, setHideNav, mapDestination, setMapDestination, mapAreaDisplay, setMapAreaDisplay }}>
      {children}
    </AppBarContext.Provider>
  );
}

export const useAppBar = () => useContext(AppBarContext);
