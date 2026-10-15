import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Хранилище сессии Supabase в защищённом хранилище телефона (Keychain на
// iPhone, Keystore на Android) вместо открытого AsyncStorage.
//
// SecureStore надёжно хранит только небольшие значения, а сессия Supabase
// бывает больше 2 КБ, поэтому значение режется на части: ключ.0, ключ.1, …,
// число частей хранится в ключ.n.
const CHUNK_SIZE = 1800;

// Ключи SecureStore: только буквы, цифры, «.», «-», «_».
function safeKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

// Доступно только на этом устройстве и только когда оно разблокировано:
// не попадает в резервные копии и на другой телефон.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Keychain на iPhone переживает удаление приложения, а AsyncStorage — нет.
// Если метки установки нет, приложение только что установлено (или
// переустановлено): стираем оставшуюся сессию, чтобы не входить без пароля.
const INSTALL_MARK = 'secure-storage.installed';
let installChecked: Promise<void> | null = null;

function checkFreshInstall(base: string) {
  if (!installChecked) {
    installChecked = (async () => {
      if ((await AsyncStorage.getItem(INSTALL_MARK)) === null) {
        await removeChunks(base);
        await AsyncStorage.setItem(INSTALL_MARK, '1');
      }
    })();
  }
  return installChecked;
}

async function removeChunks(base: string) {
  const count = Number(await SecureStore.getItemAsync(`${base}.n`, OPTIONS)) || 0;
  for (let i = 0; i < count; i += 1) {
    await SecureStore.deleteItemAsync(`${base}.${i}`, OPTIONS);
  }
  await SecureStore.deleteItemAsync(`${base}.n`, OPTIONS);
}

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const base = safeKey(key);
    await checkFreshInstall(base);
    const count = Number(await SecureStore.getItemAsync(`${base}.n`, OPTIONS)) || 0;
    if (count > 0) {
      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(`${base}.${i}`, OPTIONS);
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    }
    // Переезд со старых версий: сессия лежала в AsyncStorage — переносим и стираем.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await secureStorage.setItem(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },

  async setItem(key: string, value: string): Promise<void> {
    const base = safeKey(key);
    await checkFreshInstall(base);
    await removeChunks(base);
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(`${base}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), OPTIONS);
    }
    await SecureStore.setItemAsync(`${base}.n`, String(count), OPTIONS);
  },

  async removeItem(key: string): Promise<void> {
    await removeChunks(safeKey(key));
    await AsyncStorage.removeItem(key);
  },
};

// На вебе SecureStore нет — там остаётся обычное хранилище браузера.
export const sessionStorage = Platform.OS === 'web' ? AsyncStorage : secureStorage;
