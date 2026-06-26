import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import AnimatedRN, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import THEME from "../theme/colors";
import SplashScreen from "./Splashscreen";
import LanguageSelectionScreen from "../screens/LanguageSelectionScreen";
import { useLanguage } from "../utils/LanguageContext";

const { width, height } = Dimensions.get("window");

const COLORS = {
  navy: THEME.PRIMARY,
  lightPurple: THEME.PRIMARY_LIGHT,
  bg: "#FFFFFF", // Forced to pure white
  gray: THEME.TEXT_SECONDARY,
  lightGray: THEME.CARD,
};

const AUTO_SLIDE_INTERVAL = 3000;

export default function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [showHome, setShowHome] = useState(false);
  const pagerRef = useRef(null);
  const intervalRef = useRef(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showLangSelect, setShowLangSelect] = useState(false);

  const { isLanguageSelected, t, loading } = useLanguage();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!loading && !showSplash) {
      if (isLanguageSelected) {
        setShowLangSelect(false);
      } else {
        setShowLangSelect(true);
      }
    }
  }, [loading, isLanguageSelected, showSplash]);

  const DATA = [
    {
      id: "1",
      title: t("stay_smart"),
      subtitle: t("stay_smart_desc"),
      image: require("../../assets/images/step16.jpg"),
    },
    {
      id: "2",
      title: t("stay_control"),
      subtitle: t("stay_control_desc"),
      image: require("../../assets/images/step2.jpg"),
    },
    {
      id: "3",
      title: t("stay_connected"),
      subtitle: t("stay_connected_desc"),
      image: require("../../assets/images/step34.jpg"),
    },
  ];

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentPage, fadeAnim, slideAnim]);

  const startAutoSlide = useCallback(() => {
    stopAutoSlide();
    intervalRef.current = setInterval(() => {
      setCurrentPage((prev) => {
        if (prev < DATA.length - 1) {
          const nextPage = prev + 1;
          pagerRef.current?.setPage(nextPage);
          return nextPage;
        } else {
          stopAutoSlide();
          return prev;
        }
      });
    }, AUTO_SLIDE_INTERVAL);
  }, [stopAutoSlide]);

  const stopAutoSlide = useCallback(() => {
    intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [startAutoSlide, stopAutoSlide]);

  const handleNext = () => {
    if (currentPage < DATA.length - 1) {
      const nextPage = currentPage + 1;
      pagerRef.current?.setPage(nextPage);
      setCurrentPage(nextPage);
    }
  };

  const handleSkip = () => {
    const lastPage = DATA.length - 1;
    pagerRef.current?.setPage(lastPage);
    setCurrentPage(lastPage);
  };

  const handleGetStarted = () => setShowHome(true);

  if (loading) return null;
  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (showLangSelect) return <LanguageSelectionScreen onFinish={() => setShowLangSelect(false)} />;

  return (
    <SafeAreaProvider>
      {/* PERFECT WHITE FIX: Added backgroundColor: "#FFFFFF" everywhere */}
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {showHome ? (
          <RoleSection />
        ) : (
          <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* ===== Onboarding Pager ===== */}
            <PagerView
              style={{ flex: 1, backgroundColor: "#FFFFFF" }}
              initialPage={0}
              ref={pagerRef}
              onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
              onTouchStart={stopAutoSlide}
              onTouchEnd={startAutoSlide}
            >
              {DATA.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <View style={{ width, height: height * 0.65 }}>
                    <Animated.Image
                      source={item.image}
                      style={{
                        width: "100%",
                        height: "100%",
                        opacity: fadeAnim,
                      }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.4)", "transparent", "#FFFFFF"]}
                      locations={[0, 0.5, 0.9]}
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                      }}
                    />
                  </View>
                  <Animated.View
                    style={{
                      paddingHorizontal: 40,
                      alignItems: "center",
                      marginTop: -60,
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 36,
                        fontWeight: "900",
                        color: COLORS.navy,
                        textAlign: "center",
                        marginBottom: 12,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        color: COLORS.gray,
                        textAlign: "center",
                        lineHeight: 26,
                      }}
                    >
                      {item.subtitle}
                    </Text>
                  </Animated.View>
                </View>
              ))}
            </PagerView>

            {/* ===== Footer navigation ===== */}
            <View
              style={{
                paddingHorizontal: 25,
                paddingTop: 10,
                paddingBottom: 40,
                backgroundColor: "#FFFFFF",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 25,
                }}
              >
                {DATA.map((_, i) => {
                  const scale = currentPage === i ? 1.4 : 1;
                  return (
                    <Animated.View
                      key={i}
                      style={{
                        height: 6,
                        width: 6,
                        borderRadius: 3,
                        backgroundColor:
                          currentPage === i ? COLORS.navy : "#E0E0E0",
                        marginHorizontal: 4,
                        transform: [{ scale }],
                      }}
                    />
                  );
                })}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 60,
                }}
              >
                {currentPage === DATA.length - 1 ? (
                  <TouchableOpacity
                    style={{
                      width: "100%",
                      height: 60,
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                    onPress={handleGetStarted}
                  >
                    <LinearGradient
                      colors={[THEME.PRIMARY, THEME.PRIMARY_LIGHT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: THEME.WHITE,
                          fontSize: 18,
                          fontWeight: "bold",
                        }}
                      >
                        {t("get_started")}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity onPress={handleSkip}>
                      <Text
                        style={{
                          color: THEME.TEXT_SECONDARY,
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {t("skip")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNext}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text
                          style={{
                            color: THEME.PRIMARY,
                            fontSize: 13,
                            fontWeight: "600",
                            marginRight: 4,
                          }}
                        >
                          {t("next")}
                        </Text>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={THEME.PRIMARY}
                        />
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/* ===== HomeScreen Code ===== */
function RoleSection() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const line1Opacity = useSharedValue(0);
  const line2Opacity = useSharedValue(0);
  const line1Translate = useSharedValue(30);
  const line2Translate = useSharedValue(30);
  const accentHeight = useSharedValue(0);
  const heroFloat = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(80);
  const bubbleLeftY = useSharedValue(height);
  const bubbleRightY = useSharedValue(height);

  useEffect(() => {
    line1Opacity.value = withTiming(1, { duration: 600 });
    line1Translate.value = withTiming(0, { duration: 700 });
    line2Opacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    line2Translate.value = withDelay(300, withTiming(0, { duration: 700 }));
    accentHeight.value = withDelay(200, withTiming(70, { duration: 800 }));
    heroFloat.value = withRepeat(
      withTiming(-6, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    cardOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    cardTranslate.value = withDelay(800, withSpring(0));
    // Bubble animation
    bubbleLeftY.value = withDelay(
      300,
      withTiming(-80, { duration: 6000, easing: Easing.out(Easing.exp) }),
    );

    bubbleRightY.value = withDelay(
      500,
      withTiming(60, { duration: 6500, easing: Easing.out(Easing.exp) }),
    );
  }, []);

  const line1Style = useAnimatedStyle(() => ({
    opacity: line1Opacity.value,
    transform: [{ translateX: line1Translate.value }],
  }));
  const line2Style = useAnimatedStyle(() => ({
    opacity: line2Opacity.value,
    transform: [{ translateX: line2Translate.value }],
  }));
  const accentStyle = useAnimatedStyle(() => ({ height: accentHeight.value }));
  const heroFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroFloat.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));
  const bubbleLeftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleLeftY.value }],
  }));

  const bubbleRightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleRightY.value }],
  }));

 const SelectCard = ({ title, onPress, colors, icon }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
          onPress();
        }}
        style={{ width: "100%" }}
      >
        <AnimatedRN.View style={animatedStyle}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <View style={styles.buttonContent}>
  <MaterialCommunityIcons
    name={icon}
    size={24}
    color="#FFFFFF"
    style={{ marginRight: 12 }}
  />

  <Text style={styles.selectCardTitle}>{title}</Text>
</View>
          </LinearGradient>
        </AnimatedRN.View>
      </Pressable>
    );
  };

  return (
    <LinearGradient
      colors={["#4A00E0", "#8E2DE2", "#6A5ACD"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor={THEME.PRIMARY} />
      <AnimatedRN.View style={[styles.bubbleLeft, bubbleLeftStyle]} />
      <AnimatedRN.View style={[styles.bubbleRight, bubbleRightStyle]} />
      <AnimatedRN.View
        style={[
          { flex: 1.2, justifyContent: "center", paddingHorizontal: 32 },
          heroFloatStyle,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <AnimatedRN.View
            style={[
              {
                width: 5,
                backgroundColor: "#FFFFFF",
                marginRight: 20,
                borderRadius: 6,
              },
              accentStyle,
            ]}
          />
          <View>
            <AnimatedRN.Text
              style={[
                {
                  fontSize: 34,
                  fontWeight: "600",
                  color: "#F8F9FA",
                  letterSpacing: 1.5,
                },
                line1Style,
              ]}
            >
              {t("find_your")}
            </AnimatedRN.Text>
            <AnimatedRN.Text
              style={[
                {
                  fontSize: 44,
                  fontWeight: "800",
                  color: "#FFFFFF",
                  marginTop: 6,
                  letterSpacing: 2,
                },
                line2Style,
              ]}
            >
              {t("perfect_stay")}
            </AnimatedRN.Text>
          </View>
        </View>
        <Text
          style={{
            marginTop: 24,
            fontSize: 15,
            color: "#F3E8FF",
            lineHeight: 24,
            maxWidth: "85%",
          }}
        >
          {t("hero_desc")}
        </Text>
      </AnimatedRN.View>

      <AnimatedRN.View
        style={[
          {
            flex: 1,
            backgroundColor: "#FFFFFF", // Made this pure white too for consistency
            paddingHorizontal: 30,
            paddingTop: 60,
            borderTopLeftRadius: 50,
            borderTopRightRadius: 50,
          },
          cardStyle,
        ]}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
            color: THEME.PRIMARY,
            marginBottom: 12,
          }}
        >
          {t("get_started_caps")}
        </Text>
        <Text
          style={{
            textAlign: "center",
            color: THEME.TEXT_SECONDARY,
            marginBottom: 35,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {t("role_desc")}
        </Text>

        <SelectCard
  title={t("continue_owner")}
  icon="shield-home"
  colors={["#4A00E0", "#8E2DE2", "#6A5ACD"]}
  onPress={() => navigation.navigate("OwnerLoginScreen")}
/>

        <SelectCard
  title={t("continue_tenant")}
  icon="account"
  colors={["#4A00E0", "#8E2DE2", "#6A5ACD"]}
  onPress={() => navigation.navigate("TenantRegisterScreen")}
/>

        <Text
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 12,
            color: THEME.TEXT_SECONDARY,
          }}
        >
          {t("trust_footer")}
        </Text>
      </AnimatedRN.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  selectCard: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  
  primaryCard: { backgroundColor: THEME.PRIMARY, elevation: 8 },
  secondaryCard: {
    borderWidth: 2,
    borderColor: THEME.PRIMARY,
    backgroundColor: "#FFFFFF",
  },
  selectCardTitle: { fontSize: 16, fontWeight: "600" },
  gradientButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    elevation: 8,
  },
  buttonContent: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
},

  selectCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bubbleLeft: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.18)",
    left: -100,
    top: -80,
  },
  bubbleRight: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.15)",
    right: -100,
    top: 150, // slightly downward
  },
});
