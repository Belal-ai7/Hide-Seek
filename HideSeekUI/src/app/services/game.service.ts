import { Injectable, signal, computed } from '@angular/core';

export type PlaceType = 'hard' | 'neutral' | 'easy';
export type PlayerRole = 'hider' | 'seeker' | null;
export type GameMode = 'interactive' | 'simulation' | null;

export interface Place {
  id: number;
  type: PlaceType;
  hiderScore: number;
  seekerScore: number;
}

export interface GameResult {
  hiderChoice: number;
  seekerChoice: number;
  hiderScore: number;
  seekerScore: number;
  roundWinner: 'hider' | 'seeker' | 'draw';
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // Game configuration signals
  private worldSize = signal<number>(4);
  private places = signal<Place[]>([]);
  private playerRole = signal<PlayerRole>(null);
  private gameMode = signal<GameMode>(null);
  
  // Game state signals
  private playerChoice = signal<number | null>(null);
  private computerChoice = signal<number | null>(null);
  private gameResult = signal<GameResult | null>(null);
  private isGameStarted = signal<boolean>(false);
  private isRoundPlayed = signal<boolean>(false);
  
  // Score tracking
  private playerTotalScore = signal<number>(0);
  private computerTotalScore = signal<number>(0);
  private roundsWon = signal<number>(0);
  private computerRoundsWon = signal<number>(0);
  private totalRounds = signal<number>(0);
  
  // Simulation mode
  private simulationRounds = signal<number>(100);
  private simulationResults = signal<GameResult[]>([]);
  
  // Computed values
  readonly worldSizeValue = computed(() => this.worldSize());
  readonly placesValue = computed(() => this.places());
  readonly playerRoleValue = computed(() => this.playerRole());
  readonly gameModeValue = computed(() => this.gameMode());
  readonly playerChoiceValue = computed(() => this.playerChoice());
  readonly computerChoiceValue = computed(() => this.computerChoice());
  readonly gameResultValue = computed(() => this.gameResult());
  readonly isGameStartedValue = computed(() => this.isGameStarted());
  readonly isRoundPlayedValue = computed(() => this.isRoundPlayed());
  readonly playerTotalScoreValue = computed(() => this.playerTotalScore());
  readonly computerTotalScoreValue = computed(() => this.computerTotalScore());
  readonly roundsWonValue = computed(() => this.roundsWon());
  readonly computerRoundsWonValue = computed(() => this.computerRoundsWon());
  readonly totalRoundsValue = computed(() => this.totalRounds());
  readonly simulationRoundsValue = computed(() => this.simulationRounds());
  readonly simulationResultsValue = computed(() => this.simulationResults());

  // Initialize the game world
  initializeWorld(size: number): void {
    this.worldSize.set(size);
    const newPlaces: Place[] = [];
    
    for (let i = 0; i < size; i++) {
      const type = this.randomPlaceType();
      const scores = this.getScoresForType(type);
      
      newPlaces.push({
        id: i,
        type,
        hiderScore: scores.hider,
        seekerScore: scores.seeker
      });
    }
    
    this.places.set(newPlaces);
    this.resetRound();
  }

  // Get scores based on place type
  private getScoresForType(type: PlaceType): { hider: number; seeker: number } {
    switch (type) {
      case 'hard':
        return { hider: 1, seeker: 3 }; // Hard for seeker: seeker gets more, hider gets less
      case 'neutral':
        return { hider: 2, seeker: 2 }; // Neutral: equal scores
      case 'easy':
        return { hider: 3, seeker: 1 }; // Easy for seeker: hider gets more, seeker gets less
      default:
        return { hider: 2, seeker: 2 };
    }
  }

  // Random place type generation
  private randomPlaceType(): PlaceType {
    const rand = Math.random();
    if (rand < 0.33) return 'hard';
    if (rand < 0.66) return 'neutral';
    return 'easy';
  }

  // Set player role
  setPlayerRole(role: PlayerRole): void {
    this.playerRole.set(role);
    this.isGameStarted.set(true);
  }

  // Set game mode
  setGameMode(mode: GameMode): void {
    this.gameMode.set(mode);
  }

  // Player makes a choice
  makePlayerChoice(position: number): void {
    if (position < 0 || position >= this.worldSize()) {
      throw new Error('Invalid position');
    }
    this.playerChoice.set(position);
  }

  // Computer makes a choice using simple random strategy (can be enhanced with LP)
  makeComputerChoice(): number {
    const computerPosition = Math.floor(Math.random() * this.worldSize());
    this.computerChoice.set(computerPosition);
    return computerPosition;
  }

  // Play a round
  playRound(): GameResult {
    const playerPos = this.playerChoice();
    if (playerPos === null) {
      throw new Error('Player must make a choice first');
    }

    const computerPos = this.makeComputerChoice();
    const places = this.places();
    
    let hiderScore = 0;
    let seekerScore = 0;
    let roundWinner: 'hider' | 'seeker' | 'draw' = 'draw';

    if (this.playerRole() === 'hider') {
      // Player is hider, computer is seeker
      if (playerPos === computerPos) {
        // Seeker found hider
        seekerScore = places[computerPos].seekerScore;
        hiderScore = -seekerScore; // Hider loses points
        roundWinner = 'seeker';
      } else {
        // Hider not found
        hiderScore = places[playerPos].hiderScore;
        seekerScore = -hiderScore; // Seeker loses points
        roundWinner = 'hider';
      }
      
      // Apply proximity bonus (bonus feature)
      const distance = Math.abs(playerPos - computerPos);
      if (distance === 1) {
        hiderScore = Math.round(hiderScore * 0.5 * 100) / 100;
      } else if (distance === 2) {
        hiderScore = Math.round(hiderScore * 0.75 * 100) / 100;
      }
      
      this.playerTotalScore.update(s => s + hiderScore);
      this.computerTotalScore.update(s => s + seekerScore);
      
    } else {
      // Player is seeker, computer is hider
      if (playerPos === computerPos) {
        // Seeker found hider
        seekerScore = places[playerPos].seekerScore;
        hiderScore = -seekerScore;
        roundWinner = 'seeker';
      } else {
        // Hider not found
        hiderScore = places[computerPos].hiderScore;
        seekerScore = -hiderScore;
        roundWinner = 'hider';
      }
      
      // Apply proximity bonus
      const distance = Math.abs(playerPos - computerPos);
      if (distance === 1) {
        hiderScore = Math.round(hiderScore * 0.5 * 100) / 100;
      } else if (distance === 2) {
        hiderScore = Math.round(hiderScore * 0.75 * 100) / 100;
      }
      
      this.playerTotalScore.update(s => s + seekerScore);
      this.computerTotalScore.update(s => s + hiderScore);
    }

    const result: GameResult = {
      hiderChoice: this.playerRole() === 'hider' ? playerPos : computerPos,
      seekerChoice: this.playerRole() === 'seeker' ? playerPos : computerPos,
      hiderScore,
      seekerScore,
      roundWinner
    };

    this.gameResult.set(result);
    this.isRoundPlayed.set(true);
    this.totalRounds.update(r => r + 1);
    
    if (roundWinner === 'hider') {
      if (this.playerRole() === 'hider') {
        this.roundsWon.update(r => r + 1);
      } else {
        this.computerRoundsWon.update(r => r + 1);
      }
    } else if (roundWinner === 'seeker') {
      if (this.playerRole() === 'seeker') {
        this.roundsWon.update(r => r + 1);
      } else {
        this.computerRoundsWon.update(r => r + 1);
      }
    }

    return result;
  }

  // Reset round for new game
  resetRound(): void {
    this.playerChoice.set(null);
    this.computerChoice.set(null);
    this.gameResult.set(null);
    this.isRoundPlayed.set(false);
  }

  // Reset entire game
  resetGame(): void {
    this.playerRole.set(null);
    this.gameMode.set(null);
    this.playerTotalScore.set(0);
    this.computerTotalScore.set(0);
    this.roundsWon.set(0);
    this.computerRoundsWon.set(0);
    this.totalRounds.set(0);
    this.simulationResults.set([]);
    this.resetRound();
    this.isGameStarted.set(false);
  }

  // Run simulation mode
  runSimulation(rounds: number = 100): GameResult[] {
    this.simulationRounds.set(rounds);
    const results: GameResult[] = [];
    
    for (let i = 0; i < rounds; i++) {
      // Random choices for both players
      const hiderChoice = Math.floor(Math.random() * this.worldSize());
      const seekerChoice = Math.floor(Math.random() * this.worldSize());
      
      this.playerChoice.set(hiderChoice);
      this.computerChoice.set(seekerChoice);
      
      const places = this.places();
      let hiderScore = 0;
      let seekerScore = 0;
      let roundWinner: 'hider' | 'seeker' | 'draw' = 'draw';
      
      if (hiderChoice === seekerChoice) {
        seekerScore = places[seekerChoice].seekerScore;
        hiderScore = -seekerScore;
        roundWinner = 'seeker';
      } else {
        hiderScore = places[hiderChoice].hiderScore;
        seekerScore = -hiderScore;
        roundWinner = 'hider';
      }
      
      // Apply proximity bonus
      const distance = Math.abs(hiderChoice - seekerChoice);
      if (distance === 1) {
        hiderScore = Math.round(hiderScore * 0.5 * 100) / 100;
      } else if (distance === 2) {
        hiderScore = Math.round(hiderScore * 0.75 * 100) / 100;
      }
      
      this.playerTotalScore.update(s => s + hiderScore);
      this.computerTotalScore.update(s => s + seekerScore);
      this.totalRounds.update(r => r + 1);
      
      if (roundWinner === 'hider') {
        this.roundsWon.update(r => r + 1);
      } else if (roundWinner === 'seeker') {
        this.computerRoundsWon.update(r => r + 1);
      }
      
      results.push({
        hiderChoice,
        seekerChoice,
        hiderScore,
        seekerScore,
        roundWinner
      });
    }
    
    this.simulationResults.set(results);
    return results;
  }

  // Get payoff matrix for display
  getPayoffMatrix(): number[][] {
    const size = this.worldSize();
    const places = this.places();
    const matrix: number[][] = [];
    
    for (let hiderPos = 0; hiderPos < size; hiderPos++) {
      const row: number[] = [];
      for (let seekerPos = 0; seekerPos < size; seekerPos++) {
        if (hiderPos === seekerPos) {
          // Seeker found hider - hider loses
          row.push(-places[seekerPos].seekerScore);
        } else {
          // Hider not found - hider gains
          row.push(places[hiderPos].hiderScore);
        }
      }
      matrix.push(row);
    }
    
    return matrix;
  }
}