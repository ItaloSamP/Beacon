import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Badge } from './Badge';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  onChange?: (id: string) => void;
  enabledTabIds: string[];
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs compound components must be used within <Tabs>');
  return ctx;
}

// ── Tabs (Root) ────────────────────────────────────────────────

interface TabsProps {
  defaultActive: string;
  onChange?: (id: string) => void;
  children: React.ReactNode;
}

function Tabs({ defaultActive, onChange, children }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultActive);

  const setActiveTab = useCallback(
    (id: string) => {
      setActiveTabState(id);
      onChange?.(id);
    },
    [onChange],
  );

  // Collect enabled tab IDs from children (Tabs.List > Tabs.Tab)
  const childrenArr = React.Children.toArray(children);
  const listChild = childrenArr.find(
    (child): child is React.ReactElement<any> =>
      React.isValidElement(child) && (child.type as any)?.displayName === 'Tabs.List',
  );

  const enabledTabIds: string[] = [];
  if (listChild) {
    const listChildren = React.Children.toArray(listChild.props.children).filter(React.isValidElement) as React.ReactElement<any>[];
    listChildren.forEach((tabChild) => {
      if (!tabChild.props.disabled) {
        enabledTabIds.push(tabChild.props.id);
      }
    });
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, onChange, enabledTabIds }}>
      {children}
    </TabsContext.Provider>
  );
}

// ── Tabs.List ──────────────────────────────────────────────────

interface TabsListProps {
  children: React.ReactNode;
}

function TabsList({ children }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="flex border-b border-border"
    >
      {children}
    </div>
  );
}
TabsList.displayName = 'Tabs.List';

// ── Tabs.Tab ───────────────────────────────────────────────────

interface TabProps {
  id: string;
  badge?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

function Tab({ id, badge, disabled = false, children }: TabProps) {
  const { activeTab, setActiveTab, enabledTabIds } = useTabsContext();
  const tabRef = useRef<HTMLButtonElement>(null);
  const isActive = activeTab === id;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = enabledTabIds.indexOf(activeTab);
    let nextId: string | undefined;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextId = enabledTabIds[(currentIndex + 1) % enabledTabIds.length];
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextId = enabledTabIds[(currentIndex - 1 + enabledTabIds.length) % enabledTabIds.length];
        break;
      case 'Home':
        e.preventDefault();
        nextId = enabledTabIds[0];
        break;
      case 'End':
        e.preventDefault();
        nextId = enabledTabIds[enabledTabIds.length - 1];
        break;
      default:
        return;
    }

    if (nextId) {
      setActiveTab(nextId);
    }
  };

  return (
    <button
      ref={tabRef}
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isActive
          ? 'text-primary border-b-2 border-primary -mb-px'
          : 'text-muted-foreground hover:text-foreground border-transparent'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
      {badge !== undefined && (
        <Badge variant="default">{badge}</Badge>
      )}
    </button>
  );
}
Tab.displayName = 'Tabs.Tab';

// ── Tabs.Panel ─────────────────────────────────────────────────

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
}

function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  const isVisible = activeTab === id;

  if (!isVisible) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// ── Compound Export ────────────────────────────────────────────

Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };
