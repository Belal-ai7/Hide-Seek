// Simplified game models matching the Flask backend API

export interface SolveResponse {
  status: 'ok';
  num_places: number;
  payoff_matrix: number[][];
  probabilities: number[];
  game_value: number;
}

export interface PlayResponse {
  status: 'ok';
  opponent_place: number;
  winner: 'hider' | 'seeker';
  message: string;
  // Score tracking fields
  player_score: number;
  computer_score: number;
  rounds_won_player: number;
  rounds_won_computer: number;
  total_rounds: number;
}

export interface SimulateResponse {
  status: 'ok';
  total_rounds: number;
  player_score: number;
  computer_score: number;
  rounds_won_player: number;
  rounds_won_computer: number;
  // Cumulative state
  player_score_total: number;
  computer_score_total: number;
  rounds_won_player_total: number;
  rounds_won_computer_total: number;
  total_rounds_total: number;
}

export interface ResetResponse {
  status: 'ok';
  message: string;
  player_score: number;
  computer_score: number;
  rounds_won_player: number;
  rounds_won_computer: number;
  total_rounds: number;
}

export interface StateResponse {
  status: 'ok';
  player_score: number;
  computer_score: number;
  rounds_won_player: number;
  rounds_won_computer: number;
  total_rounds: number;
}

export interface GameState {
  numPlaces: number;
  places: Place[];
  playerRole: 'hider' | 'seeker' | null;
  selectedPosition: number | null;
  isRoundPlayed: boolean;
  lastRoundResult: RoundResult | null;
  playerScore: number;
  computerScore: number;
  roundsWonPlayer: number;
  roundsWonComputer: number;
  totalRounds: number;
  viewMode: '1D' | '2D';
  payoffMatrix: number[][];
  probabilities: number[];
  gameValue: number;
}

export interface Place {
  id: number;
  type: 'easy' | 'neutral' | 'hard';
}

export interface RoundResult {
  playerPosition: number;
  opponentPosition: number;
  winner: 'player' | 'computer';
  message: string;
}

export interface SimulationResult {
  totalRounds: number;
  playerScore: number;
  computerScore: number;
  roundsWonPlayer: number;
  roundsWonComputer: number;
}