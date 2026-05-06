import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Place {
  id: number;
  type: 'easy' | 'neutral' | 'hard';
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly API_URL = 'http://localhost:5000/api';

  // --- Signals for UI State ---
  private numPlaces = signal<number>(4);
  private places = signal<Place[]>([]);
  private payoffMatrix = signal<number[][]>([]);
  private probabilities = signal<number[]>([]);
  private gameValue = signal<number>(0);
  
  private playerScore = signal<number>(0);
  private computerScore = signal<number>(0);
  private roundsWonPlayer = signal<number>(0);
  private roundsWonComputer = signal<number>(0);
  private totalRounds = signal<number>(0);

  private playerRole = signal<'hider' | 'seeker' | null>(null);
  private selectedPosition = signal<number | null>(null);
  private isRoundPlayed = signal<boolean>(false);
  private lastRoundResult = signal<{
    playerPosition: number;
    opponentPosition: number;
    winner: 'player' | 'computer';
    message: string;
  } | null>(null);

  private viewMode = signal<'1D' | '2D'>('1D');
  private isSimulating = signal<boolean>(false);
  private simulationProgress = signal<number>(0);
  private simulationResult = signal<{
    totalRounds: number;
    playerScore: number;
    computerScore: number;
    roundsWonPlayer: number;
    roundsWonComputer: number;
  } | null>(null);

  // --- Computed Values for Components ---
  readonly numPlacesValue = computed(() => this.numPlaces());
  readonly placesValue = computed(() => this.places());
  readonly matrix = computed(() => this.payoffMatrix());
  readonly probs = computed(() => this.probabilities());
  readonly gameValueAmount = computed(() => this.gameValue());
  readonly score = computed(() => ({
    player: this.playerScore(),
    computer: this.computerScore(),
    playerWins: this.roundsWonPlayer(),
    computerWins: this.roundsWonComputer(),
    total: this.totalRounds()
  }));
  readonly playerRoleValue = computed(() => this.playerRole());
  readonly selectedPositionValue = computed(() => this.selectedPosition());
  readonly isRoundPlayedValue = computed(() => this.isRoundPlayed());
  readonly lastRoundResultValue = computed(() => this.lastRoundResult());
  readonly viewModeValue = computed(() => this.viewMode());
  readonly isSimulatingValue = computed(() => this.isSimulating());
  readonly simulationProgressValue = computed(() => this.simulationProgress());
  readonly simulationResultValue = computed(() => this.simulationResult());

  constructor(private http: HttpClient) {}

  // Initialize world with given number of places
  initializeWorld(numPlaces: number): void {
    this.numPlaces.set(numPlaces);
    // Generate placeholder places (types will be determined by backend on solve)
    const places: Place[] = Array.from({ length: numPlaces }, (_, i) => ({
      id: i,
      type: 'neutral' as const
    }));
    this.places.set(places);
    this.resetRound();
  }

  // Set player role
  setPlayerRole(role: 'hider' | 'seeker'): void {
    this.playerRole.set(role);
  }

  // Toggle view mode
  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === '1D' ? '2D' : '1D');
  }

  // Make player choice
  makePlayerChoice(position: number): void {
    this.selectedPosition.set(position);
  }

  // Reset current round
  resetRound(): void {
    this.selectedPosition.set(null);
    this.isRoundPlayed.set(false);
    this.lastRoundResult.set(null);
  }

  // 1. POST /api/solve - Solve the game and get optimal strategy
  solveGame(): void {
    this.solveAndThen();
  }

  /**
   * Calls /api/solve and, on success, runs the optional callback.
   * Used by simulation mode to chain solve → simulate atomically.
   */
  solveAndThen(onSuccess?: () => void): void {
    const numPlaces = this.numPlaces();
    const role = this.playerRole();

    this.http.post<any>(`${this.API_URL}/solve`, {
      num_places: numPlaces,
      player_role: role
    }).subscribe(res => {
      if (res.status === 'ok') {
        this.payoffMatrix.set(res.payoff_matrix);
        this.probabilities.set(res.probabilities);
        this.gameValue.set(res.game_value);
        this.updatePlaceTypesFromMatrix(res.payoff_matrix);
        onSuccess?.();
      }
    });
  }

  // 2. POST /api/play - Play a single round
  playRound(): void {
    const role = this.playerRole();
    const place = this.selectedPosition();
    const numPlaces = this.numPlaces();

    if (!role || place === null) return;

    this.http.post<any>(`${this.API_URL}/play`, { 
      role, 
      place, 
      num_places: numPlaces 
    }).subscribe(res => {
      if (res.status === 'ok') {
        this.updateLocalState(res);
        this.isRoundPlayed.set(true);
        
        // Determine player and opponent positions based on role
        const playerPosition = place;
        const opponentPosition = res.opponent_place;
        const playerWon = res.winner === role;

        this.lastRoundResult.set({
          playerPosition,
          opponentPosition,
          winner: playerWon ? 'player' : 'computer',
          message: res.message
        });
      }
    });
  }

  // 3. POST /api/simulate - Run simulation
  simulateGame(numRounds: number = 100): void {
    const numPlaces = this.numPlaces();
    this.isSimulating.set(true);
    this.simulationProgress.set(0);

    this.http.post<any>(`${this.API_URL}/simulate`, { 
      num_places: numPlaces, 
      num_rounds: numRounds 
    }).subscribe(res => {
      if (res.status === 'ok') {
        this.updateLocalState(res);
        this.simulationResult.set({
          totalRounds: res.total_rounds,
          playerScore: res.player_score,
          computerScore: res.computer_score,
          roundsWonPlayer: res.rounds_won_player,
          roundsWonComputer: res.rounds_won_computer
        });
        this.simulationProgress.set(numRounds);
      }
      this.isSimulating.set(false);
    });
  }

  // 4. POST /api/reset - Reset all game state
  resetGame(): void {
    this.http.post<any>(`${this.API_URL}/reset`, {}).subscribe(res => {
      if (res.status === 'ok') {
        this.updateLocalState(res);
        this.payoffMatrix.set([]);
        this.probabilities.set([]);
        this.gameValue.set(0);
        this.simulationResult.set(null);
        this.simulationProgress.set(0);
        this.resetRound();
      }
    });
  }

  // 5. GET /api/state - Sync state from server
  syncState(): void {
    this.http.get<any>(`${this.API_URL}/state`).subscribe(res => {
      if (res.status === 'ok') {
        this.updateLocalState(res);
      }
    });
  }

  // Helper to update score state from response
  private updateLocalState(res: any): void {
    if (res.player_score !== undefined) this.playerScore.set(res.player_score);
    if (res.computer_score !== undefined) this.computerScore.set(res.computer_score);
    if (res.rounds_won_player !== undefined) this.roundsWonPlayer.set(res.rounds_won_player);
    if (res.rounds_won_computer !== undefined) this.roundsWonComputer.set(res.rounds_won_computer);
    if (res.total_rounds !== undefined) this.totalRounds.set(res.total_rounds);
  }

  // Helper to determine place types from payoff matrix diagonal
  private updatePlaceTypesFromMatrix(matrix: number[][]): void {
    const places = this.places();
    const updatedPlaces = places.map((place, i) => {
      // Check diagonal value to determine type
      const diagonalValue = matrix[i]?.[i] ?? 0;
      let type: 'easy' | 'neutral' | 'hard' = 'neutral';
      
      if (diagonalValue === -1) {
        // Could be easy or neutral - check off-diagonal values
        const offDiagValue = matrix[i]?.find((val, j) => j !== i) ?? 0;
        type = offDiagValue === 2 ? 'easy' : 'neutral';
      } else if (diagonalValue === -3) {
        type = 'hard';
      }
      
      return { ...place, type };
    });
    this.places.set(updatedPlaces);
  }

  // Get payoff matrix for display
  getPayoffMatrix(): number[][] {
    return this.payoffMatrix();
  }
}