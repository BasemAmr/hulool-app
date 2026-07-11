import React, { useState, useMemo } from 'react';
import {
  useGetTreasuryAccounts,
  useDeactivateTreasuryAccount,
  useGetTreasuryCategories,
} from '../api/treasuryQueries';
import type { TreasuryAccount } from '../api/treasuryQueries';
import type { TreasuryCategory } from '@/api/types';
import { useCategoryLabels } from '@/features/financials/constants/categoryConfig';
import HuloolDataGrid from '@/shared/grid/HuloolDataGrid';
import type { HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import type { CellProps } from 'react-datasheet-grid';
import {
  GridActionBar,
  createAction,
  createEditAction,
  createViewAction,
  createDeleteAction,
} from '@/shared/grid';
import type { GridAction } from '@/shared/grid';
import Button from '@/shared/ui/primitives/Button';
import { useToast } from '@/shared/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  Landmark, Banknote, Wallet, Shield, Plus, Star, Building2, Settings,
} from 'lucide-react';
import { CreateAccountModal } from '../modals/CreateAccountModal';
import TransactionActionButtons from '../components/TransactionActionButtons';

// ─── Category icons (labels from DB via useCategoryLabels) ─
const categoryIcons: Record<string, React.ReactNode> = {
  bank:          <Landmark size={16} />,
  cashbox:       <Banknote size={16} />,
  wallet:        <Wallet size={16} />,
  company_vault: <Shield size={16} />,
  internal:      <Building2 size={16} />,
};

// ─── Action Cell ──────────────────────────────────────────
const ActionsCell = React.memo(({ rowData, rowIndex, columnData }: CellProps<TreasuryAccount, any>) => {
  const actions: GridAction<TreasuryAccount>[] = [
    createViewAction<TreasuryAccount>(() => columnData.onView?.(rowData)),
    createEditAction<TreasuryAccount>(() => columnData.onEdit?.(rowData)),
    createAction<TreasuryAccount>('custom', () => columnData.onPermissions?.(rowData), {
      title: 'الصلاحيات',
      icon: <Shield size={14} />,
    }),
    createAction<TreasuryAccount>('delete', () => columnData.onDeactivate?.(rowData), {
      title: 'إلغاء التنشيط',
      hidden: rowData.is_system_default === 1,
    }),
  ];

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        height: '100%',
        padding: '4px 0',
        pointerEvents: 'auto',
      }}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      <GridActionBar item={rowData} index={rowIndex} actions={actions} compact />
    </div>
  );
});
ActionsCell.displayName = 'ActionsCell';

// ─── Helper: format currency ──────────────────────────────
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 0 }).format(Math.abs(amount));

// ─── Main Page ────────────────────────────────────────────
export const TreasuryAccountsPage = () => {
  const { data: accounts = [], isLoading } = useGetTreasuryAccounts();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetTreasuryCategories();
  const categoryLabels = useCategoryLabels();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const openModal = useModalStore((state) => state.openModal);
  const deactivateMutation = useDeactivateTreasuryAccount();

  // Build category summary lookup from API data
  const categorySummaryMap = categories.reduce<Record<string, TreasuryCategory>>((acc, cat) => {
    acc[cat.sub_type] = cat;
    return acc;
  }, {});

  // Compute "الكل" summary from all categories
  const allSummary = categories.reduce(
    (acc, cat) => ({
      count: acc.count + cat.count,
      total_balance: acc.total_balance + cat.total_balance,
    }),
    { count: 0, total_balance: 0 }
  );

  // Derive tabs dynamically from API categories
  const tabs = useMemo(() => {
    const allTab = { key: 'all', label: 'الكل', icon: null };
    const categoryTabs = categories.map(cat => ({
      key: cat.sub_type,
      label: categoryLabels[cat.sub_type] || cat.sub_type,
      icon: categoryIcons[cat.sub_type] || null,
    }));
    return [allTab, ...categoryTabs];
  }, [categories, categoryLabels]);

  // Filter accounts by active tab
  const filtered = activeTab === 'all'
    ? accounts
    : accounts.filter((a) => a.sub_type === activeTab);

  // Action handlers
  const handleView = (account: TreasuryAccount) => {
    const detailsPath = account.sub_type === 'cashbox'
      ? `/financial-center/cash-boxes/${account.id}`
      : `/financial-center/treasury-accounts/${account.id}`;
    navigate(detailsPath);
  };

  const handleEdit = (account: TreasuryAccount) => {
    openModal('treasuryEditAccount', { account });
  };

  const handlePermissions = (account: TreasuryAccount) => {
    openModal('treasuryPermissions', { account });
  };

  const handleDeactivate = (account: TreasuryAccount) => {
    openModal('confirmDelete', {
      title: 'إلغاء تنشيط الحساب',
      message: `هل أنت متأكد من إلغاء تنشيط الحساب "${account.name}"؟`,
      onConfirm: () => {
        deactivateMutation.mutate(account.id, {
          onSuccess: () => toast.success('تم', 'تم إلغاء تنشيط الحساب'),
          onError: (err: any) => toast.error('فشل', err.message || ''),
        });
      },
    });
  };

  // Column definition — RTL reading order (rightmost first)
  const columns: HuloolGridColumn<TreasuryAccount>[] = [
    {
      id: 'name',
      title: 'اسم الحساب',
      key: 'name',
      type: 'text',
      grow: 2.5,
      formatter: (val: string, row: TreasuryAccount) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {val}
          {row.is_system_default === 1 && (
            <span title="حساب افتراضي النظام" style={{ color: 'var(--color-primary)', display: 'inline-flex' }}>
              <Star size={12} fill="currentColor" />
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'sub_type',
      title: 'التصنيف',
      key: 'sub_type',
      type: 'text',
      formatter: (val: string) => categoryLabels[val] || val,
      grow: 1.2,
    },
    {
      id: 'normal_balance',
      title: 'طبيعة الحساب',
      key: 'normal_balance',
      type: 'text',
      formatter: (val: string) => val === 'debit' ? 'مدين' : 'دائن',
      grow: 1,
    },
    {
      id: 'created_at',
      title: 'تاريخ الإضافة',
      key: 'created_at',
      type: 'date',
      grow: 1,
    },
    {
      id: 'balance',
      title: 'الرصيد',
      key: 'balance',
      type: 'currency',
      grow: 1.2,
    },
    {
      id: 'actions',
      title: 'الإجراءات',
      key: 'id',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<TreasuryAccount, any>>,
      columnData: {
        onView: handleView,
        onEdit: handleEdit,
        onPermissions: handlePermissions,
        onDeactivate: handleDeactivate,
      },
      width: 120,
      grow: 0,
    },
  ];

  return (
    <div className="p-6 text-right" dir="rtl">
      {/* ─── Header Bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-text-primary tracking-tight">شجرة الحسابات</h1>
          <p className="text-xs text-text-secondary mt-0.5">إدارة الحسابات البنكية، صناديق العهدة، المحافظ الإلكترونية والخزائن</p>
        </div>

        {/* Transaction buttons centered in header */}
        <div className="flex items-center gap-2">
          <TransactionActionButtons
            accountId={0}
            cardType="treasury"
          />
        </div>

        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} className="ml-1.5" />
          إضافة حساب
        </Button>
      </div>

      {/* ─── Category Tab Bar ────────────────────── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isAll = tab.key === 'all';
          const summary = isAll ? allSummary : categorySummaryMap[tab.key];
          const count = summary?.count ?? 0;
          const totalBalance = summary?.total_balance ?? 0;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-bg-surface text-text-secondary border-border-default hover:border-primary/40 hover:text-text-primary'
              }`}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-muted'
              }`}>
                {count}
              </span>
              <span className={`font-extrabold tabular-nums ${
                isActive ? 'text-white' : 'text-text-primary'
              }`}>
                {formatCurrency(totalBalance)} ريال
              </span>
            </button>
          );
        })}
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={() => openModal('categoryManager')}
          title="إدارة التصنيفات"
        >
          <Settings size={14} />
        </Button>
      </div>

      {/* ─── Accounts Grid ──────────────────────── */}
      <div className="bg-bg-surface rounded-lg border border-border-default shadow-sm">
        <HuloolDataGrid
          data={filtered}
          columns={columns}
          isLoading={isLoading || isLoadingCategories}
          emptyMessage="لا توجد حسابات مالية. أضف حساباً جديداً للبدء."
          showId={false}
        />
      </div>

      {/* ─── Create Modal ────────────────────────── */}
      <CreateAccountModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
};
