import { createContext, useContext } from 'react';

// Переход ко входу в «Режим планшета» с экрана входа.
export const KioskModeContext = createContext<() => void>(() => {});
export const useStartKioskPairing = () => useContext(KioskModeContext);
