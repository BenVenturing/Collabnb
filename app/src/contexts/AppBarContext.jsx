import { createContext, useContext, useState } from 'react';

const AppBarContext = createContext({
  compactSearch: false, setCompactSearch: () => {},
  hideNav: false, setHideNav: () => {},
  mapDestination: '', setMapDestination: () => {},
});

export function AppBarProvider({ children }) {
  const [compactSearch, setCompactSearch] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  // Destination typed in the nav search — the Explore map flies to it.
  const [mapDestination, setMapDestination] = useState('');
  return (
    <AppBarContext.Provider value={{ compactSearch, setCompactSearch, hideNav, setHideNav, mapDestination, setMapDestination }}>
      {children}
    </AppBarContext.Provider>
  );
}

export const useAppBar = () => useContext(AppBarContext);
