import { createContext, useContext, useState, useEffect } from 'react';

const SidebarCollapseContext = createContext();

export function SidebarCollapseProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <SidebarCollapseContext.Provider value={{ isCollapsed, toggleCollapse }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse() {
  const context = useContext(SidebarCollapseContext);
  if (!context) {
    throw new Error('useSidebarCollapse must be used within a SidebarCollapseProvider');
  }
  return context;
}

export default SidebarCollapseContext;
