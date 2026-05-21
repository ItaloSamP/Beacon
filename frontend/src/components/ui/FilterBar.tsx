import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

interface SortOption {
  value: string;
  label: string;
}

interface FiltersValue {
  [groupLabel: string]: string;
}

interface FilterBarContextValue {
  activeFilters: FiltersValue;
  handlePillClick: (groupLabel: string, value: string) => void;
  onFilterChange?: (filters: FiltersValue) => void;
}

const FilterBarContext = createContext<FilterBarContextValue | null>(null);

function useFilterBarContext() {
  const ctx = useContext(FilterBarContext);
  if (!ctx) throw new Error('FilterBar compound components must be used within <FilterBar>');
  return ctx;
}

// ── Group Context (so pills know their group label) ──────────

const GroupContext = createContext<string>('');

// ── FilterBar (Root) ──────────────────────────────────────────

interface FilterBarProps {
  onFilterChange?: (filters: FiltersValue) => void;
  onClear?: () => void;
  onSortChange?: (value: string) => void;
  sortOptions?: SortOption[];
  className?: string;
  children: React.ReactNode;
}

function FilterBar({
  onFilterChange,
  onClear,
  onSortChange,
  sortOptions,
  className = '',
  children,
}: FilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<FiltersValue>({});
  const [sortValue, setSortValue] = useState(sortOptions?.[0]?.value ?? '');

  // Determine initial active filters from children on first render
  useEffect(() => {
    const initial: FiltersValue = {};
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.type as any)?.displayName === 'FilterBar.Group') {
        const typedChild = child as React.ReactElement<any>;
        const groupChildren = React.Children.toArray(typedChild.props.children)
          .filter(React.isValidElement) as React.ReactElement<any>[];
        groupChildren.forEach((pill) => {
          if (pill.props.active) {
            initial[typedChild.props.label] = pill.props.value;
          }
        });
      }
    });
    if (Object.keys(initial).length > 0) {
      setActiveFilters(initial);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePillClickImmediate = useCallback(
    (groupLabel: string, value: string) => {
      const newFilters = { ...activeFilters, [groupLabel]: value };
      setActiveFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [activeFilters, onFilterChange],
  );

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSortValue(newValue);
    onSortChange?.(newValue);
  };

  return (
    <FilterBarContext.Provider value={{ activeFilters, handlePillClick: handlePillClickImmediate, onFilterChange }}>
      <div className={`flex flex-wrap items-center gap-4 ${className}`}>
        <div className="flex flex-wrap items-center gap-6">
          {children}
        </div>

        {sortOptions && sortOptions.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={sortValue}
              onChange={handleSortChange}
              className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    </FilterBarContext.Provider>
  );
}

// ── FilterBar.Group ────────────────────────────────────────────

interface FilterBarGroupProps {
  label: string;
  children: React.ReactNode;
}

function FilterBarGroup({ label, children }: FilterBarGroupProps) {
  return (
    <GroupContext.Provider value={label}>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {children}
        </div>
      </div>
    </GroupContext.Provider>
  );
}
FilterBarGroup.displayName = 'FilterBar.Group';

// ── FilterBar.Pill ─────────────────────────────────────────────

interface FilterBarPillProps {
  value: string;
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

function FilterBarPill({ value, active: propActive, children, onClick }: FilterBarPillProps) {
  const { activeFilters, handlePillClick } = useFilterBarContext();
  const groupLabel = useContext(GroupContext);

  // Determine active state: props take precedence, then context
  const isActive = propActive ?? (activeFilters[groupLabel] === value);

  const handleClick = () => {
    onClick?.();
    if (groupLabel) {
      handlePillClick(groupLabel, value);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        px-3 py-1 text-xs font-medium rounded-full transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
        ${isActive
          ? 'bg-primary text-white shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }
      `}
    >
      {children}
    </button>
  );
}

// ── Compound Export ────────────────────────────────────────────

FilterBar.Group = FilterBarGroup;
FilterBar.Pill = FilterBarPill;

export { FilterBar };
