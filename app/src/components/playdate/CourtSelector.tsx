import { Label } from "../common/Form";

interface CourtSelectorProps {
  courtCount: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  maxCourts?: number;
}

export function CourtSelector({
  courtCount,
  onChange,
  disabled = false,
  maxCourts = 4,
}: CourtSelectorProps) {
  const courtOptions = Array.from({ length: maxCourts }, (_, i) => i + 1);

  return (
    <div>
      <Label htmlFor="court-count">Number of Courts</Label>
      <select
        id="court-count"
        value={courtCount}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
      >
        {courtOptions.map((num) => (
          <option key={num} value={num}>
            {num} {num === 1 ? "Court" : "Courts"}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Number of courts available for simultaneous play
      </p>
    </div>
  );
}
