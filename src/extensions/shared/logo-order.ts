export type SortableLogoItem = {
  sortNumber?: unknown;
};

export function getLogoSortNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

export function hasLogoSortNumber(item: SortableLogoItem) {
  return getLogoSortNumber(item.sortNumber) !== null;
}

export function compareLogoSortNumber(a: SortableLogoItem, b: SortableLogoItem) {
  const aSortNumber = getLogoSortNumber(a.sortNumber);
  const bSortNumber = getLogoSortNumber(b.sortNumber);

  if (aSortNumber !== null && bSortNumber !== null) {
    return aSortNumber - bSortNumber;
  }

  if (aSortNumber !== null) {
    return -1;
  }

  if (bSortNumber !== null) {
    return 1;
  }

  return 0;
}

export function sortLogoItems<T extends SortableLogoItem>(items: T[]) {
  return [...items].sort(compareLogoSortNumber);
}
