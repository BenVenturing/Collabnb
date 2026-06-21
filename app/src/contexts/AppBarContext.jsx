import { createContext, useContext, useState } from 'react';

const AppBarContext = createContext({
  compactSearch: false, setCompactSearch: () => {},
  hideNav: false, setHideNav: () => {},
});

export function AppBarProvider({ children }) {
  const [compactSearch, setCompactSearch] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  return (
    <AppBarContext.Provider value={{ compactSearch, setCompactSearch, hideNav, setHideNav }}>
      {children}
    </AppBarContext.Provider>
  );
}

export const useAppBar = () => useContext(AppBarContext);
