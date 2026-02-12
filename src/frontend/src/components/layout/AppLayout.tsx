import { Outlet } from '@tanstack/react-router';
import TopBar from './TopBar';
import Navigation from './Navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <Navigation />
      <main className="flex-1 container py-4 sm:py-6 px-4 sm:px-6">
        {children}
      </main>
      <footer className="border-t py-4 sm:py-6 text-center text-sm text-muted-foreground">
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
