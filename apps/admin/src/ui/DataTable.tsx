import type { ReactNode } from "react";

export type Column<Row> = {
  key: string;
  header: ReactNode;
  /** Pin the column to the far end of the row, as the Stitch actions column is. */
  align?: "start" | "end";
  cell: (row: Row) => ReactNode;
};

/**
 * The bordered, zebra-hover table used by "العمليات النشطة" and the batching
 * shipment list. Horizontal overflow scrolls inside the card so the page body
 * never scrolls sideways.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === "end" ? "is-end" : undefined} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === "end" ? "is-end" : undefined}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
