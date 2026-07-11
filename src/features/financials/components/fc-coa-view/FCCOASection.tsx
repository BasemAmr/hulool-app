import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui/shadcn/dropdown-menu';
import { AccordionItem, AccordionContent } from '@/shared/ui/shadcn/accordion';
import { useModalStore } from '@/shared/stores/modalStore';
import FCCOACategory from './FCCOACategory';
import FCCOAAccountRow from './FCCOAAccountRow';
import type { COASectionData } from '@/features/financials/types/fcTypes';

interface FCCOASectionProps {
  section: COASectionData;
}

const cellBorder = 'border-e border-border-strong/80';
const firstCellBorder = 'border-s border-border-strong/80 border-e border-border-strong/80';
const lastCellBorder = 'border-e border-border-strong/80';

const FCCOASection: React.FC<FCCOASectionProps> = ({ section }) => {
  const openModal = useModalStore((state) => state.openModal);
  const { section: sectionDef, categorized, uncategorized, totalCount } = section;
  const Icon = sectionDef.icon;
  const isDebit = sectionDef.defaultNormalBalance === 'debit';

  return (
    <AccordionItem value={sectionDef.id} className="border-b border-border-default">
      <div className="relative">
        <AccordionPrimitive.Header asChild>
          <AccordionPrimitive.Trigger className="flex w-full items-center gap-4 py-4 ps-4 pe-14 text-sm font-medium transition-all hover:bg-bg-surface/50 cursor-pointer [&[data-state=open]>svg:first-child]:rotate-180">
            <ChevronDown className="h-5 w-5 shrink-0 text-text-primary transition-transform duration-200" />
            <span className="text-text-secondary shrink-0">
              <Icon size={20} />
            </span>
            <span className="text-lg font-bold text-text-primary truncate min-w-0">
              {sectionDef.label}
            </span>
            <span className="text-xs text-text-secondary font-medium shrink-0 px-2 py-0.5 rounded-full bg-bg-surface-muted border border-border-default">
              {isDebit ? 'مدين' : 'دائن'}
            </span>
            <span className="text-xs text-text-secondary shrink-0 whitespace-nowrap">
              ({totalCount} حساب)
            </span>
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <div className="absolute left-0 top-0 bottom-0 flex items-stretch border-s border-border-default">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 flex items-center text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors outline-none cursor-pointer">
                <Plus size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openModal('categoryManager', { sectionId: sectionDef.id })}
              >
                إضافة تصنيف
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openModal('treasuryCreateAccount', { initialSectionId: sectionDef.id })}
              >
                إضافة حساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <AccordionContent className="px-4 pb-4">
        <div className="border border-border-strong rounded-sm overflow-hidden">
          <div className="grid grid-cols-12 border-b border-border-strong bg-bg-secondary/80 text-sm font-bold text-text-secondary">
            <div className={`col-span-2 ${firstCellBorder} px-3 py-2.5`}>رقم الحساب</div>
            <div className={`col-span-5 ${cellBorder} px-3 py-2.5`}>الاسم</div>
            <div className={`col-span-3 ${cellBorder} px-3 py-2.5 text-left`}>الرصيد</div>
            <div className={`col-span-2 ${lastCellBorder} px-3 py-2.5 text-center`}>الإجراءات</div>
          </div>
          {categorized.map((cat) => (
            <FCCOACategory
              key={cat.subType}
              category={cat}
              sectionId={sectionDef.id}
            />
          ))}
          {uncategorized.length > 0 && (
            <div>
              <div className="grid grid-cols-12 border-b border-status-info-border bg-status-info-bg text-sm font-bold text-status-info-text">
                <div className="col-span-12 px-3 py-2">
                  بدون تصنيف
                  <span className="text-xs mr-2 opacity-70">
                    ({uncategorized.length})
                  </span>
                </div>
              </div>
              {uncategorized.map((account) => (
                <FCCOAAccountRow key={account.id} account={account} />
              ))}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default FCCOASection;
