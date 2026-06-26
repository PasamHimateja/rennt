import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import BASE_URL, { fetchWithAuth } from '../../config/Api';
import { useLanguage } from "../../utils/LanguageContext";
import {
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Replace this with: import COLORS from './colors';
const COLORS = {
  PRIMARY: "#5F259F",
  PRIMARY_LIGHT: "#7A3FC4",
  PRIMARY_DARK: "#4A1D7A",
  WHITE: "#FFFFFF",
  BACKGROUND: "#F5F5F5",
  CARD: "#EEEEEE",
  TEXT_PRIMARY: "#212121",
  TEXT_SECONDARY: "#757575",
  TEXT_LIGHT: "#9E9E9E",
  SUCCESS: "#16A34A",
  ERROR: "#DC2626",
  WARNING: "#F59E0B",
  INFO: "#2563EB",
  BORDER: "#E0E0E0",
  DIVIDER: "#D6D6D6",
  GOLD: "#D4AF37",
  BLUE_LIGHT: "#E3F2FD",
};

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function IssuesScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [issues, setIssues] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    const getTenantData = async () => {
      const storedPhone = await AsyncStorage.getItem("tenantPhone");
      const storedId = await AsyncStorage.getItem("tenantId");
      if (storedPhone) setPhone(storedPhone);
      if (storedId) setTenantId(storedId);
    };
    getTenantData();
  }, []);


  const handleUpdate = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("severity", priority);

      if (image && !image.startsWith('http')) {
        formData.append("image", {
          uri: image,
          name: "issue_update.jpg",
          type: "image/jpeg",
        });
      }

      const response = await fetchWithAuth(
        `${BASE_URL}/api/update-issue/${editingId}/`,
        {
          method: "PATCH",
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Issue updated");
        setEditingId(null);
        fetchIssues();
      } else {
        Alert.alert("Error", result.error || "Failed to update issue");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };
  const fetchIssues = async (isBackground = false) => {
    try {
      const storedPhone = await AsyncStorage.getItem("tenantPhone");
      if (!storedPhone) return;

      // Only show loading spinner if it's NOT a background refresh
      if (!isBackground) setLoading(true);

      const response = await fetchWithAuth(
        `${BASE_URL}/api/tenant-issues/${encodeURIComponent(storedPhone)}/`
      );
      const data = await response.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Fetch Issues Error:", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const isFirstLoad = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        fetchIssues(false); // Show loading spinner only on very first load
        isFirstLoad.current = false;
      } else {
        fetchIssues(true); // Silent background refresh on focus
      }

      // Automatic background refresh every 30 seconds
      const interval = setInterval(() => {
        fetchIssues(true);
      }, 30000);

      return () => clearInterval(interval);
    }, [])
  );

  // Aligned with your specific STATUS colors
  const priorities = [
    { label: "Low", color: COLORS.INFO, bg: COLORS.BLUE_LIGHT },
    { label: "Medium", color: COLORS.WARNING, bg: `${COLORS.WARNING}15` },
    { label: "High", color: COLORS.ERROR, bg: `${COLORS.ERROR}15` },
  ];

  const stats = useMemo(
    () => ({
      total: issues.length,
      high: issues.filter((i) => i.severity === "High").length,
      resolved: issues.filter((i) => i.status === "Completed").length,
    }),
    [issues],
  );

  const filteredIssues = useMemo(() => {
    let result = [...issues];

    // Sort: Pending issues first, then Completed
    result.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Apply Status Filter
    if (statusFilter !== "All") {
      result = result.filter((i) => i.status === statusFilter);
    }

    // Apply Priority Filter
    if (priorityFilter !== "All") {
      result = result.filter((i) => i.severity === priorityFilter);
    }

    return result;
  }, [issues, statusFilter, priorityFilter]);

  const toggleForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFormVisible(!isFormVisible);
    if (isFormVisible && editingId) {
      setEditingId(null);
      setTitle("");
      setDescription("");
      setImage(null);
      setPriority("Medium");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.2,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const submitIssue = async () => {
    if (!title || !description) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("tenant_id", tenantId);
      formData.append("email", phone);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("severity", priority);

      // ✅ ADD IMAGE
      if (image) {
        formData.append("image", {
          uri: image,
          name: "issue.jpg",
          type: "image/jpeg",
        });
      }

      const response = await fetchWithAuth(`${BASE_URL}/api/create-issue/`, {
        method: "POST",
        body: formData, // ✅ only this
      }
      );

      if (response.status === 201) {
        Alert.alert("Success", "Issue submitted successfully");
        setTitle("");
        setDescription("");
        setPriority("Medium");
        setImage(null); // ✅ reset image
        setIsFormVisible(false);
        fetchIssues();
      } else {
        const err = await response.json();
        Alert.alert("Error", err.error || "Failed to submit issue");
      }
    } catch (error) {
      console.log("Submit Issue Error:", error);
      Alert.alert("Error", "Network error");
    }
  };

  const formatLabel = (str) => {
    if (!str) return '';
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const deleteIssue = async (id) => {
    Alert.alert("Confirm Deletion", "Remove this issue permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetchWithAuth(`${BASE_URL}/api/delete-issue/${id}/`, {
              method: "DELETE",
            });

            if (response.status === 200) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

              // remove from UI AFTER backend success
              setIssues(issues.filter((i) => i.id !== id));

              Alert.alert("Success", "Issue deleted successfully");
            } else {
              Alert.alert("Error", "Failed to delete issue");
            }
          } catch (error) {
            console.log("Delete Error:", error);
            Alert.alert("Error", "Network error");
          }
        },
      },
    ]);
  };

  const startEdit = (item) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setPriority(item.severity || "Medium");
    setImage(item.image);
    // Don't set setIsFormVisible(true) here, as it controls the top form
  };

  const cancelEdit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setImage(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeftContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { textTransform: 'lowercase' }]}>{t('Issues')}</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.addButton} onPress={toggleForm}>
            <Ionicons
              name={isFormVisible ? "close" : "add"}
              size={18}
              color={COLORS.WHITE}
            />
            <Text style={styles.addButtonText}>
              {isFormVisible ? t('skip') : t('Report Issue')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* DASHBOARD STATS */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            onPress={() => setStatusFilter("All")}
            style={[
              styles.statCard,
              statusFilter === "All" && { borderColor: COLORS.PRIMARY, borderWidth: 2 }
            ]}
          >
            <Text style={[styles.statNumber, statusFilter === "All" && { color: COLORS.PRIMARY }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>{t('all')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatusFilter("Pending")}
            style={[
              styles.statCard,
              { borderLeftColor: COLORS.ERROR, borderLeftWidth: 3 },
              statusFilter === "Pending" && { borderColor: COLORS.ERROR, borderWidth: 2 }
            ]}
          >
            <Text style={[styles.statNumber, statusFilter === "Pending" && { color: COLORS.ERROR }]}>{stats.total - stats.resolved}</Text>
            <Text style={styles.statLabel}>{t('pending')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatusFilter("Completed")}
            style={[
              styles.statCard,
              { borderLeftColor: COLORS.SUCCESS, borderLeftWidth: 3 },
              statusFilter === "Completed" && { borderColor: COLORS.SUCCESS, borderWidth: 2 }
            ]}
          >
            <Text style={[styles.statNumber, statusFilter === "Completed" && { color: COLORS.SUCCESS }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>{t('completed')}</Text>
          </TouchableOpacity>
        </View>

        {/* COLLAPSIBLE FORM CARD */}
        {isFormVisible && (
          <View style={styles.formCard}>
            <Text style={styles.formHeader}>
              {editingId ? t('update_status') : t('Report Issue')}
            </Text>

            <Text style={styles.inputLabel}>{t('type')}</Text>
            <TextInput
              placeholder={t('search_by_name')}
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={COLORS.TEXT_LIGHT}
            />

            <Text style={styles.inputLabel}>{t('description')}</Text>
            <TextInput
              placeholder={t('description')}
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              multiline
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={COLORS.TEXT_LIGHT}
            />

            <Text style={styles.inputLabel}>SEVERITY LEVEL</Text>
            <View style={styles.priorityGroup}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => setPriority(p.label)}
                  style={[
                    styles.priorityChip,
                    priority === p.label && {
                      backgroundColor: p.color,
                      borderColor: p.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p.label && { color: COLORS.WHITE },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formFooter}>
              <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                <Feather
                  name={image ? "check" : "paperclip"}
                  size={18}
                  color={COLORS.PRIMARY}
                />
                <Text style={styles.attachText}>
                  {image ? "Attached" : "Attach File"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={editingId ? handleUpdate : submitIssue}
              >
                <Text style={styles.submitBtnText}>
                  {editingId ? "Save Changes" : "Submit Issue"}
                </Text>
                <Ionicons
                  name="send"
                  size={14}
                  color={COLORS.WHITE}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>

            {image && (
              <Image source={{ uri: image }} style={styles.previewImage} />
            )}
          </View>
        )}

        {/* LIST FILTERS */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>Priority Filter</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {["All", "High", "Medium", "Low"].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setPriorityFilter(f);
                }}
                style={[
                  styles.filterChip,
                  priorityFilter === f && { backgroundColor: COLORS.PRIMARY },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    priorityFilter === f && { color: COLORS.WHITE },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ISSUES FEED */}
        {filteredIssues.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={54}
              color={COLORS.TEXT_LIGHT}
            />
            <Text style={styles.emptyTitle}>No issues found</Text>
            <Text style={styles.emptySub}>You're all caught up for now.</Text>
          </View>
        ) : (
          filteredIssues.map((item) => {
            const isCompleted = item.status === "Completed";
            const pData =
              priorities.find((p) => p.label === item.severity) || priorities[1];

            const statusColor = isCompleted ? COLORS.SUCCESS : pData.color;
            const isEditing = editingId === item.id;

            return (
              <View
                key={item.id}
                style={[
                  styles.issueCard,
                  isCompleted && { borderLeftColor: COLORS.SUCCESS, borderLeftWidth: 4 }
                ]}
              >

                {/* STATUS & DATE */}
                <View style={styles.issueTopRow}>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: statusColor },
                    ]}
                  />
                  <Text style={styles.issueDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {isEditing ? (
                  /* INLINE EDIT FORM */
                  <View style={styles.inlineForm}>
                    <Text style={styles.inlineFormHeader}>Edit Issue</Text>

                    <Text style={styles.inlineInputLabel}>Title</Text>
                    <TextInput
                      style={styles.inlineInput}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Issue title"
                    />

                    <Text style={styles.inlineInputLabel}>Description</Text>
                    <TextInput
                      style={[styles.inlineInput, { height: 80, textAlignVertical: "top" }]}
                      multiline
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Issue description"
                    />

                    <Text style={styles.inlineInputLabel}>Severity</Text>
                    <View style={styles.inlinePriorityGroup}>
                      {priorities.map((p) => (
                        <TouchableOpacity
                          key={p.label}
                          onPress={() => setPriority(p.label)}
                          style={[
                            styles.inlinePriorityChip,
                            priority === p.label && {
                              backgroundColor: p.color,
                              borderColor: p.color,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.inlinePriorityText,
                              priority === p.label && { color: COLORS.WHITE },
                            ]}
                          >
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inlineInputLabel}>Image</Text>
                    <View style={styles.inlineImageRow}>
                      <TouchableOpacity style={styles.inlineAttachBtn} onPress={pickImage}>
                        <Feather name="camera" size={16} color={COLORS.PRIMARY} />
                        <Text style={styles.inlineAttachText}>{image ? "Change Photo" : "Add Photo"}</Text>
                      </TouchableOpacity>
                      {image && (
                        <View style={styles.inlinePreviewContainer}>
                          <Image
                            source={{ uri: image.startsWith('http') ? image : (image.startsWith('/') ? `${BASE_URL}${image}` : image) }}
                            style={styles.inlinePreviewImage}
                          />
                          <TouchableOpacity style={styles.inlineRemoveImage} onPress={() => setImage(null)}>
                            <Ionicons name="close-circle" size={20} color={COLORS.ERROR} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <View style={styles.inlineFormFooter}>
                      <TouchableOpacity style={styles.inlineCancelBtn} onPress={cancelEdit}>
                        <Text style={styles.inlineCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.inlineSaveBtn} onPress={handleUpdate}>
                        <Text style={styles.inlineSaveBtnText}>Save</Text>
                        <Ionicons name="checkmark" size={16} color={COLORS.WHITE} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    {/* ISSUE DETAILS */}
                    <Text style={styles.issueTitle}>{item.title}</Text>
                    <Text style={styles.issueDesc}>{item.description}</Text>

                    {item.image && (
                      <Image
                        source={{ uri: item.image.startsWith('http') ? item.image : `${BASE_URL}${item.image}` }}
                        style={styles.issueImage}
                      />
                    )}

                    {/* STATUS BADGE */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: statusColor }}>
                        {formatLabel(item.status)}
                      </Text>
                    </View>

                    {/* OWNER RESPONSE */}
                    {item.owner_comment && (
                      <View style={styles.ownerResponseBox}>
                        <Text style={styles.ownerResponseTitle}>Owner Response:</Text>
                        <Text style={styles.ownerResponseText}>{item.owner_comment}</Text>
                      </View>
                    )}

                    {/* FOOTER */}
                    <View style={styles.issueFooter}>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: pData.bg },
                        ]}
                      >
                        <Text style={[styles.severityText, { color: pData.color }]}>
                          {item.severity || "Medium"} Severity
                        </Text>
                      </View>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          onPress={() => startEdit(item)}
                          style={styles.iconBtn}
                        >
                          <Feather
                            name="edit-2"
                            size={16}
                            color={COLORS.TEXT_SECONDARY}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => deleteIssue(item.id)}
                          style={styles.iconBtn}
                        >
                          <Feather name="trash-2" size={16} color={COLORS.ERROR} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Header
  header: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: COLORS.BLUE_LIGHT,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: COLORS.WHITE,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 4,
  },

  // Dashboard Stats
  statsContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    elevation: 2,
  },
  statNumber: { fontSize: 24, fontWeight: "800", color: COLORS.TEXT_PRIMARY },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    textTransform: "uppercase",
  },

  // Collapsible Form
  formCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 24,
    elevation: 4,
  },
  formHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },

  priorityGroup: { flexDirection: "row", gap: 10, marginBottom: 24 },
  priorityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: "center",
    backgroundColor: COLORS.BACKGROUND,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
  },

  formFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.CARD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  attachText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.PRIMARY,
    marginLeft: 6,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.PRIMARY_DARK,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitBtnText: { color: COLORS.WHITE, fontSize: 14, fontWeight: "700" },
  previewImage: { width: "100%", height: 140, borderRadius: 10, marginTop: 16 },

  // Filters & List Header
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginRight: 12,
  },
  filterScroll: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 20
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.TEXT_SECONDARY
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginTop: 12,
  },
  emptySub: { fontSize: 13, color: COLORS.TEXT_LIGHT, marginTop: 4 },

  // Issue Card
  issueCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 16,
    elevation: 1,
  },
  issueTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  issueDate: { fontSize: 12, color: COLORS.TEXT_LIGHT, fontWeight: "600" },

  issueTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  issueDesc: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 12,
  },
  issueImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: COLORS.BACKGROUND,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  ownerResponseBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ownerResponseTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  ownerResponseText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  issueFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.DIVIDER,
    paddingTop: 16,
  },

  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  severityText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },

  actionButtons: { flexDirection: "row", gap: 16 },
  iconBtn: { padding: 4 },

  // Inline Form Styles
  inlineForm: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
  },
  inlineFormHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  inlineInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  inlineInput: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  inlinePriorityGroup: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  inlinePriorityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: "center",
    backgroundColor: COLORS.WHITE,
  },
  inlinePriorityText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
  },
  inlineFormFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  inlineCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.DIVIDER,
  },
  inlineCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
  },
  inlineSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
  },
  inlineSaveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.WHITE,
  },
  inlineImageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  inlineAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  inlineAttachText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.PRIMARY,
    marginLeft: 6,
  },
  inlinePreviewContainer: {
    position: "relative",
  },
  inlinePreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  inlineRemoveImage: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.WHITE,
    borderRadius: 10,
  },
});