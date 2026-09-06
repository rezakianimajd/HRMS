import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosConfig';
import endpoints from '../api/endpoints';

const fetchNotifications = async (limit = 20) => {
  const response = await axiosInstance.get(endpoints.notifications.list, {
    params: { page_size: limit },
  });
  // DRF paginated responses return { count, results } when PageNumberPagination
  // is active; normalize so callers always get a plain array.
  return Array.isArray(response.data) ? response.data : (response.data.results || []);
};

const fetchUnreadCount = async () => {
  const response = await axiosInstance.get(endpoints.notifications.unreadCount);
  return response.data.count ?? 0;
};

export const useNotifications = (limit = 20) => {
  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: () => fetchNotifications(limit),
    refetchInterval: 60 * 1000,
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 45 * 1000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => axiosInstance.post(endpoints.notifications.markRead(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => axiosInstance.post(endpoints.notifications.markAllRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};