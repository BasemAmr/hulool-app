/**
 * Invoice Queries
 * 
 * This module replaces receivableQueries.ts for the new Invoice/Ledger system.
 * Invoices are the primary billing document, replacing Receivables.
 * 
 * @see api/types.ts for Invoice, InvoicePayment, and related types
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import type {
  Invoice,
  InvoicePaginatedData,
  InvoiceStats,
  InvoiceStatus,
  InvoicePaymentStatus,
  InvoicePayment,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  RecordInvoicePaymentPayload,
  RecordPaymentResponse,
  ApplyCreditToInvoicePayload,
  ApplyCreditResponse,
  Pagination
} from '../api/types';

// --- Constants ---
const INVOICES_PER_PAGE = 20;

// --- Types for API Responses ---
interface InvoiceListResponse {
  invoices?: Invoice[];
  data?: Invoice[];
  pagination: Pagination;
}

interface InvoiceFilters {
  page?: number;
  per_page?: number;
  status?: InvoiceStatus;
  payment_status?: InvoicePaymentStatus;
  client_id?: number;
  employee_user_id?: number;
  date_from?: string;
  date_to?: string;
  orderby?: 'created_at' | 'due_date' | 'total_amount';
  order?: 'asc' | 'desc';
  search?: string;
}

// --- API Functions ---

/**
 * Fetch invoices with optional filters and pagination
 */
const fetchInvoices = async (filters: InvoiceFilters = {}): Promise<InvoicePaginatedData> => {
  const params: Record<string, any> = {
    page: filters.page || 1,
    per_page: filters.per_page || INVOICES_PER_PAGE,
  };

  if (filters.status) params.status = filters.status;
  if (filters.payment_status) params.payment_status = filters.payment_status;
  if (filters.client_id) params.client_id = filters.client_id;
  if (filters.employee_user_id) params.employee_user_id = filters.employee_user_id;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.orderby) params.orderby = filters.orderby;
  if (filters.order) params.order = filters.order;
  if (filters.search) params.search = filters.search;

  const { data } = await apiClient.get<InvoiceListResponse>('/invoices', { params });

  // API returns data directly: { invoices: [...], pagination: {...} }
  // Not wrapped in { success: true, data: {...} }
  const invoices = data.invoices || [];

  return {
    invoices: invoices.map(normalizeInvoice),
    pagination: data.pagination,
  };
};

/**
 * Fetch paginated invoices for infinite scroll
 */
const fetchPaginatedInvoices = async ({
  pageParam = 1,
  filters = {}
}: {
  pageParam?: number;
  filters?: Omit<InvoiceFilters, 'page'>;
}): Promise<InvoicePaginatedData> => {
  return fetchInvoices({ ...filters, page: pageParam });
};

/**
 * Fetch a single invoice by ID
 */
const fetchInvoiceById = async (id: number): Promise<Invoice> => {
  const { data } = await apiClient.get<Invoice>(`/invoices/${id}`);

  // API returns invoice directly, not wrapped
  return normalizeInvoice(data);
};

/**
 * Fetch invoices for a specific client
 */
const fetchClientInvoices = async (clientId: number): Promise<Invoice[]> => {
  const { data } = await apiClient.get<InvoiceListResponse>('/invoices', {
    params: { client_id: clientId, per_page: 100 }
  });

  // API returns data directly: { invoices: [...], pagination: {...} }
  const invoices = data.invoices || [];
  return invoices.map(normalizeInvoice);
};

/**
 * Create a new invoice
 */
const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice> => {
  const { data } = await apiClient.post<Invoice>('/invoices', payload);

  // API returns invoice directly, not wrapped
  return normalizeInvoice(data);
};

/**
 * Update an existing invoice
 */
const updateInvoice = async ({ id, payload }: { id: number; payload: UpdateInvoicePayload }): Promise<Invoice> => {
  const { data } = await apiClient.put<Invoice>(`/invoices/${id}`, payload);

  // API returns invoice directly, not wrapped
  return normalizeInvoice(data);
};

/**
 * Delete an invoice (usually only for draft status)
 */
const deleteInvoice = async (id: number): Promise<void> => {
  await apiClient.delete(`/invoices/${id}`);
  // API returns success response directly
};

/**
 * Get invoice statistics
 */
const fetchInvoiceStats = async (): Promise<InvoiceStats> => {
  const { data } = await apiClient.get<InvoiceStats>('/invoices/stats');

  // API returns stats directly, not wrapped
  return data;
};

/**
 * Get overdue invoices
 */
const fetchOverdueInvoices = async (perPage: number = 50): Promise<Invoice[]> => {
  const { data } = await apiClient.get<InvoiceListResponse>('/invoices/overdue', {
    params: { per_page: perPage }
  });

  // API returns data directly: { invoices: [...], pagination: {...} }
  const invoices = data.invoices || [];
  return invoices.map(normalizeInvoice);
};

/**
 * Get payable invoices (unpaid/partial)
 */
const fetchPayableInvoices = async (clientId?: number): Promise<Invoice[]> => {
  const params: Record<string, any> = { per_page: 100 };
  if (clientId) params.client_id = clientId;

  const { data } = await apiClient.get<InvoiceListResponse | Invoice[]>('/invoices/payable', { params });

  // API returns either { invoices: [...] } or [...]
  let invoices: any[] = [];

  if (Array.isArray(data)) {
    invoices = data;
  } else if (data.invoices) {
    invoices = data.invoices;
  }

  return invoices.map(normalizeInvoice);
};

/**
 * Get payments for a specific invoice
 */
const fetchInvoicePayments = async (invoiceId: number): Promise<InvoicePayment[]> => {
  const { data } = await apiClient.get<InvoicePayment[]>(`/invoices/${invoiceId}/payments`);

  // API returns payments array directly, not wrapped
  return data;
};

/**
 * Record a payment on an invoice
 */
const recordInvoicePayment = async ({
  invoiceId,
  payload
}: {
  invoiceId: number;
  payload: RecordInvoicePaymentPayload;
}): Promise<RecordPaymentResponse> => {
  const { data } = await apiClient.post<RecordPaymentResponse>(
    `/invoices/${invoiceId}/payments`,
    payload
  );

  // API returns payment response directly, not wrapped
  return data;
};

/**
 * Apply credit to an invoice
 */
const applyCreditToInvoice = async ({
  invoiceId,
  payload
}: {
  invoiceId: number;
  payload: ApplyCreditToInvoicePayload;
}): Promise<ApplyCreditResponse> => {
  const { data } = await apiClient.post<ApplyCreditResponse>(
    `/invoices/${invoiceId}/apply-credit`,
    payload
  );

  // API returns credit response directly, not wrapped
  return data;
};

/**
 * Fetch current employee's invoices
 */
const fetchMyInvoices = async (filters: Omit<InvoiceFilters, 'employee_user_id'> = {}): Promise<InvoicePaginatedData> => {
  const params: Record<string, any> = {
    page: filters.page || 1,
    per_page: filters.per_page || INVOICES_PER_PAGE,
  };

  if (filters.status) params.status = filters.status;

  const { data } = await apiClient.get<InvoiceListResponse>('/invoices/employee/me', { params });

  // API returns data directly: { invoices: [...], pagination: {...} }
  const invoices = data.invoices || [];

  return {
    invoices: invoices.map(normalizeInvoice),
    pagination: data.pagination,
  };
};

/**
 * Fetch current employee's invoice stats
 */
const fetchMyInvoiceStats = async (): Promise<InvoiceStats> => {
  const { data } = await apiClient.get<InvoiceStats>('/invoices/employee/me/stats');

  // API returns stats directly, not wrapped
  return data;
};

// --- Utility Functions ---

/**
 * Normalize invoice data to ensure consistent field names
 * (API may return amount or total_amount, paid_amount or amount_paid, etc.)
 */
function normalizeInvoice(invoice: any): Invoice {
  return {
    ...invoice,
    id: Number(invoice.id),
    client_id: Number(invoice.client_id),
    task_id: invoice.task_id ? Number(invoice.task_id) : null,
    created_by: Number(invoice.created_by),
    // Normalize amount fields
    amount: Number(invoice.amount || invoice.total_amount || 0),
    total_amount: Number(invoice.total_amount || invoice.amount || 0),
    paid_amount: Number(invoice.paid_amount || invoice.amount_paid || 0),
    amount_paid: Number(invoice.amount_paid || invoice.paid_amount || 0),
    remaining_amount: Number(invoice.remaining_amount || invoice.amount_due ||
      (invoice.amount || invoice.total_amount || 0) - (invoice.paid_amount || invoice.amount_paid || 0)),
    amount_due: Number(invoice.amount_due || invoice.remaining_amount ||
      (invoice.amount || invoice.total_amount || 0) - (invoice.paid_amount || invoice.amount_paid || 0)),
    // Computed flags
    is_fully_paid: invoice.is_fully_paid ?? invoice.status === 'paid',
    is_partially_paid: invoice.is_partially_paid ?? invoice.status === 'partially_paid',
    is_overdue: invoice.is_overdue ?? invoice.status === 'overdue',
  };
}

// --- React Query Hooks ---

/**
 * Get invoices with optional filters
 */
export const useGetInvoices = (filters: InvoiceFilters = {}, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => fetchInvoices(filters),
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get invoices with infinite scroll pagination
 */
export const useGetInvoicesInfinite = (
  filters: Omit<InvoiceFilters, 'page'> = {},
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ['invoices', 'infinite', filters],
    queryFn: ({ pageParam }) => fetchPaginatedInvoices({ pageParam, filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get a single invoice by ID
 */
export const useGetInvoice = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoiceById(id),
    enabled: !!id && enabled,
    staleTime: 10 * 1000,
  });
};

/**
 * Get invoices for a specific client
 */
export const useGetClientInvoices = (clientId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', 'client', clientId],
    queryFn: () => fetchClientInvoices(clientId),
    enabled: !!clientId && enabled,
    staleTime: 10 * 1000,
  });
};

/**
 * Get invoice statistics
 */
export const useGetInvoiceStats = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', 'stats'],
    queryFn: fetchInvoiceStats,
    enabled,
    staleTime: 60 * 1000,
  });
};

/**
 * Get overdue invoices
 */
export const useGetOverdueInvoices = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', 'overdue'],
    queryFn: () => fetchOverdueInvoices(),
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get payable invoices for a client (or all if no clientId)
 */
export const useGetPayableInvoices = (clientId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', 'payable', clientId],
    queryFn: () => fetchPayableInvoices(clientId),
    enabled,
    staleTime: 0, // Always fresh when selecting invoice to pay
    gcTime: 0, // Don't cache - must always refetch
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch on window focus
    refetchOnReconnect: true, // Refetch when reconnecting
  });
};

/**
 * Get payments for an invoice
 */
export const useGetInvoicePayments = (invoiceId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', invoiceId, 'payments'],
    queryFn: () => fetchInvoicePayments(invoiceId),
    enabled: !!invoiceId && enabled,
    staleTime: 0,
  });
};

/**
 * Get current employee's invoices
 */
export const useGetMyInvoices = (filters: Omit<InvoiceFilters, 'employee_user_id'> = {}, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', 'employee', 'me', filters],
    queryFn: () => fetchMyInvoices(filters),
    enabled,
    staleTime: 30 * 1000,
  });
};

/**
 * Get current employee's invoice stats
 */
export const useGetMyInvoiceStats = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['invoices', 'employee', 'me', 'stats'],
    queryFn: fetchMyInvoiceStats,
    enabled,
    staleTime: 60 * 1000,
  });
};

/**
 * Get invoices from tasks assigned to current employee (for receivables page)
 */
export const useGetEmployeeReceivables = (filters: Omit<InvoiceFilters, 'employee_user_id'> = {}, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['invoices', 'employee', 'receivables', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, any> = {
        page: pageParam,
        per_page: filters.per_page || 20,
      };

      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const { data } = await apiClient.get<InvoiceListResponse>('/invoices/employee/receivables', { params });

      const invoices = data.invoices || [];

      return {
        invoices: invoices.map(normalizeInvoice),
        pagination: data.pagination,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
        return lastPage.pagination.current_page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000,
  });
};


// --- Mutation Hooks ---

/**
 * Create a new invoice
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (newInvoice) => {
      // Invalidate invoice lists
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Invalidate client-specific data
      queryClient.invalidateQueries({ queryKey: ['invoices', 'client', newInvoice.client_id] });
      queryClient.invalidateQueries({ queryKey: ['account', 'client', newInvoice.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client', newInvoice.client_id] });

      // Invalidate summary data
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['account', 'clients'] });

      // Invalidate tasks (new invoice might affect task completion)
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Invalidate employee data
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });

      // Invalidate receivables for old system
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
    },
  });
};

/**
 * Update an invoice
 */
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInvoice,
    onSuccess: (updatedInvoice) => {
      // Invalidate specific invoice
      queryClient.invalidateQueries({ queryKey: ['invoice', updatedInvoice.id] });

      // Invalidate invoice lists
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Invalidate client-specific data
      queryClient.invalidateQueries({ queryKey: ['invoices', 'client', updatedInvoice.client_id] });
      queryClient.invalidateQueries({ queryKey: ['account', 'client', updatedInvoice.client_id] });

      // Invalidate summary data
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Invalidate employee data
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Delete an invoice
 */
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      // Invalidate all invoice-related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Invalidate employee data
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Record a payment on an invoice
 */
export const useRecordInvoicePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordInvoicePayment,
    onSuccess: (response) => {
      // Invalidate specific invoice
      queryClient.invalidateQueries({ queryKey: ['invoice', response.invoice_id], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['invoices', response.invoice_id, 'payments'], refetchType: 'active' });

      // Invalidate invoice lists - must refetch immediately
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'active' });

      // Invalidate payable invoices specifically
      queryClient.invalidateQueries({ queryKey: ['invoices', 'payable'], refetchType: 'all' });

      // Invalidate account/ledger data
      queryClient.invalidateQueries({ queryKey: ['account'], refetchType: 'active' });

      // Invalidate summary data
      queryClient.invalidateQueries({ queryKey: ['clients'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['client'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });

      // Invalidate tasks (payment affects task completion status)
      queryClient.invalidateQueries({ queryKey: ['tasks'], refetchType: 'active' });

      // Invalidate employee data
      queryClient.invalidateQueries({ queryKey: ['employee'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['employees'], refetchType: 'active' });

      // Invalidate receivables (for old system compatibility)
      queryClient.invalidateQueries({ queryKey: ['receivables'], refetchType: 'active' });
    },
  });
};

/**
 * Apply credit to an invoice
 */
export const useApplyCreditToInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyCreditToInvoice,
    onSuccess: (response) => {
      // Invalidate specific invoice
      queryClient.invalidateQueries({ queryKey: ['invoice', response.invoice_id] });

      // Invalidate invoice lists
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Invalidate credit data
      queryClient.invalidateQueries({ queryKey: ['clientCredits'] });

      // Invalidate account/ledger data
      queryClient.invalidateQueries({ queryKey: ['account'] });

      // Invalidate summary data
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// --- Query Key Factories ---
// Useful for consistent query key patterns across the app

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters: InvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  infinite: (filters: Omit<InvoiceFilters, 'page'>) => [...invoiceKeys.all, 'infinite', filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: number) => ['invoice', id] as const,
  client: (clientId: number) => [...invoiceKeys.all, 'client', clientId] as const,
  payments: (invoiceId: number) => [...invoiceKeys.all, invoiceId, 'payments'] as const,
  stats: () => [...invoiceKeys.all, 'stats'] as const,
  overdue: () => [...invoiceKeys.all, 'overdue'] as const,
  payable: (clientId?: number) => [...invoiceKeys.all, 'payable', clientId] as const,
  myInvoices: (filters?: Omit<InvoiceFilters, 'employee_user_id'>) =>
    [...invoiceKeys.all, 'employee', 'me', filters] as const,
  myStats: () => [...invoiceKeys.all, 'employee', 'me', 'stats'] as const,
};
