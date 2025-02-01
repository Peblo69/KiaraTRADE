import axios from 'axios';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
// Updated Jupiter API endpoint
const JUP_PRICE_URL = 'https://price.jup.ag/v4/price';

async function getTokenPrice(tokenMint: string) {
    try {
        // Add timeout and proper error handling
        const response = await axios.get(`${JUP_PRICE_URL}?ids=${tokenMint}`, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json'
            }
        });
        return response.data.data[tokenMint]?.price || 0;
    } catch (error) {
        console.log('Unable to fetch price data');
        return 0;
    }
}

async function checkToken(tokenMint: string) {
    try {
        console.log(`\n🔍 Analyzing token: ${tokenMint}`);

        // Fetch data with better error handling
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

        // Enhanced Output
        console.log('\n📊 Token Information:');
        console.log('===================');
        console.log(`Name: ${token.tokenMeta?.name || 'Unknown'}`);
        console.log(`Symbol: ${token.tokenMeta?.symbol || 'Unknown'}`);
        console.log(`Supply: ${Number(token.token?.supply).toLocaleString()}`);
        console.log(`Decimals: ${token.token?.decimals}`);
        console.log(`Created: ${format(new Date(heliusData?.createdAt || Date.now()), 'yyyy-MM-dd HH:mm:ss')}`);

        if (heliusData?.content?.metadata?.description) {
            console.log('\n📝 Description:');
            console.log('=============');
            console.log(heliusData.content.metadata.description);
        }

        console.log('\n🔐 Security Analysis:');
        console.log('===================');
        console.log(`Mint Authority: ${token.token?.mintAuthority ? '⚠️ ENABLED' : '✅ DISABLED'}`);
        console.log(`Freeze Authority: ${token.token?.freezeAuthority ? '⚠️ ENABLED' : '✅ DISABLED'}`);
        console.log(`Metadata Mutable: ${token.tokenMeta?.mutable ? '⚠️ YES' : '✅ NO'}`);

        console.log('\n💰 Market Data:');
        console.log('=============');
        console.log(`Total Markets: ${token.markets?.length || 0}`);
        console.log(`LP Providers: ${token.totalLPProviders}`);
        console.log(`Total Liquidity: ${token.totalMarketLiquidity.toFixed(3)} SOL`);

        if (token.markets?.length > 0) {
            console.log('\n🏦 Active Markets:');
            token.markets.forEach((market: any) => {
                console.log(`• ${market.market || 'Unknown Market'}`);
                if (market.liquidityA) console.log(`  - Pool A: ${market.liquidityA}`);
                if (market.liquidityB) console.log(`  - Pool B: ${market.liquidityB}`);
            });
        }

        console.log('\n👥 Holder Analysis:');
        console.log('=================');
        if (token.topHolders?.length > 0) {
            const totalHeld = token.topHolders.reduce((sum: number, h: any) => sum + h.pct, 0);
            console.log(`Top Holders Control: ${totalHeld.toFixed(2)}%`);

            token.topHolders.forEach((holder: any, idx: number) => {
                const warning = holder.pct > 20 ? '⚠️' : '✅';
                console.log(`${warning} Holder #${idx + 1}: ${holder.pct.toFixed(2)}%`);
                if (holder.insider) console.log(`   🚨 INSIDER DETECTED`);
            });
        }

        console.log('\n⚠️ Risk Assessment:');
        console.log('=================');
        Object.entries(riskFactors).forEach(([factor, score]) => {
            if (score > 0) {
                console.log(`• ${factor}: ${score} points`);
            }
        });

        const riskLevel = totalRiskScore > 70 ? '🔴 HIGH' : 
                         totalRiskScore > 40 ? '🟡 MEDIUM' : 
                         '🟢 LOW';

        console.log('\n📊 Final Verdict:');
        console.log('===============');
        console.log(`Risk Score: ${totalRiskScore}/100`);
        console.log(`Risk Level: ${riskLevel}`);

        if (token.rugged) {
            console.log('\n🚨 WARNING: TOKEN IS MARKED AS RUGGED 🚨');
        }

        return {
            safe: totalRiskScore < 50 && !token.rugged,
            score: totalRiskScore,
            risks: riskFactors
        };

    } catch (error: any) {
        console.error('Error during analysis:', error.message);
        return null;
    }
}

// Example usage
async function main() {
    const tokenMint = '87asvmcpuXLVgUMVKvcskmZ6pgq3hK8QsQKBncApump';
    await checkToken(tokenMint);
}

main();