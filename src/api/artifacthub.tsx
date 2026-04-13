import { getServerURL } from '../gadgets/helper';
import { normalizeName } from '../gadgets/helper';

export function fetchInspektorGadgetFromArtifactHub() {
  return fetch(`${getServerURL()}/externalproxy`, {
    headers: {
      'Forward-To': `https://artifacthub.io/api/v1/packages/search?kind=22&ts_query_web=inspektor+gadget&official=true&facets=true&limit=${60}&offset=0`,
    },
  })
    .then(response => response.json())
    .then(data => {
      return data.packages;
    });
}

export async function fetchGadgetVersionFromArtifactHub(imageURL: string) {
  const gadgetName = imageURL.split('/').pop()?.split(':')[0];
  const normalizedImageName = normalizeName(gadgetName);

  const response = await fetch(`${getServerURL()}/externalproxy`, {
    headers: {
      'Forward-To': `https://artifacthub.io/api/v1/packages/search?ts_query_web=${gadgetName}`,
    },
  });

  const data = await response.json();

  const gadget = data.packages.find(
    g =>
      normalizeName(g.normalized_name) === normalizedImageName ||
      normalizeName(g.name) === normalizedImageName
  );

  if (!gadget) {
    console.log('Gadget not found for', gadgetName);
    return '1';
  }

  return gadget.version;
}
