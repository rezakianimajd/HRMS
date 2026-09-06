import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';
import endpoints from '../api/endpoints';

const fetchGlobalSearch = async (q) => {
  const response = await axiosInstance.get(endpoints.globalSearch, { params: { q } });
  return response.data;
};

export const useGlobalSearch = (q) => {
  const trimmed = (q || '').trim();
  return useQuery({
    queryKey: ['global-search', trimmed],
    queryFn: () => fetchGlobalSearch(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 15 * 1000,
  });
};