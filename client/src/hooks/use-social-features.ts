import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useToast } from "@/hooks/use-toast";

interface WatchlistToken {
  token_address: string;
  notes?: string;
  alert_price?: number;
}

interface Discussion {
  id: number;
  title: string;
  content: string;
  user_id: number;
  token_address: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

export function useSocialFeatures(tokenAddress: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Watchlist Queries
  const { data: watchlist } = useQuery({
    queryKey: ['watchlist', tokenAddress],
    queryFn: async () => {
      const response = await axios.get(`/api/watchlist/${tokenAddress}`);
      return response.data;
    },
  });

  // Discussions Queries
  const { data: discussions } = useQuery({
    queryKey: ['discussions', tokenAddress],
    queryFn: async () => {
      const response = await axios.get(`/api/discussions/${tokenAddress}`);
      return response.data;
    },
  });

  // Watchlist Mutations
  const addToWatchlist = useMutation({
    mutationFn: async (data: WatchlistToken) => {
      const response = await axios.post('/api/watchlist', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['watchlist', tokenAddress]);
      toast({
        title: "Success",
        description: "Token added to watchlist",
      });
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (tokenAddress: string) => {
      const response = await axios.delete(`/api/watchlist/${tokenAddress}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['watchlist', tokenAddress]);
      toast({
        title: "Success",
        description: "Token removed from watchlist",
      });
    },
  });

  // Discussion Mutations
  const addDiscussion = useMutation({
    mutationFn: async (data: Omit<Discussion, 'id' | 'created_at' | 'upvotes' | 'downvotes'>) => {
      const response = await axios.post('/api/discussions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discussions', tokenAddress]);
      toast({
        title: "Success",
        description: "Discussion added successfully",
      });
    },
  });

  const voteDiscussion = useMutation({
    mutationFn: async ({ discussionId, voteType }: { discussionId: number; voteType: 'up' | 'down' }) => {
      const response = await axios.post(`/api/discussions/${discussionId}/vote`, { voteType });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discussions', tokenAddress]);
    },
  });

  return {
    watchlist,
    discussions,
    addToWatchlist,
    removeFromWatchlist,
    addDiscussion,
    voteDiscussion,
  };
}
