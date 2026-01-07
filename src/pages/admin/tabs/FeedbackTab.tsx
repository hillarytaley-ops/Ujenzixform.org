import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Mail,
  Calendar,
} from 'lucide-react';
import { FeedbackRecord } from '../types';
import { StatsCard, StatsGrid } from '../components/StatsCard';
import { DataTable, StatusBadge, Column, RowAction } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';

interface FeedbackTabProps {
  feedback: FeedbackRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({
  feedback,
  loading,
  onRefresh,
}) => {
  // Calculate stats
  const stats = useMemo(() => {
    const total = feedback.length;
    const positive = feedback.filter((f) => f.rating >= 4).length;
    const negative = feedback.filter((f) => f.rating > 0 && f.rating <= 2).length;
    const neutral = feedback.filter((f) => f.rating === 3).length;
    const unrated = feedback.filter((f) => !f.rating || f.rating === 0).length;
    const avgRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating > 0).length
      : 0;

    return { total, positive, negative, neutral, unrated, avgRating };
  }, [feedback]);

  // Render rating stars
  const renderRating = (rating: number) => {
    if (!rating || rating === 0) {
      return <span className="text-gray-500 text-sm">No rating</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
        <span className="text-sm text-gray-400 ml-1">({rating})</span>
      </div>
    );
  };

  // Table columns
  const columns: Column<FeedbackRecord>[] = [
    {
      key: 'user_email',
      label: 'From',
      sortable: true,
      render: (_, row) => (
        <div className="space-y-1">
          {row.name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-gray-500" />
              <span className="text-white font-medium">{row.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-gray-500" />
            <span className="text-gray-400 text-sm">{row.user_email}</span>
          </div>
          {row.user_type && (
            <Badge variant="outline" className="text-xs border-slate-600">
              {row.user_type}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (_, row) => (
        <div>
          <p className="text-white font-medium">{row.subject || 'No subject'}</p>
          <p className="text-gray-400 text-sm line-clamp-2">{row.message}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (v) => (
        <Badge className="bg-slate-700">{v as string}</Badge>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (v) => renderRating(v as number),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Calendar className="h-3 w-3" />
          {new Date(v as string).toLocaleDateString()}
        </div>
      ),
    },
  ];

  // Table actions
  const actions: RowAction<FeedbackRecord>[] = [
    {
      label: 'Mark as Read',
      icon: MessageSquare,
      onClick: () => {}, // TODO: Implement
      show: (row) => row.status === 'pending',
    },
    {
      label: 'Reply',
      icon: Mail,
      onClick: () => {}, // TODO: Implement
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid columns={5}>
        <StatsCard
          title="Total Feedback"
          value={stats.total}
          icon={MessageSquare}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Positive"
          value={stats.positive}
          subtitle="4-5 stars"
          icon={ThumbsUp}
          iconColor="text-green-500"
        />
        <StatsCard
          title="Negative"
          value={stats.negative}
          subtitle="1-2 stars"
          icon={ThumbsDown}
          iconColor="text-red-500"
        />
        <StatsCard
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          iconColor="text-yellow-500"
        />
        <StatsCard
          title="Pending"
          value={feedback.filter((f) => f.status === 'pending').length}
          icon={Clock}
          iconColor="text-orange-500"
        />
      </StatsGrid>

      {/* Rating Distribution */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rating Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = feedback.filter((f) => f.rating === rating).length;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm text-gray-400">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        rating >= 4
                          ? 'bg-green-500'
                          : rating === 3
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-16 text-right">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <DataTable
        title="Feedback Messages"
        description="View and manage user feedback submissions"
        icon={MessageSquare}
        data={feedback}
        columns={columns}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search feedback..."
        emptyState={{
          icon: MessageSquare,
          title: 'No Feedback Yet',
          description: 'User feedback will appear here once submitted',
        }}
        onRefresh={onRefresh}
        pageSize={10}
      />

      {/* Recent Feedback Cards */}
      {feedback.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              Recent Feedback
            </CardTitle>
            <CardDescription className="text-gray-400">
              Latest feedback submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedback.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">
                        {item.name || item.user_email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderRating(item.rating)}
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  {item.subject && (
                    <p className="text-sm text-blue-400 mb-1">{item.subject}</p>
                  )}
                  <p className="text-gray-300 text-sm">{item.message}</p>
                  {item.user_type && (
                    <Badge variant="outline" className="mt-2 text-xs border-slate-600">
                      {item.user_type}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


