import { useEffect, useRef } from "react";
import {
  View,
  Dimensions,
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
} from "react-native";

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";


const { width, height } = Dimensions.get("window");

// ── Floating particle dot ──────────────────────────────────────────────────
function Particle({ delay, startX, duration, size, opacity }) {
  const translateY = useSharedValue(0);
  const fadeVal = useSharedValue(0);

  useEffect(() => {
    fadeVal.value = withDelay(
      delay,
      withSequence(
        withTiming(opacity, { duration: 600 }),
        withDelay(
          duration - 1200,
          withTiming(0, { duration: 600 })
        )
      )
    );

    translateY.value = withDelay(
      delay,
      withTiming(-height * 0.55, { duration, easing: Easing.linear })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: fadeVal.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          bottom: height * 0.1,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "rgba(255,255,255,0.9)",
        },
        style,
      ]}
    />
  );
}

// ── Shimmer ring ───────────────────────────────────────────────────────────
function GlowRing({ delay, ringSize, duration }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.6, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.glowRing,
        { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
        style,
      ]}
    />
  );
}

// ── Main SplashScreen ──────────────────────────────────────────────────────
export default function SplashScreen({ onFinish }) {
  // Logo: pure fade-in, no scale jump
  const logoOpacity = useSharedValue(0);
  const logoBrightness = useSharedValue(0); // used via opacity on a white overlay

  // Soft breathe — very subtle translateY (±4px), NOT scale
  const breathe = useSharedValue(0);

  // Shimmer sweep across logo
  const shimmerX = useSharedValue(-220);

  // Text
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(12);
  const bottomOpacity = useSharedValue(0);

  // Screen exit
  const screenOpacity = useSharedValue(1);

  const particles = [
    { delay: 800, startX: width * 0.15, duration: 4000, size: 4, opacity: 0.7 },
    { delay: 1200, startX: width * 0.3, duration: 5000, size: 3, opacity: 0.5 },
    { delay: 600, startX: width * 0.5, duration: 3800, size: 5, opacity: 0.6 },
    { delay: 1500, startX: width * 0.65, duration: 4500, size: 3, opacity: 0.4 },
    { delay: 900, startX: width * 0.8, duration: 4200, size: 4, opacity: 0.65 },
    { delay: 300, startX: width * 0.42, duration: 5200, size: 2, opacity: 0.5 },
    { delay: 1800, startX: width * 0.22, duration: 3600, size: 6, opacity: 0.35 },
    { delay: 2100, startX: width * 0.72, duration: 4800, size: 3, opacity: 0.55 },
  ];

  useEffect(() => {
    // 1. Logo fade in — smooth, no pop
    logoOpacity.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });

    // 2. Shimmer sweep across logo (starts after fade)
    shimmerX.value = withDelay(
      1300,
      withRepeat(
        withTiming(220, {
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        false
      )
    );

    // 3. Gentle breathe — translateY only, very subtle
    breathe.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 2200, easing: Easing.linear }),
          withTiming(5, { duration: 2200, easing: Easing.linear })
        ),
        -1,
        true
      )
    );

    // 4. Subtitle slides up + fades in
    subtitleOpacity.value = withDelay(1400, withTiming(1, { duration: 700 }));
    subtitleY.value = withDelay(
      1400,
      withTiming(0, { duration: 700, easing: Easing.linear })
    );

    // 5. Bottom text
    bottomOpacity.value = withDelay(2000, withTiming(1, { duration: 800 }));

    // 6. Exit
    screenOpacity.value = withDelay(
      4500,
      withTiming(0, { duration: 900 }, (finished) => {
        if (finished && onFinish) runOnJS(onFinish)();
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: breathe.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, screenStyle]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require("../../assets/images/starting.png")}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Dark scrim for contrast */}
        <View style={styles.scrim} />

        {/* Floating particles */}
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}

        {/* Centre content */}
        <View style={styles.center}>

          {/* Glow rings behind logo */}
          <View style={styles.ringContainer}>
            <GlowRing delay={1400} ringSize={220} duration={2800} />
            <GlowRing delay={2000} ringSize={220} duration={2800} />
          </View>

          {/* Logo with shimmer overlay */}
          <Animated.View style={[styles.logoWrapper, logoStyle]}>
            <Image
              source={require("../../assets/images/RenntoLogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Shimmer sweep */}
            <View style={styles.shimmerClip} pointerEvents="none">
              <Animated.View style={[styles.shimmerBar, shimmerStyle]} />
            </View>
          </Animated.View>


          {/* Tagline */}
          <Animated.Text style={[styles.tagline, subtitleStyle]}>
            SMART RENTAL APP
          </Animated.Text>


        </View>

        {/* Bottom strip */}
        <Animated.Text style={[styles.bottomText, bottomStyle]}>
          Secure Rentals · Easy Booking · Trusted Stays
        </Animated.Text>
      </ImageBackground>
    </Animated.View>
  );
}

const LOGO_SIZE = 180;

const styles = StyleSheet.create({
  wrapper: { flex: 1 },

  background: {
    flex: 1,
    width,
    height,
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 6, 30, 0.45)",
  },

  // ── Particles ──
  particle: {
    position: "absolute",
  },

  // ── Centre layout ──
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Glow rings ──
  ringContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },

  glowRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(180, 140, 255, 0.55)",
    backgroundColor: "transparent",
  },

  // ── Logo ──
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: LOGO_SIZE / 2,
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // Shimmer clip masks to logo bounds
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: LOGO_SIZE / 2,
  },

  shimmerBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "20deg" }],
  },

  // ── Typography ──
  appName: {
    marginTop: 28,
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 8,
    textShadowColor: "rgba(140, 100, 255, 0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },

  tagline: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(210, 190, 255, 0.85)",
    letterSpacing: 3.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Decorative dots ──
  dots: {
    flexDirection: "row",
    marginTop: 20,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(180, 150, 255, 0.6)",
    marginHorizontal: 3.5,
  },

  // ── Bottom text ──
  bottomText: {
    position: "absolute",
    bottom: 52,
    alignSelf: "center",
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.65)",
    letterSpacing: 1.2,
    textAlign: "center",
  },
});

