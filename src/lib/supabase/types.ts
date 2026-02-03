export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      drawings: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          thumbnail: string | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          thumbnail?: string | null;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          thumbnail?: string | null;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          anthropic_api_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          anthropic_api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          anthropic_api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Drawing = Database['public']['Tables']['drawings']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
