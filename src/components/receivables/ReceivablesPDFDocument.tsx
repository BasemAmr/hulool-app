// src/components/receivables/ReceivablesPDFDocument.tsx

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatDate } from '../../utils/dateUtils';
import type { Receivable, StatementItem } from '../../api/types';

// Define the props interface
interface ReportTotals {
    totalDebit: number;
    totalCredit: number;
    totalNet: number;
}
interface ReceivablesPDFDocumentProps {
    // Accept combined statement rows OR raw receivables
    receivables: (Receivable | StatementItem)[];
    clientName: string;
    totals: ReportTotals;
}

// --- FONT REGISTRATION ---
// Register the Arabic font from the public folder.
// This is the key to fixing the garbled text.
Font.register({
    family: 'Tajawal',
    fonts: [
        { src: '/fonts/Tajawal-Regular.ttf' }, // Path from the public folder
        { src: '/fonts/Tajawal-Bold.ttf', fontWeight: 'bold' },
    ],
});

// --- STYLESHEET ---
const styles = StyleSheet.create({
    page: {
        direction: 'rtl', // Set text direction to Right-to-Left
        fontFamily: 'Tajawal', // Use our registered Arabic font
        fontSize: 9,
        padding: 25,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#0D6EFD',
        color: 'white',
        borderRadius: 5,
    },
    // Main table styles
    table: {
        width: '100%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableColHeader: {
        backgroundColor: '#343A40',
        color: 'white',
        fontWeight: 'bold',
        padding: 6,
        textAlign: 'center',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableCol: {
        padding: 5,
        textAlign: 'center',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    colDescription: { width: '30%', textAlign: 'right' },
    colAmount: { width: '15%' },
    colDate: { width: '15%' },
    colType: { width: '12.5%' },
    // Payment details styles
    paymentSection: {
        backgroundColor: '#f8f9fa',
        padding: 8,
        marginTop: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    paymentTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6c757d',
        textAlign: 'center',
        marginBottom: 5,
    },
    paymentTable: { width: '100%', fontSize: 8 },
    paymentTableRow: { flexDirection: 'row' },
    paymentTableCol: { width: '25%', padding: 4, textAlign: 'center' },
    paymentTableHeader: { backgroundColor: '#6c757d', color: 'white', fontWeight: 'bold' },
    // Summary table styles
    summaryTable: { width: '50%', marginLeft: 'auto', marginTop: 20 },
    summaryRow: { flexDirection: 'row' },
    summaryLabel: { width: '50%', padding: 6, fontWeight: 'bold', textAlign: 'right', borderWidth: 1, borderColor: '#dee2e6' },
    summaryValue: { width: '50%', padding: 6, fontWeight: 'bold', textAlign: 'center', borderWidth: 1, borderColor: '#dee2e6' },
    finalBalance: { backgroundColor: '#0D6EFD', color: 'white', fontSize: 12 },
    // Text color styles
    debitText: { color: '#DC3545' },
    creditText: { color: '#198754' },
    balanceText: { color: '#0D6EFD' },
});

// Helper function for consistent currency formatting
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(amount);

// The PDF Document Component
const ReceivablesPDFDocument: React.FC<ReceivablesPDFDocumentProps> = ({ receivables, clientName, totals }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.title}>كشف حساب للعميل: {clientName}</Text>

            {/* Header Row */}
            <View style={styles.tableRow}>
                <Text style={[styles.tableColHeader, styles.colDescription]}>الوصف / ملاحظات</Text>
                <Text style={[styles.tableColHeader, styles.colAmount]}>المدين</Text>
                <Text style={[styles.tableColHeader, styles.colAmount]}>الدائن</Text>
                <Text style={[styles.tableColHeader, styles.colAmount]}>الرصيد</Text>
                <Text style={[styles.tableColHeader, styles.colDate]}>تاريخ الأمر</Text>
                <Text style={[styles.tableColHeader, styles.colType]}>النوع</Text>
            </View>

            {/* Data Rows */}
            {receivables.map((r, index) => {
                const isStatement = (r as any).debit !== undefined && (r as any).credit !== undefined && (r as any).balance !== undefined;
                const description = (r as any).description;
                const debit = isStatement ? (r as StatementItem).debit : (r as Receivable).amount;
                const credit = isStatement ? (r as StatementItem).credit : (r as Receivable).total_paid;
                const balance = isStatement ? (r as StatementItem).balance : (r as Receivable).remaining_amount;
                const dateVal = (r as any).date || (r as any).created_at;
                const payments = (r as any).payments || [];
                const typeVal = (r as any).type;
                const notes = (r as any).notes;
                return (
                <View key={index} style={[styles.table, { marginTop: -1 }]}>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCol, styles.colDescription]}>
                            <Text>{description}</Text>
                            {notes && <Text style={{ fontSize: 7, color: '#6c757d' }}>{notes}</Text>}
                        </View>
                        <Text style={[styles.tableCol, styles.colAmount, styles.debitText]}>{debit ? formatCurrency(debit) : formatCurrency(0)}</Text>
                        <Text style={[styles.tableCol, styles.colAmount, styles.creditText]}>{credit ? formatCurrency(credit) : formatCurrency(0)}</Text>
                        <Text style={[styles.tableCol, styles.colAmount, styles.balanceText]}>{formatCurrency(balance)}</Text>
                        <Text style={[styles.tableCol, styles.colDate]}>{dateVal ? formatDate(dateVal) : ''}</Text>
                        <Text style={[styles.tableCol, styles.colType]}>{typeVal}</Text>
                    </View>

                    {/* Payment Details Sub-Table */}
                    {payments && payments.length > 0 && (
                        <View style={styles.tableRow}>
                            <View style={[styles.tableCol, { width: '100%', padding: 5 }]}>
                                <View style={styles.paymentSection}>
                                    <Text style={styles.paymentTitle}>تفاصيل المدفوعات</Text>
                                    <View style={[styles.paymentTableRow, styles.paymentTableHeader]}>
                                        <Text style={styles.paymentTableCol}>المبلغ</Text>
                                        <Text style={styles.paymentTableCol}>ملاحظات</Text>
                                        <Text style={styles.paymentTableCol}>التاريخ</Text>
                                        <Text style={styles.paymentTableCol}>طريقة الدفع</Text>
                                    </View>
                                    {payments.map((p: any, pIndex: number) => (
                                        <View key={pIndex} style={styles.paymentTableRow}>
                                            <Text style={[styles.paymentTableCol, styles.creditText]}>{formatCurrency(p.amount)}</Text>
                                            <Text style={styles.paymentTableCol}>{p.note || '—'}</Text>
                                            <Text style={styles.paymentTableCol}>{formatDate(p.paid_at)}</Text>
                                            <Text style={styles.paymentTableCol}>{p.payment_method?.name_ar || 'غير محدد'}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            );})}

            {/* Summary Table */}
            <View style={styles.summaryTable}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>إجمالي المدين</Text>
                    <Text style={[styles.summaryValue, styles.debitText]}>{formatCurrency(totals.totalDebit)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>إجمالي الدائن</Text>
                    <Text style={[styles.summaryValue, styles.creditText]}>{formatCurrency(totals.totalCredit)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.finalBalance]}>
                    <Text style={[styles.summaryLabel, styles.finalBalance]}>الرصيد النهائي</Text>
                    <Text style={[styles.summaryValue, styles.finalBalance]}>{formatCurrency(totals.totalNet)}</Text>
                </View>
            </View>
        </Page>
    </Document>
);

export default ReceivablesPDFDocument;