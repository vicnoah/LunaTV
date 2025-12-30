import React from 'react';

// Placeholder for the ModernNav component
const ModernNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-gray-800 shadow-md">
      <div className="flex items-center justify-between h-full px-4 text-white">
        <div className="text-xl font-bold">LunaTV</div>
        <div>
          {/* Placeholder for nav items */}
          <span className="mr-4">Home</span>
          <span>Search</span>
        </div>
      </div>
    </nav>
  );
};


interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="w-full min-h-screen bg-gray-900">
      <ModernNav />
      {/* Main Content Area */}
      <main className="w-full min-h-screen pt-16 pb-8">
        <div className="w-full max-w-[2560px] mx-auto px-4 sm:px-6 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PageLayout;
