import { Label } from '../common/Form'
import type { WinCondition } from '../../types/database'

interface WinConditionSelectorProps {
  winCondition: WinCondition
  targetScore: number
  onWinConditionChange: (value: WinCondition) => void
  onTargetScoreChange: (value: number) => void
  disabled?: boolean
}

export function WinConditionSelector({
  winCondition,
  targetScore,
  onWinConditionChange,
  onTargetScoreChange,
  disabled = false
}: WinConditionSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="win-condition">Win Condition</Label>
        <select
          id="win-condition"
          value={winCondition}
          onChange={(e) => onWinConditionChange(e.target.value as WinCondition)}
          disabled={disabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
        >
          <option value="first-to-target">First to Target Score</option>
          <option value="win-by-2">Win by 2</option>
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {winCondition === 'first-to-target' 
            ? 'First team to reach the target score wins'
            : 'Must reach target score and lead by at least 2 points'}
        </p>
      </div>

      <div>
        <Label htmlFor="target-score">Target Score</Label>
        <input
          type="number"
          id="target-score"
          value={targetScore}
          onChange={(e) => onTargetScoreChange(Number(e.target.value))}
          min={5}
          max={21}
          disabled={disabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Valid range: 5-21 points (default: 11)
        </p>
      </div>
    </div>
  )
}