import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";

const ProjectPage: FC = () => {
  useEffect(() => {
    console.log('Testing BitQuery API connection...');
    (window as any).debugConsole?.log('Starting BitQuery API test...');

    fetch('https://graphql.bitquery.io', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': 'BQYSaASLeyNPxRf38DGgENQ1mVHxNypq',
      },
      body: JSON.stringify({
        query: `{ Solana { blockchain { blocks(limit: 1) { blockNumber } } } }`,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('API Key Test Result:', data);
        (window as any).debugConsole?.success(`API Test Success: ${JSON.stringify(data, null, 2)}`);
      })
      .catch((err) => {
        console.error('API Key Test Error:', err);
        (window as any).debugConsole?.error(`API Test Failed: ${err.message}`);
      });
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">BitQuery API Test Page</h1>
        <p className="text-gray-400 mt-4">Check the debug console in the bottom right corner for test results</p>
      </div>
      <DebugConsole />
    </div>
  );
};

export default ProjectPage;