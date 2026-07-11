import React, { useState } from 'react';
import { Shield, Plus, Trash2, User, Star } from 'lucide-react';
import BaseModal from '@/shared/ui/layout/BaseModal';
import Button from '@/shared/ui/primitives/Button';
import { useModalStore } from '@/shared/stores/modalStore';
import { useToast } from '@/shared/hooks/useToast';
import {
  useGetTreasuryAccountPermissions,
  useSetTreasuryAccountPermission,
  useRemoveTreasuryAccountPermission,
} from '../api/treasuryQueries';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import type { TreasuryAccount } from '../api/treasuryQueries';

interface TreasuryPermissionsModalProps {
  account: TreasuryAccount;
}

const TreasuryPermissionsModal = () => {
  const { success, error } = useToast();
  const { isOpen, modalType, props, closeModal } = useModalStore();

  const { account } = (props || {}) as TreasuryPermissionsModalProps;

  const isModalOpen = isOpen && modalType === 'treasuryPermissions';

  // Data queries
  const {
    data: permissions = [],
    isLoading: isLoadingPermissions,
  } = useGetTreasuryAccountPermissions(account?.id || 0);

  const { data: employees = [], isLoading: isLoadingEmployees } = useGetEmployeesForSelection();

  // Mutations
  const setPermissionMutation = useSetTreasuryAccountPermission();
  const removePermissionMutation = useRemoveTreasuryAccountPermission();

  // Determine if this is a cashbox and who the primary custodian is
  const isCashBox = account?.sub_type === 'cashbox';
  let primaryCustodianUserId: number | null = null;
  if (isCashBox && account?.metadata) {
    try {
      const metadata = typeof account.metadata === 'string' ? JSON.parse(account.metadata) : account.metadata;
      const empId = metadata?.employee_id;
      if (empId) {
        // Find the user_id for this employee
        const emp = employees.find((e: any) => e.id === empId);
        if (emp) {
          primaryCustodianUserId = emp.user_id;
        }
      }
    } catch (e) {
      // ignore parse error
    }
  }

  // New permission form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [newCanTransact, setNewCanTransact] = useState(false);
  const [newCanView, setNewCanView] = useState(true);

  const handleAddPermission = async () => {
    if (!selectedEmployeeId || !account) return;

    const employeeUserId = parseInt(selectedEmployeeId, 10);
    if (isNaN(employeeUserId)) return;

    // Check if permission already exists for this employee
    const existing = permissions.find(p => p.employee_user_id === employeeUserId);
    if (existing) {
      error('هذا الموظف لديه صلاحيات بالفعل');
      return;
    }

    try {
      await setPermissionMutation.mutateAsync({
        accountId: account.id,
        data: {
          employee_user_id: employeeUserId,
          can_transact: newCanTransact,
          can_view: newCanView,
        },
      });
      success('تمت إضافة الصلاحية بنجاح');
      setSelectedEmployeeId('');
      setNewCanTransact(false);
      setNewCanView(true);
    } catch (err: any) {
      error(err.message || 'فشل إضافة الصلاحية');
    }
  };

  const handleTogglePermission = async (
    permissionId: number,
    field: 'can_transact' | 'can_view',
    currentValue: boolean
  ) => {
    const permission = permissions.find(p => p.id === permissionId);
    if (!permission) return;

    try {
      await setPermissionMutation.mutateAsync({
        accountId: account.id,
        data: {
          employee_user_id: permission.employee_user_id,
          [field]: !currentValue,
        },
      });
      success('تم تحديث الصلاحية');
    } catch (err: any) {
      error(err.message || 'فشل تحديث الصلاحية');
    }
  };

  const handleRemovePermission = async (permissionId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الصلاحية؟')) return;

    try {
      await removePermissionMutation.mutateAsync(permissionId);
      success('تم حذف الصلاحية');
    } catch (err: any) {
      error(err.message || 'فشل حذف الصلاحية');
    }
  };

  // Filter out employees who already have permissions
  const availableEmployees = employees.filter(
    emp => !permissions.some(p => p.employee_user_id === emp.user_id)
  );

  if (!isModalOpen || !account) return null;

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title={`صلاحيات الحساب - ${account.name}`}
    >
      <div className="space-y-4" dir="rtl">
        {/* Existing Permissions List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Shield size={14} />
            الصلاحيات الحالية
          </h3>

          {isLoadingPermissions ? (
            <div className="text-center py-4 text-text-secondary text-sm">
              جاري التحميل...
            </div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-4 text-text-secondary text-sm">
              لا توجد صلاحيات مسجلة
            </div>
          ) : (
            <div className="space-y-2">
              {permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between gap-3 p-3 bg-bg-surface border border-border-default rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User size={14} className="text-text-secondary flex-shrink-0" />
                    <span className="text-sm text-text-primary truncate flex items-center gap-1">
                      {permission.employee_display_name || `موظف #${permission.employee_user_id}`}
                      {primaryCustodianUserId === permission.employee_user_id && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                          <Star size={10} />
                          أمين الصندوق
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Can Transact Toggle */}
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permission.can_transact}
                        onChange={() =>
                          handleTogglePermission(permission.id, 'can_transact', permission.can_transact)
                        }
                        className="w-3.5 h-3.5 rounded border-border-default text-primary focus:ring-primary"
                      />
                      <span className="text-text-secondary"> معاملات</span>
                    </label>

                    {/* Can View Toggle */}
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permission.can_view}
                        onChange={() =>
                          handleTogglePermission(permission.id, 'can_view', permission.can_view)
                        }
                        className="w-3.5 h-3.5 rounded border-border-default text-primary focus:ring-primary"
                      />
                      <span className="text-text-secondary"> عرض</span>
                    </label>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePermission(permission.id)}
                      className="p-1 rounded text-text-secondary hover:text-destructive transition-colors"
                      title="حذف الصلاحية"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Permission Section */}
        <div className="border-t border-border-default pt-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
            <Plus size={14} />
            إضافة صلاحية جديدة
          </h3>

          {isLoadingEmployees ? (
            <div className="text-center py-2 text-text-secondary text-sm">
              جاري تحميل الموظفين...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Employee Selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary block">
                  الموظف
                </label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="">اختر موظف...</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permission Toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCanTransact}
                    onChange={(e) => setNewCanTransact(e.target.checked)}
                    className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary"
                  />
                  <span className="text-text-primary">صلاحيات المعاملات</span>
                </label>

                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCanView}
                    onChange={(e) => setNewCanView(e.target.checked)}
                    className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary"
                  />
                  <span className="text-text-primary">صلاحية العرض</span>
                </label>
              </div>

              {/* Add Button */}
              <Button
                type="button"
                variant="primary"
                onClick={handleAddPermission}
                disabled={!selectedEmployeeId || setPermissionMutation.isPending}
                isLoading={setPermissionMutation.isPending}
                className="w-full"
              >
                <Plus size={14} className="ml-1" />
                إضافة الصلاحية
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="button" variant="outline-secondary" onClick={closeModal}>
            إغلاق
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TreasuryPermissionsModal;
