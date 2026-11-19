import React, { useEffect, useState } from 'react';
import { isStaffRole } from '../lib/roles';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { StaffNavigator } from './StaffNavigator';
import { ParentNavigator } from './ParentNavigator';
import { OfficeNavigator } from './OfficeNavigator';
import { NewPasswordScreen } from '../screens/auth/NewPasswordScreen';
import { KioskScreen } from '../screens/kiosk/KioskScreen';
import { KioskPairScreen } from '../screens/kiosk/KioskPairScreen';
import { getKioskToken } from '../lib/checkin';
import { KioskModeContext } from '../lib/kioskMode';
import { colors } from '../theme/colors';
import { useNotificationNavigation } from '../lib/notificationRouting';
import type { ParentStackParamList, StaffStackParamList, StudentStackParamList } from './types';

const navigationRef = createNavigationContainerRef<StudentStackParamList & StaffStackParamList & ParentStackParamList>();

export function RootNavigator() {
  const { session, profile, loading, passwordRecovery } = useAuth();
  const signedInRole = session && profile ? profile.role : null;
  const flushNotificationNavigation = useNotificationNavigation(navigationRef, signedInRole);
  // Планшет у входа в филиал: вместо приложения — экран QR (см. lib/checkin).
  const [kioskToken, setKioskToken] = useState<string | null | undefined>(undefined);
  const [kioskPairing, setKioskPairing] = useState(false);

  useEffect(() => {
    getKioskToken().then(setKioskToken);
  }, []);

  if (kioskToken) {
    return <KioskScreen deviceToken={kioskToken} onExit={() => setKioskToken(null)} />;
  }

  if (kioskPairing) {
    return (
      <KioskPairScreen
        onBack={() => setKioskPairing(false)}
        onPaired={() => {
          setKioskPairing(false);
          getKioskToken().then(setKioskToken);
        }}
      />
    );
  }

  if (loading || kioskToken === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KioskModeContext.Provider value={() => setKioskPairing(true)}>
    <NavigationContainer
      ref={navigationRef}
      onReady={flushNotificationNavigation}
      onStateChange={flushNotificationNavigation}
    >
      {session && passwordRecovery ? (
        // Вошли по ссылке из письма «Сбросить пароль» — сначала новый пароль.
        <NewPasswordScreen />
      ) : !session || !profile ? (
        <AuthNavigator />
      ) : isStaffRole(profile.role) ? (
        <StaffNavigator />
      ) : profile.role === 'office' ? (
        <OfficeNavigator />
      ) : profile.role === 'parent' ? (
        <ParentNavigator />
      ) : (
        <StudentNavigator />
      )}
    </NavigationContainer>
    </KioskModeContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
