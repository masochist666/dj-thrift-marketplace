import { useQuery, useMutation, useQueryClient } from 'react-query';
import { tracksAPI } from '../services/api';
import toast from 'react-hot-toast';

export function useTracks(params?: any) {
  return useQuery(
    ['tracks', params],
    () => tracksAPI.getTracks(params).then(res => res.data),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}

export function useTrack(id: string) {
  return useQuery(
    ['track', id],
    () => tracksAPI.getTrack(id).then(res => res.data),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  );
}

export function useCreateTrack() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: any) => tracksAPI.createTrack(data).then(res => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tracks']);
        toast.success('Track created successfully!');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create track');
      },
    }
  );
}

export function useUpdateTrack() {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, data }: { id: string; data: any }) => 
      tracksAPI.updateTrack(id, data).then(res => res.data),
    {
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries(['track', id]);
        queryClient.invalidateQueries(['tracks']);
        toast.success('Track updated successfully!');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update track');
      },
    }
  );
}

export function useDeleteTrack() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: string) => tracksAPI.deleteTrack(id).then(res => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tracks']);
        toast.success('Track deleted successfully!');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to delete track');
      },
    }
  );
}

export function usePublishTrack() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: string) => tracksAPI.publishTrack(id).then(res => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tracks']);
        toast.success('Track published successfully!');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to publish track');
      },
    }
  );
}

export function useInitUpload() {
  return useMutation(
    ({ trackId, data }: { trackId: string; data: any }) =>
      tracksAPI.initUpload(trackId, data).then(res => res.data),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to initialize upload');
      },
    }
  );
}

export function useCompleteUpload() {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ trackId, data }: { trackId: string; data: any }) =>
      tracksAPI.completeUpload(trackId, data).then(res => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tracks']);
        toast.success('Track uploaded successfully!');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to complete upload');
      },
    }
  );
}

export function useUserTracks(userId: string, params?: any) {
  return useQuery(
    ['user-tracks', userId, params],
    () => tracksAPI.getUserTracks(userId, params).then(res => res.data),
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    }
  );
}
