import React, { createContext, useContext } from 'react';

export const OperationsContext = createContext<any>(null);

export const useOperations = () => useContext(OperationsContext);

export const OperationsProvider = ({ children, value }: { children: React.ReactNode, value: any }) => {
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
};
