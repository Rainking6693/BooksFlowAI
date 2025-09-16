import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'accountant' | 'client' | 'admin'
          avatar_url: string | null
          phone: string | null
          company_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'accountant' | 'client' | 'admin'
          avatar_url?: string | null
          phone?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'accountant' | 'client' | 'admin'
          avatar_url?: string | null
          phone?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accountants: {
        Row: {
          id: string
          user_id: string
          license_number: string | null
          firm_name: string | null
          specializations: string[] | null
          years_experience: number | null
          subscription_tier: 'starter' | 'pro' | 'enterprise'
          subscription_status: string
          quickbooks_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          license_number?: string | null
          firm_name?: string | null
          specializations?: string[] | null
          years_experience?: number | null
          subscription_tier?: 'starter' | 'pro' | 'enterprise'
          subscription_status?: string
          quickbooks_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          license_number?: string | null
          firm_name?: string | null
          specializations?: string[] | null
          years_experience?: number | null
          subscription_tier?: 'starter' | 'pro' | 'enterprise'
          subscription_status?: string
          quickbooks_connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string | null
          accountant_id: string
          business_name: string
          business_type: string | null
          tax_id: string | null
          address: any | null
          notification_preferences: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          accountant_id: string
          business_name: string
          business_type?: string | null
          tax_id?: string | null
          address?: any | null
          notification_preferences?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          accountant_id?: string
          business_name?: string
          business_type?: string | null
          tax_id?: string | null
          address?: any | null
          notification_preferences?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          accountant_id: string
          client_id: string | null
          quickbooks_id: string | null
          transaction_date: string
          description: string
          amount: number
          vendor_name: string | null
          account_name: string | null
          category_id: string | null
          ai_suggested_category_id: string | null
          ai_confidence: 'high' | 'medium' | 'low' | null
          ai_reasoning: string | null
          status: 'pending' | 'approved' | 'rejected' | 'processing'
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id: string
          client_id?: string | null
          quickbooks_id?: string | null
          transaction_date: string
          description: string
          amount: number
          vendor_name?: string | null
          account_name?: string | null
          category_id?: string | null
          ai_suggested_category_id?: string | null
          ai_confidence?: 'high' | 'medium' | 'low' | null
          ai_reasoning?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'processing'
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          client_id?: string | null
          quickbooks_id?: string | null
          transaction_date?: string
          description?: string
          amount?: number
          vendor_name?: string | null
          account_name?: string | null
          category_id?: string | null
          ai_suggested_category_id?: string | null
          ai_confidence?: 'high' | 'medium' | 'low' | null
          ai_reasoning?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'processing'
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          client_id: string
          transaction_id: string | null
          file_path: string
          file_name: string
          file_size: number
          mime_type: string
          ocr_data: any | null
          ocr_confidence: number | null
          vendor_extracted: string | null
          amount_extracted: number | null
          date_extracted: string | null
          is_matched: boolean
          match_confidence: number | null
          uploaded_at: string
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          transaction_id?: string | null
          file_path: string
          file_name: string
          file_size: number
          mime_type: string
          ocr_data?: any | null
          ocr_confidence?: number | null
          vendor_extracted?: string | null
          amount_extracted?: number | null
          date_extracted?: string | null
          is_matched?: boolean
          match_confidence?: number | null
          uploaded_at?: string
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          transaction_id?: string | null
          file_path?: string
          file_name?: string
          file_size?: number
          mime_type?: string
          ocr_data?: any | null
          ocr_confidence?: number | null
          vendor_extracted?: string | null
          amount_extracted?: number | null
          date_extracted?: string | null
          is_matched?: boolean
          match_confidence?: number | null
          uploaded_at?: string
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'accountant' | 'client' | 'admin'
      subscription_tier: 'starter' | 'pro' | 'enterprise'
      transaction_status: 'pending' | 'approved' | 'rejected' | 'processing'
      ai_confidence_level: 'high' | 'medium' | 'low'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]