import { createContext, useContext, useState } from 'react';

const AppBarContext = createContext({ compactSearch: false, setCompactSearch: () => {} });

export function AppBarProvider({ children }) {
  const [compactSearch, setCompactSearch] = useState(false);
  return (
    <AppBarContext.Provider value={{ compactSearch, setCompactSearch }}>
      {children}
    </AppBarContext.Provider>
  );
}

export const useAppBar = () => useContext(AppBarContext);
