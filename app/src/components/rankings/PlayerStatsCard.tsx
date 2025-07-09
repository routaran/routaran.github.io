/**
 * PlayerStatsCard Component
 * 
 * Displays comprehensive player statistics including performance metrics,
 * trends, and partnership analysis in a card format
 */

import React, { useState } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Progress } from '@/components/common/Progress'
import { PlayerStatistics } from '@/hooks/usePlayerStats'
import { 
  TrophyIcon, 
  ChartBarIcon, 
  FireIcon, 
  UserGroupIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface PlayerStatsCardProps {
  playerStats: PlayerStatistics
  loading?: boolean
  error?: string | null
  onViewHistory?: () => void
  onComparePlayer?: () => void
  compact?: boolean
  className?: string
}

export function PlayerStatsCard({
  playerStats,
  loading = false,
  error = null,
  onViewHistory,
  onComparePlayer,
  compact = false,
  className = ''
}: PlayerStatsCardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'partnerships' | 'trends'>('overview')

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading player statistics: {error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <LoadingSpinner size="lg" className="text-blue-600 mb-4" />
          <p className="text-gray-600">Loading player statistics...</p>
        </div>
      </Card>
    )
  }

  const { currentStats, currentRank } = playerStats

  /**
   * Get improvement trend indicator
   */
  const getTrendIndicator = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUpIcon className="w-5 h-5 text-green-600" />
      case 'declining':
        return <TrendingDownIcon className="w-5 h-5 text-red-600" />
      default:
        return <ArrowRightIcon className="w-5 h-5 text-gray-600" />
    }
  }

  /**
   * Get performance tier badge
   */
  const getPerformanceTier = (winPercentage: number) => {
    if (winPercentage >= 80) return { tier: 'Elite', color: 'bg-purple-100 text-purple-800' }
    if (winPercentage >= 70) return { tier: 'Advanced', color: 'bg-blue-100 text-blue-800' }
    if (winPercentage >= 60) return { tier: 'Skilled', color: 'bg-green-100 text-green-800' }
    if (winPercentage >= 50) return { tier: 'Developing', color: 'bg-yellow-100 text-yellow-800' }
    return { tier: 'Beginner', color: 'bg-gray-100 text-gray-800' }
  }

  const performanceTier = getPerformanceTier(playerStats.averageWinPercentage)

  return (
    <Card className={`${compact ? 'p-4' : 'p-6'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>
            Player Statistics
          </h2>
          {currentStats && (
            <p className="text-sm text-gray-500 mt-1">
              Current tournament performance
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {currentRank && (
            <div className="flex items-center space-x-2">
              <TrophyIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">
                Rank #{currentRank}
              </span>
            </div>
          )}
          
          <Badge className={performanceTier.color}>
            {performanceTier.tier}
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: ChartBarIcon },
          { id: 'partnerships', label: 'Partnerships', icon: UserGroupIcon },
          { id: 'trends', label: 'Trends', icon: TrendingUpIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current Tournament Stats */}
            {currentStats && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Current Tournament</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{currentStats.win_percentage}%</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Games Played</p>
                    <p className="text-lg font-semibold text-gray-900">{currentStats.games_played}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Point Diff</p>
                    <p className={`text-lg font-semibold ${
                      currentStats.point_differential > 0 ? 'text-green-600' : 
                      currentStats.point_differential < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {currentStats.point_differential > 0 ? '+' : ''}{currentStats.point_differential}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Points For</p>
                    <p className="text-lg font-semibold text-gray-900">{currentStats.points_for}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Performance */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Historical Performance</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Win Rate</span>
                    <span className="text-sm font-medium text-gray-900">{playerStats.averageWinPercentage}%</span>
                  </div>
                  <Progress value={playerStats.averageWinPercentage} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Consistency</span>
                    <span className="text-sm font-medium text-gray-900">{playerStats.consistencyRating}/100</span>
                  </div>
                  <Progress value={playerStats.consistencyRating} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Best Performance</span>
                    <span className="text-sm font-medium text-green-600">{playerStats.bestWinPercentage}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tournaments</span>
                    <span className="text-sm font-medium text-gray-900">{playerStats.totalTournaments}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Points/Game</span>
                    <span className="text-sm font-medium text-gray-900">{playerStats.averagePointsPerGame}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Performance Indicators</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getTrendIndicator(playerStats.improvementTrend)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">Trend</p>
                    <p className="text-xs text-gray-500 capitalize">{playerStats.improvementTrend}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <FireIcon className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Win Streak</p>
                    <p className="text-xs text-gray-500">{playerStats.currentWinningStreak} games</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Best Diff</p>
                    <p className="text-xs text-gray-500">+{playerStats.bestPointDifferential}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'partnerships' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Partnership Performance</h3>
            
            {playerStats.bestPartnership && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-green-800">Best Partnership</h4>
                  <Badge variant="success" className="text-xs">
                    {playerStats.bestPartnership.win_percentage}% wins
                  </Badge>
                </div>
                <p className="text-sm text-green-700">
                  {playerStats.bestPartnership.player1_name} & {playerStats.bestPartnership.player2_name}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {playerStats.bestPartnership.games_won}-{playerStats.bestPartnership.games_lost} record
                </p>
              </div>
            )}

            {playerStats.partnershipStats.length > 0 ? (
              <div className="space-y-3">
                {playerStats.partnershipStats.map((partnership, index) => (
                  <div key={partnership.partnership_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {partnership.player1_name} & {partnership.player2_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {partnership.games_won}-{partnership.games_lost} 
                          ({partnership.win_percentage}% wins)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Point Diff</p>
                        <p className={`text-sm font-medium ${
                          partnership.point_differential > 0 ? 'text-green-600' : 
                          partnership.point_differential < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {partnership.point_differential > 0 ? '+' : ''}{partnership.point_differential}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No partnership data available for current tournament.
              </p>
            )}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Performance Trends</h3>
            
            {playerStats.historicalStats.length > 0 ? (
              <div className="space-y-3">
                {playerStats.historicalStats.slice(0, 5).map((trend, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(trend.playDate.date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          {trend.matchResult.games_won}-{trend.matchResult.games_lost} record
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={trend.matchResult.win_percentage >= 60 ? 'success' : 
                                  trend.matchResult.win_percentage >= 40 ? 'warning' : 'error'}
                          className="text-xs"
                        >
                          {trend.matchResult.win_percentage}%
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {trend.matchResult.point_differential > 0 ? '+' : ''}{trend.matchResult.point_differential}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No historical data available yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
        {onViewHistory && (
          <Button 
            variant="outline" 
            onClick={onViewHistory}
            className="flex-1"
          >
            View History
          </Button>
        )}
        {onComparePlayer && (
          <Button 
            variant="outline" 
            onClick={onComparePlayer}
            className="flex-1"
          >
            Compare Players
          </Button>
        )}
      </div>
    </Card>
  )
}

/**
 * Mini version for dashboard or mobile display
 */
export function MiniPlayerStatsCard(props: Omit<PlayerStatsCardProps, 'compact'>) {
  return <PlayerStatsCard {...props} compact={true} />
}