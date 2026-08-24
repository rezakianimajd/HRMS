import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';

const fetchDocsByEmployee = async (employeeId) => {
  const response = await axiosInstance.get(`/documents/employee/${employeeId}/`);
  return response.data;
};

const fetchDocumentTypes = async () => {
  const response = await axiosInstance.get('/documents/types/');
  return response.data;
};

const uploadDocument = async (formData) => {
  const response = await axiosInstance.post('/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

const deleteDocument = async (id) => {
  const response = await axiosInstance.delete(`/documents/${id}/`);
  return response.data;
};

export const useDocuments = (employeeId) => {
  return useQuery({
    queryKey: ['documents', employeeId],
    queryFn: () => fetchDocsByEmployee(employeeId),
    enabled: !!employeeId,
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
      queryClient.invalidateQueries({ queryKey: ['documents', data.employee] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};