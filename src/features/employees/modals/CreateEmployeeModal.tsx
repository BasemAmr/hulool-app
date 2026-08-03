import React from 'react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import EmployeeForm from '@/features/employees/forms/EmployeeForm';
import { useCreateEmployee } from '@/features/employees/api/userQueries';
import { useModalStore } from '@/shared/stores/modalStore';
import type { CreateEmployeeAccountRequest } from '@/api/types';
import { useToast } from '@/shared/hooks/useToast';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onSubmit?: (data: CreateEmployeeAccountRequest) => Promise<any>;
  isLoading?: boolean;
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  onSubmit,
  isLoading: propIsLoading = false,
}) => {
  const toast = useToast();
  const openModal = useModalStore((state) => state.openModal);
  const createEmployeeMutation = useCreateEmployee();

  const handleFormSubmit = async (data: CreateEmployeeAccountRequest) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
        onClose();
        return;
      }

      // Default creation flow via API mutation
      const result = await createEmployeeMutation.mutateAsync(data as any);
      toast.success('تم إنشاء حساب الموظف بنجاح');
      onClose();

      // If response includes login credentials, present credentials modal
      if (result && (result as any).credentials) {
        openModal('employeeCredentials', { credentials: (result as any).credentials });
      }
    } catch (err: any) {
      console.error('Failed to create employee:', err);
      const msg = err?.response?.data?.message || err?.message || 'فشل إنشاء حساب الموظف';
      toast.error(msg);
    }
  };

  const isLoading = propIsLoading || createEmployeeMutation.isPending;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة موظف جديد"
      className="max-w-lg"
    >
      <div className="p-6">
        <EmployeeForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          onCancel={onClose}
          isAdmin={isAdmin}
        />
      </div>
    </BaseModal>
  );
};

export default CreateEmployeeModal;
