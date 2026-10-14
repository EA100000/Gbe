import { Icon, UiText, colors, type IconName } from '@gbe/ui';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../core/i18n';

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'tabPath', label: t('tabs.learn') },
  sons: { icon: 'tabSounds', label: t('tabs.sounds') },
  profil: { icon: 'tabProfile', label: t('tabs.profile') },
};

/** Barre de navigation du bas, comme dans la maquette (onglet actif encadré de jaune). */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('tabs.navigation')}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (tab === undefined) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tab}
            testID={`tab-${route.name}`}>
            <View style={[styles.iconBox, focused ? styles.iconBoxActive : null]}>
              <Icon name={tab.icon} size={22} color={focused ? colors.ink : colors.inkSoft} />
            </View>
            <UiText
              size={12}
              weight={focused ? 'extrabold' : 'bold'}
              color={focused ? colors.ink : colors.inkSoft}>
              {tab.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 52 },
  iconBox: {
    width: 44,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { borderWidth: 2, borderColor: colors.yellow, backgroundColor: colors.cream },
});
