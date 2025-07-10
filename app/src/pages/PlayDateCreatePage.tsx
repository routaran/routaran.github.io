import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePlayDate } from "../hooks/usePlayDate";
import { PlayDateForm } from "../components/playdate/PlayDateForm";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import type { PlayDateInsert, PlayerInsert } from "../types/database";

export function PlayDateCreatePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createPlayDate, loading } = usePlayDate();

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSubmit = async (
    data: PlayDateInsert,
    players: PlayerInsert[]
  ) => {
    await createPlayDate(data, players);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Play Date
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Set up a new pickleball tournament with round-robin scheduling
          </p>
        </div>

        {/* Form */}
        <Card className="p-6">
          <PlayDateForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </Card>

        {/* Help text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• A round-robin schedule will be automatically generated</li>
            <li>
              • Each partnership will play against every other partnership
              exactly once
            </li>
            <li>• Players can log in with their email to enter scores</li>
            <li>• Live rankings will update as matches are completed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
