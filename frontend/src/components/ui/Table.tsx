import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export function Table({ headers, children, className = '' }: TableProps) {
  return (
    <table className={`w-full ${className}`}>
      <thead>
        <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
          {headers.map((h, i) => (
            <th key={i} className="p-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
  );
}
