/**
 * PerformanceTrends Component
 * 
 * Displays player performance trends over time using charts and visualizations
 * Shows historical performance, ranking changes, and trend analysis
 */

import { useMemo } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import type { PlayerPerformanceTrend } from '@/hooks/usePlayerStats'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  ArrowRightIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface PerformanceTrendsProps {
  trends: PlayerPerformanceTrend[]
  playerName: string
  loading?: boolean
  className?: string
}

// Helper function to compute win percentage
const getWinPercentage = (matchResult: PlayerPerformanceTrend['matchResult']) => {
  return matchResult.games_played > 0 
    ? (matchResult.games_won / matchResult.games_played) * 100 
    : 0
}

// Helper function to compute point differential
const getPointDifferential = (matchResult: PlayerPerformanceTrend['matchResult']) => {
  return matchResult.points_for - matchResult.points_against
}

export function PerformanceTrends({
  trends,
  playerName,
  loading = false,
  className = ''
}: PerformanceTrendsProps) {
  /**
   * Calculate trend statistics
   */
  const trendStats = useMemo(() => {
    if (trends.length === 0) return null

    const winPercentages = trends.map(t => 
      t.matchResult.games_played > 0 
        ? (t.matchResult.games_won / t.matchResult.games_played) * 100 
        : 0
    )
    const pointDifferentials = trends.map(t => 
      t.matchResult.points_for - t.matchResult.points_against
    )
    
    const avgWinPercentage = Math.round(
      winPercentages.reduce((sum, wp) => sum + wp, 0) / winPercentages.length
    )
    
    const avgPointDifferential = Math.round(
      pointDifferentials.reduce((sum, pd) => sum + pd, 0) / pointDifferentials.length
    )
    
    const bestPerformance = trends.reduce((best, current) => 
      getWinPercentage(current.matchResult) > getWinPercentage(best.matchResult) ? current : best
    )
    
    const worstPerformance = trends.reduce((worst, current) => 
      getWinPercentage(current.matchResult) < getWinPercentage(worst.matchResult) ? current : worst
    )
    
    // Calculate trend direction
    const recentTrends = trends.slice(0, Math.min(3, trends.length))
    const olderTrends = trends.slice(Math.min(3, trends.length))
    
    const recentAvg = recentTrends.length > 0 
      ? recentTrends.reduce((sum, t) => sum + getWinPercentage(t.matchResult), 0) / recentTrends.length
      : 0
    
    const olderAvg = olderTrends.length > 0 
      ? olderTrends.reduce((sum, t) => sum + getWinPercentage(t.matchResult), 0) / olderTrends.length
      : recentAvg
    
    const trendDirection = recentAvg > olderAvg + 5 ? 'improving' : 
                          recentAvg < olderAvg - 5 ? 'declining' : 'stable'
    
    return {
      avgWinPercentage,
      avgPointDifferential,
      bestPerformance,
      worstPerformance,
      trendDirection,
      totalTournaments: trends.length
    }
  }, [trends])

  /**
   * Get trend icon
   */
  const getTrendIcon = (direction: 'improving' | 'declining' | 'stable') => {
    switch (direction) {
      case 'improving':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
      case 'declining':
        return <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
      default:
        return <ArrowRightIcon className="w-5 h-5 text-gray-600" />
    }
  }

  /**
   * Get performance badge color
   */
  const getPerformanceBadgeColor = (winPercentage: number) => {
    if (winPercentage >= 70) return 'success'
    if (winPercentage >= 50) return 'warning'
    return 'destructive'
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (trends.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <div className="text-center py-8">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No historical data available</p>
          <p className="text-sm text-gray-400 mt-1">
            Trends will appear after participating in multiple tournaments
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Performance Trends</h3>
          <p className="text-sm text-gray-500 mt-1">
            {playerName}'s performance across {trendStats?.totalTournaments} tournaments
          </p>
        </div>
        
        {trendStats && (
          <div className="flex items-center space-x-2">
            {getTrendIcon(trendStats.trendDirection)}
            <span className="text-sm text-gray-600 capitalize">
              {trendStats.trendDirection}
            </span>
          </div>
        )}
      </div>

      {/* Trend Summary */}
      {trendStats && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Average Win Rate</p>
            <p className="text-xl font-bold text-blue-900">{trendStats.avgWinPercentage}%</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-xs text-purple-600 font-medium">Avg Point Diff</p>
            <p className={`text-xl font-bold ${
              trendStats.avgPointDifferential > 0 ? 'text-green-600' : 
              trendStats.avgPointDifferential < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trendStats.avgPointDifferential > 0 ? '+' : ''}{trendStats.avgPointDifferential}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Best Performance</p>
            <p className="text-xl font-bold text-green-900">{Math.round(getWinPercentage(trendStats.bestPerformance.matchResult))}%</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-xs text-orange-600 font-medium">Tournaments</p>
            <p className="text-xl font-bold text-orange-900">{trendStats.totalTournaments}</p>
          </div>
        </div>
      )}

      {/* Performance History */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Tournament History</h4>
        
        <div className="space-y-3">
          {trends.map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {new Date(trend.playDate.date).toLocaleDateString()}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={getPerformanceBadgeColor(getWinPercentage(trend.matchResult))}
                    className="text-xs"
                  >
                    {getWinPercentage(trend.matchResult)}%
                  </Badge>
                  
                  {trend.rank && (
                    <Badge variant="default" className="text-xs">
                      Rank #{trend.rank}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-gray-600">
                  <span className="font-medium text-green-600">{trend.matchResult.games_won}</span>
                  <span className="mx-1">-</span>
                  <span className="font-medium text-red-600">{trend.matchResult.games_lost}</span>
                </div>
                
                <div className={`font-medium ${
                  getPointDifferential(trend.matchResult) > 0 ? 'text-green-600' : 
                  getPointDifferential(trend.matchResult) < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {getPointDifferential(trend.matchResult) > 0 ? '+' : ''}{getPointDifferential(trend.matchResult)}
                </div>
                
                {trend.rankChange && (
                  <div className="flex items-center">
                    {trend.rankChange > 0 ? (
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-xs ${
                      trend.rankChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(trend.rankChange)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Trend Indicator */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Visualization</h4>
        <div className="relative">
          <div className="flex items-end space-x-2 h-16">
            {trends.slice(0, 10).reverse().map((trend, index) => {
              const height = Math.max(8, (getWinPercentage(trend.matchResult) / 100) * 64)
              return (
                <div
                  key={index}
                  className={`rounded-t-sm transition-all duration-200 ${
                    getWinPercentage(trend.matchResult) >= 70 ? 'bg-green-500' :
                    getWinPercentage(trend.matchResult) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${height}px`, minWidth: '20px' }}
                  title={`${new Date(trend.playDate.date).toLocaleDateString()}: ${getWinPercentage(trend.matchResult)}%`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Oldest</span>
            <span>Most Recent</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      {trendStats && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Insights</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                trendStats.trendDirection === 'improving' ? 'bg-green-500' :
                trendStats.trendDirection === 'declining' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span className="text-gray-700">
                Performance is {trendStats.trendDirection} compared to earlier tournaments
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-700">
                Average win rate: {trendStats.avgWinPercentage}% across all tournaments
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-700">
                Best performance: {Math.round(getWinPercentage(trendStats.bestPerformance.matchResult))}% win rate 
                on {new Date(trendStats.bestPerformance.playDate.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

/**
 * Mini trends component for dashboard
 */
export function MiniPerformanceTrends({
  trends,
  playerName: _playerName,
  className = ''
}: {
  trends: PlayerPerformanceTrend[]
  playerName: string
  className?: string
}) {
  const recentTrends = trends.slice(0, 5)
  
  if (recentTrends.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Performance</h4>
        <p className="text-xs text-gray-500">No recent data available</p>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Performance</h4>
      
      <div className="space-y-2">
        {recentTrends.map((trend, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              {new Date(trend.playDate.date).toLocaleDateString()}
            </span>
            <div className="flex items-center space-x-2">
              <Badge
                variant={getWinPercentage(trend.matchResult) >= 60 ? 'success' : 
                        getWinPercentage(trend.matchResult) >= 40 ? 'warning' : 'error'}
                className="text-xs"
              >
                {getWinPercentage(trend.matchResult)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}