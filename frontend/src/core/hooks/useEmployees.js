import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';
import endpoints from '../api/endpoints';

/**
 * Fetch employees list with optional filters.
 */
const fetchEmployees = async (params = {}) => {
  const response = await axiosInstance.get(endpoints.employees.list, { params });
  return response.data;
};

/**
 * Fetch a single employee by ID.
 */
const fetchEmployee = async (id) => {
  const response = await axiosInstance.get(endpoints.employees.detail(id));
  return response.data;
};

/**
 * Create a new employee.
 */
const createEmployee = async (data) => {
  const response = await axiosInstance.post(endpoints.employees.list, data);
  return response.data;
};

/**
 * Update an existing employee.
 */
const updateEmployee = async ({ id, data }) => {
  const response = await axiosInstance.patch(endpoints.employees.detail(id), data);
  return response.data;
};

/**
 * Delete (soft-delete) an employee.
 */
const deleteEmployee = async (id) => {
  const response = await axiosInstance.delete(endpoints.employees.detail(id));
  return response.data;
};

/**
 * Fetch dropdown data (departments, titles, locations, insurance lists).
 */
const fetchDropdownData = async (endpoint) => {
  const response = await axiosInstance.get(endpoint);
  return response.data;
};

// =============================================================================
// Custom Hooks
// =============================================================================

export const useEmployees = (filters = {}) => {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => fetchEmployees(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useEmployee = (id) => {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
    enabled: !!id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => fetchDropdownData('/departments/'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useJobTitles = () => {
  return useQuery({
    queryKey: ['job-titles'],
    queryFn: () => fetchDropdownData('/job-titles/'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useWorkLocations = () => {
  return useQuery({
    queryKey: ['work-locations'],
    queryFn: () => fetchDropdownData('/work-locations/'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useInsuranceLists = () => {
  return useQuery({
    queryKey: ['insurance-lists'],
    queryFn: () => fetchDropdownData('/insurance-lists/'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useContractTypes = () => {
  return useQuery({
    queryKey: ['contract-types'],
    queryFn: () => fetchDropdownData('/contract-types/'),
    staleTime: 5 * 60 * 1000,
  });
};
