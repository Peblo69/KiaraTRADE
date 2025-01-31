import { FC, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface Discussion {
  id: number;
  userId: number;
  tokenAddress: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  username?: string;
}

interface TokenDiscussionsProps {
  tokenAddress: string;
  discussions: Discussion[];
  onAddDiscussion?: (discussion: Omit<Discussion, 'id' | 'createdAt'>) => void;
  onUpvote?: (discussionId: number) => void;
  onDownvote?: (discussionId: number) => void;
}

export const TokenDiscussions: FC<TokenDiscussionsProps> = ({
  tokenAddress,
  discussions,
  onAddDiscussion,
  onUpvote,
  onDownvote
}) => {
  const { toast } = useToast();
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '' });

  const handleSubmitDiscussion = () => {
    if (!newDiscussion.title || !newDiscussion.content) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    onAddDiscussion?.({
      userId: 1, // Replace with actual user ID
      tokenAddress,
      title: newDiscussion.title,
      content: newDiscussion.content,
      upvotes: 0,
      downvotes: 0
    });

    setNewDiscussion({ title: '', content: '' });
    setShowNewDiscussion(false);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/20">
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-purple-50">Discussions</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-400 hover:text-purple-300"
            onClick={() => setShowNewDiscussion(true)}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            New Discussion
          </Button>
        </div>
      </div>

      <div className="divide-y divide-purple-500/10">
        {discussions.map((discussion) => (
          <div
            key={discussion.id}
            className="p-4 hover:bg-purple-500/5 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-purple-100">
                  {discussion.title}
                </h3>
                <p className="text-sm text-purple-400 mt-1">
                  by {discussion.username || 'Anonymous'} • 
                  {formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpvote?.(discussion.id)}
                  className="text-green-400 hover:text-green-300"
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {discussion.upvotes}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownvote?.(discussion.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  {discussion.downvotes}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-purple-200">{discussion.content}</p>
          </div>
        ))}

        {discussions.length === 0 && (
          <div className="p-8 text-center text-purple-400">
            No discussions yet. Start one!
          </div>
        )}
      </div>
    </Card>
  );
};

export default TokenDiscussions;
