import { fetchInspektorGadgetFromArtifactHub } from './artifacthub';
import { vi } from 'vitest';

describe('ArtifactHub API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchInspektorGadgetFromArtifactHub', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('should fetch packages from ArtifactHub successfully', async () => {
      const mockPackages = [
        { name: 'package-1', version: '1.0.0' },
        { name: 'package-2', version: '2.0.0' },
      ];

      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce({ packages: mockPackages }),
      } as unknown as Response);

      const result = await fetchInspektorGadgetFromArtifactHub();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:4466/externalproxy', {
        headers: {
          'Forward-To':
            'https://artifacthub.io/api/v1/packages/search?kind=22&ts_query_web=inspektor+gadget&official=true&facets=true&limit=60&offset=0',
        },
      });
      expect(result).toEqual(mockPackages);
    });

    it('should return empty array when no packages are found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce({ packages: [] }),
      } as unknown as Response);

      const result = await fetchInspektorGadgetFromArtifactHub();

      expect(result).toEqual([]);
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchInspektorGadgetFromArtifactHub()).rejects.toThrow('Network error');
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      } as unknown as Response);

      await expect(fetchInspektorGadgetFromArtifactHub()).rejects.toThrow('Invalid JSON');
    });

    it('should use correct query parameters for ArtifactHub API', async () => {
      const mockPackages = [{ name: 'test-package', version: '1.0.0' }];

      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValueOnce({ packages: mockPackages }),
      } as unknown as Response);

      await fetchInspektorGadgetFromArtifactHub();

      const callArgs = mockFetch.mock.calls[0];
      const forwardToHeader = callArgs[1]?.headers?.['Forward-To'];

      expect(forwardToHeader).toContain('kind=22');
      expect(forwardToHeader).toContain('ts_query_web=inspektor+gadget');
      expect(forwardToHeader).toContain('official=true');
      expect(forwardToHeader).toContain('facets=true');
      expect(forwardToHeader).toContain('limit=60');
      expect(forwardToHeader).toContain('offset=0');
    });
  });
});
