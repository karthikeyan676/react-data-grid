import { useState, useCallback, useMemo } from 'react';
import faker from 'faker';
import DataGrid, {
  SelectColumn,
  TextEditor,
  SelectCellFormatter
} from '../../src';
import type { Column, SortDirection } from '../../src';
import { stopPropagation } from '../../src/utils';
import { SelectEditor } from './components/Editors/SelectEditor';

const dateFormatter = new Intl.DateTimeFormat(navigator.language);
const currencyFormatter = new Intl.NumberFormat(navigator.language, {
  style: 'currency',
  currency: 'eur'
});

function TimestampFormatter({ timestamp }: { timestamp: number }) {
  return <>{dateFormatter.format(timestamp)}</>;
}

function CurrencyFormatter({ value }: { value: number }) {
  return <>{currencyFormatter.format(value)}</>;
}

interface SummaryRow {
  id: string;
  totalCount: number;
  yesCount: number;
}
interface Row {
  id: number;
  title: string;
  client: string;
  area: string;
  country: string;
  contact: string;
  assignee: string;
  progress: number;
  startTimestamp: number;
  endTimestamp: number;
  budget: number;
  transaction: string;
  account: string;
  version: string;
  available: boolean;
}

function getColumns(countries: string[]): readonly Column<Row, SummaryRow>[] {
  return [
    SelectColumn,
    {
      key: 'id',
      name: 'ID',
      width: 60,
      frozen: true,
      resizable: false,
      summaryFormatter() {
        return <strong>Total</strong>;
      }
    },
    {
      key: 'title',
      name: 'Task',
      width: 120,
      frozen: true,
      editor: TextEditor,
      summaryFormatter({ row }) {
        return <>{row.totalCount} records</>;
      }
    },
    {
      key: 'client',
      name: 'Client',
      width: 220,
      editor: TextEditor
    },
    {
      key: 'area',
      name: 'Area',
      width: 120,
      editor: TextEditor
    },
    {
      key: 'country',
      name: 'Country',
      width: 180,
      editor: (p) => (
        <SelectEditor
          value={p.row.country}
          onChange={(value) =>
            p.onRowChange({ ...p.row, country: value }, true)}
          options={countries.map((c) => ({ value: c, label: c }))}
          rowHeight={p.rowHeight}
          menuPortalTarget={p.editorPortalTarget}
        />
      )
    },
    {
      key: 'contact',
      name: 'Contact',
      width: 160,
      editor: TextEditor
    },
    {
      key: 'assignee',
      name: 'Assignee',
      width: 150,
      editor: TextEditor
    },
    {
      key: 'progress',
      name: 'Completion',
      width: 110,
      formatter(props) {
        const value = props.row.progress;
        return (
          <>
            <progress max={100} value={value} style={{ width: 50 }} />{' '}
            {Math.round(value)}%
          </>
        );
      }
    },
    {
      key: 'startTimestamp',
      name: 'Start date',
      width: 100,
      formatter(props) {
        return <TimestampFormatter timestamp={props.row.startTimestamp} />;
      }
    },
    {
      key: 'endTimestamp',
      name: 'Deadline',
      width: 100,
      formatter(props) {
        return <TimestampFormatter timestamp={props.row.endTimestamp} />;
      }
    },
    {
      key: 'budget',
      name: 'Budget',
      width: 100,
      formatter(props) {
        return <CurrencyFormatter value={props.row.budget} />;
      }
    },
    {
      key: 'transaction',
      name: 'Transaction type'
    },
    {
      key: 'account',
      name: 'Account',
      width: 150
    },
    {
      key: 'version',
      name: 'Version',
      editor: TextEditor
    },
    {
      key: 'available',
      name: 'Available',
      width: 80,
      formatter({ row, onRowChange, isCellSelected }) {
        return (
          <SelectCellFormatter
            tabIndex={-1}
            value={row.available}
            onChange={() => {
              onRowChange({ ...row, available: !row.available });
            }}
            onClick={stopPropagation}
            isCellSelected={isCellSelected}
          />
        );
      },
      summaryFormatter({ row: { yesCount, totalCount } }) {
        return <>{`${Math.floor((100 * yesCount) / totalCount)}% ✔️`}</>;
      }
    }
  ];
}

function rowKeyGetter(row: Row) {
  return row.id;
}

function createRows(): readonly Row[] {
  const now = Date.now();
  const rows: Row[] = [];

  for (let i = 0; i < 10; i++) {
    rows.push({
      id: i,
      title: `Task #${i + 1}`,
      client: faker.company.companyName(),
      area: faker.name.jobArea(),
      country: faker.address.country(),
      contact: faker.internet.exampleEmail(),
      assignee: faker.name.findName(),
      progress: Math.random() * 100,
      startTimestamp: now - Math.round(Math.random() * 1e10),
      endTimestamp: now + Math.round(Math.random() * 1e10),
      budget: 500 + Math.random() * 10500,
      transaction: faker.finance.transactionType(),
      account: faker.finance.iban(),
      version: faker.system.semver(),
      available: Math.random() > 0.5
    });
  }

  return rows;
}

export function CommonFeatures() {
  const [rows, setRows] = useState(createRows);
  const [[sortColumn, sortDirection], setSort] = useState<
    [string, SortDirection]
  >(['id', 'NONE']);
  const [selectedRows, setSelectedRows] = useState(() => new Set<React.Key>());

  const countries = useMemo(() => {
    return [...new Set(rows.map((r) => r.country))].sort(
      new Intl.Collator().compare
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const columns = useMemo(() => getColumns(countries), [countries]);

  const summaryRows = useMemo(() => {
    const summaryRow: SummaryRow = {
      id: 'total_0',
      totalCount: rows.length,
      yesCount: rows.filter((r) => r.available).length
    };
    return [summaryRow];
  }, [rows]);

  const sortedRows: readonly Row[] = useMemo(() => {
    if (sortDirection === 'NONE') return rows;

    let sortedRows: Row[] = [...rows];

    switch (sortColumn) {
      case 'assignee':
      case 'title':
      case 'client':
      case 'area':
      case 'country':
      case 'contact':
      case 'transaction':
      case 'account':
      case 'version':
        sortedRows = sortedRows.sort((a, b) =>
          a[sortColumn].localeCompare(b[sortColumn])
        );
        break;
      case 'available':
        sortedRows = sortedRows.sort((a, b) =>
          a[sortColumn] === b[sortColumn] ? 0 : a[sortColumn] ? 1 : -1
        );
        break;
      case 'id':
      case 'progress':
      case 'startTimestamp':
      case 'endTimestamp':
      case 'budget':
        sortedRows = sortedRows.sort((a, b) => a[sortColumn] - b[sortColumn]);
        break;
      default:
    }

    return sortDirection === 'DESC' ? sortedRows.reverse() : sortedRows;
  }, [rows, sortDirection, sortColumn]);

  const handleSort = useCallback(
    (columnKey: string, direction: SortDirection) => {
      setSort([columnKey, direction]);
    },
    []
  );

  return (
    <DataGrid
      rowKeyGetter={rowKeyGetter}
      columns={columns}
      rows={sortedRows}
      defaultColumnOptions={{
        sortable: true,
        resizable: true
      }}
      selectedRows={selectedRows}
      onSelectedRowsChange={setSelectedRows}
      onRowsChange={setRows}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={handleSort}
      summaryRows={summaryRows}
      className="fill-grid"
    />
  );
}

CommonFeatures.storyName = 'Common Features';
