import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';

export default function HomeScreen() {
  // Access store but do not call any functions or effects that might trigger undefined calls
  const store = useHVACStore();

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">HVAC Hub - Store Data Test (no effects)</ThemedText>
        <ThemedText type="subtitle">Testing pure store access on launch</ThemedText>
        
        <ThemedText style={{ marginTop: 16 }}>
          Equipment: {store.equipment?.length ?? 'undefined'}
        </ThemedText>
        <ThemedText>
          Logged in: {store.isLoggedIn ? 'Yes' : 'No'}
        </ThemedText>
        <ThemedText>
          Has seen onboarding: {store.hasSeenOnboarding ? 'Yes' : 'No'}
        </ThemedText>
        <ThemedText>
          Pending approvals: {store.pendingApprovalsCount ?? 'undefined'}
        </ThemedText>
        {store.user ? (
          <ThemedText>User: {store.user.name} ({store.user.role})</ThemedText>
        ) : (
          <ThemedText>No user</ThemedText>
        )}

        <ThemedText style={{ marginTop: 24, opacity: 0.7, fontSize: 13 }}>
          If this screen appears and stays visible, the store data is accessible without side-effects or function calls from this component.
          The previous crash was likely caused by the useEffect calling setHasSeenOnboarding or other render-time calls.
        </ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
});
