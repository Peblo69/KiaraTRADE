// client/src/lib/token-analysis.ts
import axios from 'axios';
import { format } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

interface TokenAnalysisData {
  tokenInfo: {
    name: string;
    symbol: string;
    supply: string;
    decimals: number;
    createdAt: string;
    description?: string;
    lastAnalyzedAt: string;
    analyzedBy: string;
  };
  security: {
    mintAuthority: boolean;
    freezeAuthority: boolean;
    mutable: boolean;
  };
  market: {
    totalMarkets: number;
    lpProviders: number;
    totalLiquidity: number;
    markets: Array<{
      name: string;
      liquidityA?: number;
      liquidityB?: number;
    }>;
  };
  holders: {
    topHoldersControl: number;
    topHolders: Array<{
      percentage: number;
      isInsider: boolean;
    }>;
  };
  risks: {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: {
      mintAuthority: number;
      freezeAuthority: number;
      mutable: number;
      lowLiquidity: number;
      highConcentration: number;
    };
    isRugged: boolean;
  };
}

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const JUP_PRICE_URL = 'https://price.jup.ag/v4/price';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function getTokenPrice(tokenMint: string): Promise<number> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await axios.get(`${JUP_PRICE_URL}?ids=${tokenMint}`, {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json'
                }
            });
            return response.data.data[tokenMint]?.price || 0;
        } catch (error) {
            if (attempt === MAX_RETRIES - 1) {
                console.error('Failed to fetch price after all retries:', error);
                return 0;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
    return 0;
}

export async function analyzeToken(tokenMint: string): Promise<TokenAnalysisData | null> {
    try {
        console.log(`\n🔍 Starting analysis for token: ${tokenMint}`);
        const currentTime = format(zonedTimeToUtc(new Date(), 'UTC'), 'yyyy-MM-dd HH:mm:ss');

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const [rugCheckResponse, heliusResponse] = await Promise.allSettled([
                    axios.get(`https://api.rugcheck.xyz/v1/tokens/${tokenMint}/report`, {
                        timeout: 5000
                    }),
                    axios.post(HELIUS_RPC_URL, {
                        jsonrpc: '2.0',
                        id: 'token-info',
                        method: 'getAsset',
                        params: [tokenMint]
                    }, {
                        timeout: 5000
                    })
                ]);

                // Handle API responses
                const rugCheckData = rugCheckResponse.status === 'fulfilled' ? rugCheckResponse.value.data : null;
                const heliusData = heliusResponse.status === 'fulfilled' ? heliusResponse.value.data?.result : null;

                if (!rugCheckData && !heliusData) {
                    if (attempt === MAX_RETRIES - 1) {
                        throw new Error('Failed to fetch data from both RugCheck and Helius');
                    }
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    continue;
                }

                // Risk Scoring
                const riskFactors = {
                    mintAuthority: rugCheckData?.token?.mintAuthority ? 30 : 0,
                    freezeAuthority: rugCheckData?.token?.freezeAuthority ? 20 : 0,
                    mutable: rugCheckData?.tokenMeta?.mutable ? 10 : 0,
                    lowLiquidity: (rugCheckData?.totalLPProviders || 0) < 3 ? 20 : 0,
                    highConcentration: (rugCheckData?.topHolders?.[0]?.pct || 0) > 50 ? 20 : 0
                };

                const totalRiskScore = Object.values(riskFactors).reduce((a, b) => a + b, 0);
                const riskLevel = totalRiskScore > 70 ? 'HIGH' : totalRiskScore > 40 ? 'MEDIUM' : 'LOW';

                const analysis: TokenAnalysisData = {
                    tokenInfo: {
                        name: rugCheckData?.tokenMeta?.name || heliusData?.name || 'Unknown',
                        symbol: rugCheckData?.tokenMeta?.symbol || heliusData?.symbol || 'Unknown',
                        supply: Number(rugCheckData?.token?.supply || 0).toLocaleString(),
                        decimals: rugCheckData?.token?.decimals || 0,
                        createdAt: heliusData?.createdAt ? 
                            format(new Date(heliusData.createdAt), 'yyyy-MM-dd HH:mm:ss') : 
                            'Unknown',
                        description: heliusData?.content?.metadata?.description,
                        lastAnalyzedAt: currentTime,
                        analyzedBy: 'Peblo69'
                    },
                    security: {
                        mintAuthority: !!rugCheckData?.token?.mintAuthority,
                        freezeAuthority: !!rugCheckData?.token?.freezeAuthority,
                        mutable: !!rugCheckData?.tokenMeta?.mutable
                    },
                    market: {
                        totalMarkets: rugCheckData?.markets?.length || 0,
                        lpProviders: rugCheckData?.totalLPProviders || 0,
                        totalLiquidity: rugCheckData?.totalMarketLiquidity || 0,
                        markets: rugCheckData?.markets?.map((m: any) => ({
                            name: m.market || 'Unknown Market',
                            liquidityA: m.liquidityA,
                            liquidityB: m.liquidityB
                        })) || []
                    },
                    holders: {
                        topHoldersControl: rugCheckData?.topHolders?.reduce((sum: number, h: any) => sum + h.pct, 0) || 0,
                        topHolders: rugCheckData?.topHolders?.map((h: any) => ({
                            percentage: h.pct,
                            isInsider: h.insider
                        })) || []
                    },
                    risks: {
                        score: totalRiskScore,
                        level: riskLevel,
                        factors: riskFactors,
                        isRugged: !!rugCheckData?.rugged
                    }
                };

                return analysis;

            } catch (error: any) {
                if (attempt === MAX_RETRIES - 1) {
                    console.error('Error during analysis:', error.message);
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }

    } catch (error: any) {
        console.error('Fatal error during analysis:', error.message);
        return null;
    }
    return null;
}

export function useTokenAnalysis(tokenMint: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<TokenAnalysisData | null>(null);

    const analyze = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await analyzeToken(tokenMint);
            if (result) {
                setData(result);
            } else {
                setError('Analysis failed. Please try again.');
            }
        } catch (error: any) {
            setError(error.message || 'Analysis failed');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        analyze,
        isLoading,
        error,
        data
    };
}