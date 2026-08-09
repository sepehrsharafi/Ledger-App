import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';

/** Entry gate: waits for the persisted session, then routes to the app or the login screen. */
export default function IndexRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={status === 'signedIn' ? '/(tabs)' : '/login'} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
