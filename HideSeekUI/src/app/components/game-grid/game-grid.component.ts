import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, Place } from '../../services/game.service';

@Component({
  selector: 'app-game-grid',
  imports: [CommonModule, FormsModule],
  templateUrl: './game-grid.component.html',
  styleUrl: './game-grid.component.css'
})
export class GameGridComponent implements OnInit {
  private gameService = inject(GameService);

  // UI State
  worldSizeInput = signal<number>(4);
  showSetup = signal<boolean>(true);
  showGame = signal<boolean>(false);
  showResults = signal<boolean>(false);
  simulationMode = signal<boolean>(false);

  // Game state from service
  places = this.gameService.placesValue;
  numPlaces = this.gameService.numPlacesValue;
  playerRole = this.gameService.playerRoleValue;
  selectedPosition = this.gameService.selectedPositionValue;
  isRoundPlayed = this.gameService.isRoundPlayedValue;
  lastRoundResult = this.gameService.lastRoundResultValue;
 playerScore = computed(() => this.gameService.score().player);
computerScore = computed(() => this.gameService.score().computer);
roundsWonPlayer = computed(() => this.gameService.score().playerWins);
roundsWonComputer = computed(() => this.gameService.score().computerWins);
totalRounds = computed(() => this.gameService.score().total);
  probabilities = this.gameService.probs;
  viewMode = this.gameService.viewModeValue;
  isSimulating = this.gameService.isSimulatingValue;
  simulationProgress = this.gameService.simulationProgressValue;
  simulationResult = this.gameService.simulationResultValue;

  // Payoff matrix for display
  payoffMatrix = computed(() => this.gameService.getPayoffMatrix());

  // Computed array for matrix header iteration
  matrixHeaders = computed(() => {
    const size = this.numPlaces();
    return Array.from({ length: size }, (_, i) => i + 1);
  });

  // Computed grid layout for 2D view
  gridLayout = computed(() => {
    const places = this.places();
    const currentViewMode = this.viewMode();
    
    if (currentViewMode === '1D') {
      return [places];
    }
    
    // 2D layout - calculate grid dimensions
    const size = places.length;
    const cols = Math.ceil(Math.sqrt(size));
    const rows = Math.ceil(size / cols);
    
    const grid: (Place | null)[][] = [];
    for (let row = 0; row < rows; row++) {
      const rowData: (Place | null)[] = [];
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        rowData.push(index < size ? places[index] : null);
      }
      grid.push(rowData);
    }
    return grid;
  });

  ngOnInit(): void {
    this.gameService.initializeWorld(4);
  }

  get placeTypes(): { type: 'easy' | 'neutral' | 'hard'; label: string; color: string; description: string }[] {
    return [
      { type: 'hard', label: 'Hard', color: '#ef4444', description: 'Hard for seeker (hider advantage)' },
      { type: 'neutral', label: 'Neutral', color: '#f59e0b', description: 'Balanced' },
      { type: 'easy', label: 'Easy', color: '#22c55e', description: 'Easy for seeker (seeker advantage)' }
    ];
  }

  getPlaceColor(place: Place): string {
    switch (place.type) {
      case 'hard': return '#fef2f2';
      case 'neutral': return '#fffbeb';
      case 'easy': return '#f0fdf4';
      default: return '#ffffff';
    }
  }

  getPlaceBorderColor(place: Place): string {
    switch (place.type) {
      case 'hard': return '#ef4444';
      case 'neutral': return '#f59e0b';
      case 'easy': return '#22c55e';
      default: return '#e5e7eb';
    }
  }

  getPlaceTypeLabel(type: string): string {
    switch (type) {
      case 'hard': return 'Hard';
      case 'neutral': return 'Neutral';
      case 'easy': return 'Easy';
      default: return type;
    }
  }

  // Format probability as percentage
  formatProbability(prob: number | undefined): string {
    if (prob === undefined || prob === null) return '';
    return (prob * 100).toFixed(1) + '%';
  }

  // Get probability display class
  getProbabilityClass(prob: number | undefined): string {
    if (prob === undefined || prob === null) return '';
    const pct = prob * 100;
    if (pct > 30) return 'prob-high';
    if (pct > 10) return 'prob-medium';
    return 'prob-low';
  }

  // Setup methods
  setWorldSize(size: number): void {
    this.worldSizeInput.set(size);
    this.gameService.initializeWorld(size);
  }

  selectRole(role: 'hider' | 'seeker'): void {
    this.gameService.setPlayerRole(role);
    this.showSetup.set(false);
    this.showGame.set(true);
    // Solve the game once role is selected
    this.gameService.solveGame();
  }

  toggleSimulationMode(): void {
    this.simulationMode.set(!this.simulationMode());
  }

  toggleViewMode(): void {
    this.gameService.toggleViewMode();
  }

  // Game methods
  selectPosition(position: number): void {
    if (this.isRoundPlayed()) return;
    
    this.gameService.makePlayerChoice(position);
  }

  playRound(): void {
    if (this.selectedPosition() === null) {
      alert('Please select a position first!');
      return;
    }

    this.gameService.playRound();
    this.showResults.set(true);
  }

  playNextRound(): void {
    this.gameService.resetRound();
    this.showResults.set(false);
  }

  resetGame(): void {
    this.gameService.resetGame();
    this.gameService.initializeWorld(this.worldSizeInput());
    this.showSetup.set(true);
    this.showGame.set(false);
    this.showResults.set(false);
  }

  runSimulation(): void {
    this.gameService.resetGame();
    this.gameService.initializeWorld(this.worldSizeInput());
    this.gameService.simulateGame(100);
    this.showGame.set(true);
    this.showResults.set(true);
  }

  // Get result message
  getResultMessage(): string {
    const result = this.lastRoundResult();
    if (!result) return '';
    return result.message;
  }

  // Get simulation stats
  getSimulationStats(): { wins: number; losses: number; winRate: number } {
    const result = this.simulationResult();
    if (!result) {
      return { wins: 0, losses: 0, winRate: 0 };
    }
    const winRate = result.totalRounds > 0 
      ? (result.roundsWonPlayer / result.totalRounds * 100) 
      : 0;
    
    return { 
      wins: result.roundsWonPlayer, 
      losses: result.roundsWonComputer, 
      winRate 
    };
  }
}