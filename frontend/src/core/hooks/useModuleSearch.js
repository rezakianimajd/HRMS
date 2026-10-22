import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';
import endpoints from '../api/endpoints';

/**
 * جستجوی محدود به ماژول فعال.
 * خروجی API شامل results و sections است.
 */
export const useModuleSearch = (q, module) => {
  const trimmed = String(q || '').trim();
  const moduleKey = String(module || '').trim();
  return useQuery({
    queryKey: ['module-search', moduleKey, trimmed],
    queryFn: async () => {
      const response = await axiosInstance.get(endpoints.moduleSearch, {
        params: { q: trimmed, module: moduleKey },
      });
      return response.data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 15 * 1000,
  });
};
