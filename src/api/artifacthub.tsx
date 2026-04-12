import { getServerURL } from '../gadgets/helper';

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
