import { z } from 'zod';

// Validation schemas
export const withdrawalSchema = z.object({
  amount: z.number().positive(),
  tokenAddress: z.string().min(32).max(44),
  destinationAddress: z.string().min(32).max(44),
  walletId: z.string()
});

export type WithdrawalRequest = z.infer<typeof withdrawalSchema>;

// API functions
export async function withdrawFunds(data: WithdrawalRequest): Promise<{ 
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Network error');
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function validateTokenAddress(address: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/validate/token/${address}`);
    const result = await response.json();
    return result.valid;
  } catch {
    return false;
  }
}

export async function getWalletBalance(walletId: string): Promise<number> {
  try {
    const response = await fetch(`/api/balance/${walletId}`);
    const result = await response.json();
    return result.balance;
  } catch {
    return 0;
  }
}