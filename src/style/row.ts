import { css } from '@linaria/core';
import { cell } from './cell';

export const row = css`
  /* contain: strict;
  contain: size layout style paint; */
  display: grid;
  grid-template-rows: var(--row-height);
  grid-template-columns: var(--template-columns);

  width: var(--row-width);
  height: var(--row-height);
  line-height: var(--row-height);
  background-color: var(--background-color);
  word-wrap: break-word;
  word-break: break-word;

  &:hover {
    background-color: var(--row-hover-background-color);
  }
`;

export const rowClassname = `rdg-row ${row}`;

export const rowSelected = css`
  background-color: var(--row-selected-background-color);

  &:hover {
    background-color: var(--row-selected-hover-background-color);
  }
`;

export const rowSelectedClassname = `rdg-row-selected ${rowSelected}`;

const summaryRow = css`
  position: sticky;
  z-index: 3;
  grid-template-rows: var(--summary-row-height);
  height: var(--summary-row-height);
  line-height: var(--summary-row-height);

  > .${cell} {
    border-top: 2px solid var(--summary-border-color);
  }
`;

export const summaryRowClassname = `rdg-summary-row ${summaryRow}`;
