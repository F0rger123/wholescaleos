/**
 * Team utility functions shared across components.
 * Kept in a separate file to avoid circular dependency issues.
 */

/**
 * Switch the active team context.
 * Sets localStorage preferred team and reloads the page so SupabaseSync
 * fetches data for the new team.
 */
export function switchToTeam(teamId: string) {
  localStorage.setItem('wholescale-preferred-team', teamId);
  // Reset dataLoaded so SupabaseSync re-fetches for the new team
  // Easiest/safest approach: full reload
  window.location.reload();
}
