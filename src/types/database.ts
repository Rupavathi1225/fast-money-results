export interface LandingSettings {
  id: string;
  site_name: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface RelatedSearch {
  id: string;
  search_text: string;
  title: string;
  web_result_page: number;
  position: number;
  display_order: number;
  is_active: boolean;
  blog_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebResult {
  id: string;
  web_result_page: number;
  title: string;
  description: string | null;
  logo_url: string | null;
  original_link: string;
  display_order: number;
  is_active: boolean;
  is_sponsored: boolean;
  country_permissions: string[];
  fallback_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkTracking {
  id: string;
  link_id: number;
  web_result_id: string | null;
  related_search_id: string | null;
  session_id: string;
  ip_address: string | null;
  device_type: string | null;
  user_agent: string | null;
  country: string | null;
  referrer: string | null;
  clicked_at: string;
}

export interface Session {
  id: string;
  session_id: string;
  ip_address: string | null;
  device_type: string | null;
  user_agent: string | null;
  country: string | null;
  started_at: string;
  last_activity: string;
}

export interface PrelanderSettings {
  id: string;
  web_result_id: string;
  is_enabled: boolean;
  headline_text: string;
  headline_font_size: number;
  headline_color: string;
  headline_alignment: string;
  description_text: string;
  description_font_size: number;
  description_color: string;
  button_text: string;
  button_color: string;
  background_color: string;
  background_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSubmission {
  id: string;
  prelander_id: string | null;
  web_result_id: string | null;
  email: string;
  session_id: string | null;
  ip_address: string | null;
  country: string | null;
  device_type: string | null;
  submitted_at: string;
}

export const COUNTRIES = [
  'worldwide',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'India',
  'Japan',
  'Brazil',
  'Mexico',
  'Spain',
  'Italy',
  'Netherlands',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Russia',
  'China',
  'South Korea',
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Philippines',
  'Thailand',
  'Vietnam',
  'South Africa',
  'Nigeria',
  'Egypt',
  'UAE',
  'Saudi Arabia',
  'Turkey',
  'Israel',
  'New Zealand',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'Pakistan',
  'Bangladesh',
];
