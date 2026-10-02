export const metadata = {
  title: "DigiRobotics Pitch Deck",
  description: "The future of agentic commerce and Physical AI training data.",
};

export default function DeckPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0e1118] text-white p-8">
      <div className="max-w-4xl w-full text-center space-y-6">
        <h1 className="text-5xl font-bold font-brand text-[#84cc16]">
          DigiRobotics Pitch Deck
        </h1>
        <p className="text-xl text-gray-400 font-sans">
          Building the agentic economy for Physical AI.
        </p>
        <div className="mt-8 p-6 border border-[#161c29] rounded-lg bg-[#161c29]/50">
          <p className="text-sm font-mono text-[#84cc16] animate-pulse">
            Final presentation loading... 
          </p>
        </div>
        <a 
          href="/" 
          className="inline-block mt-8 px-6 py-3 bg-[#84cc16] text-[#0e1118] font-bold rounded-lg hover:bg-[#65a30d] transition-colors"
        >
          ← Back to Homepage
        </a>
      </div>
    </main>
  );
}
