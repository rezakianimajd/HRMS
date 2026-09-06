import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';
import endpoints from '../api/endpoints';

const fetchAssets = async () => (await axiosInstance.get(endpoints.assets.list)).data;
const fetchChecklists = async (params = {}) => (await axiosInstance.get(endpoints.lifecycleChecklists.list, { params })).data;
const fetchCalendarFeed = async (params = {}) => (await axiosInstance.get(endpoints.calendarEvents.feed, { params })).data;

export const useAssets = () =>
  useQuery({ queryKey: ['assets'], queryFn: fetchAssets });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => axiosInstance.post(endpoints.assets.list, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
};

export const useReturnAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => axiosInstance.post(endpoints.assets.return(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
};

export const useChecklists = (params) =>
  useQuery({ queryKey: ['lifecycle-checklists', params], queryFn: () => fetchChecklists(params) });

export const useCreateChecklist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => axiosInstance.post(endpoints.lifecycleChecklists.list, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lifecycle-checklists'] }),
  });
};

export const useToggleChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ checklistId, itemId }) =>
      axiosInstance.post(endpoints.lifecycleChecklists.toggleItem(checklistId), { item_id: itemId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lifecycle-checklists'] }),
  });
};

export const useCalendarFeed = (params) =>
  useQuery({ queryKey: ['calendar-feed', params], queryFn: () => fetchCalendarFeed(params) });

export const useCreateCalendarEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => axiosInstance.post(endpoints.calendarEvents.list, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-feed'] }),
  });
};