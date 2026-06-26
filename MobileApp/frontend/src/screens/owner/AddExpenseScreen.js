import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../theme/colors';
import BASE_URL, { fetchWithAuth } from '@/src/config/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OwnerExpenseScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAddExpense = async () => {
        if (!category || !amount || !date) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        try {
            setLoading(true);
            const ownerPhone = await AsyncStorage.getItem('ownerPhone');
            
            const response = await fetchWithAuth(`${BASE_URL}/api/add-expense/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    owner_phone: ownerPhone,
                    category,
                    amount: parseFloat(amount),
                    date,
                    description
                }),
            });

            if (response.ok) {
                Alert.alert('Success', 'Expense added successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to add expense');
            }
        } catch (error) {
            console.error('Add expense error:', error);
            Alert.alert('Error', 'Server connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Expense</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.formCard}>
                    <Text style={styles.label}>Category *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Repairs, Electricity, Cleaning"
                        value={category}
                        onChangeText={setCategory}
                    />

                    <Text style={styles.label}>Amount (₹) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="2024-05-15"
                        value={date}
                        onChangeText={setDate}
                    />

                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Details about the expense..."
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                    />

                    <TouchableOpacity 
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
                        onPress={handleAddExpense}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitBtnText}>Save Expense</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.TEXT_PRIMARY,
    },
    content: {
        padding: 20,
    },
    formCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 20,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitBtn: {
        backgroundColor: COLORS.PRIMARY,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});


