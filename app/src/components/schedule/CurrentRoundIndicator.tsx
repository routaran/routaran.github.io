import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, PlayCircle } from 'lucide-react';
import { Card, Badge, Progress } from '../common';
import { cn } from '../../lib/utils';

interface CurrentRoundIndicatorProps {
  currentRound: number;
  totalRounds: number;
  estimatedTimePerMatch?: number; // in minutes
  className?: string;
}

export function CurrentRoundIndicator({
  currentRound,
  totalRounds,
  estimatedTimePerMatch = 15,
  className
}: CurrentRoundIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [roundStartTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate elapsed time
  const elapsedMinutes = Math.floor(
    (currentTime.getTime() - roundStartTime.getTime()) / 60000
  );
  const elapsedTime = `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`;

  // Calculate progress
  const progress = ((currentRound - 1) / totalRounds) * 100;

  // Estimate remaining time
  const remainingRounds = totalRounds - currentRound + 1;
  const estimatedRemainingMinutes = remainingRounds * estimatedTimePerMatch;
  const estimatedRemainingTime = `${Math.floor(estimatedRemainingMinutes / 60)}h ${estimatedRemainingMinutes % 60}m`;

  return (
    <Card className={cn("p-4 bg-primary/5 border-primary/20", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <PlayCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Round {currentRound} of {totalRounds}</h3>
              <p className="text-sm text-muted-foreground">Currently in progress</p>
            </div>
          </div>
          
          <Badge variant="default" className="animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tournament Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Time Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Elapsed Time</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {elapsedTime}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Est. Remaining</p>
            <p className="font-medium flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              ~{estimatedRemainingTime}
            </p>
          </div>
        </div>

        {/* Mobile-friendly reminder */}
        <div className="md:hidden bg-background/50 rounded-md p-3 text-sm">
          <p className="text-muted-foreground">
            Check your schedule below for your next match
          </p>
        </div>
      </div>
    </Card>
  );
}