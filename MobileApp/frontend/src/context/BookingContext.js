import React, { createContext, useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from '../utils/LanguageContext';
import BASE_URL, { fetchWithAuth } from "../config/Api";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

export const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [requests, setRequests] = useState([]);
  const [userPhone, setuserPhone] = useState(null);
  const [seenIds, setSeenIds] = useState([]);
  const [clearedIds, setClearedIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const ws = useRef(null);

  // --- Audio Player State ---
  const [sound, setSound] = useState();

  async function playSound() {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require("../../assets/notification.wav")
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  useEffect(() => {
    return sound
      ? () => {
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  const [isJoined, setIsJoined] = useState(false);
  const [isTenantVacated, setIsTenantVacated] = useState(false);

  // 1. Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const tenant = await AsyncStorage.getItem("tenantPhone");
        const owner = await AsyncStorage.getItem("ownerPhone");
        const storedSeen = await AsyncStorage.getItem("notificationSeenIds");
        const storedCleared = await AsyncStorage.getItem("notificationClearedIds");

        if (tenant || owner) setuserPhone(tenant || owner);
        if (storedSeen) setSeenIds(JSON.parse(storedSeen));
        if (storedCleared) setClearedIds(JSON.parse(storedCleared));
      } catch (e) {
        console.log("Error loading context data:", e);
      }
    };
    loadData();
  }, []);

  // 1.5. Fetch Initial Requests & Sync
  const fetchRequests = async () => {
    if (!userPhone) return;

    try {
      const isOwner = await AsyncStorage.getItem("ownerPhone");
      const endpoint = isOwner ? "owner_requests" : "tenant_notifications";

      const response = await fetchWithAuth(
        `${BASE_URL}/api/${endpoint}/${encodeURIComponent(userPhone)}/`
      );

      const data = await response.json();

      if (Array.isArray(data)) {
        setRequests(data);
      }

      if (!isOwner) {
        const detailsRes = await fetchWithAuth(
          `${BASE_URL}/api/tenantdetails/${encodeURIComponent(userPhone)}/`
        );
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          setIsTenantVacated(detailsData && detailsData.status === "Vacated");
        }
      } else {
        setIsTenantVacated(false);
      }
    } catch (error) {
      console.log("Fetch Requests Error:", error);
    }
  };

  useEffect(() => {
    if (isTenantVacated) {
      setIsJoined(false);
      return;
    }

    const joined = requests.some((item) => {
      const status = (item.status || "").toLowerCase();

      return [
        "completed",
        "joined",
        "active",
        "occupied",
      ].includes(status);
    });

    setIsJoined(joined);
  }, [requests, isTenantVacated]);

  useEffect(() => {
    fetchRequests();
  }, [userPhone, refreshTrigger]);

  useEffect(() => {
    console.log("Requests:", requests);
    console.log("isTenantVacated:", isTenantVacated);
    console.log("isJoined:", isJoined);
  }, [requests, isTenantVacated, isJoined]);

  // NEW: Poling as backup to WebSocket for robust UI updates
  useEffect(() => {
    if (!userPhone) return;
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [userPhone]);

  // 2. WebSocket Connection Management
  useEffect(() => {
    if (!userPhone) return;

    const wsUrl = BASE_URL.replace(/^http/, "ws") + `/ws/notifications/${userPhone}/`;
    const connectWS = () => {
      console.log("Connecting WebSocket:", wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log("WS Data Received:", data);

          // Trigger a full refresh when any notification comes in
          setRefreshTrigger((prev) => prev + 1);

          // Show popup alert if message exists
          const msgText = data.content?.message || data.message;
          const msgType = data.content?.type || data.type;

          if (msgText) {
            // Check if this is a real-time status update or join request
            if (msgType === "status_update" || msgType === "incoming_request" || msgType === "ISSUE" || msgType === "PAYMENT" || msgType === "PAYMENT_VERIFIED") {
              playSound();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("New Notification \uD83D\uDD14", msgText);
            }
          }

        } catch (err) {
          console.log("WS Message Error:", err);
        }
      };

      ws.current.onclose = () => setTimeout(connectWS, 3000);
    };
    connectWS();
    return () => ws.current?.close();
  }, [userPhone]);

  // Handle Marking As Seen
  const markAllAsSeen = async () => {
    const newIds = requests.map((r) => r.id);
    const uniqueIds = Array.from(new Set([...seenIds, ...newIds]));
    setSeenIds(uniqueIds);
    try {
      await AsyncStorage.setItem("notificationSeenIds", JSON.stringify(uniqueIds));
    } catch (e) {
      console.log("Error saving seenIds:", e);
    }
  };

  // NEW: Handle Clearing (Hiding) All Notifications
  const clearAllNotifications = async () => {
    const newIds = requests.map((r) => r.id);
    const uniqueIds = Array.from(new Set([...clearedIds, ...newIds]));
    setClearedIds(uniqueIds);
    try {
      await AsyncStorage.setItem("notificationClearedIds", JSON.stringify(uniqueIds));
    } catch (e) {
      console.log("Error clearing notifications:", e);
    }
  };

  // Refined Pending Count
  const pendingCount = requests.filter((r) => {
    if (clearedIds.includes(r.id)) return false;

    const isUnseen = !seenIds.includes(r.id);
    const status = (r.status || "").toLowerCase();

    // 1. Join Request Logic
    if (r.type === "join_request" || !r.type) {
      const isOwnerTask = ["pending", "allotted"].includes(status);
      const isTenantAlert = ["accepted", "rejected"].includes(status);
      return isUnseen && (isOwnerTask || isTenantAlert);
    }

    // 2. Issue Logic
    if (r.type === "issue") {
      // Owner sees new/unseen issues
      // Tenant sees resolved issues
      return isUnseen;
    }

    // 3. Payment Logic
    if (r.type === "payment") {
      // Owner sees pending payments
      // Tenant sees successful/failed payments
      return isUnseen;
    }

    return isUnseen;
  }).length;

  return (
    <BookingContext.Provider
      value={{
        requests,
        setRequests,
        isJoined,
        pendingCount,
        userPhone,
        setuserPhone,
        refreshTrigger,
        setRefreshTrigger,
        markAllAsSeen,
        clearAllNotifications,
        clearedIds,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};