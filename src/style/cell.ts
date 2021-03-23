import { css } from '@linaria/core';

export const cell = css`

  padding: 8px 8px;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  background-color: inherit;

  white-space: pre-wrap;
  overflow: clip;
  text-overflow: ellipsis;

  min-height: 40px;
  display: flex;
`;

export const cellClassname = `rdg-cell ${cell}`;

const cellFrozen = css`
  position: sticky;
  z-index: 1;
`;

export const cellFrozenClassname = `rdg-cell-frozen ${cellFrozen}`;

export const cellFrozenLast = css`
  box-shadow: 2px 0 5px -2px rgba(136, 136, 136, .3);
`;

export const cellFrozenLastClassname = `rdg-cell-frozen-last ${cellFrozenLast}`;

const cellSelected = css`
  box-shadow: inset 0 0 0 2px var(--selection-color);
`;

export const cellSelectedClassname = `rdg-cell-selected ${cellSelected}`;
