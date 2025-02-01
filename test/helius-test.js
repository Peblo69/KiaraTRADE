import WebSocket from 'ws';

const HELIUS_KEY = "004f9b13-f526-4952-9998-52f5c7bec6ee";
const TEST_TOKEN = "2j3Q7rURF1k3UzYfViptpPXq7H5VgtWmdszG7oDYpump";
const TEST_DURATION = 60000; // 1 minute test

console.log('🚀 Starting Helius Connection Test');
console.log('Using test token:', TEST_TOKEN);
console.log('Connecting to Helius WebSocket...');

const ws = new WebSocket(`wss://rpc.helius.xyz/?api-key=${HELIUS_KEY}`);

// Track message count
let messageCount = 0;

ws.on('open', () => {
    console.log('✅ WebSocket Connected!');

    // Subscribe to parsed token account updates
    const subscribeMsg = {
        jsonrpc: "2.0",
        id: 1,
        method: "accountSubscribe",
        params: [
            TEST_TOKEN,
            {
                encoding: "jsonParsed",
                commitment: "confirmed",
                filters: [
                    {
                        dataSize: 165  // Size of token account data
                    }
                ]
            }
        ]
    };

    console.log('Sending subscription request for token:', TEST_TOKEN);
    ws.send(JSON.stringify(subscribeMsg));
});

ws.on('message', (data) => {
    messageCount++;
    const parsedData = JSON.parse(data.toString());

    if (parsedData.method === 'accountNotification') {
        console.log('\n🔔 Token Account Update #', messageCount);
        console.log('Account:', parsedData.params?.result?.value?.pubkey || 'N/A');
        console.log('Data:', JSON.stringify(parsedData.params?.result?.value?.data, null, 2));
    } else {
        console.log('\n📦 Other Message #', messageCount);
        console.log('Type:', parsedData.method || 'Response');
        console.log('Data:', JSON.stringify(parsedData, null, 2));
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error.message);
});

ws.on('close', () => {
    console.log('🔴 WebSocket Connection Closed');
    console.log(`Total messages received: ${messageCount}`);
});

// Monitor connection for 1 minute
setTimeout(() => {
    console.log('\n📊 Test Summary:');
    console.log(`Total messages: ${messageCount}`);
    console.log('Closing connection...');
    ws.close();
    process.exit(0);
}, TEST_DURATION);