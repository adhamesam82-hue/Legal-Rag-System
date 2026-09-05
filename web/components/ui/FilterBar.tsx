import React from "react";
import { Badge } from "./Badge";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterField {
  id: string;
  label: string;
  options: FilterOption[];
}

export type MultiFilterValues = Record<string, string[]>;

export interface FilterBarProps {
  fields: FilterField[];
  selectedValues: MultiFilterValues;
  onChange: (newValues: MultiFilterValues) => void;
  onReset?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  totalCount?: number;
  filteredCount?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * شريط التصفية المتقدم (FilterBar)
 * يلتزم بمبدأ تعددية الفلترة (Multi-Value Filtering) بقبول قوائم قيم للحقل الواحد (علاقة OR/IN)
 * مع واجهة إبداعية تدعم الاختيار المتعدد وعرض وسوم التصفية النشطة القابلة للإزالة.
 */
export function FilterBar({
  fields,
  selectedValues,
  onChange,
  onReset,
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  className = "",
  style,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const toggleValue = (fieldId: string, value: string) => {
    const currentList = selectedValues[fieldId] || [];
    const exists = currentList.includes(value);
    const updatedList = exists
      ? currentList.filter((v) => v !== value)
      : [...currentList, value];

    onChange({
      ...selectedValues,
      [fieldId]: updatedList,
    });
  };

  const removeSingleValue = (fieldId: string, value: string) => {
    const currentList = selectedValues[fieldId] || [];
    onChange({
      ...selectedValues,
      [fieldId]: currentList.filter((v) => v !== value),
    });
  };

  // جمع كافة الوسوم النشطة لعرضها
  const activeFilters = React.useMemo(() => {
    const items: Array<{ fieldId: string; fieldLabel: string; value: string; optionLabel: string }> = [];
    fields.forEach((field) => {
      const selected = selectedValues[field.id] || [];
      selected.forEach((val) => {
        const option = field.options.find((opt) => opt.value === val);
        items.push({
          fieldId: field.id,
          fieldLabel: field.label,
          value: val,
          optionLabel: option ? option.label : val,
        });
      });
    });
    return items;
  }, [fields, selectedValues]);

  const hasActiveFilters = activeFilters.length > 0 || Boolean(searchQuery);

  return (
    <div
      className={`legalos-filter-bar ${className}`.trim()}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "100%",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {/* أزرار القوائم المنسدلة للتصفية متعددة القيم */}
        {fields.map((field) => {
          const selected = selectedValues[field.id] || [];
          const isOpen = openDropdown === field.id;
          const count = selected.length;

          return (
            <div key={field.id} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setOpenDropdown(isOpen ? null : field.id)}
                aria-expanded={isOpen}
                style={{
                  height: "36px",
                  padding: "0 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  border: `1px solid ${count > 0 ? "var(--primary)" : "var(--border2)"}`,
                  borderRadius: "var(--rs)",
                  background: count > 0 ? "var(--primary-soft)" : "var(--surface)",
                  color: count > 0 ? "var(--primary)" : "var(--text)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{field.label}</span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      background: "var(--primary)",
                      color: "var(--primary-fg)",
                      padding: "1px 6px",
                      borderRadius: "999px",
                    }}
                  >
                    {count}
                  </span>
                )}
                <span className="ms" style={{ fontSize: "16px", color: "var(--text3)" }}>
                  expand_more
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    insetInlineStart: 0,
                    marginTop: "6px",
                    zIndex: 30,
                    minWidth: "220px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--rs)",
                    boxShadow: "var(--shadow-lg)",
                    padding: "6px",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text3)",
                      borderBottom: "1px solid var(--border)",
                      marginBottom: "4px",
                    }}
                  >
                    تحديد متعدد (OR / علاقة اختيار)
                  </div>
                  {field.options.map((opt) => {
                    const isChecked = selected.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          borderRadius: "var(--rs)",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          color: "var(--text)",
                          background: isChecked ? "var(--surface2)" : "transparent",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleValue(field.id, opt.value)}
                          style={{
                            width: "16px",
                            height: "16px",
                            accentColor: "var(--primary)",
                          }}
                        />
                        <span style={{ flex: 1 }}>{opt.label}</span>
                        {opt.count !== undefined && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text3)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {opt.count}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* زر إعادة ضبط التصفية */}
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            style={{
              height: "36px",
              padding: "0 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: 0,
              borderRadius: "var(--rs)",
              background: "transparent",
              color: "var(--danger)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span className="ms" style={{ fontSize: "16px" }}>
              filter_alt_off
            </span>
            إعادة ضبط
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* إحصائية النتائج المطابقة */}
        {filteredCount !== undefined && totalCount !== undefined && (
          <div style={{ fontSize: "12px", color: "var(--text3)", whiteSpace: "nowrap" }}>
            عرض <strong style={{ color: "var(--text)" }}>{filteredCount}</strong> من أصل{" "}
            {totalCount}
          </div>
        )}
      </div>

      {/* شريط الوسوم المختارة (Active Filter Tags) */}
      {activeFilters.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            paddingTop: "2px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text3)", marginInlineEnd: "4px" }}>
            عوامل التصفية:
          </span>
          {activeFilters.map((filter) => (
            <Badge
              key={`${filter.fieldId}-${filter.value}`}
              variant="soft"
              color="primary"
              size="sm"
            >
              <span>
                {filter.fieldLabel}: <strong>{filter.optionLabel}</strong>
              </span>
              <button
                type="button"
                onClick={() => removeSingleValue(filter.fieldId, filter.value)}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  color: "inherit",
                  display: "grid",
                  placeItems: "center",
                  marginInlineStart: "4px",
                }}
                aria-label={`إزالة تصفية ${filter.optionLabel}`}
              >
                <span className="ms" style={{ fontSize: "13px" }}>
                  close
                </span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
