import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCases, loadProfile } from './storage';

const BACKGROUND_FETCH_TASK = 'background-case-checker';
const NOTIFIED_IDS_KEY = 'notified_case_ids';

// 1. Define the task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const profile = await loadProfile();
    if (!profile) return BackgroundFetch.BackgroundFetchResult.NoData;

    const cloudCases = await loadCases();
    const assignedToMe = cloudCases.filter(c => (c as any).assignedNurseId === profile.id && c.status === 'assigned');

    if (assignedToMe.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Get previously notified IDs from storage
    const notifiedStr = await AsyncStorage.getItem(NOTIFIED_IDS_KEY);
    const notifiedSet = new Set<string>(notifiedStr ? JSON.parse(notifiedStr) : []);

    const newOnes = assignedToMe.filter(c => !notifiedSet.has(c.id));

    if (newOnes.length > 0) {
      for (const c of newOnes) {
        // Voice Alert (TTS might have limited support in background, but worth trying)
        await Speech.speak(`New case assigned for ${c.patientName}`, {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });

        // Visual/Sound Notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "New Case Assigned",
            body: `Patient: ${c.patientName}. Tap to view details.`,
            sound: true,
            priority: Notifications.AndroidImportance.HIGH,
            data: { caseId: c.id },
          },
          trigger: null, // Immediate
        });

        notifiedSet.add(c.id);
      }

      // Save updated notified IDs
      await AsyncStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(Array.from(notifiedSet)));
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background check failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Register the task
export async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 1, // 1 minute (iOS might throttle this to 15-30 mins)
    stopOnTerminate: false, // Keep running after app is closed
    startOnBoot: true,     // Restart after device reboot
  });
}

export async function unregisterBackgroundFetchAsync() {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}
