import { Outlet } from '@tanstack/react-router';
import TopBar from './TopBar';
import Navigation from './Navigation';
import OfflineBanner from '../pwa/OfflineBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col app-layout">
      <OfflineBanner />
      <TopBar />
      <Navigation />
      <main className="flex-1 container py-6 px-4 sm:px-6 safe-area-sides safe-area-bottom">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground safe-area-bottom safe-area-sides">
        <p>
          © {new Date().getFullYear()} · Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
