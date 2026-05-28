import { createContext, useContext, useState } from 'react';

const VerificationContext = createContext(null);

export const useVerification = () => useContext(VerificationContext);

export function VerificationProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <VerificationContext.Provider value={{
      isOpen,
      openModal: () => setIsOpen(true),
      closeModal: () => setIsOpen(false),
    }}>
      {children}
    </VerificationContext.Provider>
  );
}
