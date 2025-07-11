import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "../common/Button";
import { Form, FormGroup, Label, Input, ErrorMessage } from "../common/Form";
import { PlayerSelector } from "./PlayerSelector";
import { WinConditionSelector } from "./WinConditionSelector";
import { CourtSelector } from "./CourtSelector";
import type {
  PlayDate,
  PlayDateInsert,
  PlayerInsert,
  WinCondition,
} from "../../types/database";

interface PlayDateFormProps {
  initialData?: Partial<PlayDate>;
  onSubmit: (data: PlayDateInsert, players: PlayerInsert[]) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  canEditPlayers?: boolean;
  loading?: boolean;
}

export function PlayDateForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  canEditPlayers = true,
  loading = false,
}: PlayDateFormProps) {
  const [formData, setFormData] = useState<PlayDateInsert>({
    date: initialData?.date || "",
    win_condition: initialData?.win_condition || "first_to_target",
    target_score: initialData?.target_score || 11,
    num_courts: initialData?.num_courts || 1,
    organizer_id: "", // Will be set by the parent
  });

  const [players, setPlayers] = useState<PlayerInsert[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // If editing and we have initial player data, we would load it here
    // For now, players will be managed separately in edit mode
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = "Date is required";
    } else if (formData.date < today) {
      newErrors.date = "Date must be today or in the future";
    }

    if (
      formData.target_score !== undefined &&
      (formData.target_score < 5 || formData.target_score > 21)
    ) {
      newErrors.target_score = "Target score must be between 5 and 21";
    }

    if (!isEditing && players.length < 4) {
      newErrors.players = "At least 4 players are required";
    }

    if (!isEditing && players.length > 16) {
      newErrors.players = "Maximum 16 players allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      { players: true }
    );
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData, players);
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Form submission error:", error);
    }
  };

  const handleFieldChange = (field: keyof PlayDateInsert, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm();
  };

  return (
    <Form onSubmit={handleSubmit} className="space-y-6">
      <FormGroup>
        <Label htmlFor="date">Date</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleFieldChange("date", e.target.value)}
            onBlur={() => handleBlur("date")}
            min={today}
            disabled={loading}
            required
            className="pl-10"
          />
        </div>
        {touched.date && errors.date && <ErrorMessage error={errors.date} />}
      </FormGroup>

      <WinConditionSelector
        winCondition={formData.win_condition as WinCondition}
        targetScore={formData.target_score || 11}
        onWinConditionChange={(value) =>
          handleFieldChange("win_condition", value)
        }
        onTargetScoreChange={(value) =>
          handleFieldChange("target_score", value)
        }
        disabled={loading}
      />

      <CourtSelector
        courtCount={formData.num_courts || 1}
        onChange={(value) => handleFieldChange("num_courts", value)}
        disabled={loading}
      />

      {!isEditing && canEditPlayers && (
        <>
          <PlayerSelector
            players={players}
            onChange={(newPlayers) => {
              setPlayers(newPlayers);
              setTouched((prev) => ({ ...prev, players: true }));
              if (errors.players) {
                setErrors((prev) => ({ ...prev, players: "" }));
              }
            }}
            disabled={loading}
          />
          {touched.players && errors.players && (
            <ErrorMessage error={errors.players} />
          )}
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading}
          className="flex-1"
        >
          {isEditing ? "Update Play Date" : "Create Play Date"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </Form>
  );
}
