import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';

/** شناسهٔ عددی معتبر (جلوگیری از درخواست‌هایی مثل /documents/employee/undefined/). */
const hasNumericId = (value) => /^\d+$/.test(String(value ?? ''));

const fetchDocsByEmployee = async (employeeId) => {
  const response = await axiosInstance.get(`/documents/employee/${employeeId}/`);
  return response.data;
};

const fetchDocumentTypes = async () => {
  const response = await axiosInstance.get('/documents/types/');
  return response.data;
};

const uploadDocument = async (formData) => {
  // Content-Type توسط مرورگر (به‌همراه boundary) تنظیم می‌شود؛ تعیین دستی آن
  // باعث خطای تجزیهٔ multipart در سرور و «ذخیره نشدن» مدرک می‌شد.
  // مهلت بلندتر برای آپلود اسکن‌های حجیم در پروندهٔ پرسنلی.
  const response = await axiosInstance.post('/documents/', formData, {
    timeout: 5 * 60 * 1000,
  });
  return response.data;
};

const deleteDocument = async (id) => {
  const response = await axiosInstance.delete(`/documents/${id}/`);
  return response.data;
};

export const useDocuments = (employeeId) => {
  return useQuery({
    queryKey: ['documents', String(employeeId ?? '')],
    queryFn: () => fetchDocsByEmployee(employeeId),
    enabled: hasNumericId(employeeId),
  });
};

export const useDocumentTypes = () => {
  return useQuery({
    queryKey: ['document-types'],
    queryFn: fetchDocumentTypes,
    staleTime: 10 * 60 * 1000,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: (data) => {
      // شناسهٔ پرسنل ممکن است رشته یا عدد باشد؛ کلیدها نرمال‌شده‌اند و
      // پیشوند ['documents'] همهٔ فهرست‌های مدارک را تازه می‌کند.
      if (data?.employee) {
        queryClient.invalidateQueries({ queryKey: ['documents', String(data.employee)] });
      }
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      queryClient.invalidateQueries({ queryKey: ['dms-documents'] });
      queryClient.invalidateQueries({ queryKey: ['dms-stats'] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dms-documents'] });
      queryClient.invalidateQueries({ queryKey: ['dms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dms-folders'] });
    },
  });
};