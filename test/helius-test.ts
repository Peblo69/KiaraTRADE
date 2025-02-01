import { Connection, PublicKey } from '@solana/web3.js';
import WebSocket from 'ws';

const HELIUS_KEY = "004f9b13-f526-4952-9998-52f5c7bec6ee";
const TEST_DURATION = 60000; // 1 minute test
const TEST_TOKEN = "5BwSmMcFSPrWXFhrrFjRdNYBmNXMnDFt6QSRwwiUpump"; // User provided token address

async function testHeliusConnection() {
    console.log('🚀 Starting Helius Connection Test');
    console.log('Using test token:', TEST_TOKEN);
    console.log('Using Helius key:', HELIUS_KEY);
    console.log('Connecting to Helius WebSocket...');

    // Initialize WebSocket connection
    const ws = new WebSocket(`wss://rpc.helius.xyz/?api-key=${HELIUS_KEY}`);

    // Test metrics
    let updateCount = 0;
    let totalLatency = 0;
    const startTime = Date.now();

    // Listen for connection
    ws.on('open', () => {
        console.log('✅ WebSocket Connected!');

        // Subscribe to token updates
        const subscribeMsg = {
            jsonrpc: "2.0",
            id: 1,
            method: "accountSubscribe",
            params: [
                TEST_TOKEN,
                {
                    encoding: "jsonParsed",
                    commitment: "confirmed"
                }
            ]
        };

        console.log('Sending subscription request:', JSON.stringify(subscribeMsg, null, 2));
        ws.send(JSON.stringify(subscribeMsg));
    });

    // Handle messages
    ws.on('message', (data: WebSocket.Data) => {
        const messageTime = Date.now();
        updateCount++;

        const latency = messageTime - startTime;
        totalLatency += latency;

        console.log(`\n📊 Update #${updateCount}`);
        console.log(`⚡ Latency: ${latency}ms`);
        try {
            const parsedData = JSON.parse(data.toString());
            console.log('📦 Data:', JSON.stringify(parsedData, null, 2));
        } catch (err) {
            console.log('📦 Raw Data:', data.toString());
        }
        console.log('-------------------');
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('❌ WebSocket Error:', error.message);
    });

    ws.on('close', () => {
        console.log('🔴 WebSocket Connection Closed');
    });

    // Run test for specified duration
    setTimeout(() => {
        const avgLatency = totalLatency / updateCount || 0;

        console.log('\n📈 TEST RESULTS:');
        console.log(`Total Updates: ${updateCount}`);
        console.log(`Updates/Second: ${(updateCount / (TEST_DURATION / 1000)).toFixed(2)}`);
        console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);

        ws.close();
        process.exit(0);
    }, TEST_DURATION);
}

// Run the test
testHeliusConnection().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});