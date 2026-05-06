export interface GameResults {
  round_results: {
    hider_pos: number;
    seeker_pos: number;
    winner: string;
    points_awarded: number;
    proximity_multiplier: number; 
  };
  total_stats: {
    human_wins: number;
    computer_wins: number;
    human_score: number;
    computer_score: number;
  };
}