
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testRugCheck() {
  try {
    const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
    
    // Test with a real token mint address
    const mint = "HWjMLWaXAmdhjZjk5khwyKokfe7DNogrUQToVRSopump";
    
    // Get token info and transfers
    const [tokenResponse, transfersResponse] = await Promise.all([
      axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'token-info',
        method: 'getAsset',
        params: [mint]
      }),
      axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'transfers',
        method: 'getSignaturesForAsset',
        params: {
          assetId: mint,
          limit: 100,
          sortBy: {
            value: 'blockTime',
            order: 'desc'
          }
        }
      })
    ]);

    console.log("Token Info:", JSON.stringify(tokenResponse.data, null, 2));
    console.log("Recent Transfers:", JSON.stringify(transfersResponse.data, null, 2));

  } catch (error: any) {
    console.error("Test Error:", error.message);
    if (error.response) {
      console.error("Response Error:", {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// Run the test
testRugCheck();
