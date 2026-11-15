import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';

/** شناسهٔ عددی معتبر (جلوگیری از درخواست با employee=undefined). */
const hasNumericId = (value) => /^\d+$/.test(String(value ?? ''));

const normalizeList = (data) => (Array.isArray(data) ? data : (data?.results || []));

const fetchFamilyMembers = async (employeeId) => {
  const response = await axiosInstance.get('/family-members/', { params: { employee: employeeId } });
  return normalizeList(response.data);
};

const saveFamilyMember = async ({ id, employee, attachment, remove_attachment, ...payload }) => {
  const hasFile = attachment instanceof File;
  let body = { ...payload, employee };
  if (hasFile || remove_attachment) {
    body = new FormData();
    body.append('employee', employee);
    Object.entries(payload).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'boolean') body.append(key, value ? 'true' : 'false');
      else body.append(key, value);
    });
    if (hasFile) body.append('attachment', attachment);
    if (remove_attachment) body.append('remove_attachment', 'true');
  }
  const response = id
    ? await axiosInstance.patch(`/family-members/${id}/`, body)
    : await axiosInstance.post('/family-members/', body);
  return response.data;
};

const deleteFamilyMember = async (id) => {
  const response = await axiosInstance.delete(`/family-members/${id}/`);
  return response.data;
};

const syncFamilyFromInsurance = async (employeeId) => {
  const response = await axiosInstance.post('/family-members/sync-from-insurance/', { employee: employeeId });
  return response.data;
};

export const useFamilyMembers = (employeeId) => useQuery({
  queryKey: ['family-members', String(employeeId ?? '')],
  queryFn: () => fetchFamilyMembers(employeeId),
  enabled: hasNumericId(employeeId),
  staleTime: 30 * 1000,
});

export const useSaveFamilyMember = (employeeId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members', String(employeeId ?? '')] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['employee', String(employeeId ?? '')] });
    },
  });
};

export const useDeleteFamilyMember = (employeeId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
};

export const useSyncFamilyFromInsurance = (employeeId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncFamilyFromInsurance(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
};
