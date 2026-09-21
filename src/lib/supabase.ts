import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY не заданы. ' +
      'Скопируйте .env.example в .env и укажите данные вашего проекта Supabase. ' +
      'Приложение запустится, но запросы к базе будут завершаться ошибкой.'
  );
}

// createClient бросает исключение на пустом URL — без .env приложение упало бы
// при запуске ещё до отрисовки экрана входа, поэтому на этот случай подставляем
// синтаксически валидную заглушку (запросы к ней просто вернут сетевую ошибку).
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'placeholder-anon-key';

// Таблицы типизированы вручную через src/types/database.ts и явные приведения
// типов в запросах, а не через generic-параметр createClient — так проще
// поддерживать схему без генерации типов из Supabase CLI.
export const supabase = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || FALLBACK_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
