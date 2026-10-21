export type VisitedLocation = {
  lat: number;
  lng: number;
};

export type FieldTourMapLink = {
  fromStop: number;
  toStop: number;
  url: string;
};

export type FieldTourEmbed = {
  fromStop: number;
  toStop: number;
  src: string;
};

/** Maps Embed directions support up to 20 waypoints (22 stops total). */
export function buildFieldTourEmbedMaps(
  stops: VisitedLocation[],
  apiKey: string,
): FieldTourEmbed[] {
  const key = apiKey.trim();
  if (!key || stops.length === 0) return [];
  if (stops.length === 1) {
    const url = new URL("https://www.google.com/maps/embed/v1/place");
    url.searchParams.set("key", key);
    url.searchParams.set("q", `${stops[0].lat},${stops[0].lng}`);
    url.searchParams.set("zoom", "15");
    return [{ fromStop: 1, toStop: 1, src: url.toString() }];
  }

  const maps: FieldTourEmbed[] = [];
  let startIndex = 0;
  while (startIndex < stops.length - 1) {
    const endIndex = Math.min(startIndex + 22, stops.length);
    const segment = stops.slice(startIndex, endIndex);
    const url = new URL("https://www.google.com/maps/embed/v1/directions");
    url.searchParams.set("key", key);
    url.searchParams.set("origin", `${segment[0].lat},${segment[0].lng}`);
    url.searchParams.set(
      "destination",
      `${segment[segment.length - 1].lat},${segment[segment.length - 1].lng}`,
    );
    url.searchParams.set("mode", "driving");
    url.searchParams.set("units", "metric");
    if (segment.length > 2) {
      url.searchParams.set(
        "waypoints",
        segment.slice(1, -1).map((stop) => `${stop.lat},${stop.lng}`).join("|"),
      );
    }
    maps.push({ fromStop: startIndex + 1, toStop: endIndex, src: url.toString() });
    startIndex = endIndex - 1;
  }
  return maps;
}

/**
 * Google Maps Directions URLs support up to three waypoints on mobile browsers.
 * Five stops per route (origin + 3 waypoints + destination) works across devices.
 * Consecutive route links overlap by one stop so the full tour stays connected.
 */
export function buildFieldTourMapLinks(
  stops: VisitedLocation[],
): FieldTourMapLink[] {
  if (stops.length === 0) return [];

  if (stops.length === 1) {
    const pin = new URL("https://www.google.com/maps/search/");
    pin.searchParams.set("api", "1");
    pin.searchParams.set("query", `${stops[0].lat},${stops[0].lng}`);
    return [{ fromStop: 1, toStop: 1, url: pin.toString() }];
  }

  const links: FieldTourMapLink[] = [];
  let startIndex = 0;
  while (startIndex < stops.length - 1) {
    const endIndex = Math.min(startIndex + 5, stops.length);
    const segment = stops.slice(startIndex, endIndex);
    const directions = new URL("https://www.google.com/maps/dir/");
    directions.searchParams.set("api", "1");
    directions.searchParams.set("origin", `${segment[0].lat},${segment[0].lng}`);
    directions.searchParams.set(
      "destination",
      `${segment[segment.length - 1].lat},${segment[segment.length - 1].lng}`,
    );
    directions.searchParams.set("travelmode", "driving");
    if (segment.length > 2) {
      directions.searchParams.set(
        "waypoints",
        segment.slice(1, -1).map((stop) => `${stop.lat},${stop.lng}`).join("|"),
      );
    }
    links.push({
      fromStop: startIndex + 1,
      toStop: endIndex,
      url: directions.toString(),
    });
    startIndex = endIndex - 1;
  }
  return links;
}
