import React, { Fragment, useState, useRef, useEffect, useMemo } from 'react';
import { isElement } from 'react-is';

import Row from './Row';
import RowGroup from './RowGroup';
import InteractionMasks from './masks/InteractionMasks';
import { getColumnScrollPosition, isPositionStickySupported, getScrollbarSize } from './utils';
import { EventTypes } from './common/enums';
import { CalculatedColumn, Position, ScrollPosition, SubRowDetails, RowRenderer, RowRendererProps, RowData, ColumnMetrics, CellMetaData, InteractionMasksMetaData } from './common/types';
import { ReactDataGridProps } from './ReactDataGrid';
import EventBus from './EventBus';
import { getVerticalRangeToRender, getHorizontalRangeToRender } from './utils/viewportUtils';

type SharedDataGridProps<R> = Pick<ReactDataGridProps<R>,
| 'rowGetter'
| 'rowsCount'
| 'rowRenderer'
| 'rowGroupRenderer'
| 'scrollToRowIndex'
| 'contextMenu'
| 'RowsContainer'
| 'getSubRowDetails'
| 'selectedRows'
> & Required<Pick<ReactDataGridProps<R>,
| 'rowKey'
| 'enableCellSelect'
| 'rowHeight'
| 'cellNavigationMode'
| 'enableCellAutoFocus'
| 'editorPortalTarget'
| 'renderBatchSize'
>>;

export interface CanvasProps<R> extends SharedDataGridProps<R> {
  columnMetrics: ColumnMetrics<R>;
  cellMetaData: CellMetaData<R>;
  height: number;
  eventBus: EventBus;
  interactionMasksMetaData: InteractionMasksMetaData<R>;
  onScroll(position: ScrollPosition): void;
  onCanvasKeydown?(e: React.KeyboardEvent<HTMLDivElement>): void;
  onCanvasKeyup?(e: React.KeyboardEvent<HTMLDivElement>): void;
  onRowSelectionChange(rowIdx: number, row: R, checked: boolean, isShiftClick: boolean): void;
}

interface RendererProps<R> extends Pick<CanvasProps<R>, 'cellMetaData' | 'onRowSelectionChange'> {
  ref(row: (RowRenderer & React.Component<RowRendererProps<R>>) | null): void;
  key: number;
  idx: number;
  columns: CalculatedColumn<R>[];
  lastFrozenColumnIndex: number;
  row: R;
  subRowDetails?: SubRowDetails;
  height: number;
  isRowSelected: boolean;
  scrollLeft: number;
  colOverscanStartIdx: number;
  colOverscanEndIdx: number;
}

export default function Canvas<R>({
  cellMetaData,
  cellNavigationMode,
  columnMetrics,
  contextMenu,
  editorPortalTarget,
  enableCellAutoFocus,
  enableCellSelect,
  eventBus,
  getSubRowDetails,
  height,
  interactionMasksMetaData,
  onCanvasKeydown,
  onCanvasKeyup,
  onRowSelectionChange,
  onScroll,
  renderBatchSize,
  rowGetter,
  rowGroupRenderer,
  rowHeight,
  rowKey,
  rowRenderer,
  RowsContainer = Fragment,
  rowsCount,
  scrollToRowIndex,
  selectedRows
}: CanvasProps<R>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const interactionMasks = useRef<InteractionMasks<R>>(null);
  const prevScrollToRowIndex = useRef<number | undefined>();
  const [rows] = useState(() => new Map<number, RowRenderer & React.Component<RowRendererProps<R>>>());
  const clientHeight = getClientHeight();

  const [rowOverscanStartIdx, rowOverscanEndIdx] = getVerticalRangeToRender(
    clientHeight,
    rowHeight,
    scrollTop,
    rowsCount,
    renderBatchSize
  );

  const { colOverscanStartIdx, colOverscanEndIdx, colVisibleStartIdx, colVisibleEndIdx } = useMemo(() => {
    return getHorizontalRangeToRender({
      columnMetrics,
      scrollLeft
    });
  }, [columnMetrics, scrollLeft]);

  useEffect(() => {
    return eventBus.subscribe(EventTypes.SCROLL_TO_COLUMN, idx => scrollToColumn(idx, columnMetrics.columns));
  }, [columnMetrics.columns, eventBus]);

  useEffect(() => {
    if (prevScrollToRowIndex.current === scrollToRowIndex) return;
    prevScrollToRowIndex.current = scrollToRowIndex;
    const { current } = canvas;
    if (typeof scrollToRowIndex === 'number' && current) {
      current.scrollTop = scrollToRowIndex * rowHeight;
    }
  }, [rowHeight, scrollToRowIndex]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollLeft: newScrollLeft, scrollTop: newScrollTop } = e.currentTarget;
    // Freeze columns on legacy browsers
    setComponentsScrollLeft(newScrollLeft);

    setScrollLeft(newScrollLeft);
    setScrollTop(newScrollTop);
    onScroll({ scrollLeft: newScrollLeft, scrollTop: newScrollTop });
  }

  function getClientHeight() {
    if (canvas.current) return canvas.current.clientHeight;
    const scrollbarSize = columnMetrics.totalColumnWidth > columnMetrics.viewportWidth ? getScrollbarSize() : 0;
    return height - scrollbarSize;
  }

  function onHitBottomCanvas({ rowIdx }: Position) {
    const { current } = canvas;
    if (current) {
      // We do not need to check for the index being in range, as the scrollTop setter will adequately clamp the value.
      current.scrollTop = (rowIdx + 1) * rowHeight - clientHeight;
    }
  }

  function onHitTopCanvas({ rowIdx }: Position) {
    const { current } = canvas;
    if (current) {
      current.scrollTop = rowIdx * rowHeight;
    }
  }

  function handleHitColummBoundary({ idx }: Position) {
    scrollToColumn(idx, columnMetrics.columns);
  }

  function scrollToColumn(idx: number, columns: CalculatedColumn<R>[]) {
    const { current } = canvas;
    if (!current) return;

    const { scrollLeft, clientWidth } = current;
    const newScrollLeft = getColumnScrollPosition(columns, idx, scrollLeft, clientWidth);
    if (newScrollLeft !== 0) {
      current.scrollLeft = scrollLeft + newScrollLeft;
    }
  }

  function getRows() {
    const rows = [];

    for (let idx = rowOverscanStartIdx; idx <= rowOverscanEndIdx; idx++) {
      rows.push(renderRow(idx));
    }

    return rows;
  }

  function renderRow(idx: number) {
    const row = rowGetter(idx);
    const rendererProps: RendererProps<R> = {
      key: idx,
      ref(row) {
        if (row) {
          rows.set(idx, row);
        } else {
          rows.delete(idx);
        }
      },
      idx,
      row,
      height: rowHeight,
      columns: columnMetrics.columns,
      isRowSelected: isRowSelected(row),
      onRowSelectionChange,
      cellMetaData,
      subRowDetails: getSubRowDetails ? getSubRowDetails(row) : undefined,
      colOverscanStartIdx,
      colOverscanEndIdx,
      lastFrozenColumnIndex: columnMetrics.lastFrozenColumnIndex,
      scrollLeft
    };
    const { __metaData } = row as RowData;

    if (__metaData) {
      if (__metaData.getRowRenderer) {
        return __metaData.getRowRenderer(rendererProps, idx);
      }
      if (__metaData.isGroup) {
        return renderGroupRow(rendererProps);
      }
    }

    if (rowRenderer) {
      return renderCustomRowRenderer(rendererProps);
    }

    return <Row<R> {...rendererProps} />;
  }

  function isRowSelected(row: R): boolean {
    return selectedRows !== undefined && selectedRows.has(row[rowKey]);
  }

  function setComponentsScrollLeft(scrollLeft: number) {
    if (isPositionStickySupported()) return;
    const { current } = interactionMasks;
    if (current) {
      current.setScrollLeft(scrollLeft);
    }

    rows.forEach(row => {
      if (row && row.setScrollLeft) {
        row.setScrollLeft(scrollLeft);
      }
    });
  }

  function getRowColumns(rowIdx: number) {
    const row = rows.get(rowIdx);
    return row && row.props ? row.props.columns : columnMetrics.columns;
  }

  function renderCustomRowRenderer(rowProps: RendererProps<R>) {
    const { ref, ...otherProps } = rowProps;
    const CustomRowRenderer = rowRenderer!;
    const customRowRendererProps = { ...otherProps, renderBaseRow: (p: RowRendererProps<R>) => <Row ref={ref} {...p} /> };

    if (isElement(CustomRowRenderer)) {
      if (CustomRowRenderer.type === Row) {
        // In the case where Row is specified as the custom render, ensure the correct ref is passed
        return <Row<R> {...rowProps} />;
      }
      return React.cloneElement(CustomRowRenderer, customRowRendererProps);
    }

    return <CustomRowRenderer {...customRowRendererProps} />;
  }

  function renderGroupRow(groupRowProps: RendererProps<R>) {
    const { ref, columns, ...rowGroupProps } = groupRowProps;
    const row = groupRowProps.row as RowData;

    return (
      <RowGroup
        {...rowGroupProps}
        {...row.__metaData!}
        columns={columns as CalculatedColumn<unknown>[]}
        name={row.name!}
        eventBus={eventBus}
        renderer={rowGroupRenderer}
        renderBaseRow={(p: RowRendererProps<R>) => <Row ref={ref} {...p} />}
      />
    );
  }

  const paddingTop = rowOverscanStartIdx * rowHeight;
  const paddingBottom = (rowsCount - 1 - rowOverscanEndIdx) * rowHeight;

  return (
    <div
      className="react-grid-Canvas"
      style={{ height }}
      ref={canvas}
      onScroll={handleScroll}
      onKeyDown={onCanvasKeydown}
      onKeyUp={onCanvasKeyup}
    >
      <InteractionMasks<R>
        ref={interactionMasks}
        rowGetter={rowGetter}
        rowsCount={rowsCount}
        rowHeight={rowHeight}
        columns={columnMetrics.columns}
        height={clientHeight}
        colVisibleStartIdx={colVisibleStartIdx}
        colVisibleEndIdx={colVisibleEndIdx}
        enableCellSelect={enableCellSelect}
        enableCellAutoFocus={enableCellAutoFocus}
        cellNavigationMode={cellNavigationMode}
        eventBus={eventBus}
        contextMenu={contextMenu}
        onHitBottomBoundary={onHitBottomCanvas}
        onHitTopBoundary={onHitTopCanvas}
        onHitLeftBoundary={handleHitColummBoundary}
        onHitRightBoundary={handleHitColummBoundary}
        scrollLeft={scrollLeft}
        scrollTop={scrollTop}
        getRowColumns={getRowColumns}
        editorPortalTarget={editorPortalTarget}
        {...interactionMasksMetaData}
      />
      <RowsContainer id={contextMenu ? contextMenu.props.id : 'rowsContainer'}>
        <div className="rdg-rows-container" style={{ width: columnMetrics.totalColumnWidth, paddingTop, paddingBottom }}>
          {getRows()}
        </div>
      </RowsContainer>
    </div>
  );
}
