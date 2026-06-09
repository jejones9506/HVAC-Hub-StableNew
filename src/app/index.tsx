import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';

export default function HomeScreen() {
  const { 
    user, 
    isLoggedIn, 
    equipment, 
    pendingApprovalsCount, 
    hasSeenOnboarding, 
    setHasSeenOnboarding 
  } = useHVACStore();

  useEffect(() => {
    setHasSeenOnboarding(true);
  }, [setHasSeenOnboarding]);

  // Very minimal render to test if store + basic themed components cause the launch crash
  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">HVAC Hub - Store Test</ThemedText>
        <ThemedText type="subtitle">Launch successful with store hook</ThemedText>
        
        <ThemedText style={{ marginTop: 20 }}>
          Equipment entries: {equipment?.length || 0}
        </ThemedText>
        <ThemedText>
          Pending approvals: {pendingApprovalsCount || 0}
        </ThemedText>
        <ThemedText>
          Logged in: {isLoggedIn ? 'Yes' : 'No'}
        </ThemedText>
        {user && (
          <ThemedText>
            User: {user.name} ({user.role})
          </ThemedText>
        )}
        <ThemedText style={{ marginTop: 20, opacity: 0.6 }}>
          If this screen stays visible without crashing, the store and basic render are OK.
          The previous full UI (lists, many Pressables, Modal, etc.) was the problem.
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
