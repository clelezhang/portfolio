import Header from './components/Header';
import Hero from './components/Hero';
import PortfolioGrid from './components/PortfolioGrid';

export default function Home() {
  return (
    <div className="min-h-screen bg-cream font-sans">
      <Header />
      <Hero />
      <PortfolioGrid />
      
      <footer className="py-16 text-center">
        <div className="text-red text-6xl md:text-8xl font-mono font-bold mb-4">
          Lele Zhang
        </div>
        <div className="text-grey-600 text-sm font-mono">
          DESIGNER & CREATIVE
        </div>
      </footer>
    </div>
  );
}
