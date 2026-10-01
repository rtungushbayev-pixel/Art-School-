import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { StaffNavigator } from './StaffNavigator';
import { ParentNavigator } from './ParentNavigator';
import { colors } from '../theme/colors';
import { useNotificationNavigation } from '../lib/notificationRouting';
import type { ParentStackParamList, StaffStackParamList, StudentStackParamList } from './types';

const navigationRef = createNavigationContainerRef<StudentStackParamList & StaffStackParamList & ParentStackParamList>();

export function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const signedInRole = session && profile ? profile.role : null;
  const flushNotificationNavigation = useNotificationNavigation(navigationRef, signedInRole);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushNotificationNavigation}
      onStateChange={flushNotificationNavigation}
    >
      {!session || !profile ? (
        <AuthNavigator />
      ) : profile.role === 'staff' ? (
        <StaffNavigator />
      ) : profile.role === 'parent' ? (
        <ParentNavigator />
      ) : (
        <StudentNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
