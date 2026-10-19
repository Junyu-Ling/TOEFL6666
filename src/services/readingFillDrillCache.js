import { fetchReadingFillDrill } from "./access";

let cachedItems = null;
let inflight = null;

export function peekReadingFillDrillItems() {
  return cachedItems;
}

export function prefetchReadingFillDrill() {
  if (cachedItems) return Promise.resolve(cachedItems);
  if (inflight) return inflight;
  inflight = fetchReadingFillDrill()
    .then((data) => {
      cachedItems = Array.isArray(data?.items) ? data.items : [];
      return cachedItems;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
