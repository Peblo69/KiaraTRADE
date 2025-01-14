import { FC } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";
import { useTypewriter } from "@/hooks/useTypewriter";
import MagicalCursor from "@/components/MagicalCursor";

const TITLE = "About Us – The Team Behind Kiara";
const CONTENT = `Welcome to Kiara, a project designed to redefine the way AI and crypto merge. We are a team of developers, blockchain enthusiasts, and visionaries dedicated to building the most advanced AI-driven crypto assistant the world has ever seen.

Our goal? To push AI beyond simple chatbot interactions and create a fully autonomous, intelligent, and adaptable assistant that transforms the way people navigate the crypto space.

Our Mission
In a world where markets move fast, scams are everywhere, and information is overwhelming, we believe AI should do more than just answer questions—it should learn, adapt, and act for you.

Kiara is designed to be:
✔ A personalized AI crypto strategist – Not just an assistant, but a real decision-making partner.
✔ An AI-powered trading tool – Providing real-time insights, tracking wallets, and automating research.
✔ An evolving AI entity – One that learns from the user and develops over time.
✔ A Web3-integrated intelligence – Bridging AI and blockchain like never before.

We aren't just building another crypto tool—we are building the future of AI-powered market intelligence.`;

const VISION_CONTENT = `The Big Vision
Right now, Kiara is a powerful AI crypto assistant. But we are working on expanding her into a fully autonomous AI system that can:
✅ Execute trades based on AI-powered research
✅ Manage entire portfolios, optimizing strategies for maximum gains
✅ Track real-time blockchain activity, detecting trends before anyone else
✅ Integrate seamlessly into Web3, connecting with DeFi protocols, smart contracts, and wallets

This isn't just an AI—it's the foundation for something much bigger.

Join Us – Partnerships & Collaborations
We are always looking for strategic partnerships to expand Kiara's reach and capabilities. If you are:

🔹 A developer looking to contribute to the next evolution of AI & crypto
🔹 A project founder interested in AI-powered integrations
🔹 An investor seeking groundbreaking Web3 opportunities
🔹 A business looking for AI-driven trading solutions

📩 We'd love to connect! Get in touch with us to discuss collaborations, partnerships, or investment opportunities.`;

const AboutUs: FC = () => {
  const { displayText, isComplete } = useTypewriter({
    text: CONTENT,
    typingSpeed: 20,
  });

  const { displayText: visionDisplayText, isComplete: visionIsComplete } = useTypewriter({
    text: VISION_CONTENT,
    typingSpeed: 20,
  });

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <MagicalCursor />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 
              className="text-5xl md:text-7xl font-bold mb-12 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-glitch"
              style={{
                fontFamily: '"VT323", monospace',
                letterSpacing: '0.05em',
                fontWeight: '800',
                textShadow: '0 0 30px rgba(var(--theme-primary), 0.8)'
              }}
            >
              {TITLE}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div
                style={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"VT323", monospace',
                  fontSize: '1.1rem',
                  lineHeight: '1.5',
                  textShadow: '0 0 10px rgba(var(--theme-primary), 0.5)',
                  color: 'rgb(216, 180, 254)',
                  backdropFilter: 'blur(4px)',
                  padding: '1rem',
                  opacity: isComplete ? 1 : 0.9,
                  transition: 'opacity 0.3s ease-in-out'
                }}
                className="typing-text"
              >
                {displayText}
              </div>

              <div
                style={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"VT323", monospace',
                  fontSize: '1.1rem',
                  lineHeight: '1.5',
                  textShadow: '0 0 10px rgba(var(--theme-primary), 0.5)',
                  color: 'rgb(216, 180, 254)',
                  backdropFilter: 'blur(4px)',
                  padding: '1rem',
                  opacity: visionIsComplete ? 1 : 0.9,
                  transition: 'opacity 0.3s ease-in-out'
                }}
                className="typing-text"
              >
                {visionDisplayText}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AboutUs;