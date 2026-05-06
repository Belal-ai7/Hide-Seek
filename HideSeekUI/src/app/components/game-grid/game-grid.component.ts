import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, Place, PlaceType, GameResult } from '../../services/game.service';

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
  selectedPosition = signal<number | null>(null);
  showSetup = signal<boolean>(true);
  showGame = signal<boolean>(false);
  showResults = signal<boolean>(false);
  simulationMode = signal<boolean>(false);

  // Game state from service
  places = this.gameService.placesValue;
  worldSize = this.gameService.worldSizeValue;
  playerRole = this.gameService.playerRoleValue;
  gameResult = this.gameService.gameResultValue;
  isRoundPlayed = this.gameService.isRoundPlayedValue;
  playerTotalScore = this.gameService.playerTotalScoreValue;
  computerTotalScore = this.gameService.computerTotalScoreValue;
  roundsWon = this.gameService.roundsWonValue;
  computerRoundsWon = this.gameService.computerRoundsWonValue;
  totalRounds = this.gameService.totalRoundsValue;
  simulationResults = this.gameService.simulationResultsValue;

  // Payoff matrix for display
  payoffMatrix = signal<number[][]>([]);

  // Computed array for matrix header iteration
  matrixHeaders = computed(() => {
    const size = this.worldSize();
    return Array.from({ length: size }, (_, i) => i + 1);
  });

  ngOnInit(): void {
    this.gameService.initializeWorld(4);
    this.updatePayoffMatrix();
  }

  get placeTypes(): { type: PlaceType; label: string; color: string; description: string }[] {
    return [
      { type: 'hard', label: 'Hard', color: '#ef4444', description: 'Hard for seeker' },
      { type: 'neutral', label: 'Neutral', color: '#f59e0b', description: 'Neutral' },
      { type: 'easy', label: 'Easy', color: '#22c55e', description: 'Easy for seeker' }
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

  getPlaceTypeLabel(type: PlaceType): string {
    switch (type) {
      case 'hard': return 'Hard';
      case 'neutral': return 'Neutral';
      case 'easy': return 'Easy';
    }
  }

  // Setup methods
  setWorldSize(size: number): void {
    this.worldSizeInput.set(size);
    this.gameService.initializeWorld(size);
    this.updatePayoffMatrix();
  }

  selectRole(role: 'hider' | 'seeker'): void {
    this.gameService.setPlayerRole(role);
    this.showSetup.set(false);
    this.showGame.set(true);
  }

  toggleSimulationMode(): void {
    this.simulationMode.set(!this.simulationMode());
  }

  // Game methods
  selectPosition(position: number): void {
    if (this.isRoundPlayed()) return;
    
    this.selectedPosition.set(position);
    this.gameService.makePlayerChoice(position);
  }

  playRound(): void {
    if (this.selectedPosition() === null) {
      alert('Please select a position first!');
      return;
    }

    this.gameService.playRound();
    this.showResults.set(true);
    this.updatePayoffMatrix();
  }

  playNextRound(): void {
    this.gameService.resetRound();
    this.selectedPosition.set(null);
    this.showResults.set(false);
  }

  resetGame(): void {
    this.gameService.resetGame();
    this.gameService.initializeWorld(this.worldSizeInput());
    this.showSetup.set(true);
    this.showGame.set(false);
    this.showResults.set(false);
    this.selectedPosition.set(null);
    this.updatePayoffMatrix();
  }

  runSimulation(): void {
    this.gameService.resetGame();
    this.gameService.initializeWorld(this.worldSizeInput());
    this.gameService.runSimulation(100);
    this.showGame.set(true);
    this.showResults.set(true);
    this.updatePayoffMatrix();
  }

  private updatePayoffMatrix(): void {
    const matrix = this.gameService.getPayoffMatrix();
    this.payoffMatrix.set(matrix);
  }

  // Get result message
  getResultMessage(): string {
    const result = this.gameResult();
    if (!result) return '';

    const playerRole = this.playerRole();
    if (result.roundWinner === 'draw') {
      return "It's a draw!";
    }

    const playerWon = (playerRole === 'hider' && result.roundWinner === 'hider') ||
                      (playerRole === 'seeker' && result.roundWinner === 'seeker');

    if (playerWon) {
      return `You won! ${playerRole === 'hider' ? 'Hider' : 'Seeker'} successfully ${playerRole === 'hider' ? 'hid' : 'found'}!`;
    } else {
      return `You lost! Computer ${result.roundWinner === 'hider' ? 'hid successfully' : 'found the hider'}!`;
    }
  }

  // Simulation stats
  getSimulationStats(): { wins: number; losses: number; winRate: number } {
    const results = this.simulationResults();
    const wins = results.filter(r => r.roundWinner === 'hider').length;
    const losses = results.filter(r => r.roundWinner === 'seeker').length;
    const winRate = results.length > 0 ? (wins / results.length * 100).toFixed(2) : '0';
    
    return { wins, losses, winRate: parseFloat(winRate) };
  }
}