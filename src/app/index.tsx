import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoggedIn, signIn, equipment, pendingApprovalsCount, hasSeenOnboarding, setHasSeenOnboarding } = useHVACStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const recentEquipment = equipment.slice(0, 3);

  useEffect(() => {
    // Temporarily disabled to prevent crash on "Got it" button after recent admin/TOS/diagrams updates.
    // Re-enable after fixing navigation/TOS integration.
    // if (!hasSeenOnboarding) {
    //   setShowOnboarding(true);
    // }
    setHasSeenOnboarding(true); // Force skip for now
  }, []);

  const quickActions = [
    { label: 'Search Equipment', icon: 'magnifyingglass', route: '/equipment' as const },
    { label: 'Open Calculators', icon: 'function', route: '/calculators' as const },
    { label: 'Talk to AI', icon: 'brain.head.profile', route: '/ai' as const },
    { label: 'EPA Practice Test', icon: 'book.fill', route: '/epa' as const },
    { label: 'Start Job Walkthrough', icon: 'checklist', route: '/walkthrough' as const },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header / Welcome */}
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>HVAC Hub</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Your complete toolkit for every job
            </ThemedText>
            {isLoggedIn && user ? (
              <ThemedText style={styles.welcome}>
                Welcome back, {user.name.split(' ')[0]}! ({user.role})
              </ThemedText>
            ) : (
              <Pressable onPress={signIn} style={styles.loginButton}>
                <ThemedText type="link">Sign in with Google (Supabase + Mock)</ThemedText>
              </Pressable>
            )}
          </ThemedView>

          {/* Quick Stats */}
          <ThemedView style={styles.statsRow}>
            <ThemedView style={styles.statCard}>
              <ThemedText type="title">{equipment.length}+</ThemedText>
              <ThemedText type="small">Equipment Entries</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <ThemedText type="title">4</ThemedText>
              <ThemedText type="small">Refrigerants</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <ThemedText type="title">{pendingApprovalsCount}</ThemedText>
              <ThemedText type="small">Pending Approvals</ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Quick Actions */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, idx) => (
              <Pressable 
                key={idx} 
                style={styles.actionCard} 
                onPress={() => router.push(action.route)}
                accessibilityLabel={action.label}
                accessibilityHint={`Navigate to ${action.label} screen`}
                accessibilityRole="button"
              >
                <SymbolView name={action.icon as any} size={28} tintColor="#208AEF" />
                <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Recent Equipment */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>Recently Viewed Equipment</ThemedText>
          {recentEquipment.map((eq) => (
            <Pressable 
              key={eq.id} 
              style={styles.equipCard}
              onPress={() => {
                useHVACStore.getState().setSelectedEquipment(eq);
                useHVACStore.getState().setShowModal('equipment-detail');
                router.push('/equipment');
              }}
            >
              <ThemedText type="defaultSemiBold">{eq.brand} {eq.model}</ThemedText>
              <ThemedText type="small" style={styles.equipMeta}>
                {eq.type} • {eq.refrigerant} • {eq.capacities.tonnage}
              </ThemedText>
              <ThemedText type="small" style={{ color: '#208AEF' }}>{eq.averagePrice} avg</ThemedText>
            </Pressable>
          ))}

          {/* AI Teaser */}
          <ThemedView style={styles.aiTeaser}>
            <ThemedText type="defaultSemiBold">AI Assistant Ready</ThemedText>
            <ThemedText type="small">
              Text or voice chat. Searches internet for missing info. Learns your style. 
              Verifies before adding to shared DB.
            </ThemedText>
            <Pressable onPress={() => router.push('/ai')} style={styles.aiButton}>
              <ThemedText style={{ color: 'white' }}>Open AI Chat →</ThemedText>
            </Pressable>
          </ThemedView>

          {/* Location Note */}
          <ThemedText type="small" style={styles.locationNote}>
            Current location: {useHVACStore.getState().currentLocation} (affects code recommendations in calculators &amp; walkthroughs)
          </ThemedText>

          {Platform.OS === 'web' && (
            <ThemedText type="small" style={{ textAlign: 'center', marginTop: 20, opacity: 0.6 }}>
              Running on web. For full mobile experience use Expo Go on iOS/Android.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Step 16: Onboarding Tutorial for new users/apprentices */}
      <Modal visible={showOnboarding} animationType="slide" onRequestClose={() => {
        setShowOnboarding(false);
        setHasSeenOnboarding(true);
      }}>
        <SafeAreaView style={{ flex: 1, padding: Spacing.four, backgroundColor: '#fff' }}>
          <ThemedText type="title">Welcome to HVAC Hub!</ThemedText>
          <ThemedText style={{ marginTop: Spacing.three }}>This app is built for apprentices to master techs. Here's a quick tour:</ThemedText>
          <ThemedText style={{ marginTop: Spacing.two }}>• Equipment Hub: Comprehensive database with models from all major manufacturers, filters, QR scan, community notes, prices.</ThemedText>
          <ThemedText>• Calculators: 11+ tools with location codes, history, equipment prefill.</ThemedText>
          <ThemedText>• AI Assistant: Chat/text/voice, internet search sim, personality adapts to you, verify data for DB.</ThemedText>
          <ThemedText>• EPA: Full study + quizzes, progress tracking, audio.</ThemedText>
          <ThemedText>• Walkthroughs: Generate code-compliant job steps, PPE, tools.</ThemedText>
          <ThemedText>• Profile: Uploads, badges (gamification), job logs, admin approvals.</ThemedText>
          <ThemedText style={{ marginTop: Spacing.two }}>All data verified via admin loop. Sign in to save prefs/personality.</ThemedText>
          <Pressable style={{ backgroundColor: '#208AEF', padding: 16, borderRadius: 8, marginTop: Spacing.four, alignItems: 'center' }} onPress={() => {
            setShowOnboarding(false);
            setHasSeenOnboarding(true);
          }}>
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Got it, Start Exploring!</ThemedText>
          </Pressable>
          <ThemedText type="small" style={{ textAlign: 'center', marginTop: Spacing.two, opacity: 0.6 }}>You can replay this from Profile later.</ThemedText>
        </SafeAreaView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, paddingBottom: 100, gap: Spacing.four },
  header: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  title: { fontSize: 32, textAlign: 'center' },
  subtitle: { textAlign: 'center', opacity: 0.8 },
  welcome: { fontSize: 16, marginTop: Spacing.one },
  loginButton: { padding: Spacing.two, backgroundColor: '#E6F4FE', borderRadius: 8, marginTop: Spacing.two },
  statsRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'space-between' },
  statCard: { flex: 1, backgroundColor: '#F0F0F3', padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  sectionTitle: { marginTop: Spacing.three, marginBottom: Spacing.two },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'space-between' },
  actionCard: { width: '48%', backgroundColor: '#F8F9FA', padding: Spacing.three, borderRadius: 12, alignItems: 'center', gap: Spacing.one },
  actionLabel: { fontSize: 13, textAlign: 'center', fontWeight: '500' },
  equipCard: { backgroundColor: '#F0F0F3', padding: Spacing.three, borderRadius: 10, marginBottom: Spacing.two },
  equipMeta: { opacity: 0.7, marginTop: 2 },
  aiTeaser: { backgroundColor: '#208AEF', padding: Spacing.four, borderRadius: 16, gap: Spacing.two },
  aiButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start', marginTop: Spacing.one },
  locationNote: { textAlign: 'center', opacity: 0.6, fontSize: 12, marginTop: Spacing.two },
});
