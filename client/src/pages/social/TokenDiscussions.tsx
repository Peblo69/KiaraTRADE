import React from 'react';
import { TokenDiscussions as TokenDiscussionsComponent } from '@/components/social/TokenDiscussions';
import { useSocialFeatures } from "@/hooks/use-social-features";

const TokenDiscussions: React.FC = () => {
  const { discussions, addDiscussion, voteDiscussion } = useSocialFeatures("default");

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-purple-100 mb-8">Token Discussions</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <TokenDiscussionsComponent
          tokenAddress="default"
          discussions={discussions || []}
          onAddDiscussion={addDiscussion.mutate}
          onUpvote={(id) => voteDiscussion.mutate({ discussionId: id, voteType: 'up' })}
          onDownvote={(id) => voteDiscussion.mutate({ discussionId: id, voteType: 'down' })}
        />
      </div>
    </div>
  );
};

export default TokenDiscussions;
