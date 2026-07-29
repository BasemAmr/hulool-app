import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, TrendingUp, TrendingDown, ChevronDown, Edit3 } from 'lucide-react';
import type { CellProps } from 'react-datasheet-grid';
import HuloolDataGrid, { type HuloolGridColumn } from '@/shared/grid/HuloolDataGrid';
import { useModalStore } from '@/shared/stores/modalStore';
import Button from '@/shared/ui/primitives/Button';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import apiClient from '@/api/client';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import { formatPhoneForWhatsApp } from '@/shared/utils/whatsappUtils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui/shadcn/dropdown-menu';

// ─── Data Shape ───────────────────────────────────────────────────────────────
export interface EmployeeSummaryRow {
  employee_id: number;
  user_id: number;
  display_name: string;
  phone?: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface EmployeesSummaryResponse {
  employees: EmployeeSummaryRow[];
  total?: number;
}

// ─── Query Hook ───────────────────────────────────────────────────────────────
const useGetEmployeesSummary = (search?: string) =>
  useQuery<EmployeesSummaryResponse>({
    queryKey: ['employees', 'summary', search],
    queryFn: async () => {
      const response = await apiClient.get('/employees/summary', {
        params: search ? { search } : undefined,
      });
      const raw = response.data?.data ?? response.data;
      if (Array.isArray(raw)) return { employees: raw };
      return raw as EmployeesSummaryResponse;
    },
    staleTime: 30 * 1000,
  });

// ─── Currency Formatter ───────────────────────────────────────────────────────
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

// ─── Custom Cells ─────────────────────────────────────────────────────────────

// Employee Name Cell
interface EmployeeNameCellData {
  onEmployeeClick: (employeeId: number) => void;
}
const EmployeeNameCell = React.memo(
  ({ rowData, columnData, active }: CellProps<EmployeeSummaryRow, EmployeeNameCellData>) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      columnData?.onEmployeeClick?.(rowData.employee_id);
    };

    return (
      <span
        className="hulool-cell-content"
        style={{
          fontWeight: active ? 800 : 600,
          color: 'var(--color-primary)',
          cursor: 'pointer',
          justifyContent: 'flex-start',
          textAlign: 'right',
        }}
        onClick={handleClick}
      >
        {rowData.display_name || '—'}
      </span>
    );
  }
);
EmployeeNameCell.displayName = 'EmployeeNameCell';

// Phone Cell with WhatsApp
interface PhoneCellData {
  onWhatsApp: (phone: string) => void;
}
const PhoneCell = React.memo(
  ({ rowData, columnData, active }: CellProps<EmployeeSummaryRow, PhoneCellData>) => {
    const phone = rowData.phone;

    const handleWhatsAppClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (phone) columnData?.onWhatsApp?.(phone);
    };

    if (!phone) {
      return (
        <span
          className="hulool-cell-content"
          style={{
            justifyContent: 'center',
            color: 'var(--token-text-secondary)',
            fontWeight: active ? 700 : 500,
          }}
        >
          —
        </span>
      );
    }

    return (
      <div
        className="hulool-cell-content"
        style={{
          justifyContent: 'center',
          gap: '8px',
          fontWeight: active ? 700 : 400,
        }}
      >
        <button
          type="button"
          onClick={handleWhatsAppClick}
          title="فتح واتساب"
          className="hulool-whatsapp-btn"
        >
          <WhatsAppIcon size={14} />
        </button>
        <span style={{ color: 'var(--token-text-primary)' }}>{phone}</span>
      </div>
    );
  }
);
PhoneCell.displayName = 'PhoneCell';

// Debit Cell (Light Pink Highlight background)
const DebitCell = React.memo(({ rowData, active }: CellProps<EmployeeSummaryRow>) => {
  const amount = Number(rowData.total_debit) || 0;
  return (
    <span
      className="hulool-cell-content"
      style={{
        justifyContent: 'center',
        color: 'var(--token-text-danger)',
        fontWeight: active ? 800 : 700,
      }}
    >
      {formatCurrency(amount)}
    </span>
  );
});
DebitCell.displayName = 'DebitCell';

// Credit Cell (Light Green Highlight background)
const CreditCell = React.memo(({ rowData, active }: CellProps<EmployeeSummaryRow>) => {
  const amount = Number(rowData.total_credit) || 0;
  return (
    <span
      className="hulool-cell-content"
      style={{
        justifyContent: 'center',
        color: 'var(--token-text-success)',
        fontWeight: active ? 800 : 700,
      }}
    >
      {formatCurrency(amount)}
    </span>
  );
});
CreditCell.displayName = 'CreditCell';

// Balance Cell
const BalanceCell = React.memo(({ rowData, active }: CellProps<EmployeeSummaryRow>) => {
  const balance = Number(rowData.balance) || 0;
  return (
    <span
      className="hulool-cell-content"
      style={{
        justifyContent: 'center',
        fontWeight: active ? 800 : 700,
        color:
          balance > 0
            ? 'var(--token-text-success)'
            : balance < 0
            ? 'var(--token-text-danger)'
            : 'var(--token-text-primary)',
      }}
    >
      {formatCurrency(balance)}
    </span>
  );
});
BalanceCell.displayName = 'BalanceCell';

// Actions Cell using Radix DropdownMenu Portal
interface ActionsCellData {
  onQabd: (emp: EmployeeSummaryRow) => void;
  onSarf: (emp: EmployeeSummaryRow) => void;
  onTaswiyaQabd: (emp: EmployeeSummaryRow) => void;
  onTaswiyaSarf: (emp: EmployeeSummaryRow) => void;
  onViewProfile: (employeeId: number) => void;
}
const ActionsCell = React.memo(
  ({ rowData, columnData }: CellProps<EmployeeSummaryRow, ActionsCellData>) => {
    return (
      <div
        style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          pointerEvents: 'auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => columnData?.onViewProfile(rowData.employee_id)}
          title="عرض كشف الحساب"
          className="inline-flex items-center justify-center rounded p-1.5 text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150"
        >
          <Edit3 size={14} />
        </button>

        <button
          type="button"
          onClick={() => columnData?.onQabd(rowData)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded border border-status-success-border text-status-success-text bg-status-success-bg hover:opacity-80 transition-opacity cursor-pointer"
        >
          <TrendingUp size={12} />
          قبض
        </button>

        <button
          type="button"
          onClick={() => columnData?.onSarf(rowData)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded border border-status-danger-border text-status-danger-text bg-status-danger-bg hover:opacity-80 transition-opacity cursor-pointer"
        >
          <TrendingDown size={12} />
          صرف
        </button>

        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded border border-border text-text-primary bg-background hover:bg-muted/40 transition-colors cursor-pointer"
            >
              تسوية
              <ChevronDown size={11} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[9999] min-w-[130px] bg-card border border-border shadow-xl">
            <DropdownMenuItem
              className="flex items-center gap-2 text-xs font-semibold text-status-success-text cursor-pointer hover:bg-status-success-bg/20"
              onClick={() => columnData?.onTaswiyaQabd(rowData)}
            >
              <TrendingUp size={12} />
              تسوية قبض
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-xs font-semibold text-status-danger-text cursor-pointer hover:bg-status-danger-bg/20"
              onClick={() => columnData?.onTaswiyaSarf(rowData)}
            >
              <TrendingDown size={12} />
              تسوية صرف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);
ActionsCell.displayName = 'ActionsCell';

// ─── Main Component ───────────────────────────────────────────────────────────
const AllEmployeesPage = () => {
  const navigate = useNavigate();
  const openModal = useModalStore((s) => s.openModal);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    applyPageBackground('employees');
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useGetEmployeesSummary(debouncedSearch || undefined);
  const employees = data?.employees ?? [];

  // Handlers
  const handleEmployeeClick = (employeeId: number) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const openQabd = (emp?: EmployeeSummaryRow) =>
    openModal('unifiedTransaction', {
      defaultFromCardType: 'employee',
      defaultFromAccountId: emp ? String(emp.employee_id) : undefined,
      defaultToCardType: 'cashbox',
      lockDirection: true,
      title: 'سند قبض',
    });

  const openSarf = (emp?: EmployeeSummaryRow) =>
    openModal('unifiedTransaction', {
      defaultFromCardType: 'cashbox',
      defaultToCardType: 'employee',
      defaultToAccountId: emp ? String(emp.employee_id) : undefined,
      lockDirection: true,
      title: 'سند صرف',
    });

  const openTaswiyaQabd = (emp?: EmployeeSummaryRow) =>
    openModal('unifiedTransaction', {
      defaultFromCardType: 'settlement',
      defaultToCardType: 'employee',
      defaultToAccountId: emp ? String(emp.employee_id) : undefined,
      lockDirection: true,
      title: 'تسوية قبض',
    });

  const openTaswiyaSarf = (emp?: EmployeeSummaryRow) =>
    openModal('unifiedTransaction', {
      defaultFromCardType: 'employee',
      defaultFromAccountId: emp ? String(emp.employee_id) : undefined,
      defaultToCardType: 'settlement',
      lockDirection: true,
      title: 'تسوية صرف',
    });

  // Calculate Totals
  const displayTotals = useMemo(() => {
    const totalDebit = employees.reduce((sum, emp) => sum + (Number(emp.total_debit) || 0), 0);
    const totalCredit = employees.reduce((sum, emp) => sum + (Number(emp.total_credit) || 0), 0);
    const totalBalance = employees.reduce((sum, emp) => sum + (Number(emp.balance) || 0), 0);
    return { totalDebit, totalCredit, totalBalance, count: employees.length };
  }, [employees]);

  // Define Columns for HuloolDataGrid (RTL order - first is rightmost)
  const columns = useMemo((): HuloolGridColumn<EmployeeSummaryRow>[] => [
    {
      id: 'display_name',
      key: 'display_name',
      title: 'الموظف',
      type: 'custom',
      component: EmployeeNameCell as React.ComponentType<CellProps<EmployeeSummaryRow>>,
      columnData: { onEmployeeClick: handleEmployeeClick },
      grow: 2,
    },
    {
      id: 'phone',
      key: 'phone',
      title: 'رقم الجوال',
      type: 'custom',
      component: PhoneCell as React.ComponentType<CellProps<EmployeeSummaryRow>>,
      columnData: { onWhatsApp: handleWhatsApp },
      grow: 1,
    },
    {
      id: 'total_debit',
      key: 'total_debit',
      title: 'إجمالي المدين',
      type: 'custom',
      component: DebitCell,
      grow: 1,
      cellClassName: () => 'emp-debit-cell',
    },
    {
      id: 'total_credit',
      key: 'total_credit',
      title: 'إجمالي الدائن',
      type: 'custom',
      component: CreditCell,
      grow: 1,
      cellClassName: () => 'emp-credit-cell',
    },
    {
      id: 'balance',
      key: 'balance',
      title: 'الرصيد',
      type: 'custom',
      component: BalanceCell,
      grow: 1,
    },
    {
      id: 'actions',
      key: 'employee_id',
      title: 'الإجراءات',
      type: 'custom',
      component: ActionsCell as React.ComponentType<CellProps<EmployeeSummaryRow>>,
      columnData: {
        onQabd: openQabd,
        onSarf: openSarf,
        onTaswiyaQabd: openTaswiyaQabd,
        onTaswiyaSarf: openTaswiyaSarf,
        onViewProfile: handleEmployeeClick,
      },
      width: 270,
      grow: 0,
    },
  ], [handleEmployeeClick, handleWhatsApp]);

  return (
    <div className="space-y-3" dir="rtl">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="flex justify-between items-center py-1">
        <div className="flex items-center gap-2">
          <h5 className="mb-0 text-primary font-bold" style={{ fontSize: '1.1rem' }}>
            جميع الموظفين
          </h5>

          <Button
            variant="outline-success"
            size="sm"
            className="font-bold"
            onClick={() => openQabd()}
          >
            سند قبض
          </Button>

          <Button
            variant="outline-danger"
            size="sm"
            className="font-bold"
            onClick={() => openSarf()}
          >
            سند صرف
          </Button>

          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline-secondary" size="sm" className="font-bold">
                سند تسوية
                <ChevronDown size={12} className="ms-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[9999] min-w-[160px] bg-card border border-border shadow-xl">
              <DropdownMenuItem
                className="flex items-center gap-2 text-sm font-semibold text-text-primary cursor-pointer hover:bg-muted/50 py-2.5"
                onClick={() => openTaswiyaQabd()}
              >
                <TrendingUp size={14} className="text-status-success-text" />
                تسوية قبض
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 text-sm font-semibold text-text-primary cursor-pointer hover:bg-muted/50 py-2.5"
                onClick={() => openTaswiyaSarf()}
              >
                <TrendingDown size={14} className="text-status-danger-text" />
                تسوية صرف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative" style={{ minWidth: '240px' }}>
            <Search
              size={14}
              className="absolute text-text-secondary"
              style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              placeholder="البحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingRight: '32px' }}
            />
            {search && (
              <button
                type="button"
                className="absolute text-text-secondary p-0 hover:text-foreground transition-colors"
                style={{ left: '8px', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main DataGrid Component ────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <HuloolDataGrid
          data={employees}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا يوجد موظفون"
          showId={false}
          height="auto"
          minHeight={400}
        />
      </div>

      {/* ── Summary Totals Footer Row ────────────────────────────────────────── */}
      {!isLoading && employees.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-sm mt-2">
          <div className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center">
              <div className="flex justify-between items-center p-2 bg-primary text-white rounded font-bold">
                <span className="text-sm">الإجمالي ({displayTotals.count} موظف)</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
                <span className="text-text-secondary text-sm">إجمالي المدين:</span>
                <span className="font-bold text-status-danger-text">
                  {formatCurrency(displayTotals.totalDebit)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
                <span className="text-text-secondary text-sm">إجمالي الدائن:</span>
                <span className="font-bold text-status-success-text">
                  {formatCurrency(displayTotals.totalCredit)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-bg-surface-muted rounded">
                <span className="text-text-secondary text-sm">إجمالي الرصيد:</span>
                <span
                  className={`font-bold ${
                    displayTotals.totalBalance > 0
                      ? 'text-status-success-text'
                      : displayTotals.totalBalance < 0
                      ? 'text-status-danger-text'
                      : 'text-text-primary'
                  }`}
                >
                  {formatCurrency(displayTotals.totalBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column background colors styling */}
      <style>{`
        .dsg-cell.emp-debit-cell {
          background-color: var(--token-status-danger-bg, #fef2f2) !important;
        }
        .dsg-cell.emp-credit-cell {
          background-color: var(--token-status-success-bg, #f0fdf4) !important;
        }
      `}</style>
    </div>
  );
};

export default AllEmployeesPage;
