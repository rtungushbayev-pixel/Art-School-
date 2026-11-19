import { createContext, useContext } from 'react';

// Открыть экран подключения планшета (скрытый вход: долгое нажатие на логотип).
export const KioskModeContext = createContext<() => void>(() => {});
export const useStartKioskPairing = () => useContext(KioskModeContext);
