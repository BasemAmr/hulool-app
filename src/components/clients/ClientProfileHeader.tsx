import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
// import { useState, useRef, useEffect } from 'react';
// import { createPortal } from 'react-dom';
import type { Client } from '../../api/types';
import Button from '../ui/Button';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { Plus, Download, TrendingUp, TrendingDown } from 'lucide-react'; // For a generic export icon
import { useGetClientCredits } from '../../queries/clientCreditQueries';
import SaudiRiyalIcon from '../ui/SaudiRiyalIcon';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'; // Adjust path as needed

type ProfileViewMode = 'general' | 'tasks' | 'receivables';

interface ClientProfileHeaderProps {
  client: Client;
  mode: ProfileViewMode;
  onAddTask: () => void;
  onAddInvoice: () => void;
  onAddCredit: () => void;
  onAddSarfVoucher?: () => void;
  onAddQabdVoucher?: () => void;
  // --- MODIFIED PROPS ---
  onExportStatement: () => void;
  onExportTasks: () => void;
  onExportCredits: () => void;
  isExporting: boolean;
  // --- END MODIFIED PROPS ---
}

const ClientCreditBalance = ({ clientId }: { clientId: number }) => {
  const { data, isLoading } = useGetClientCredits(clientId);

  if (isLoading) {
    return <span className="text-black text-sm">Loading...</span>;
  }

  const balance = data?.balance || 0;

  return (
    <span className="flex items-center text-black font-bold">
      <SaudiRiyalIcon size={16} className="me-1" />
      {balance.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
    </span>
  );
};

const ClientProfileHeader = ({ 
  client, 
  mode, 
  onAddTask, 
  onAddInvoice, 
  onAddCredit,
  onAddSarfVoucher,
  onAddQabdVoucher,
  onExportStatement,
  onExportTasks,
  onExportCredits,
  isExporting,
}: ClientProfileHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm mb-2">
      <div className="py-2 px-3">
        <div className="flex justify-between items-center relative">
          
          {/* Left: Action Buttons and Dropdowns */}
          <div className="flex items-center gap-2">
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
                <button className="px-3 py-1.5 text-sm border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors">
                  <Plus size={16} className="me-1 inline"/> إضافة
                  <span className="ms-1">▼</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuItem onClick={onAddInvoice} className="text-end">
                  {t('clientProfile.addInvoice')}<Plus size={14} className="me-2"/>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddCredit} className="text-end">
                  إضافة رصيد<Plus size={14} className="me-2"/>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Voucher Buttons */}
            {onAddQabdVoucher && (
              <Button 
                size="sm" 
                onClick={onAddQabdVoucher}
                variant="outline-primary"
                className="font-bold"
              >
                <TrendingUp size={16} className="me-1 text-green-600" /> سند قبض
              </Button>
            )}
            {onAddSarfVoucher && (
              <Button 
                size="sm" 
                onClick={onAddSarfVoucher}
                variant="outline-primary"
                className="font-bold"
              >
                <TrendingDown size={16} className="me-1 text-red-600" /> سند صرف
              </Button>
            )}

            {/* Export Dropdown */}
            {(mode === 'receivables' || mode === 'tasks') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-2 py-1 text-xs border border-gray-400 text-gray-600 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
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

          {/* Center: Client Info */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <span className="font-bold text-black me-3 text-base">
              {client.name}
            </span>
            <span className="text-black me-2 text-sm">
              {client.phone}
            </span>
            <a 
              href={`https://wa.me/966${client.phone.substring(1)}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-green-600 hover:scale-110 transition-transform"
            >
              <WhatsAppIcon size={18} />
            </a>
          </div>

          {/* Right: Client Credit Balance */}
          <div className="flex items-center gap-2">
            <div className="text-end text-sm text-black">الرصيد المتاح</div>
            <ClientCreditBalance clientId={client.id} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default ClientProfileHeader;