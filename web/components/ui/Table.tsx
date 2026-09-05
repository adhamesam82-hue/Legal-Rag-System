import React from "react";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children?: React.ReactNode;
}

/**
 * مكون الجدول في نظام السجل (LegalOS)
 * يعتمد على متغير الكثافة var(--rowpad) لإتاحة التبديل بين المريح والعادي والمضغوط.
 */
export function Table({ children, className = "", style, ...props }: TableProps) {
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table
        className={`legalos-table ${className}`.trim()}
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12.5px",
          textAlign: "start",
          ...style,
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`legalos-table-header ${className}`.trim()}
      style={{
        background: "var(--surface2)",
        ...style,
      }}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`legalos-table-body ${className}`.trim()} style={style} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children?: React.ReactNode;
  selected?: boolean;
}

export function TableRow({
  children,
  selected = false,
  className = "",
  style,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={`legalos-table-row ${selected ? "is-selected" : ""} ${className}`.trim()}
      style={{
        borderBottom: "1px solid var(--border)",
        background: selected ? "var(--primary-soft)" : "transparent",
        transition: "background 0.15s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
}

export function TableHead({
  children,
  sortable,
  sorted,
  className = "",
  style,
  ...props
}: TableHeadProps) {
  return (
    <th
      className={`legalos-table-head ${className}`.trim()}
      style={{
        textAlign: "start",
        padding: "10px 16px",
        fontSize: "11px",
        fontWeight: 600,
        color: "var(--text3)",
        borderBottom: "1px solid var(--border)",
        cursor: sortable ? "pointer" : "default",
        userSelect: sortable ? "none" : "auto",
        ...style,
      }}
      {...props}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
        {children}
        {sorted && (
          <span
            className="ms"
            style={{
              fontSize: "15px",
              color: "var(--primary)",
              transform: sorted === "desc" ? "rotate(180deg)" : "none",
            }}
          >
            arrow_downward
          </span>
        )}
      </div>
    </th>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export function TableCell({
  children,
  className = "",
  style,
  ...props
}: TableCellProps) {
  return (
    <td
      className={`legalos-table-cell ${className}`.trim()}
      style={{
        padding: "var(--rowpad) 16px",
        color: "var(--text)",
        ...style,
      }}
      {...props}
    >
      {children}
    </td>
  );
}
