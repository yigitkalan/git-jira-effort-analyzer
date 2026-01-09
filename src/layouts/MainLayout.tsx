import React from 'react';
import { Sidebar } from '../components/Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-primary text-primary">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div
            className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col h-full">{children}</div>
      </main>
    </div>
  );
};
