import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Client } from '@/api/types';
import Button from '@/shared/ui/primitives/Button';
import WhatsAppIcon from '@/shared/ui/icons/WhatsAppIcon';
import { Plus, Download, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  buildSettlementQabdPreset,
  buildSettlementSarfPreset,
} from '@/features/financials/utils/settlementPresets';

type ProfileViewMode = 'general' | 'tasks' | 'receivables';

interface ClientProfileHeaderProps {
  client: Client;
  mode: ProfileViewMode;
  onAddTask: () => void;
  onAddInvoice: () => void;
  onAddCredit: () => void;
  // --- MODIFIED PROPS ---
  onExportStatement: () => void;
  onExportTasks: () => void;
  onExportCredits: () => void;
  isExporting: boolean;
  // --- END MODIFIED PROPS ---
}

const ClientProfileHeader = ({ 
  client, 
  mode, 
  onAddTask, 
  onAddInvoice, 
  onAddCredit,
  onExportStatement,
  onExportTasks,
  onExportCredits,
  isExporting,
}: ClientProfileHeaderProps) => {
  const { t } = useTranslation();
  const openModal = useModalStore(s => s.openModal);

  // `object` not `Record<string, unknown>`: the settlement presets are typed interfaces with
  // no index signature, which Record<string, unknown> rejects.
  const openUnified = (overrides: object) =>
    openModal('unifiedTransaction', { lockDirection: true, ...overrides });

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm mb-2">
      <div className="py-2 px-3">
        {/* Narrow: stacked rows so the button cluster wraps instead of overflowing.
            lg+: one row, exactly as before — the identity block is lifted back out of
            flow (absolute) and the remaining two groups sit at either end. */}
        <div className="relative flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">

          {/* Left: Action Buttons and Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Add Task Button */}
            <Button size="sm" onClick={onAddTask} className="hover:scale-105 transition-transform">
              <Plus size={16} className="me-1"/> {t('clientProfile.addTask')}
            </Button>

            {/* Navigation Mode Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1.5 text-sm border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors">
                  {mode === 'general' && t('clientProfile.viewModeGeneral')}
                  {mode === 'tasks' && t('clientProfile.viewModeTasks')}
                  {mode === 'receivables' && t('clientProfile.viewModeReceivables')}
                  <span className="ms-1">▼</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuItem asChild className={mode === 'general' ? 'bg-accent' : ''}>
                  <Link to={`/clients/${client.id}?mode=general`}>
                    {t('clientProfile.viewModeGeneral')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={mode === 'tasks' ? 'bg-accent' : ''}>
                  <Link to={`/clients/${client.id}?mode=tasks`}>
                    {t('clientProfile.viewModeTasks')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={mode === 'receivables' ? 'bg-accent' : ''}>
                  <Link to={`/clients/${client.id}?mode=receivables`}>
                    {t('clientProfile.viewModeReceivables')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Receivable/Credit Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1.5 text-sm border border-status-success-border text-status-success-text rounded-md hover:bg-status-success-bg transition-colors">
                  <Plus size={16} className="me-1 inline"/> إضافة
                  <span className="ms-1">▼</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuItem onClick={onAddInvoice} className="text-end">
                  {/* key is absent from ar.json — i18next has no fallback key here, so it
                      rendered the literal string "clientProfile.addInvoice". Inline default
                      matches the house pattern in ClientProfilePage (t(key, 'arabic default')). */}
                  {t('clientProfile.addInvoice', 'إضافة فاتورة')}<Plus size={14} className="me-2"/>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddCredit} className="text-end">
                  إضافة رصيد<Plus size={14} className="me-2"/>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Transaction Buttons */}
            {/* سند قبض */}
            <Button
              size="sm"
              variant="outline-success"
              className="font-bold flex items-center gap-1"
              onClick={() => openUnified({
                defaultFromCardType: 'client',
                defaultFromAccountId: String(client.id),
                defaultToCardType: 'cashbox',
                title: 'سند قبض',
              })}
            >
              <TrendingUp size={16} />
              سند قبض
            </Button>

            {/* سند صرف */}
            <Button
              size="sm"
              variant="outline-danger"
              className="font-bold flex items-center gap-1"
              onClick={() => openUnified({
                defaultFromCardType: 'cashbox',
                defaultToCardType: 'client',
                defaultToAccountId: String(client.id),
                title: 'سند صرف',
              })}
            >
              <TrendingDown size={16} />
              سند صرف
            </Button>

            {/* سند تسوية */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="font-bold flex items-center gap-1"
                >
                  <span>سند تسوية</span>
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-right">
                <DropdownMenuItem
                  className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-success-text font-bold"
                  onClick={() => openUnified(
                    // Standard تسوية preset: قبض for a client = FROM client (credit, debt down) TO settlement.
                    buildSettlementQabdPreset({ kind: 'client', id: String(client.id) }))}
                >
                  <span>تسوية قبض</span>
                  <TrendingUp size={16} className="text-status-success-text" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex flex-row-reverse justify-end gap-2 text-status-danger-text font-bold"
                  onClick={() => openUnified(
                    // Standard تسوية preset: صرف for a client = FROM settlement TO client (debit, debt up).
                    buildSettlementSarfPreset({ kind: 'client', id: String(client.id) }))}
                >
                  <span>تسوية صرف</span>
                  <TrendingDown size={16} className="text-status-danger-text" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Dropdown */}
            {(mode === 'receivables' || mode === 'tasks') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-2 py-1 text-xs border border-border-strong text-text-secondary rounded-md hover:bg-bg-surface-muted transition-colors disabled:opacity-50"
                    disabled={isExporting}
                  >
                    <Download size={14} className="me-1" />
                    {isExporting ? 'جاري...' : 'تصدير'}
                    <span className="ms-1">▼</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px]">
                  {mode === 'receivables' && (
                    <>
                      <DropdownMenuItem onClick={onExportStatement} className="text-end">
                        <span className="text-success me-2">📊</span> كشف الحساب (Excel)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onExportCredits} className="text-end">
                        <span className="text-info me-2">💰</span> تقرير الائتمانات (Excel)
                      </DropdownMenuItem>
                    </>
                  )}
                  {mode === 'tasks' && (
                    <DropdownMenuItem onClick={onExportTasks} className="text-end">
                      <span className="text-primary me-2">📋</span> تقرير المهام (Excel)
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Center: Client Info — order-first on narrow so identity leads the stack;
              at lg+ it is absolutely centred again (order is ignored once out of flow).
              min-w-0 + truncate let a long name ellipsis instead of pushing the buttons. */}
          <div className="order-first flex items-center min-w-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            {mode === 'receivables' && (
              <span className="shrink-0 font-bold text-text-primary me-1.5 text-base">
                كشف الحساب -
              </span>
            )}
            <span className="truncate font-bold text-text-primary me-3 text-base">
              {client.name}
            </span>
            <span className="shrink-0 text-text-primary me-2 text-sm">
              {client.phone}
            </span>
            <a
              href={`https://wa.me/966${client.phone.substring(1)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-status-success-text hover:scale-110 transition-transform"
            >
              <WhatsAppIcon size={18} />
            </a>
          </div>

          {/* DEAD: "الرصيد المتاح" removed - it rendered ٠٫٠٠ ر.س. for every client because the
              credits endpoint returns 0 once allocations are unused. The private
              ClientCreditBalance component above is now dead with it. */}

        </div>
      </div>
    </div>
  );
};

export default ClientProfileHeader;