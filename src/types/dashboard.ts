export interface UserData {
  id: string;
  UID: string;
  user_role: string;
  credits: number;
  email: string;
  trial_credits_claimed: boolean;
  created_at: string;
  user_metadata: {
    avatar_url?: string;
    email?: string;
    name?: string;
    full_name?: string;
    phone?: string;
  };
}

export interface WebsiteSettings {
  enable_credits: boolean;
  trial_credits: number;
  trial_credits_pricing_page: boolean;
  enable_affiliate: boolean;
  commission_type: 'flat_rate' | 'percentage';
  affiliate_commission: number;
  site_domain: string;
} 