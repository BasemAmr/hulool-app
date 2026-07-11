import { useState, useMemo } from 'react';
import { Shield, Trash2, UserPlus, Eye, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import { useGetTreasuryAccountPermissions, useSetTreasuryAccountPermission, useRemoveTreasuryAccountPermission } from '../api/treasuryQueries';
import { useGetEmployeesForSelection } from '@/features/employees/api/employeeQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/shadcn/table';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/ui/shadcn/alert-dialog';
import { Badge } from '@/shared/ui/shadcn/badge';
import Button from '@/shared/ui/primitives/Button';
import type { TreasuryAccountPermission } from '@/api/types';

interface PermissionsManagerProps {
  accountId: number;
  accountName: string;
  isCashBox?: boolean;
  primaryCustodianUserId?: number | null;
}

const PermissionsManager = ({
  accountId,
  accountName,
  isCashBox = false,
  primaryCustodianUserId = null,
}: PermissionsManagerProps) => {
  const { success, error: showError } = useToast();

  const {
    data: permissions = [],
    isLoading: isLoadingPermissions,
  } = useGetTreasuryAccountPermissions(accountId);

  const { data: employees = [], isLoading: isLoadingEmployees } = useGetEmployeesForSelection();

  const setPermissionMutation = useSetTreasuryAccountPermission();
  const removePermissionMutation = useRemoveTreasuryAccountPermission();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [newCanTransact, setNewCanTransact] = useState(false);
  const [newCanView, setNewCanView] = useState(true);

  const availableEmployees = useMemo(
    () => employees.filter(emp => !permissions.some(p => p.employee_user_id === emp.user_id)),
    [employees, permissions]
  );

  const handleAddPermission = async () => {
    if (!selectedEmployeeId) return;

    const employeeUserId = parseInt(selectedEmployeeId, 10);
    if (isNaN(employeeUserId)) return;

    try {
      await setPermissionMutation.mutateAsync({
        accountId,
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
      showError(err.message || 'فشل إضافة الصلاحية');
    }
  };

  const handleTogglePermission = async (
    permission: TreasuryAccountPermission,
    field: 'can_transact' | 'can_view'
  ) => {
    try {
      await setPermissionMutation.mutateAsync({
        accountId,
        data: {
          employee_user_id: permission.employee_user_id,
          [field]: !permission[field],
        },
      });
      success('تم تحديث الصلاحية');
    } catch (err: any) {
      showError(err.message || 'فشل تحديث الصلاحية');
    }
  };

  const handleRemovePermission = async (permissionId: number) => {
    try {
      await removePermissionMutation.mutateAsync(permissionId);
      success('تم حذف الصلاحية');
    } catch (err: any) {
      showError(err.message || 'فشل حذف الصلاحية');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Existing Permissions Table */}
      <Card className="border border-border-default bg-bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Shield size={14} />
            الصلاحيات الحالية
            {permissions.length > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                {permissions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingPermissions ? (
            <div className="text-center py-6 text-text-secondary text-sm">جاري التحميل...</div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-6 text-text-secondary text-sm">
              لا توجد صلاحيات مسجلة于此 الحساب
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-surface-muted/50">
                  <TableHead className="font-bold text-text-primary text-xs">الموظف</TableHead>
                  <TableHead className="font-bold text-text-primary text-xs text-center w-20">عرض</TableHead>
                  <TableHead className="font-bold text-text-primary text-xs text-center w-20">معاملات</TableHead>
                  <TableHead className="font-bold text-text-primary text-xs text-center w-14">حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((perm) => (
                  <TableRow key={perm.id} className="hover:bg-bg-surface-hover">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {perm.employee_display_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-text-primary">
                            {perm.employee_display_name || `موظف #${perm.employee_user_id}`}
                          </span>
                          {isCashBox && primaryCustodianUserId === perm.employee_user_id && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 w-fit border-status-warning-border text-status-warning-text bg-status-warning-bg">
                              أمين الصندوق
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(perm, 'can_view')}
                        disabled={setPermissionMutation.isPending}
                        className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          perm.can_view
                            ? 'bg-status-success-bg text-status-success-text border border-status-success-border hover:bg-status-success-bg/80'
                            : 'bg-bg-surface-muted text-text-muted border border-border-default hover:bg-bg-surface-hover'
                        }`}
                      >
                        <Eye size={12} />
                        {perm.can_view ? 'نعم' : 'لا'}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(perm, 'can_transact')}
                        disabled={setPermissionMutation.isPending}
                        className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          perm.can_transact
                            ? 'bg-status-success-bg text-status-success-text border border-status-success-border hover:bg-status-success-bg/80'
                            : 'bg-bg-surface-muted text-text-muted border border-border-default hover:bg-bg-surface-hover'
                        }`}
                      >
                        <ArrowLeftRight size={12} />
                        {perm.can_transact ? 'نعم' : 'لا'}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="p-1.5 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="حذف الصلاحية"
                          >
                            <Trash2 size={14} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الصلاحية</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف صلاحية <strong>{perm.employee_display_name}</strong> على هذا الحساب؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemovePermission(perm.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add New Permission Section */}
      <Card className="border border-border-default bg-bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <UserPlus size={14} />
            إضافة صلاحية جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingEmployees ? (
            <div className="text-center py-4 text-text-secondary text-sm">جاري تحميل الموظفين...</div>
          ) : availableEmployees.length === 0 ? (
            <div className="text-center py-4 text-text-secondary text-sm">
              جميع الموظفين لديهم صلاحيات بالفعل
            </div>
          ) : (
            <>
              {/* Employee Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary block">الموظف</label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="اختر موظف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((emp) => (
                      <SelectItem key={emp.user_id} value={String(emp.user_id)}>
                        {emp.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Permission Toggles */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewCanView(!newCanView)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors border ${
                    newCanView
                      ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                      : 'bg-bg-surface-muted text-text-muted border-border-default hover:bg-bg-surface-hover'
                  }`}
                >
                  <Eye size={14} />
                  صلاحية العرض
                </button>
                <button
                  type="button"
                  onClick={() => setNewCanTransact(!newCanTransact)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors border ${
                    newCanTransact
                      ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                      : 'bg-bg-surface-muted text-text-muted border-border-default hover:bg-bg-surface-hover'
                  }`}
                >
                  <ArrowLeftRight size={14} />
                  صلاحية المعاملات
                </button>
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
                <UserPlus size={14} className="ml-1" />
                إضافة الصلاحية
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsManager;
