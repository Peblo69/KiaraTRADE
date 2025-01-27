import axios from 'axios';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const JUP_PRICE_URL = 'https://price.jup.ag/v4/price';

export interface TokenAnalysis {
    name: string;
    symbol: string;
    supply: number;
    decimals: number;
    createdAt: string;
    description?: string;
    security: {
        mintAuthority: boolean;
        freezeAuthority: boolean;
        mutable: boolean;
    };
    market: {
        totalMarkets: number;
        lpProviders: number;
        totalLiquidity: number;
    };
    holders: {
        topHoldersControl: number;
        topHolders: Array<{
            percentage: number;
            isInsider: boolean;
            warning: boolean;
        }>;
    };
    risk: {
        score: number;
        level: 'LOW' | 'MEDIUM' | 'HIGH';
        factors: {
            mintAuthority: number;
            freezeAuthority: number;
            mutable: number;
            lowLiquidity: number;
            highConcentration: number;
        };
    };
    rugged: boolean;
}

export async function analyzeToken(tokenMint: string): Promise<TokenAnalysis | null> {
    try {
        console.log(`[TokenAnalyzer] Analyzing token: ${tokenMint}`);

        const [rugCheckResponse, heliusResponse] = await Promise.all([
            axios.get(`https://api.rugcheck.xyz/v1/tokens/${tokenMint}/report`, {
                timeout: 5000
            }).catch(() => ({ data: null })),
            axios.post(HELIUS_RPC_URL, {
                jsonrpc: '2.0',
                id: 'token-info',
                method: 'getAsset',
                params: [tokenMint]
            }, {
                timeout: 5000
            }).catch(() => ({ data: { result: null } }))
        ]);

        if (!rugCheckResponse.data) {
            throw new Error('Failed to fetch RugCheck data');
        }

        const token = rugCheckResponse.data;
        const heliusData = heliusResponse.data?.result;

        // Risk Scoring
        const riskFactors = {
            mintAuthority: token.token?.mintAuthority ? 30 : 0,
            freezeAuthority: token.token?.freezeAuthority ? 20 : 0,
            mutable: token.tokenMeta?.mutable ? 10 : 0,
            lowLiquidity: token.totalLPProviders < 3 ? 20 : 0,
            highConcentration: token.topHolders?.[0]?.pct > 50 ? 20 : 0
        };

        const totalRiskScore = Object.values(riskFactors).reduce((a, b) => a + b, 0);
        
        // Format response
        return {
            name: token.tokenMeta?.name || 'Unknown',
            symbol: token.tokenMeta?.symbol || 'Unknown',
            supply: Number(token.token?.supply) || 0,
            decimals: token.token?.decimals || 0,
            createdAt: format(new Date(heliusData?.createdAt || Date.now()), 'yyyy-MM-dd HH:mm:ss'),
            description: heliusData?.content?.metadata?.description,
            security: {
                mintAuthority: Boolean(token.token?.mintAuthority),
                freezeAuthority: Boolean(token.token?.freezeAuthority),
                mutable: Boolean(token.tokenMeta?.mutable)
            },
            market: {
                totalMarkets: token.markets?.length || 0,
                lpProviders: token.totalLPProviders || 0,
                totalLiquidity: token.totalMarketLiquidity || 0
            },
            holders: {
                topHoldersControl: token.topHolders?.reduce((sum: number, h: any) => sum + h.pct, 0) || 0,
                topHolders: (token.topHolders || []).map((holder: any) => ({
                    percentage: holder.pct,
                    isInsider: Boolean(holder.insider),
                    warning: holder.pct > 20
                }))
            },
            risk: {
                score: totalRiskScore,
                level: totalRiskScore > 70 ? 'HIGH' : totalRiskScore > 40 ? 'MEDIUM' : 'LOW',
                factors: riskFactors
            },
            rugged: Boolean(token.rugged)
        };

    } catch (error) {
        console.error('[TokenAnalyzer] Error:', error);
        return null;
    }
}
