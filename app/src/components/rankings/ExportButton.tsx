/**
 * ExportButton Component
 * 
 * Provides export functionality for rankings data with format options
 * and user-friendly interface
 */

import React, { useState } from 'react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Select } from '@/components/common/Select'
import { Alert } from '@/components/common/Alert'
import { useToast } from '@/hooks/useToast'
import { PlayerRanking, TournamentSummary, PartnershipStats } from '@/lib/calculations/rankings'
import { PlayerStatistics } from '@/hooks/usePlayerStats'
import { PlayDate } from '@/types/database'
import {
  exportRankingsData,
  exportPlayerStatistics,
  exportPartnershipStatistics,
  exportTournamentSummary,
  validateExportData,
  getExportStats,
  ExportOptions
} from '@/lib/export/rankingsExport'
import { 
  ArrowDownTrayIcon, 
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ExportButtonProps {
  rankings: PlayerRanking[]
  playDate: PlayDate
  tournamentSummary: TournamentSummary
  partnershipStats?: PartnershipStats[]
  playerStats?: PlayerStatistics
  playerName?: string
  type?: 'rankings' | 'player-stats' | 'partnerships' | 'tournament-summary'
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export function ExportButton({
  rankings,
  playDate,
  tournamentSummary,
  partnershipStats,
  playerStats,
  playerName,
  type = 'rankings',
  variant = 'outline',
  size = 'md',
  disabled = false,
  className = ''
}: ExportButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [includePersonalData, setIncludePersonalData] = useState(false)
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  const { addToast } = useToast()

  /**
   * Validate data before export
   */
  const validateData = () => {
    if (type === 'rankings') {
      const validation = validateExportData(rankings, playDate)
      setValidationErrors(validation.errors)
      return validation.valid
    }
    
    setValidationErrors([])
    return true
  }

  /**
   * Handle export action
   */
  const handleExport = async () => {
    if (!validateData()) {
      return
    }

    setExporting(true)
    
    try {
      const options: ExportOptions = {
        format: exportFormat,
        includePersonalData,
        includeTimestamps
      }

      switch (type) {
        case 'rankings':
          await exportRankingsData(rankings, playDate, tournamentSummary, partnershipStats, options)
          break
        case 'player-stats':
          if (playerStats && playerName) {
            await exportPlayerStatistics(playerStats, playerName, playDate, options)
          }
          break
        case 'partnerships':
          if (partnershipStats) {
            await exportPartnershipStatistics(partnershipStats, playDate, options)
          }
          break
        case 'tournament-summary':
          await exportTournamentSummary(tournamentSummary, playDate, options)
          break
      }

      addToast({
        type: 'success',
        title: 'Export Successful',
        message: `${type.replace('-', ' ')} data exported successfully.`,
        duration: 3000
      })

      setShowModal(false)
    } catch (error) {
      console.error('Export failed:', error)
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
        duration: 5000
      })
    } finally {
      setExporting(false)
    }
  }

  /**
   * Get export statistics for display
   */
  const getDisplayStats = () => {
    if (type === 'rankings') {
      return getExportStats(rankings)
    }
    return null
  }

  /**
   * Get export type label
   */
  const getTypeLabel = () => {
    switch (type) {
      case 'rankings':
        return 'Rankings'
      case 'player-stats':
        return 'Player Statistics'
      case 'partnerships':
        return 'Partnership Statistics'
      case 'tournament-summary':
        return 'Tournament Summary'
      default:
        return 'Data'
    }
  }

  const stats = getDisplayStats()

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant={variant}
        size={size}
        disabled={disabled}
        className={className}
      >
        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
        Export {getTypeLabel()}
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Export ${getTypeLabel()}`}
      >
        <div className="space-y-6">
          {/* Export Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Export Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tournament Date:</span>
                <span className="font-medium">{new Date(playDate.date).toLocaleDateString()}</span>
              </div>
              
              {stats && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Players:</span>
                    <span className="font-medium">{stats.totalPlayers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Games:</span>
                    <span className="font-medium">{stats.totalGames}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Points:</span>
                    <span className="font-medium">{stats.totalPoints}</span>
                  </div>
                </>
              )}
              
              {type === 'player-stats' && playerName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Player:</span>
                  <span className="font-medium">{playerName}</span>
                </div>
              )}
              
              {type === 'partnerships' && partnershipStats && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Partnerships:</span>
                  <span className="font-medium">{partnershipStats.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <Select
                value={exportFormat}
                onChange={(value) => setExportFormat(value as 'csv' | 'json')}
                options={[
                  { value: 'csv', label: 'CSV (Spreadsheet)' },
                  { value: 'json', label: 'JSON (Data Archive)' }
                ]}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Export Options
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeTimestamps}
                    onChange={(e) => setIncludeTimestamps(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Include timestamps</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includePersonalData}
                    onChange={(e) => setIncludePersonalData(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Include personal data</span>
                </label>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert type="error" className="p-3">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <div className="ml-3">
                <p className="text-sm font-medium">Export Validation Errors:</p>
                <ul className="text-sm mt-1 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {/* Export Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                {exportFormat === 'csv' 
                  ? 'CSV files can be opened in Excel, Google Sheets, or other spreadsheet applications.'
                  : 'JSON files contain complete data structure and can be imported back into the system.'
                }
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleExport}
              disabled={exporting || validationErrors.length > 0}
              className="min-w-[100px]"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

/**
 * Quick export buttons for common actions
 */
export function QuickExportButtons({
  rankings,
  playDate,
  tournamentSummary,
  partnershipStats,
  className = ''
}: {
  rankings: PlayerRanking[]
  playDate: PlayDate
  tournamentSummary: TournamentSummary
  partnershipStats?: PartnershipStats[]
  className?: string
}) {
  return (
    <div className={`flex space-x-2 ${className}`}>
      <ExportButton
        rankings={rankings}
        playDate={playDate}
        tournamentSummary={tournamentSummary}
        partnershipStats={partnershipStats}
        type="rankings"
        variant="outline"
        size="sm"
      />
      
      {partnershipStats && partnershipStats.length > 0 && (
        <ExportButton
          rankings={rankings}
          playDate={playDate}
          tournamentSummary={tournamentSummary}
          partnershipStats={partnershipStats}
          type="partnerships"
          variant="outline"
          size="sm"
        />
      )}
      
      <ExportButton
        rankings={rankings}
        playDate={playDate}
        tournamentSummary={tournamentSummary}
        type="tournament-summary"
        variant="outline"
        size="sm"
      />
    </div>
  )
}