import './globals.css';

export const metadata = {
  title: '日文複習測驗',
  description: '25題挖空/單字複習系統'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <div className="font-semibold">日文複習測驗</div>
              <nav className="text-sm text-zinc-600">
                <a className="hover:text-zinc-900" href="/dashboard">個人介面</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
