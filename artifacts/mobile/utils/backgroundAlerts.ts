import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_FETCH_TASK = 'background-case-checker';
const NOTIFIED_IDS_KEY = 'notified_case_ids';

// Safe-load: only define the task if native modules are available
try {
  const BackgroundFetch = require('expo-background-fetch');
  const TaskManager = require('expo-task-manager');
  const Notifications = require('expo-notifications');

  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
      const { loadCases, loadProfile } = require('./storage');
      const profile = await loadProfile();
      if (!profile) return BackgroundFetch.BackgroundFetchResult.NoData;

      const cloudCases = await loadCases();
      const assignedToMe = cloudCases.filter(
        (c: any) => c.assignedNurseId === profile.id && c.status === 'assigned'
      );

      if (assignedToMe.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

      const notifiedStr = await AsyncStorage.getItem(NOTIFIED_IDS_KEY);
      const notifiedSet = new Set<string>(notifiedStr ? JSON.parse(notifiedStr) : []);
      const newOnes = assignedToMe.filter((c: any) => !notifiedSet.has(c.id));

      if (newOnes.length > 0) {
        for (const c of newOnes) {
          // Voice alert (best-effort in background)
          try {
            const Speech = require('expo-speech');
            Speech.speak(`New case assigned for ${c.patientName}`, {
              language: 'en',
              pitch: 1.0,
              rate: 0.9,
            });
          } catch (_) { /* Speech may not work in headless JS */ }

          // Push notification (always works in background)
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'New Case Assigned',
              body: `Patient: ${c.patientName}. Tap to view details.`,
              sound: true,
              priority: 'high',
              data: { caseId: c.id },
            },
            trigger: null,
          });

          notifiedSet.add(c.id);
        }

        await AsyncStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(Array.from(notifiedSet)));
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }

      return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error('Background check failed:', error);
      return require('expo-background-fetch').BackgroundFetchResult.Failed;
    }
  });
} catch (e) {
  console.log('Background alerts: native modules not available (safe skip)');
}

// Register the task — safe to call even if defineTask was skipped
export async function registerBackgroundFetchAsync() {
  try {
    const BackgroundFetch = require('expo-background-fetch');
    return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn('Background fetch registration skipped:', e);
  }
}

export async function unregisterBackgroundFetchAsync() {
  try {
    const BackgroundFetch = require('expo-background-fetch');
    return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  } catch (e) {
    console.warn('Background fetch unregister skipped:', e);
  }
}
