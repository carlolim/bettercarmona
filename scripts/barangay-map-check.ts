/**
 * Fails the build when the boundary file and the barangay list stop matching: loading the
 * map data throws if any of the 14 barangays has no shape.
 */
import type { Plugin } from 'vite';

export function barangayMapCheck(): Plugin {
  return {
    name: 'barangay-map-check',
    async buildStart() {
      try {
        await import('../src/community/data/barangay-map.ts');
      } catch (error) {
        this.error(`Barangay map: ${(error as Error).message}`);
      }
    },
  };
}
