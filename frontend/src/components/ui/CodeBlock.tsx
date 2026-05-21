import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [code]);

  const lines = code.split('\n');
  const lineNumberWidth = showLineNumbers
    ? `${String(lines.length).length + 1}ch`
    : undefined;

  return (
    <div
      className={`bg-[#1e1e2e] rounded-lg overflow-hidden ${className}`}
    >
      {/* Header with language label and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        {language ? (
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {language}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="overflow-x-auto p-4 m-0 bg-[#1e1e2e]">
        <code className="font-mono text-sm text-gray-200 leading-relaxed block bg-[#1e1e2e]">
          {showLineNumbers
            ? lines.map((line, i) => (
                <div key={i} className="flex">
                  <span
                    className="select-none text-gray-500 text-right mr-4 flex-shrink-0"
                    style={{ width: lineNumberWidth }}
                  >
                    {i + 1}
                  </span>
                  <span className="whitespace-pre">{line}</span>
                </div>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
