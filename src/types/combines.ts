export interface MatchDuCombine {
  id: number;
  combine_id: number;
  match_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  commence_at: string;
  prediction: string;
  market: string;
  cote: number;
}

export interface CombineDuJour {
  id: number;
  cote_totale: number;
  created_at: string;
  statut?: string; // 'en_attente' | 'gagne' | 'perdu'
  matchs_du_combine?: MatchDuCombine[];
}
