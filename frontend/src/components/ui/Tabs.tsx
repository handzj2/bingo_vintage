'use client';

import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (value: string) => void;
} | undefined>(undefined);

export function Tabs({ defaultValue, children, className = "" }: any) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }: any) {
  return (
    <div className={`flex bg-gray-100 p-1 rounded-lg mb-6 ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = "" }: any) {
  const context = useContext(TabsContext);
  const isActive = context?.activeTab === value;

  return (
    <button
      onClick={() => context?.setActiveTab(value)}
      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
        isActive 
          ? 'bg-white text-blue-600 shadow-sm' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = "" }: any) {
  const context = useContext(TabsContext);
  if (context?.activeTab !== value) return null;
  return <div className={`animate-in fade-in duration-200 ${className}`}>{children}</div>;
}