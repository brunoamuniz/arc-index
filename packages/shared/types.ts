// Shared types for Arc Index

export type UserRole = 'user' | 'curator' | 'admin';
export type ProjectStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
export type SubmissionStatus = 'Submitted' | 'Approved' | 'Rejected';

export interface Profile {
  id: string;
  wallet_address: string;
  created_at: string;
  role: UserRole;
}

export interface Project {
  id: string;
  project_id?: number | null;
  owner_wallet: string;
  status: ProjectStatus;
  name: string;
  description: string;
  full_description?: string | null;
  category: string;
  x_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  discord_url?: string | null;
  discord_username?: string | null;
  website_url?: string | null;
  contracts_json: Array<{ address: string; label: string }>;
  image_url?: string | null;
  image_thumb_url?: string | null;
  metadata_json: Record<string, unknown>;
  latest_submission_id?: string | null;
  nft_token_id?: number | null;
  nft_contract_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  project_id: string;
  version: number;
  submitted_by: string;
  submitted_at: string;
  status: SubmissionStatus;
  review_reason_code?: string | null;
  review_reason_text?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  snapshot_json: Record<string, unknown>;
}

export interface Rating {
  project_id: string;
  rater: string;
  stars: number;
  updated_at: string;
}

export interface RatingAgg {
  project_id: string;
  avg_stars: number;
  ratings_count: number;
  updated_at: string;
}

export interface Funding {
  id: string;
  project_id: string;
  funder: string;
  amount_usdc: number;
  tx_hash: string;
  created_at: string;
}

export interface FundingAgg {
  project_id: string;
  total_usdc: number;
  funding_count: number;
  updated_at: string;
}

export interface ChainEvent {
  id: number;
  chain_id: number;
  tx_hash: string;
  log_index: number;
  event_name: string;
  project_chain_id?: number | null;
  payload: Record<string, unknown>;
  block_number?: number | null;
  block_time?: string | null;
  created_at: string;
}

export interface ProjectWithAggregates extends Project {
  rating_agg?: RatingAgg | null;
  funding_agg?: FundingAgg | null;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  full_description?: string;
  category: string;
  website_url: string;
  x_url?: string;
  github_url?: string;
  linkedin_url?: string;
  discord_url?: string;
  discord_username?: string;
  contracts_json?: Array<{ address: string; label: string }>;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  full_description?: string;
  category?: string;
  x_url?: string;
  github_url?: string;
  linkedin_url?: string;
  discord_url?: string;
  discord_username?: string;
  website_url?: string;
  contracts_json?: Array<{ address: string; label: string }>;
}

export interface RejectSubmissionInput {
  reasonCode?: string; // Optional, defaults to empty string
  reasonText: string;
}

