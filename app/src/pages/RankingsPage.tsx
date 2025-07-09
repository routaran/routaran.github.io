/**
 * RankingsPage Component
 * 
 * Main page for displaying tournament rankings, statistics, and analysis
 * Provides comprehensive view of tournament performance data
 */

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Alert } from '@/components/common/Alert'
import { Badge } from '@/components/common/Badge'
import { useRankings, useRankingChanges, useTournamentProgress } from '@/hooks/useRankings'
import { usePlayerStats } from '@/hooks/usePlayerStats'
import { useToast } from '@/hooks/useToast'
import { 
  RankingsTable, 
  RankingsPodium, 
  PlayerStatsCard, 
  TournamentSummaryCard, 
  PerformanceTrends,
  QuickExportButtons
} from '@/components/rankings'
import { ConnectionStatusBar } from '@/components/realtime'
import { 
  TrophyIcon, 
  ChartBarIcon, 
  UsersIcon, 
  ArrowPathIcon,
  EyeIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

export function RankingsPage() {
  const { playDateId } = useParams<{ playDateId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'rankings' | 'statistics' | 'trends' | 'summary'>('rankings')
  const [showRankingChanges, setShowRankingChanges] = useState(true)
  
  const { addToast } = useToast()

  // Load rankings data
  const {
    rankings,
    tournamentSummary,
    rankingChanges,
    loading: rankingsLoading,
    refreshing: rankingsRefreshing,
    error: rankingsError,
    refresh: refreshRankings,
    isConnected,
    lastUpdated
  } = useRankings(playDateId || '')

  // Load tournament progress
  const {
    progress,
    loading: progressLoading,
    error: progressError,
    refresh: refreshProgress
  } = useTournamentProgress(playDateId || '')

  // Load player stats if player is selected
  const {
    playerStats,
    loading: playerStatsLoading,
    error: playerStatsError,
    refresh: refreshPlayerStats
  } = usePlayerStats(selectedPlayerId || '', playDateId, rankings)

  // Get ranking changes for notifications
  const significantChanges = useRankingChanges(rankings)

  // Handle URL parameters
  useEffect(() => {
    const playerId = searchParams.get('playerId')
    const tab = searchParams.get('tab') as typeof activeTab
    
    if (playerId && rankings.find(r => r.player_id === playerId)) {
      setSelectedPlayerId(playerId)
    }
    
    if (tab && ['rankings', 'statistics', 'trends', 'summary'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams, rankings])

  // Handle player selection
  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId)
    setActiveTab('statistics')
    setSearchParams({ playerId, tab: 'statistics' })
  }

  // Handle tab change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    setSearchParams(params)
  }

  // Handle refresh all data
  const handleRefreshAll = async () => {
    await Promise.all([
      refreshRankings(),
      refreshProgress(),
      selectedPlayerId ? refreshPlayerStats() : Promise.resolve()
    ])
  }

  // Show significant ranking changes
  useEffect(() => {
    if (significantChanges.length > 0) {
      significantChanges.forEach(change => {
        addToast({
          type: 'info',
          title: 'Ranking Change',
          message: `${change.playerName} ${change.change > 0 ? 'moved up' : 'moved down'} ${Math.abs(change.change)} positions!`,
          duration: 5000
        })
      })
    }
  }, [significantChanges, addToast])

  if (!playDateId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="error">
          <p>Invalid tournament ID. Please select a valid tournament.</p>
        </Alert>
      </div>
    )
  }

  const selectedPlayer = selectedPlayerId ? rankings.find(r => r.player_id === selectedPlayerId) : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tournament Rankings</h1>
          <p className="text-gray-600 mt-1">
            Real-time rankings and statistics
            {lastUpdated && (
              <span className="ml-2 text-sm">
                • Last updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <ConnectionStatusBar isConnected={isConnected} />
          
          <Button
            onClick={handleRefreshAll}
            disabled={rankingsLoading || rankingsRefreshing}
            variant="outline"
            size="sm"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${rankingsRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tournament Progress */}
      {!progressLoading && progress && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrophyIcon className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Tournament Progress: {progress.completionPercentage}%
                </p>
                <p className="text-xs text-blue-700">
                  {progress.completedMatches} of {progress.totalMatches} matches completed
                </p>
              </div>
            </div>
            
            <Badge variant={progress.completionPercentage === 100 ? 'success' : 'info'}>
              {progress.completionPercentage === 100 ? 'Complete' : 'In Progress'}
            </Badge>
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'rankings', label: 'Rankings', icon: TrophyIcon },
          { id: 'statistics', label: 'Player Stats', icon: ChartBarIcon },
          { id: 'trends', label: 'Trends', icon: DocumentTextIcon },
          { id: 'summary', label: 'Summary', icon: UsersIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as typeof activeTab)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'rankings' && (
            <div className="space-y-6">
              {/* Rankings Podium */}
              {rankings.length >= 3 && progress?.completionPercentage === 100 && (
                <RankingsPodium rankings={rankings} />
              )}
              
              {/* Rankings Table */}
              <RankingsTable
                rankings={rankings}
                loading={rankingsLoading}
                error={rankingsError}
                onPlayerClick={handlePlayerSelect}
                showRankingChanges={showRankingChanges}
                rankingChanges={rankingChanges}
              />
              
              {/* Export Options */}
              {rankings.length > 0 && tournamentSummary && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Export Data</h3>
                      <p className="text-xs text-gray-500">Download tournament data in various formats</p>
                    </div>
                    <QuickExportButtons
                      rankings={rankings}
                      playDate={{ id: playDateId, date: new Date().toISOString() } as any}
                      tournamentSummary={tournamentSummary}
                    />
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              {selectedPlayer && playerStats ? (
                <PlayerStatsCard
                  playerStats={playerStats}
                  loading={playerStatsLoading}
                  error={playerStatsError}
                  onViewHistory={() => handleTabChange('trends')}
                />
              ) : (
                <Card className="p-8 text-center">
                  <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Player</h3>
                  <p className="text-gray-500 mb-4">
                    Click on a player in the rankings table to view their detailed statistics
                  </p>
                  <Button onClick={() => handleTabChange('rankings')} variant="outline">
                    <EyeIcon className="w-4 h-4 mr-2" />
                    View Rankings
                  </Button>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              {selectedPlayer && playerStats ? (
                <PerformanceTrends
                  trends={playerStats.historicalStats}
                  playerName={selectedPlayer.player_name}
                />
              ) : (
                <Card className="p-8 text-center">
                  <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Player</h3>
                  <p className="text-gray-500 mb-4">
                    Select a player to view their performance trends and historical data
                  </p>
                  <Button onClick={() => handleTabChange('rankings')} variant="outline">
                    <EyeIcon className="w-4 h-4 mr-2" />
                    View Rankings
                  </Button>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-6">
              {tournamentSummary ? (
                <TournamentSummaryCard
                  summary={tournamentSummary}
                  loading={rankingsLoading}
                />
              ) : (
                <Card className="p-8 text-center">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Summary Available</h3>
                  <p className="text-gray-500">
                    Tournament summary will be available once matches are completed
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Players</span>
                <span className="font-medium">{rankings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed Matches</span>
                <span className="font-medium">{progress?.completedMatches || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tournament Progress</span>
                <span className="font-medium">{progress?.completionPercentage || 0}%</span>
              </div>
              {rankings.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Leader</span>
                  <span className="font-medium">{rankings[0].player_name}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              <Cog6ToothIcon className="w-4 h-4 inline mr-2" />
              Display Options
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showRankingChanges}
                  onChange={(e) => setShowRankingChanges(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Show ranking changes</span>
              </label>
            </div>
          </Card>

          {/* Connection Status */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Live Updates</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isConnected ? 'Rankings update automatically' : 'Manual refresh required'}
            </p>
          </Card>
        </div>
      </div>

      {/* Loading Overlay */}
      {rankingsLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <LoadingSpinner size="md" />
            <span className="text-gray-700">Loading rankings...</span>
          </div>
        </div>
      )}
    </div>
  )
}