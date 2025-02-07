
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
      tokens: {
        Row: {
          address: string
          name: string
          symbol: string
          created_at: string
          website?: string
          twitter?: string
          telegram?: string
          last_price?: number
          market_cap?: number
          holders_count?: number
          dev_percentage?: number
          insider_percentage?: number
        }
      }
      trades: {
        Row: {
          id: string
          token_address: string
          type: 'buy' | 'sell'
          amount: number
          price: number
          timestamp: string
          wallet_address: string
        }
      }
    }
  }
}
