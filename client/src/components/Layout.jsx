import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-dark text-text font-sans">
      <Navbar />
      <main className="flex-1 pt-[76px] px-4 pb-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <footer className="border-t-[3px] border-gold text-center py-5 px-4 text-muted text-sm"
              style={{ background: '#0f4225' }}>
        <strong className="text-light-gold">OWBA</strong> &mdash; Orange Walk Billiards Association &copy; 2026
      </footer>
    </div>
  );
}
