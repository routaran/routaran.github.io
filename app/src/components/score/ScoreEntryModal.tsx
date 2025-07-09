import React from 'react';
import { Modal, ModalBody } from '../common/Modal';
import { ScoreEntryForm } from './ScoreEntryForm';
import type { Match, WinCondition } from '../../types/database';

export interface ScoreEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  playDateId: string;
  winCondition: WinCondition;
  targetScore: number;
  onScoreUpdated?: (match: Match) => void;
}

export function ScoreEntryModal({
  isOpen,
  onClose,
  match,
  playDateId,
  winCondition,
  targetScore,
  onScoreUpdated,
}: ScoreEntryModalProps) {
  const handleScoreUpdated = (updatedMatch: Match) => {
    onScoreUpdated?.(updatedMatch);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enter Match Score"
      size="lg"
      closeOnOverlayClick={false} // Prevent accidental closes during score entry
      closeOnEscape={true}
    >
      <ModalBody className="p-0">
        <ScoreEntryForm
          match={match}
          playDateId={playDateId}
          winCondition={winCondition}
          targetScore={targetScore}
          onScoreUpdated={handleScoreUpdated}
          onClose={onClose}
        />
      </ModalBody>
    </Modal>
  );
}