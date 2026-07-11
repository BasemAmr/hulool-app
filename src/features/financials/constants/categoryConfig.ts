import { useMemo } from 'react';
import { useGetCategoryMetadata } from '../api/treasuryQueries';

/**
 * Hook that fetches category labels from the database and returns
 * a Record<string, string> mapping slug → label.
 *
 * Usage:
 *   const categoryLabels = useCategoryLabels();
 *   // categoryLabels['bank'] → 'الحسابات البنكية'
 */
export const useCategoryLabels = (): Record<string, string> => {
  const { data: metadata = [] } = useGetCategoryMetadata();

  const labels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of metadata) {
      if (cat.slug && cat.label) {
        map[cat.slug] = cat.label;
      }
    }
    return map;
  }, [metadata]);

  return labels;
};
