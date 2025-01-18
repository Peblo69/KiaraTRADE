import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";

const ProjectPage: FC = () => {
  useEffect(() => {
    console.log('Testing BitQuery API connection...');

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
      .then((data) => console.log('API Key Test Result:', data))
      .catch((err) => console.error('API Key Test Error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-white text-2xl">BitQuery API Test Page</h1>
        <p className="text-gray-400 mt-4">Check the browser console for API test results</p>
      </div>
    </div>
  );
};

export default ProjectPage;