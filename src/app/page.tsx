import Header from './components/Header';
import Hero from './components/Hero';
import WorkSection from './components/WorkSection';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-lightgray font-sans">
      <Header />
      <Hero />
      <WorkSection />
      <Footer />
    </div>
  );
}
