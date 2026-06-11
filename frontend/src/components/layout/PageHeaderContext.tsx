import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';

export interface PageHeaderData {
  title: string;
  actions?: ReactNode;
}

export const PageHeaderContext = createContext<{
  header: PageHeaderData;
  setHeader: (data: PageHeaderData) => void;
}>({
  header: { title: 'Beacon' },
  setHeader: () => {},
});

export function useSetPageHeader(title: string, actions?: ReactNode) {
  const { setHeader } = useContext(PageHeaderContext);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    setHeader({ title, actions: actionsRef.current });
  }, [title]); // Only re-run when title changes — breaks the infinite render loop
}
