import axios from 'axios';

// Using existing HELIUS_API_KEY from environment
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

async function checkToken(tokenMint: string) {
  try {
    console.log(`\n🔍 Analyzing token: ${tokenMint}`);

    // Get token data from Helius
    const tokenResponse = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: '2.0',
      id: 'token-info',
      method: 'getAsset',
      params: [tokenMint]
    });

    const token = tokenResponse.data?.result;

    if (!token) {
      throw new Error('No data received from Helius API');
    }

    // Print basic info
    console.log('\n📊 Token Information:');
    console.log('-------------------');
    console.log(`Name: ${token.content?.metadata?.name || 'Unknown'}`);
    console.log(`Symbol: ${token.content?.metadata?.symbol || 'Unknown'}`);
    console.log(`Supply: ${token.token_info?.supply || 'Unknown'}`);
    console.log(`Decimals: ${token.token_info?.decimals || 'Unknown'}`);

    // Check for risks
    console.log('\n🚨 Risk Analysis:');
    console.log('---------------');

    let riskScore = 0;

    if (token.authorities?.find((a: any) => a.type === 'mint')) {
      console.log('⚠️  Has mint authority - Can create more tokens');
      riskScore += 30;
    }

    if (token.authorities?.find((a: any) => a.type === 'freeze')) {
      console.log('⚠️  Has freeze authority - Can freeze transfers');
      riskScore += 30;
    }

    if (token.content?.metadata?.mutable) {
      console.log('⚠️  Token metadata is mutable - Can be changed');
      riskScore += 20;
    }

    // Final verdict
    console.log('\n📝 Final Assessment:');
    console.log('-----------------');
    console.log(`Risk Score: ${riskScore}/100`);
    console.log(`Status: ${riskScore > 70 ? '🔴 HIGH RISK' : riskScore > 40 ? '🟡 MEDIUM RISK' : '🟢 LOW RISK'}`);

    return {
      safe: riskScore < 50,
      score: riskScore,
      tokenInfo: {
        name: token.content?.metadata?.name,
        symbol: token.content?.metadata?.symbol,
        supply: token.token_info?.supply,
        decimals: token.token_info?.decimals
      }
    };

  } catch (error: any) {
    console.error('Error checking token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// New advanced analysis function
async function detailedAnalysis(tokenMint: string) {
  try {
    console.log(`\n🔬 Detailed Analysis for token: ${tokenMint}`);

    // Get transfers history
    const transfersResponse = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: '2.0',
      id: 'transfers',
      method: 'getSignaturesForAsset',
      params: {
        assetId: tokenMint,
        limit: 100,
        sortBy: {
          sortBy: 'blockTime',
          sortDirection: 'desc'
        }
      }
    });

    const transfers = transfersResponse.data?.result || [];
    console.log(`\n📈 Transfer Analysis (Last ${transfers.length} transfers):`);
    console.log('----------------------------------------');

    // Analyze holder distribution
    const holders = new Map<string, number>();
    const snipers = new Set<string>();
    const creationTime = transfers[transfers.length - 1]?.blockTime || Date.now();
    const sniperWindow = 30000; // 30 seconds after creation

    transfers.forEach((transfer: any) => {
      if (transfer.blockTime - creationTime <= sniperWindow) {
        snipers.add(transfer.toUserAccount);
      }
    });

    console.log(`Early Buyers (First 30s): ${snipers.size}`);

    // Get current holders
    const holdersResponse = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: '2.0',
      id: 'holders',
      method: 'getAssetHolders',
      params: [tokenMint]
    });

    const currentHolders = holdersResponse.data?.result || [];
    console.log(`Current Holders: ${currentHolders.length}`);

    // Calculate concentration
    if (currentHolders.length > 0) {
      const top10 = currentHolders.slice(0, 10);
      const totalSupply = currentHolders.reduce((sum: number, h: any) => sum + (h.amount || 0), 0);
      const top10Percentage = (top10.reduce((sum: number, h: any) => sum + (h.amount || 0), 0) / totalSupply) * 100;

      console.log(`\n👥 Top 10 Holders Control: ${top10Percentage.toFixed(2)}% of supply`);
      console.log('Risk Level:', top10Percentage > 80 ? '🔴 HIGH' : top10Percentage > 50 ? '🟡 MEDIUM' : '🟢 LOW');
    }

    // Transaction velocity
    const last24h = transfers.filter((t: any) => t.blockTime > Date.now() - 24 * 60 * 60 * 1000).length;
    console.log(`\n🔄 24h Transactions: ${last24h}`);
    console.log('Activity Level:', last24h > 1000 ? '🟢 HIGH' : last24h > 100 ? '🟡 MEDIUM' : '🔴 LOW');

  } catch (error: any) {
    console.error('\n❌ Error in detailed analysis:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

// Example token to test
async function main() {
  // Using the token address provided
  const tokenMint = '87asvmcpuXLVgUMVKvcskmZ6pgq3hK8QsQKBncApump';
  await checkToken(tokenMint);
  console.log('\n===========================================\n');
  await detailedAnalysis(tokenMint);
}

main();