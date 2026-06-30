import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BookingContext } from "@/src/context/BookingContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLanguage } from '../../utils/LanguageContext';
import BASE_URL, { fetchWithAuth } from "@/src/config/Api";
import COLORS from "../../theme/colors";

const OwnerNotificationScreen = ({ route }) => {
  const { t } = useLanguage();
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    const dateOptions = { month: "short", day: "numeric" };
    if (date.getFullYear() !== now.getFullYear()) {
      dateOptions.year = "numeric";
    }

    return `${date.toLocaleDateString("en-US", dateOptions)}, ${timeStr}`;
  };

  const navigation = useNavigation();
  const phone = route?.params?.phone;
  const ownerPropertyType = (route?.params?.propertyType || "").toLowerCase();

  const {
    setRequests: setGlobalRequests,
    refreshTrigger,
    setRefreshTrigger,
    markAllAsSeen,
    clearAllNotifications,
    clearedIds
  } = useContext(BookingContext);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    if (!phone) return;
    // Only show full-screen loading on initial fetch to prevent UI flicker
    if (!refreshing && requests.length === 0) setLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/owner_requests/${encodeURIComponent(phone)}/`);
      const data = await res.json();
      
      const mockData = [
        {
          id: "mock1",
          db_id: "mock1",
          type: "existing_tenant",
          name: "Ram",
          phone: "9876543210",
          status: "pending",
          propertyName: "Demo Hostel",
          propertyType: "Hostel",
          floor: "2",
          room: "205",
          bed: "B",
          createdAt: new Date().toISOString()
        },
        {
          id: "mock2",
          db_id: "mock2",
          type: "existing_tenant",
          name: "Ram",
          phone: "9876543210",
          status: "pending",
          propertyName: "Demo Apartment",
          propertyType: "Apartment",
          floor: "3",
          flat: "A-302",
          sharing: "2BHK",
          createdAt: new Date().toISOString()
        },
        {
          id: "mock3",
          db_id: "mock3",
          type: "existing_tenant",
          name: "Ram",
          phone: "9876543210",
          status: "pending",
          propertyName: "Demo Commercial",
          propertyType: "Commercial",
          floor: "1",
          room: "C-101",
          createdAt: new Date().toISOString()
        }
      ];

      const combinedData = [...mockData, ...(Array.isArray(data) ? data : [])];
      
      const filteredData = combinedData.filter(item => {
        if (!ownerPropertyType) return true; // If no type passed, show all
        const itemType = (item.propertyType || item.property_type || "").toLowerCase();
        // Match the specific property type, fallback to showing if item has no type to not break existing
        if (!itemType) return true;
        return itemType === ownerPropertyType;
      });

      setRequests(filteredData);
      setGlobalRequests(filteredData);
    } catch (error) {
      Alert.alert("Error", "Unable to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [phone, refreshTrigger])
  );

  // Clear badge count when new notifications are loaded or screen is focused
  useEffect(() => {
    if (requests.length > 0) {
      markAllAsSeen();
    }
  }, [requests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, [phone]);

  const handleAction = async (action, id) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/update_request_status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, status: action }),
      });

      if (!res.ok) throw new Error();

      setRefreshTrigger(prev => prev + 1); // Notify Home screen to refresh stats 🚀
      fetchRequests(); // Refresh local list
      Alert.alert("Success", `Request ${action === "accepted" ? "approved" : "declined"} successfully.`);
    } catch (error) {
      Alert.alert("Error", "Failed to update request status");
    }
  };

  const groupRequests = (reqs) => {
    const sorted = [...reqs].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    const groups = { New: [], Earlier: [] };
    const now = new Date();

    sorted.forEach((item) => {
      const date = new Date(item.created_at || item.createdAt);
      const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
      if (diffHours < 24) groups.New.push(item);
      else groups.Earlier.push(item);
    });
    return groups;
  };

  const getStatusConfig = (item) => {
    const status = (item.status || "pending").toLowerCase();

    if (item.type === "issue") {
      switch (status) {
        case "completed": return { label: "Resolved", color: COLORS.SUCCESS, bg: "#E8F5E9" };
        case "in progress": return { label: "In Progress", color: COLORS.PRIMARY, bg: "#F5F3FF" };
        default: return { label: "Open", color: COLORS.ERROR, bg: "#FFEBEE" };
      }
    }

    if (item.type === "payment") {
      switch (status) {
        case "success": return { label: "Success", color: COLORS.SUCCESS, bg: "#E8F5E9" };
        case "failed": return { label: "Failed", color: COLORS.ERROR, bg: "#FFEBEE" };
        default: return { label: "Verifying", color: COLORS.WARNING, bg: "#FFF8E1" };
      }
    }

    switch (status) {
      case "accepted": return { label: "Approved", color: COLORS.SUCCESS, bg: "#E8F5E9" };
      case "rejected": return { label: "Declined", color: COLORS.ERROR, bg: "#FFEBEE" };
      case "withdrawn": return { label: "Withdrawn", color: COLORS.TEXT_LIGHT, bg: "#F1F5F9" };
      case "allotted": return { label: "Room Allotted", color: COLORS.PRIMARY, bg: "#F5F3FF" };
      default: return { label: "Pending", color: COLORS.WARNING, bg: "#FFF8E1" };
    }
  };

  const renderBadge = (icon, text) => (
    <View style={styles.badge}>
      <Ionicons name={icon} size={14} color={COLORS.TEXT_SECONDARY} />
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );

  const renderCard = (item) => {
    const status = (item.status || "pending").toLowerCase();
    const config = getStatusConfig(item);

    if (item.type === "issue") {
      return (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => navigation.navigate("OwnerNavigation", { screen: "Issues" })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: "#FFF1F2" }]}>
                <Ionicons name="construct-outline" size={20} color={COLORS.ERROR} />
              </View>
              <View>
                <Text style={styles.userName}>{item.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.userPhone}>From: {item.tenant_name}</Text>
                  <Text style={styles.timeDot}>•</Text>
                  <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.statusTag, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusTagText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          <Text style={[styles.cardMessage, { marginTop: 12, color: COLORS.TEXT_SECONDARY }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={[styles.badgeRow, { marginTop: 12 }]}>
            {renderBadge("alert-circle-outline", `${item.severity} Severity`)}
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === "payment") {
      return (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => navigation.navigate("OwnerNavigation", { screen: "Payments" })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="cash-outline" size={20} color={COLORS.SUCCESS} />
              </View>
              <View>
                <Text style={styles.userName}>Payment: ₹{item.amount}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.userPhone}>From: {item.tenant_name}</Text>
                  <Text style={styles.timeDot}>•</Text>
                  <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.statusTag, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusTagText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          <View style={[styles.propertySection, { borderTopWidth: 0, marginTop: 10, paddingTop: 0 }]}>
            <Text style={[styles.propertyName, { fontSize: 13 }]}>{item.property_name}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.userName}>{item.name}</Text>
                {item.type === "existing_tenant" ? (
                  <View style={{ backgroundColor: "#E0E7FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#4338CA" }}>Existing Tenant</Text>
                  </View>
                ) : item.type !== "issue" && item.type !== "payment" ? (
                  <View style={{ backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#059669" }}>New Tenant</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Text style={styles.userPhone}>{item.phone}</Text>
                <Text style={styles.timeDot}>•</Text>
                <Text style={styles.timeText}>
                  {formatDate(item.created_at || item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusTag, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusTagText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <View style={styles.propertySection}>
          <Text style={styles.propertyName}>{item.propertyName || "Selected Property"}</Text>
          <View style={styles.badgeRow}>
            {item.type !== "existing_tenant" && item.propertyType && renderBadge("home-outline", item.propertyType)}
            {item.floor && renderBadge("business-outline", `Floor ${item.floor}`)}

            {item.type === "existing_tenant" ? (
              <>
                {item.propertyType === "Hostel" && item.room && renderBadge("business-outline", `Room ${item.room}`)}
                {item.propertyType === "Hostel" && item.bed && renderBadge("bed-outline", `Bed ${item.bed}`)}
                {item.propertyType === "Apartment" && item.flat && renderBadge("business-outline", `Room ${item.flat}`)}
                {item.propertyType === "Apartment" && item.sharing && renderBadge("home-outline", `Type ${item.sharing}`)}
                {item.propertyType === "Commercial" && item.room && renderBadge("business-outline", `Unit ${item.room}`)}
              </>
            ) : (
              <>
                {item.room && renderBadge("business-outline", `Room ${item.room}`)}
                {item.flat && renderBadge("business-outline", `Flat ${item.flat}`)}
                {item.bed && renderBadge("bed-outline", `Bed ${item.bed}`)}
                {item.sharing && renderBadge("people-outline", item.sharing)}
              </>
            )}

            {item.section && renderBadge("business-outline", `Section ${item.section}`)}
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Check-in</Text>
            <Text style={styles.detailValue}>{item.checkIn || "Flexible"}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{item.phone}</Text>
          </View>
        </View>



        {status === "pending" ? (
          <View style={styles.actionButtons}>
            {item.type === "existing_tenant" ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleAction("accepted", item.db_id || item.id)}
                >
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.WHITE} />
                  <Text style={styles.btnTextPrimary}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.declineBtn]}
                  onPress={() => handleAction("rejected", item.db_id || item.id)}
                >
                  <Text style={styles.btnTextSecondary}>Decline</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.allotBtn]}
                  onPress={() => navigation.navigate("OwnerNavigation", {
                    screen: "Home",
                    params: { phone, autoFillData: { ...item, requestId: item.db_id || item.id } }
                  })}
                >
                  <Ionicons name="bed-outline" size={18} color={COLORS.WHITE} />
                  <Text style={styles.btnTextPrimary}>Allot Room</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.declineBtn]}
                  onPress={() => handleAction("rejected", item.db_id || item.id)}
                >
                  <Text style={styles.btnTextSecondary}>Decline</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : status === "allotted" ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.btn, styles.approveBtn]}
              onPress={() => handleAction("accepted", item.db_id || item.id)}
            >
              <Ionicons name="checkmark-done" size={18} color={COLORS.WHITE} />
              <Text style={styles.btnTextPrimary}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={() => handleAction("rejected", item.db_id || item.id)}>
              <Text style={styles.btnTextSecondary}>Decline</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  // Filter out cleared notifications
  const visibleRequests = requests.filter(r => !clearedIds.includes(r.id));
  const grouped = groupRequests(visibleRequests);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Guest Requests</Text>
              <Text style={styles.headerSubtitle}>Manage incoming booking applications</Text>
            </View>
          </View>
          {visibleRequests.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                Alert.alert(
                  "Clear All",
                  "Are you sure you want to clear all notifications?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear All", onPress: clearAllNotifications, style: "destructive" }
                  ]
                );
              }}
            >
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />
        }
      >
        {visibleRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={80} color={COLORS.BORDER} />
            <Text style={styles.emptyTitle}>All cleared!</Text>
            <Text style={styles.emptyText}>You've managed all your guest requests.</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([title, items]) => (
            items.length > 0 && (
              <View key={title} style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {items.map(renderCard)}
              </View>
            )
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.ERROR,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_LIGHT,
    marginHorizontal: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  timeDot: {
    fontSize: 12,
    color: COLORS.TEXT_LIGHT,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.PRIMARY,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  propertySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  propertyName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
  },
  detailsGrid: {
    flexDirection: "row",
    marginTop: 16,
    gap: 20,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.TEXT_LIGHT,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
  },
  allotBtn: {
    backgroundColor: COLORS.PRIMARY,
    flex: 2,
  },
  approveBtn: {
    backgroundColor: COLORS.SUCCESS,
    flex: 2,
  },
  declineBtn: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  btnTextPrimary: {
    color: COLORS.WHITE,
    fontWeight: "700",
    marginLeft: 8,
  },
  btnTextSecondary: {
    color: COLORS.ERROR,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
});

export default OwnerNotificationScreen;

