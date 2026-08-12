import React from 'react';
import type { VoucherData } from '@/api/types';
import logo from '@/assets/hulool-logo.png';

interface Props {
  data: VoucherData;
  id?: string;
  descriptionOverride?: string;
}

export const VoucherTemplate: React.FC<Props> = ({ data, id = 'voucher-template-container', descriptionOverride }) => {
  const isReceipt = data.voucher_type === 'receipt';
  const title = isReceipt ? 'سند قبض' : 'سند صرف';
  const titleEn = isReceipt ? 'Receipt Voucher' : 'Expense Voucher';
  const color = isReceipt ? '#059669' : '#dc2626'; // Green for receipt, Red for expense

  const description = descriptionOverride ?? data.description ?? '';
  const displayAmount = (data.amount || data.debit || data.credit || 0).toFixed(2);
  const displayDate = data.date || (data as any).transaction_date?.split(' ')[0] || '';
  const counterpartyName = data.counterparty_name || data.account_name || '';

  return (
    <div
      id={id}
      style={{
        width: '210mm',
        height: '148mm',
        padding: '12mm',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        direction: 'rtl',
        boxSizing: 'border-box',
        position: 'relative',
        color: '#000000',
        overflow: 'hidden',
      }}
    >
      {/* Outer Decorative Borders */}
      <div
        style={{
          position: 'absolute',
          top: '4mm',
          bottom: '4mm',
          left: '4mm',
          right: '4mm',
          border: '1px solid #666',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '5mm',
          bottom: '5mm',
          left: '5mm',
          right: '5mm',
          border: '2px solid #000',
          pointerEvents: 'none',
        }}
      />

      {/* Top Branding Header (3-Column Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          marginBottom: '8px',
          paddingBottom: '8px',
        }}
      >
        {/* Right Column (RTL): Company Name & Phone */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', lineHeight: '1.2' }}>
            مكتب حلول
          </div>
          <div style={{ fontSize: '11pt', color: '#374151', marginTop: '2px' }}>
            0500000000
          </div>
        </div>

        {/* Center Column: Voucher Badge Number */}
        <div
          style={{
            border: `2px solid ${color}`,
            borderRadius: '4px',
            padding: '3px 18px',
            fontWeight: 'bold',
            fontSize: '13pt',
            color: color,
            textAlign: 'center',
            minWidth: '110px',
          }}
        >
          #{data.voucher_number || String(data.id).padStart(6, '0')}
        </div>

        {/* Left Column (RTL): Logo Image Only */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <img
            src={logo}
            alt="Logo"
            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Double Separator Line */}
      <div style={{ borderTop: '3px double #000', marginBottom: '12px' }} />

      {/* Title & Amount & Date Row (3-Column Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        {/* Right Column (RTL): Date */}
        <div style={{ textAlign: 'right', fontSize: '11.5pt', fontWeight: 'bold' }}>
          <span>التاريخ: </span>
          <span style={{ paddingInline: '4px' }}>
            {displayDate}
          </span>
        </div>

        {/* Center Column: Title */}
        <div style={{ textAlign: 'center', minWidth: '180px' }}>
          <div style={{ fontSize: '18pt', fontWeight: 'bold', lineHeight: '1.1' }}>
            {title}
          </div>
          <div
            style={{
              fontSize: '11pt',
              color: '#374151',
              borderBottom: '2px solid #000',
              display: 'inline-block',
              paddingBottom: '1px',
              marginTop: '1px',
            }}
          >
            {titleEn}
          </div>
        </div>

        {/* Left Column (RTL): Amount Box */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              border: '2px solid #000',
              borderRadius: '5px',
              padding: '4px 14px',
              fontSize: '14pt',
              fontWeight: 'bold',
              backgroundColor: '#f9fafb',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{displayAmount}</span>
            <span style={{ fontSize: '11pt' }}>ر.س</span>
          </div>
        </div>
      </div>

      {/* Form Fields Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11pt', lineHeight: '1.8' }}>
        
        {/* Row 1: Received From / Paid To */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', width: '110px' }}>
            {isReceipt ? 'استلمنا من :' : 'دفعنا إلى :'}
          </div>
          <div
            style={{
              flex: 1,
              borderBottom: '1px dotted #333',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11.5pt',
              paddingBottom: '2px',
            }}
          >
            {counterpartyName}
          </div>
          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', width: '130px', textAlign: 'left', direction: 'ltr' }}>
            {isReceipt ? 'Received From Mr.' : 'Paid To Mr.'}
          </div>
        </div>

        {/* Row 2: Sum Of */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', width: '110px' }}>
            مبلغاً وقدره :
          </div>
          <div
            style={{
              flex: 1,
              borderBottom: '1px dotted #333',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11pt',
              paddingBottom: '2px',
            }}
          >
            {data.amount_words_ar || 'صفر ريال سعودي فقط لا غير'}
          </div>
          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', width: '130px', textAlign: 'left', direction: 'ltr' }}>
            The Sum Of
          </div>
        </div>

        {/* Row 3: Payment Details Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr 1fr',
            alignItems: 'center',
            gap: '12px',
            paddingTop: '4px',
            paddingBottom: '4px',
            fontSize: '10pt',
          }}
        >
          {/* Checkboxes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <input type="checkbox" style={{ width: '13px', height: '13px' }} />
              <span>نقداً Cash</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <input type="checkbox" style={{ width: '13px', height: '13px' }} />
              <span>شيك Cheque</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <input type="checkbox" style={{ width: '13px', height: '13px' }} />
              <span>تحويل Transfer</span>
            </label>
          </div>

          {/* Transfer No */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>رقم Transfer No:</span>
            <span style={{ flex: 1, borderBottom: '1px dotted #333', display: 'inline-block', height: '16px' }} />
          </div>

          {/* Bank / Treasury */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>على خزينة / بنك:</span>
            <span
              style={{
                flex: 1,
                borderBottom: '1px dotted #333',
                display: 'inline-block',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              {data.account_name || ''}
            </span>
          </div>
        </div>

        {/* Row 4: For / وذلك مقابل */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', width: '110px' }}>
            وذلك مقابل :
          </div>
          <div
            style={{
              flex: 1,
              borderBottom: '1px dotted #333',
              textAlign: 'center',
              fontWeight: '500',
              fontSize: '11pt',
              paddingBottom: '2px',
            }}
          >
            {description}
          </div>
          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', width: '130px', textAlign: 'left', direction: 'ltr' }}>
            For
          </div>
        </div>
      </div>

      {/* Footer Signatures */}
      <div
        style={{
          position: 'absolute',
          bottom: '8mm',
          left: '12mm',
          right: '12mm',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          textAlign: 'center',
          fontSize: '10pt',
          fontWeight: 'bold',
        }}
      >
        <div>
          <div>توقيع المستلم</div>
          <div style={{ fontSize: '8.5pt', color: '#4b5563', direction: 'ltr' }}>Received Sig.</div>
          <div style={{ marginTop: '22px', borderBottom: '1px dotted #000', width: '80%', marginInline: 'auto' }} />
        </div>
        <div>
          <div>أمين الصندوق</div>
          <div style={{ fontSize: '8.5pt', color: '#4b5563', direction: 'ltr' }}>Cashier Sig.</div>
          <div style={{ marginTop: '22px', borderBottom: '1px dotted #000', width: '80%', marginInline: 'auto' }} />
        </div>
        <div>
          <div>توقيع المدير</div>
          <div style={{ fontSize: '8.5pt', color: '#4b5563', direction: 'ltr' }}>Manager Sig.</div>
          <div style={{ marginTop: '22px', borderBottom: '1px dotted #000', width: '80%', marginInline: 'auto' }} />
        </div>
      </div>
    </div>
  );
};
