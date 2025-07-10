import { supabase } from '../supabase';
import { logger } from '../logger';
import { monitor } from '../monitoring';
import type { Match, AuditLog } from '../../types/database';
import { validateMatchScore, type ScoreValidationConfig } from '../validation/scoreValidation';

export interface ScoreUpdateRequest {
  matchId: string;
  team1Score: number;
  team2Score: number;
  currentVersion: number;
  reason?: string;
  playDateId: string;
}

export interface ScoreUpdateResult {
  match: Match;
  auditLog: AuditLog;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ScoreHistoryEntry {
  id: string;
  matchId: string;
  changeType: string;
  oldValues: {
    team1Score: number | null;
    team2Score: number | null;
    version: number;
  };
  newValues: {
    team1Score: number | null;
    team2Score: number | null;
    version: number;
  };
  changedBy: string;
  changedAt: string;
  reason?: string;
  playerName?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Updates a match score with validation, optimistic locking, and audit logging
 */
export async function updateMatchScore(
  request: ScoreUpdateRequest,
  validationConfig: ScoreValidationConfig
): Promise<ScoreUpdateResult> {
  return await monitor.measureApiCall('updateMatchScore', async () => {
    const { matchId, team1Score, team2Score, currentVersion, reason, playDateId } = request;

    logger.info('Updating match score with validation', {
      component: 'supabase',
      action: 'updateMatchScore',
      matchId,
      playDateId,
      metadata: {
        team1Score,
        team2Score,
        version: currentVersion,
        reason,
      },
    });

    // Validate the score
    const validation = validateMatchScore(team1Score, team2Score, validationConfig);
    
    if (!validation.isValid) {
      logger.warn('Score validation failed', {
        component: 'supabase',
        action: 'updateMatchScore',
        matchId,
        metadata: {
          team1Score,
          team2Score,
          errors: validation.errors,
        },
      });
      
      throw new Error(`Invalid score: ${validation.errors.join(', ')}`);
    }

    // Get current user info for audit logging
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the current match data for audit logging
    const { data: currentMatch, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fetchError) {
      logger.error('Failed to fetch current match for audit', {
        component: 'supabase',
        action: 'updateMatchScore',
        matchId,
      }, fetchError);
      throw new Error(`Failed to fetch match: ${fetchError.message}`);
    }

    // Prepare audit log entry
    const auditLogEntry = {
      match_id: matchId,
      change_type: 'score_update',
      old_values: {
        team1Score: currentMatch.team1_score,
        team2Score: currentMatch.team2_score,
        version: currentMatch.version,
      },
      new_values: {
        team1Score,
        team2Score,
        version: currentVersion + 1,
      },
      changed_by: user.id,
      reason: reason || 'Score update',
      ip_address: null, // Would need to be passed from client
      user_agent: navigator.userAgent,
    };

    // Update match score with optimistic locking
    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update({
        team1_score: team1Score,
        team2_score: team2Score,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', matchId)
      .eq('version', currentVersion)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update match score', {
        component: 'supabase',
        action: 'updateMatchScore',
        matchId,
        metadata: {
          team1Score,
          team2Score,
          version: currentVersion,
          errorCode: updateError.code,
        },
      }, updateError);

      if (updateError.code === 'PGRST116') {
        throw new Error('Match was updated by another user. Please refresh and try again.');
      }
      throw new Error(`Failed to update match score: ${updateError.message}`);
    }

    // Log the audit entry
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_log')
      .insert(auditLogEntry)
      .select()
      .single();

    if (auditError) {
      logger.error('Failed to create audit log entry', {
        component: 'supabase',
        action: 'updateMatchScore',
        matchId,
      }, auditError);
      // Don't fail the entire operation if audit logging fails
    }

    logger.info('Successfully updated match score', {
      component: 'supabase',
      action: 'updateMatchScore',
      matchId,
      metadata: {
        team1Score,
        team2Score,
        newVersion: currentVersion + 1,
        hasWarnings: validation.warnings.length > 0,
      },
    });

    return {
      match: updatedMatch,
      auditLog: auditLog!,
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }, { component: 'supabase', matchId: request.matchId });
}

/**
 * Gets the score history for a match
 */
export async function getScoreHistory(matchId: string): Promise<ScoreHistoryEntry[]> {
  return await monitor.measureApiCall('getScoreHistory', async () => {
    logger.debug('Fetching score history', {
      component: 'supabase',
      action: 'getScoreHistory',
      matchId,
    });

    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        *,
        players!changed_by (name)
      `)
      .eq('match_id', matchId)
      .order('changed_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch score history', {
        component: 'supabase',
        action: 'getScoreHistory',
        matchId,
      }, error);
      throw new Error(`Failed to fetch score history: ${error.message}`);
    }

    const history = data.map(entry => ({
      id: entry.id,
      matchId: entry.match_id,
      changeType: entry.change_type,
      oldValues: entry.old_values as any,
      newValues: entry.new_values as any,
      changedBy: entry.changed_by,
      changedAt: entry.changed_at,
      reason: entry.reason,
      playerName: entry.players?.name,
      ipAddress: entry.ip_address,
      userAgent: entry.user_agent,
    }));

    logger.info('Successfully fetched score history', {
      component: 'supabase',
      action: 'getScoreHistory',
      matchId,
      metadata: { entryCount: history.length },
    });

    return history;
  }, { component: 'supabase', matchId });
}

/**
 * Checks if a user can update a match score
 */
export async function canUpdateMatchScore(
  matchId: string,
  userId: string
): Promise<{ canUpdate: boolean; reason?: string }> {
  try {
    logger.debug('Checking score update permissions', {
      component: 'supabase',
      action: 'canUpdateMatchScore',
      matchId,
      userId,
    });

    // Get match details with partnerships and players
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        partnership1:partnerships!partnership1_id (
          player1:players!player1_id (*),
          player2:players!player2_id (*)
        ),
        partnership2:partnerships!partnership2_id (
          player1:players!player1_id (*),
          player2:players!player2_id (*)
        )
      `)
      .eq('id', matchId)
      .single();

    if (error) {
      logger.error('Failed to fetch match for permission check', {
        component: 'supabase',
        action: 'canUpdateMatchScore',
        matchId,
        userId,
      }, error);
      return { canUpdate: false, reason: 'Match not found' };
    }

    // Check if user has a player claim for any player in the match
    const { data: playerClaims, error: claimsError } = await supabase
      .from('player_claims')
      .select(`
        *,
        player:players (*)
      `)
      .eq('auth_user_id', userId);

    if (claimsError) {
      logger.error('Failed to fetch player claims', {
        component: 'supabase',
        action: 'canUpdateMatchScore',
        matchId,
        userId,
      }, claimsError);
      return { canUpdate: false, reason: 'Failed to check permissions' };
    }

    // Check if user is one of the players in the match
    const playerIds = [
      match.partnership1.player1.id,
      match.partnership1.player2.id,
      match.partnership2.player1.id,
      match.partnership2.player2.id,
    ];

    const hasPlayerClaim = playerClaims.some(claim => 
      playerIds.includes(claim.player.id)
    );

    if (!hasPlayerClaim) {
      return { canUpdate: false, reason: 'Only players in the match can update scores' };
    }

    // Check if user is project owner (can update any score)
    const userPlayerClaim = playerClaims.find(claim => 
      playerIds.includes(claim.player.id)
    );

    if (userPlayerClaim?.player.project_owner) {
      return { canUpdate: true };
    }

    return { canUpdate: true };
  } catch (error) {
    logger.error('Error checking score update permissions', {
      component: 'supabase',
      action: 'canUpdateMatchScore',
      matchId,
      userId,
    }, error);
    return { canUpdate: false, reason: 'Permission check failed' };
  }
}

/**
 * Gets matches that a user can update scores for
 */
export async function getUserEditableMatches(
  playDateId: string,
  userId: string
): Promise<string[]> {
  try {
    logger.debug('Getting user editable matches', {
      component: 'supabase',
      action: 'getUserEditableMatches',
      playDateId,
      userId,
    });

    // Get user's player claims for this play date
    const { data: playerClaims, error: claimsError } = await supabase
      .from('player_claims')
      .select(`
        *,
        player:players!inner (
          id,
          play_date_id,
          project_owner
        )
      `)
      .eq('auth_user_id', userId)
      .eq('player.play_date_id', playDateId);

    if (claimsError) {
      logger.error('Failed to fetch player claims', {
        component: 'supabase',
        action: 'getUserEditableMatches',
        playDateId,
        userId,
      }, claimsError);
      return [];
    }

    if (playerClaims.length === 0) {
      return [];
    }

    // If user is project owner, they can edit all matches
    if (playerClaims.some(claim => claim.player.project_owner)) {
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id')
        .eq('play_date_id', playDateId);

      if (matchesError) {
        logger.error('Failed to fetch all matches for project owner', {
          component: 'supabase',
          action: 'getUserEditableMatches',
          playDateId,
          userId,
        }, matchesError);
        return [];
      }

      return matches.map(match => match.id);
    }

    // Get matches where user is a player
    const playerIds = playerClaims.map(claim => claim.player.id);
    
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        partnership1:partnerships!partnership1_id (
          player1_id,
          player2_id
        ),
        partnership2:partnerships!partnership2_id (
          player1_id,
          player2_id
        )
      `)
      .eq('play_date_id', playDateId);

    if (matchesError) {
      logger.error('Failed to fetch matches for player', {
        component: 'supabase',
        action: 'getUserEditableMatches',
        playDateId,
        userId,
      }, matchesError);
      return [];
    }

    const editableMatches = matches.filter(match => {
      const matchPlayerIds = [
        match.partnership1.player1_id,
        match.partnership1.player2_id,
        match.partnership2.player1_id,
        match.partnership2.player2_id,
      ];
      return matchPlayerIds.some(id => playerIds.includes(id));
    });

    return editableMatches.map(match => match.id);
  } catch (error) {
    logger.error('Error getting user editable matches', {
      component: 'supabase',
      action: 'getUserEditableMatches',
      playDateId,
      userId,
    }, error);
    return [];
  }
}

/**
 * Validates that a score update is allowed based on business rules
 */
export function validateScoreUpdate(
  currentScore: { team1: number | null; team2: number | null },
  newScore: { team1: number; team2: number },
  config: ScoreValidationConfig
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if match already has a final score
  if (currentScore.team1 !== null && currentScore.team2 !== null) {
    const currentValidation = validateMatchScore(currentScore.team1, currentScore.team2, config);
    if (currentValidation.isValid) {
      warnings.push('Match already has a valid final score');
    }
  }

  // Validate the new score
  const newValidation = validateMatchScore(newScore.team1, newScore.team2, config);
  errors.push(...newValidation.errors);
  warnings.push(...newValidation.warnings);

  // Check for significant score changes
  if (currentScore.team1 !== null && currentScore.team2 !== null) {
    const team1Change = Math.abs(newScore.team1 - currentScore.team1);
    const team2Change = Math.abs(newScore.team2 - currentScore.team2);
    
    if (team1Change > 5 || team2Change > 5) {
      warnings.push('Large score change detected - please verify accuracy');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}