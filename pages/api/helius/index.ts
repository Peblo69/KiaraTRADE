import { heliusClient } from '../../../lib/helius/client';

// Test if this shit works
const testHelius = async () => {
    // Test with a real token mint from our env
    const testMint = "5BwSmMcFSPrWXFhrrFjRdNYBmNXMnDFt6QSRwwiUpump"; // Using a real token from our test

    try {
        await heliusClient.subscribeToToken(testMint);
        console.log("✅ Helius connection working!");

        // Monitor for a minute to see updates
        setTimeout(() => {
            heliusClient.unsubscribe(testMint);
            console.log("Test completed");
        }, 60000);

    } catch (error) {
        console.error("❌ Helius failed:", error);
    }
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        await testHelius();
        res.status(200).json({ message: "Helius test started" });
    } else {
        res.status(405).json({ message: "Method not allowed" });
    }
}