import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Star, Award, Target, Flame, Zap, Crown, Medal,
  TrendingUp, Clock, Truck, DollarSign, ThumbsUp, Gift,
  Lock, Unlock, CheckCircle, Calendar, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  reward: string;
  category: 'deliveries' | 'ratings' | 'earnings' | 'special';
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string;
  score: number;
  deliveries: number;
  rating: number;
  isCurrentUser?: boolean;
}

interface DriverStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalDeliveries: number;
  thisWeekDeliveries: number;
  currentStreak: number;
  longestStreak: number;
  averageRating: number;
  totalEarnings: number;
  rank: number;
  totalDrivers: number;
}

interface DriverGamificationProps {
  driverId: string;
  driverName: string;
}

export const DriverGamification: React.FC<DriverGamificationProps> = ({
  driverId,
  driverName
}) => {
  const [stats, setStats] = useState<DriverStats>({
    level: 12,
    xp: 2450,
    xpToNextLevel: 3000,
    totalDeliveries: 156,
    thisWeekDeliveries: 23,
    currentStreak: 5,
    longestStreak: 14,
    averageRating: 4.8,
    totalEarnings: 245000,
    rank: 15,
    totalDrivers: 250
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: '1',
      name: 'First Delivery',
      description: 'Complete your first delivery',
      icon: Truck,
      color: 'text-blue-500',
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      unlockedAt: new Date('2024-01-15'),
      reward: '100 XP',
      category: 'deliveries'
    },
    {
      id: '2',
      name: 'Speed Demon',
      description: 'Complete 10 deliveries in one day',
      icon: Zap,
      color: 'text-yellow-500',
      progress: 8,
      maxProgress: 10,
      unlocked: false,
      reward: '500 XP + Speed Badge',
      category: 'deliveries'
    },
    {
      id: '3',
      name: 'Century Club',
      description: 'Complete 100 deliveries',
      icon: Trophy,
      color: 'text-amber-500',
      progress: 100,
      maxProgress: 100,
      unlocked: true,
      unlockedAt: new Date('2024-06-20'),
      reward: '1000 XP + Gold Badge',
      category: 'deliveries'
    },
    {
      id: '4',
      name: 'Five Star Driver',
      description: 'Maintain 5.0 rating for 30 days',
      icon: Star,
      color: 'text-yellow-400',
      progress: 22,
      maxProgress: 30,
      unlocked: false,
      reward: '750 XP + Premium Status',
      category: 'ratings'
    },
    {
      id: '5',
      name: 'Customer Favorite',
      description: 'Receive 50 five-star ratings',
      icon: ThumbsUp,
      color: 'text-green-500',
      progress: 45,
      maxProgress: 50,
      unlocked: false,
      reward: '500 XP + Favorite Badge',
      category: 'ratings'
    },
    {
      id: '6',
      name: 'Hot Streak',
      description: 'Deliver 7 days in a row',
      icon: Flame,
      color: 'text-orange-500',
      progress: 5,
      maxProgress: 7,
      unlocked: false,
      reward: '300 XP + Streak Badge',
      category: 'special'
    },
    {
      id: '7',
      name: 'Early Bird',
      description: 'Complete 20 deliveries before 9 AM',
      icon: Clock,
      color: 'text-cyan-500',
      progress: 15,
      maxProgress: 20,
      unlocked: false,
      reward: '400 XP + Early Badge',
      category: 'special'
    },
    {
      id: '8',
      name: 'Money Maker',
      description: 'Earn KES 500,000 total',
      icon: DollarSign,
      color: 'text-emerald-500',
      progress: 245000,
      maxProgress: 500000,
      unlocked: false,
      reward: '2000 XP + Elite Status',
      category: 'earnings'
    }
  ]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, name: 'John Kamau', score: 15420, deliveries: 312, rating: 4.9 },
    { rank: 2, name: 'Grace Wanjiku', score: 14850, deliveries: 298, rating: 4.95 },
    { rank: 3, name: 'Peter Ochieng', score: 13200, deliveries: 276, rating: 4.85 },
    { rank: 4, name: 'Mary Akinyi', score: 12100, deliveries: 254, rating: 4.8 },
    { rank: 5, name: 'David Mwangi', score: 11500, deliveries: 243, rating: 4.75 },
    { rank: 15, name: driverName, score: 8500, deliveries: 156, rating: 4.8, isCurrentUser: true }
  ]);

  const { toast } = useToast();

  const getLevelTitle = (level: number): string => {
    if (level < 5) return 'Rookie Driver';
    if (level < 10) return 'Experienced Driver';
    if (level < 15) return 'Professional Driver';
    if (level < 20) return 'Expert Driver';
    if (level < 25) return 'Master Driver';
    return 'Legend Driver';
  };

  const getLevelColor = (level: number): string => {
    if (level < 5) return 'from-gray-400 to-gray-600';
    if (level < 10) return 'from-green-400 to-green-600';
    if (level < 15) return 'from-blue-400 to-blue-600';
    if (level < 20) return 'from-purple-400 to-purple-600';
    if (level < 25) return 'from-amber-400 to-amber-600';
    return 'from-red-400 to-red-600';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="font-bold text-gray-500">#{rank}</span>;
  };

  const claimReward = (achievementId: string) => {
    toast({
      title: "Reward Claimed!",
      description: "XP and rewards have been added to your account",
    });
  };

  const xpProgress = (stats.xp / stats.xpToNextLevel) * 100;

  return (
    <div className="space-y-6">
      {/* Driver Level Card */}
      <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getLevelColor(stats.level)} flex items-center justify-center shadow-lg`}>
                <span className="text-3xl font-bold">{stats.level}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{driverName}</h2>
                <p className="text-teal-100">{getLevelTitle(stats.level)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-white/20 text-white">
                    <Trophy className="h-3 w-3 mr-1" />
                    Rank #{stats.rank}
                  </Badge>
                  <Badge className="bg-white/20 text-white">
                    <Flame className="h-3 w-3 mr-1" />
                    {stats.currentStreak} day streak
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-5 w-5 ${star <= Math.floor(stats.averageRating) ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}`} 
                  />
                ))}
              </div>
              <p className="text-sm text-teal-100 mt-1">{stats.averageRating} rating</p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Level {stats.level}</span>
              <span>{stats.xp.toLocaleString()} / {stats.xpToNextLevel.toLocaleString()} XP</span>
              <span>Level {stats.level + 1}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-white rounded-full h-3 transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
              <p className="text-xs text-teal-100">Total Deliveries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.thisWeekDeliveries}</p>
              <p className="text-xs text-teal-100">This Week</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.longestStreak}</p>
              <p className="text-xs text-teal-100">Best Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">KES {(stats.totalEarnings / 1000).toFixed(0)}K</p>
              <p className="text-xs text-teal-100">Total Earned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Achievements and Leaderboard */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList className="bg-white shadow-md">
          <TabsTrigger value="achievements" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
            <Award className="h-4 w-4 mr-2" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="rewards" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
            <Gift className="h-4 w-4 mr-2" />
            Rewards
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <Card 
                key={achievement.id} 
                className={`transition-all ${achievement.unlocked ? 'border-green-300 bg-green-50' : 'opacity-90'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${achievement.unlocked ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <achievement.icon className={`h-6 w-6 ${achievement.unlocked ? achievement.color : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{achievement.name}</h4>
                        {achievement.unlocked ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                      
                      {!achievement.unlocked && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress.toLocaleString()} / {achievement.maxProgress.toLocaleString()}</span>
                          </div>
                          <Progress 
                            value={(achievement.progress / achievement.maxProgress) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className="text-xs">
                          <Gift className="h-3 w-3 mr-1" />
                          {achievement.reward}
                        </Badge>
                        {achievement.unlocked && achievement.unlockedAt && (
                          <span className="text-xs text-gray-400">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {achievement.unlockedAt.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Weekly Leaderboard
              </CardTitle>
              <CardDescription>Top performers this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                      entry.isCurrentUser 
                        ? 'bg-teal-50 border-2 border-teal-300' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-10 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {entry.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {entry.name}
                        {entry.isCurrentUser && (
                          <Badge className="ml-2 bg-teal-500">You</Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {entry.deliveries} deliveries
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {entry.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-600">{entry.score.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                Available Rewards
              </CardTitle>
              <CardDescription>Redeem your points for rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-dashed hover:border-teal-300 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="font-semibold">Cash Bonus</h4>
                    <p className="text-sm text-gray-500 mt-1">KES 500 bonus</p>
                    <Badge className="mt-3" variant="outline">5,000 XP</Badge>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-dashed hover:border-teal-300 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                      <Zap className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="font-semibold">Priority Orders</h4>
                    <p className="text-sm text-gray-500 mt-1">1 week priority</p>
                    <Badge className="mt-3" variant="outline">3,000 XP</Badge>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-dashed hover:border-teal-300 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                      <Crown className="h-8 w-8 text-purple-600" />
                    </div>
                    <h4 className="font-semibold">Premium Badge</h4>
                    <p className="text-sm text-gray-500 mt-1">Exclusive profile badge</p>
                    <Badge className="mt-3" variant="outline">10,000 XP</Badge>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverGamification;




