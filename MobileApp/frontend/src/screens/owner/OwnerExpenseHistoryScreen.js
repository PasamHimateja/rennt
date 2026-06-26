import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from '../../theme/colors';
import BASE_URL, { fetchWithAuth } from '../../config/Api';
import { useLanguage } from '../../utils/LanguageContext';

export default function OwnerExpenseHistoryScreen({ navigation }) {
    const { t } = useLanguage();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            const rawEmail = await AsyncStorage.getItem("ownerPhone");
            if (!rawEmail) return;
            const phone = rawEmail.trim();
            const response = await fetchWithAuth(`${BASE_URL}/api/owner-expenses/${encodeURIComponent(phone)}/`);
            const data = await response.json();
            if (response.ok) {
                setExpenses(Array.isArray(data) ? data : (data.data || []));
            }
        } catch (e) {
            console.log("Fetch expenses error:", e);
        } finally {
            setLoading(false);
        }
    };

    const renderExpenseItem = ({ item }) => (
        <View style={styles.expenseCard}>
            <View style={styles.expenseLeft}>
                <View style={styles.iconBox}>
                    <Ionicons name="wallet-outline" size={24} color="#EF4444" />
                </View>
                <View>
                    <Text style={styles.category}>{t(item.category) || item.category}</Text>
                    <Text style={styles.date}>{item.date}</Text>
                </View>
            </View>
            <View style={styles.expenseRight}>
                <Text style={styles.amount}>- ₹{Number(item.amount).toLocaleString()}</Text>
                {item.description ? (
                    <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
                ) : null}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#7A3FC4" />
                <Text style={{ marginTop: 12, color: '#64748B' }}>{t("loading") || "Loading..."}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#5F259F" translucent={false} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("expense_history") || "Expense History"}</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={expenses}
                renderItem={renderExpenseItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyText}>{t("no_expense_history") || "No expense history found"}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    backBtn: {
        padding: 8,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    expenseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    category: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    date: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    expenseRight: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: '800',
        color: '#EF4444',
    },
    description: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
        maxWidth: 120,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '600',
    },
});


