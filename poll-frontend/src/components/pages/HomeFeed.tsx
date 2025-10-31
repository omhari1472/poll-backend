'use client';

import { CheckCircle, Heart, Plus, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToastContext } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { CreatePollModal } from '@/components/ui/CreatePollModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { HomeFeedSkeleton } from '@/components/ui/Skeleton';
import { useLikePoll, usePolls, useRemoveVote, useUnlikePoll, useVoteOnPoll } from '@/hooks/usePolls';
import { useSocket } from '@/components/providers/SocketProvider';
import { Poll } from '@/types';

export function HomeFeed() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  
  const { success, error: showError } = useToastContext();
  const { joinPoll, isConnected } = useSocket();
  
  const { data: pollsData, isLoading, error, refetch } = usePolls({
    sortBy: 'newest',
    page,
    limit: 20,
  });

  const polls = (pollsData as any)?.data || [];
  const pagination = (pollsData as any)?.pagination;

  useEffect(() => {
    if (isConnected && polls.length > 0) {
      const pollIds = polls.map((poll: Poll) => poll.pollId);
      const uniquePollIds = Array.from(new Set(pollIds)) as string[];
      uniquePollIds.forEach((pollId: string) => {
        joinPoll(pollId);
      });
    }
  }, [polls.length, isConnected, joinPoll]);

  const voteMutation = useVoteOnPoll();
  const removeVoteMutation = useRemoveVote();
  const likeMutation = useLikePoll();
  const unlikeMutation = useUnlikePoll();

  const handleCreatePoll = () => {
    setIsCreateModalOpen(true);
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const poll = polls.find((p: Poll) => p.pollId === pollId);
      
      if (poll?.sessionVote) {
        if (poll.sessionVote.optionId === optionId) {
          await removeVoteMutation.mutateAsync(pollId);
          success('Vote removed!', 'Your vote has been removed.');
          return;
        }
      }
      
      await voteMutation.mutateAsync({ pollId, optionId });
      success('Vote recorded!', 'Your vote has been successfully recorded.');
    } catch (error) {
      console.error('Error voting:', error);
      showError('Failed to vote', 'There was an error recording your vote. Please try again.');
    }
  };

  const handleLike = async (pollId: string) => {
    try {
      const poll = polls.find((p: Poll) => p.pollId === pollId);
      
      if (poll?.sessionLiked) {
        await unlikeMutation.mutateAsync(pollId);
        success('Like removed', 'You have unliked this poll.');
      } else {
        await likeMutation.mutateAsync(pollId);
        success('Poll liked!', 'You have liked this poll.');
      }
    } catch (error) {
      console.error('Error liking:', error);
      showError('Failed to like', 'There was an error liking this poll. Please try again.');
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleRetry = () => {
    refetch();
  };

  // Show loading skeleton on initial load
  if (isLoading && polls.length === 0) {
    return <HomeFeedSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Failed to load polls</h1>
          <p className="mb-4 text-gray-600">Something went wrong while loading the polls.</p>
          <Button onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CreatePollModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 py-4 mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">QuickPoll</h1>
              <div className="hidden items-center space-x-2 text-sm md:flex text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Real-time polling</span>
              </div>
            </div>
            <Button onClick={handleCreatePoll} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create Poll</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8 mx-auto">

        {/* Polls Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {polls.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <div className="mb-4 text-gray-500">
                <h3 className="mb-2 text-lg font-medium">No polls yet</h3>
                <p className="text-sm">Create your first poll to get started!</p>
              </div>
              <Button onClick={handleCreatePoll}>
                <Plus className="mr-2 w-4 h-4" />
                Create First Poll
              </Button>
            </div>
          ) : (
            polls.map((poll: Poll) => (
            <Card key={poll.pollId} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{poll.title}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {poll.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{poll.totalVotes} votes</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="w-4 h-4" />
                    <span>{poll.totalLikes}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {poll.options?.map((option: any) => {
                    const isSelected = poll.sessionVote?.optionId === option.optionId;
                    const percentage = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                    
                    return (
                      <button
                        key={option.optionId}
                        type="button"
                        onClick={() => handleVote(poll.pollId, option.optionId)}
                        disabled={voteMutation.isPending}
                        className={`p-3 w-full text-left rounded-md border transition-all duration-200 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 shadow-sm'
                            : 'border-input hover:bg-accent hover:border-blue-300'
                        } ${voteMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-medium ${isSelected ? 'text-blue-700' : ''}`}>
                            {option.optionText}
                          </span>
                          <div className="flex items-center space-x-2">
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {option.voteCount} ({percentage}%)
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 w-full h-2 rounded-full bg-secondary">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isSelected ? 'bg-blue-600' : 'bg-primary'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex justify-center items-center w-6 h-6 rounded-full bg-primary/10">
                      <span className="text-xs font-medium">
                        A
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Anonymous
                    </span>
                  </div>
                  <Button
                    variant={poll.sessionLiked ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleLike(poll.pollId)}
                    disabled={likeMutation.isPending || unlikeMutation.isPending}
                    className="flex items-center space-x-1"
                  >
                    <Heart className={`w-4 h-4 ${poll.sessionLiked ? 'fill-current' : ''}`} />
                    <span>{poll.sessionLiked ? 'Liked' : 'Like'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>

        {/* Load More Button */}
        {pagination && pagination.page < pagination.totalPages && (
          <div className="mt-8 text-center">
            <Button 
              onClick={handleLoadMore}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}

      </main>
    </div>
  );
}
