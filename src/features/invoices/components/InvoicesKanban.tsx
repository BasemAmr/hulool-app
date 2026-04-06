import { useMemo } from 'react';
import { useGetInvoicesInfinite } from '@/features/invoices/api/invoiceQueries';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import Button from '@/shared/ui/primitives/Button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Spinner } from '@/shared/ui/shadcn/spinner';
import { Clock, DollarSign, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useModalStore } from '@/shared/stores/modalStore';
import SaudiRiyalIcon from '@/shared/ui/icons/SaudiRiyalIcon';
import type { Invoice } from '@/api/types';

interface InvoicesKanbanProps {
    search?: string;
    clientId?: string;
}

const KanbanColumn = ({
    title,
    icon: Icon,
    status,
    colorClass,
    bgClass,
    badgeVariant = "secondary",
    search,
    clientId
}: {
    title: string;
    icon: any;
    status: string;
    colorClass: string;
    bgClass: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
    search?: string;
    clientId?: string;
}) => {
    const openModal = useModalStore((state) => state.openModal);

    // Independent query for this column
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useGetInvoicesInfinite({
        status: status as any,
        search,
        client_id: clientId ? Number(clientId) : undefined,
        per_page: 10 // User requested 10 per page
    });

    const invoices = useMemo(
        () => data?.pages.flatMap((page) => page.invoices) || [],
        [data]
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className={`${bgClass} rounded-lg p-3 flex flex-col h-full min-h-0`}>
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <Icon size={16} className={colorClass} />
                    {title}
                </h3>
                <Badge variant={badgeVariant}>
                    {data?.pages[0]?.pagination.total || 0}
                </Badge>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-2 min-h-0">
                {isLoading && invoices.length === 0 ? (
                    <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                    </div>
                ) : (
                    invoices.map((invoice: Invoice) => (
                        <Card
                            key={invoice.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openModal('invoiceDetails', { invoiceId: invoice.id })}
                        >
                            <CardContent className="p-3">
                                <div className="text-xs text-text-primary/50 mb-1">#{invoice.id}</div>
                                <div className="font-medium text-sm text-text-primary mb-1 truncate">
                                    {invoice.client?.name || `عميل #${invoice.client_id}`}
                                </div>

                                {/* Status Specific Details */}
                                {status === 'partially_paid' ? (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-status-warning-text">
                                            {Math.round((Number(invoice.paid_amount) / Number(invoice.amount)) * 100)}%
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <span>{formatCurrency(Number(invoice.amount))}</span>
                                            <SaudiRiyalIcon size={10} />
                                        </div>
                                    </div>
                                ) : status === 'overdue' ? (
                                    <div className="flex items-center gap-1 text-sm text-status-danger-text">
                                        <Calendar size={12} />
                                        <span>{new Date(invoice.due_date).toLocaleDateString('en-CA')}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="font-bold">{formatCurrency(Number(invoice.amount))}</span>
                                        <SaudiRiyalIcon size={10} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {hasNextPage && (
                <div className="pt-3 flex-shrink-0">
                    <Button
                        onClick={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                        variant="outline-secondary"
                        size="sm"
                        className="w-full text-xs"
                    >
                        {isFetchingNextPage ? '...' : 'عرض 10 المزيد'}
                    </Button>
                </div>
            )}
        </div>
    );
};

const InvoicesKanban = ({ search, clientId }: InvoicesKanbanProps) => {
    return (
        <div className="grid grid-cols-4 gap-4 w-full h-full p-4 overflow-hidden">
            <KanbanColumn
                title="معلقة"
                icon={Clock}
                status="pending"
                colorClass="text-orange-500"
                bgClass="bg-muted/30"
                search={search}
                clientId={clientId}
            />
            <KanbanColumn
                title="جزئية"
                icon={DollarSign}
                status="partially_paid"
                colorClass="text-yellow-500"
                bgClass="bg-muted/30"
                search={search}
                clientId={clientId}
            />
            <KanbanColumn
                title="مدفوعة"
                icon={CheckCircle}
                status="paid"
                colorClass="text-status-success-text"
                bgClass="bg-status-success-bg/50"
                search={search}
                clientId={clientId}
            />
            <KanbanColumn
                title="متأخرة"
                icon={AlertCircle}
                status="overdue"
                colorClass="text-status-danger-text"
                bgClass="bg-status-danger-bg/50"
                badgeVariant="destructive"
                search={search}
                clientId={clientId}
            />
        </div>
    );
};

export default InvoicesKanban;
