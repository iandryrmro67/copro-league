export const CAPTAIN_PICK_SECONDS = 60;
type Team = 'A' | 'B';
export type CaptainDraftState = {
  teams: Record<string, Team>;
  turn: number;
  deadline: number | null;
  now: number;
  automaticPlayerId: string | null;
};
export const emptyCaptainDraft: CaptainDraftState = { teams: {}, turn: 0, deadline: null, now: 0, automaticPlayerId: null };
type TurnAction = { playerIds: string[]; now: number; turn: number; deadline: number };
export type CaptainDraftAction =
  | { type: 'reset' }
  | { type: 'assign'; teams: Record<string, Team> }
  | { type: 'start'; captainA: string; captainB: string; playerIds: string[]; now: number }
  | ({ type: 'pick'; playerId: string } & TurnAction)
  | ({ type: 'tick'; random: number } & TurnAction)
  | { type: 'move'; playerId: string; team: Team };

function pick(state: CaptainDraftState, id: string, playerIds: string[], now: number, automatic: boolean): CaptainDraftState {
  const side: Team = state.turn % 2 === 0 ? 'A' : 'B';
  if (state.teams[id] || !playerIds.includes(id) || Object.values(state.teams).filter(team => team === side).length >= playerIds.length / 2) return state;
  const teams = { ...state.teams, [id]: side };
  return { teams, turn: state.turn + 1, deadline: playerIds.every(playerId => teams[playerId]) ? null : now + CAPTAIN_PICK_SECONDS * 1000, now, automaticPlayerId: automatic ? id : null };
}

export function captainDraftReducer(state: CaptainDraftState, action: CaptainDraftAction): CaptainDraftState {
  if (action.type === 'reset') return emptyCaptainDraft;
  if (action.type === 'assign') return { ...emptyCaptainDraft, teams: action.teams };
  if (action.type === 'move') return state.deadline === null && state.teams[action.playerId] ? { ...state, teams: { ...state.teams, [action.playerId]: action.team } } : state;
  if (action.type === 'start') {
    if (action.captainA === action.captainB || !action.playerIds.includes(action.captainA) || !action.playerIds.includes(action.captainB) || action.playerIds.length < 2 || action.playerIds.length % 2) return state;
    return { teams: { [action.captainA]: 'A', [action.captainB]: 'B' }, turn: 0, deadline: action.playerIds.length > 2 ? action.now + CAPTAIN_PICK_SECONDS * 1000 : null, now: action.now, automaticPlayerId: null };
  }
  // Stale timer ticks and rapid duplicate clicks cannot consume the following turn.
  if (state.deadline === null || action.turn !== state.turn || action.deadline !== state.deadline) return state;
  if (action.type === 'pick') return action.now < state.deadline ? pick(state, action.playerId, action.playerIds, action.now, false) : state;
  if (action.now < state.deadline) return { ...state, now: action.now };
  const available = action.playerIds.filter(id => !state.teams[id]);
  if (!available.length) return { ...state, deadline: null, now: action.now };
  const index = Math.min(available.length - 1, Math.max(0, Math.floor(action.random * available.length)));
  return pick(state, available[index], action.playerIds, action.now, true);
}
