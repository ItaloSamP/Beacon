import React, { createContext, useContext } from 'react';

interface TableContextValue {
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  striped?: boolean;
}

const TableContext = createContext<TableContextValue>({});

interface TableProps {
  children: React.ReactNode;
  className?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  striped?: boolean;
}

function getSortKey(children: React.ReactNode): string {
  if (typeof children === 'string') return children.toLowerCase();
  if (typeof children === 'number') return String(children);
  return '';
}

export function Table({
  children,
  className = '',
  emptyState,
  loading = false,
  sortKey,
  sortDirection,
  onSort,
  striped = false,
}: TableProps) {
  const contextValue: TableContextValue = { sortKey, sortDirection, onSort, striped };

  const childrenArray = React.Children.toArray(children);
  const headElements = childrenArray.filter(
    child => React.isValidElement(child) && child.type === Table.Head,
  );
  const bodyRows = childrenArray.filter(
    child => React.isValidElement(child) && child.type === Table.Row,
  );

  const hasDataRows = bodyRows.length > 0;

  return (
    <TableContext.Provider value={contextValue}>
      <table
        className={`w-full ${className}`}
        aria-busy={loading ? 'true' : undefined}
      >
        {headElements}
        <tbody className={loading ? 'animate-pulse' : ''}>
          {hasDataRows
            ? bodyRows
            : emptyState
              ? (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-gray-500">
                    {emptyState}
                  </td>
                </tr>
              )
              : null}
        </tbody>
      </table>
    </TableContext.Provider>
  );
}

// ============================================================
// Sub-Components (static properties on Table)
// ============================================================

interface TableHeadProps {
  children: React.ReactNode;
}

Table.Head = function TableHead({ children }: TableHeadProps) {
  return <thead className="border-b border-gray-200">{children}</thead>;
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
}

Table.Row = function TableRow({ children, className = '' }: TableRowProps) {
  const { striped } = useContext(TableContext);
  const stripeClass = striped ? 'even:bg-gray-50' : '';
  return <tr className={`${stripeClass} ${className}`}>{children}</tr>;
};

interface TableCellProps {
  children: React.ReactNode;
  header?: boolean;
  sortable?: boolean;
  className?: string;
}

Table.Cell = function TableCell({
  children,
  header,
  sortable,
  className = '',
}: TableCellProps) {
  const { sortKey, sortDirection, onSort } = useContext(TableContext);
  const cellKey = getSortKey(children);
  const isSorted = sortable && sortKey === cellKey;

  const handleClick =
    sortable && onSort ? () => onSort(cellKey) : undefined;

  const sortClass = sortable ? 'cursor-pointer select-none' : '';
  const Tag = header ? 'th' : 'td';
  const baseClass = header
    ? 'p-3 text-left text-sm text-gray-500'
    : 'p-3';

  return (
    <Tag
      className={`${baseClass} ${sortClass} ${className}`}
      onClick={handleClick}
    >
      {children}
      {isSorted && (
        <span className="ml-1" aria-hidden="true">
          {sortDirection === 'desc' ? ' ▼' : ' ▲'}
        </span>
      )}
    </Tag>
  );
};
