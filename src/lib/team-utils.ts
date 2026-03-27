import { useStore } from '../store/useStore';

/**
 * Switch the active team context.
 * Sets localStorage preferred team and reloads the page so SupabaseSync
 * fetches data for the new team.
 */
export function switchToTeam(teamId: string) {
  localStorage.setItem('wholescale-preferred-team', teamId);
  // Update the store's teamId and reset dataLoaded.
  // SupabaseSync's useEffect now depends on [currentUser?.id, teamId],
  // so it will automatically re-run and fetch data for the new team without a full reload.
  const store = useStore.getState();
  store.setTeamId(teamId);
  useStore.setState({ dataLoaded: false });
}
