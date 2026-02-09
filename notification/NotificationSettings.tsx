// components/NotificationSettings.tsx

import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Colors } from '../src/constants/Colors';
import { Fonts } from '../src/constants/Fonts';
import { useLanguage } from '../src/lib/i18n';
import { useNotifications } from './useNotifications';

export function NotificationSettings() {
  const { preferences, updatePreferences } = useNotifications();
  const { t } = useLanguage();

  if (!preferences) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={{ color: Colors.white, marginTop: 10 }}>{t("notifications_loading")}</Text>
      </View>
    );
  }

  const settings = [
    {
      key: 'push_enabled',
      title: t("notifications_type_push_enabled"),
      description: 'Receive push notifications on this device',
    },
    {
      key: 'new_attendee',
      title: t("notifications_type_new_attendee"),
      description: 'When someone joins your event',
    },
    {
      key: 'attendee_cancel',
      title: t("notifications_type_attendee_cancel"),
      description: 'When someone cancels their attendance',
    },
    {
      key: 'event_reminders',
      title: t("notifications_type_event_reminders"),
      description: '12 hours and 2 hours before events you\'re attending',
    },
    {
      key: 'questions',
      title: t("notifications_type_questions"),
      description: 'When someone asks about your event',
    },
    {
      key: 'new_events_nearby',
      title: t("notifications_type_new_events_nearby"),
      description: 'New events in your area matching your interests',
    },
    {
      key: 'event_stats',
      title: t("notifications_type_event_stats"),
      description: 'View milestones and engagement updates',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <Text style={styles.sectionDescription}>
          Choose which notifications you want to receive
        </Text>
      </View>

      {settings.map((setting) => (
        <View key={setting.key} style={styles.settingItem}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <Text style={styles.settingDescription}>{setting.description}</Text>
          </View>
          <Switch
            value={preferences[setting.key as keyof typeof preferences] as boolean}
            onValueChange={(value) =>
              updatePreferences({ [setting.key]: value })
            }
            trackColor={{ false: Colors.gray, true: Colors.primary }}
            thumbColor={
              preferences[setting.key as keyof typeof preferences]
                ? Colors.white
                : Colors.textSecondary
            }
          />
        </View>
      ))}

      <View style={styles.info}>
        <Text style={styles.infoText}>
          💡 Tip: Long press on a notification to delete it
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
  info: {
    margin: 20,
    padding: 16,
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
});
