import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItemProps {
  href?: string;
  isCurrentPage?: boolean;
  children: React.ReactNode;
}

interface BreadcrumbProps {
  collapsed?: boolean;
  className?: string;
  children: React.ReactNode;
}

function BreadcrumbItem({ href, isCurrentPage, children }: BreadcrumbItemProps) {
  if (isCurrentPage) {
    return (
      <li
        aria-current="page"
        className="text-foreground font-medium"
      >
        {children}
      </li>
    );
  }

  return (
    <li>
      <a
        href={href}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {children}
      </a>
    </li>
  );
}

function Breadcrumb({ collapsed, className = '', children }: BreadcrumbProps) {
  const items = React.Children.toArray(children);

  if (items.length === 0) {
    return (
      <nav aria-label="breadcrumb" className={className}>
        <ol className="flex items-center gap-1.5 flex-wrap" />
      </nav>
    );
  }

  const renderedItems = collapsed && items.length > 3
    ? [
        items[0],
        <li key="ellipsis" aria-hidden="true" className="text-muted-foreground">...</li>,
        items[items.length - 1],
      ]
    : items;

  return (
    <nav aria-label="breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {renderedItems.map((item, index) => {
          const itemKey = (React.isValidElement(item) && (item as React.ReactElement<any>).key) || `bc-${index}`;
          return (
          <React.Fragment key={itemKey}>
            {index > 0 && (
              <li aria-hidden="true" className="text-muted-foreground flex items-center">
                <ChevronRight className="w-4 h-4" />
              </li>
            )}
            {item}
          </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

Breadcrumb.Item = BreadcrumbItem;

export { Breadcrumb };
