import React, { createContext, useContext, ReactNode } from 'react';
import { SFUClient } from '../services/sfuClient';

// Создаем контекст с типом SFUClient или null
const SFUClientContext = createContext<SFUClient | null>(null);

// Определяем интерфейс для пропсов провайдера, включая children
interface SFUClientProviderProps {
  client: SFUClient;
  children: ReactNode;
}

// Провайдер для контекста SFUClient
export const SFUClientProvider: React.FC<SFUClientProviderProps> = ({ client, children }) => {
  return (
    <SFUClientContext.Provider value={client}>
      {children}
    </SFUClientContext.Provider>
  );
};

// Хук для удобного использования контекста
export const useSFUClient = () => {
  const context = useContext(SFUClientContext);
  if (!context) {
    throw new Error('useSFUClient must be used within a SFUClientProvider');
  }
  return context;
};
