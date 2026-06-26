import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.52;
const OVERDRAG = 40;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AccountSwitcherSheet = forwardRef(({
  accounts = [],
  activePhone = '',
  onSwitchAccount,
  onAddAccount,
  onClose,
}, ref) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const context = useSharedValue({ y: 0 });

  // Expose open/close to parent via ref
  useImperativeHandle(ref, () => ({
    snapToIndex: (index) => {
      open();
    },
    close: () => {
      close();
    },
  }));

  const open = () => {
    isOpen.value = true;
    translateY.value = withSpring(0, {
      damping: 28,
      stiffness: 220,
      mass: 0.8,
      overshootClamping: false,
      restDisplacementThreshold: 0.1,
    });
    backdropOpacity.value = withTiming(1, { duration: 300 });
  };

  const close = () => {
    translateY.value = withSpring(SHEET_HEIGHT, {
      damping: 22,
      stiffness: 200,
      mass: 0.7,
    });
    backdropOpacity.value = withTiming(0, { duration: 250 });
    isOpen.value = false;
    if (onClose) {
      runOnJS(onClose)();
    }
  };

  // Pan gesture for swipe-to-dismiss
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow dragging down (or slight overdrag up)
      const newY = event.translationY + context.value.y;
      translateY.value = Math.max(newY, -OVERDRAG);
      // Update backdrop based on position
      const progress = interpolate(
        translateY.value,
        [0, SHEET_HEIGHT],
        [1, 0],
        Extrapolation.CLAMP
      );
      backdropOpacity.value = progress;
    })
    .onEnd((event) => {
      // If dragged more than 30% down or with velocity, close
      if (translateY.value > SHEET_HEIGHT * 0.3 || event.velocityY > 500) {
        runOnJS(close)();
      } else {
        // Snap back open
        translateY.value = withSpring(0, {
          damping: 28,
          stiffness: 220,
          mass: 0.8,
        });
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: isOpen.value ? 'auto' : 'none',
  }));

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={close}
        />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheetContainer, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#7C3AED', '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIconBg}
              >
                <Ionicons name="people" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={styles.headerTitle}>Switch Account</Text>
                <Text style={styles.headerSubtitle}>
                  {accounts.length} account{accounts.length !== 1 ? 's' : ''} logged in
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={close}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Account List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.accountsList}
            bounces={false}
          >
            {accounts.map((account, index) => {
              const isActive = account.id === activePhone || (account.phone === activePhone && accounts.findIndex(a => a.id === activePhone || a.phone === activePhone) === index);
              return (
                <AccountRow
                  key={`${account.phone || 'acc'}-${index}`}
                  account={account}
                  isActive={isActive}
                  index={index}
                  onPress={() => {
                    if (!isActive) {
                      onSwitchAccount(account);
                    }
                  }}
                />
              );
            })}

            {/* Add Account Button */}
            <TouchableOpacity
              style={styles.addAccountBtn}
              onPress={onAddAccount}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#F5F3FF', '#EDE9FE']}
                style={styles.addAccountIconBg}
              >
                <Ionicons name="add" size={24} color="#7C3AED" />
              </LinearGradient>
              <View style={styles.addAccountTextContainer}>
                <Text style={styles.addAccountText}>Add Another Account</Text>
                <Text style={styles.addAccountSubtext}>Login with a different account</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </>
  );
});

// Individual account row with micro-animations
function AccountRow({ account, isActive, index, onPress }) {
  const scale = useSharedValue(1);
  const rowOpacity = useSharedValue(0);
  const rowTranslateY = useSharedValue(20);

  useEffect(() => {
    const delay = index * 80;
    rowOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    rowTranslateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 180 }));
  }, []);

  const animatedRowStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
    transform: [
      { translateY: rowTranslateY.value },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedTouchable
      style={[
        styles.accountRow,
        isActive && styles.accountRowActive,
        animatedRowStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {account.profileImage ? (
          <Image source={{ uri: account.profileImage }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={isActive ? ['#7C3AED', '#A78BFA'] : ['#94A3B8', '#CBD5E1']}
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarLetter}>
              {(account.name || account.phone || '?').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        {/* Online indicator for active */}
        {isActive && (
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineIndicatorInner} />
          </View>
        )}
      </View>

      {/* Account Info */}
      <View style={styles.accountInfo}>
        <Text style={[styles.accountName, isActive && styles.accountNameActive]} numberOfLines={1}>
          {account.name || 'Owner'} {account.property_name && account.property_name !== 'N/A' ? `(${account.property_name})` : ''}
        </Text>
        <Text style={styles.accountEmail} numberOfLines={1}>
          {account.phone} {account.property_type && account.property_type !== 'N/A' ? `• ${account.property_type}` : ''}
        </Text>
        {isActive && (
          <View style={styles.activeLabel}>
            <View style={styles.activeDot} />
            <Text style={styles.activeLabelText}>Active Now</Text>
          </View>
        )}
      </View>

      {/* Active Check */}
      {isActive ? (
        <LinearGradient
          colors={['#7C3AED', '#A78BFA']}
          style={styles.checkCircle}
        >
          <Ionicons name="checkmark" size={16} color="#FFF" />
        </LinearGradient>
      ) : (
        <View style={styles.switchLabel}>
          <Text style={styles.switchLabelText}>Switch</Text>
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 998,
  },

  // Sheet
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 999,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },

  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 24,
    marginBottom: 8,
  },

  // Account List
  accountsList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },

  // Account Row
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  accountRowActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1.5,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicatorInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#22C55E',
  },

  // Account Info
  accountInfo: {
    flex: 1,
    marginRight: 10,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  accountNameActive: {
    color: '#5B21B6',
    fontWeight: '700',
  },
  accountEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  activeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  activeLabelText: {
    fontSize: 11,
    color: '#22C55E',
    fontWeight: '600',
  },

  // Check / Switch
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  switchLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Add Account
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 6,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderStyle: 'dashed',
  },
  addAccountIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  addAccountTextContainer: {
    flex: 1,
  },
  addAccountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 2,
  },
  addAccountSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
});

export default AccountSwitcherSheet;


