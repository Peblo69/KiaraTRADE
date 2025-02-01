export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          address: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          address: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          address?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          type: string
          side: string
          amount: number
          price: number
          total: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          type: string
          side: string
          amount: number
          price: number
          total: number
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_id?: string
          type?: string
          side?: string
          amount?: number
          price?: number
          total?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_book: {
        Row: {
          id: string
          price: number
          amount: number
          side: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          price: number
          amount: number
          side: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          price?: number
          amount?: number
          side?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      create_trade: {
        Args: {
          p_user_id: string
          p_wallet_id: string
          p_type: string
          p_side: string
          p_amount: number
          p_price: number
        }
        Returns: string
      }
    }
  }
}