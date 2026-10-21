import { describe, expect, it } from "vitest";
import {
  buildFieldTourEmbedMaps,
  buildFieldTourMapLinks,
} from "@/lib/hr/field-google-maps";

const stops = Array.from({ length: 11 }, (_, index) => ({
  lat: 19 + index / 100,
  lng: 72 + index / 100,
}));

describe("Google Maps field tour links", () => {
  it("opens a single visited location as a pinned map", () => {
    const [link] = buildFieldTourMapLinks(stops.slice(0, 1));
    const url = new URL(link.url);
    expect(url.pathname).toBe("/maps/search/");
    expect(url.searchParams.get("query")).toBe("19,72");
  });

  it("preserves visit order and keeps routes to five stops for mobile compatibility", () => {
    const links = buildFieldTourMapLinks(stops);
    expect(links.map(({ fromStop, toStop }) => [fromStop, toStop])).toEqual([
      [1, 5],
      [5, 9],
      [9, 11],
    ]);
    for (const link of links) {
      const url = new URL(link.url);
      expect(url.searchParams.get("api")).toBe("1");
      expect(url.searchParams.get("travelmode")).toBe("driving");
      expect(url.searchParams.get("origin")).toBe(`${stops[link.fromStop - 1].lat},${stops[link.fromStop - 1].lng}`);
      expect(url.searchParams.get("destination")).toBe(`${stops[link.toStop - 1].lat},${stops[link.toStop - 1].lng}`);
      expect((url.searchParams.get("waypoints")?.split("|") ?? []).filter(Boolean).length).toBeLessThanOrEqual(3);
    }
  });
});

describe("Google Maps Embed field tour maps", () => {
  it("returns no embeds without a workspace key or stops", () => {
    expect(buildFieldTourEmbedMaps(stops, " ")).toEqual([]);
    expect(buildFieldTourEmbedMaps([], "browser-key-12345678901234567890")).toEqual([]);
  });

  it("builds a single-place embed and encodes the key", () => {
    const [map] = buildFieldTourEmbedMaps(stops.slice(0, 1), "key with spaces");
    const url = new URL(map.src);
    expect(url.pathname).toBe("/maps/embed/v1/place");
    expect(url.searchParams.get("key")).toBe("key with spaces");
    expect(url.searchParams.get("q")).toBe("19,72");
  });

  it("keeps the ordered day route and splits only above the 20-waypoint limit", () => {
    const maps = buildFieldTourEmbedMaps(stops, "workspace-browser-key");
    expect(maps.map(({ fromStop, toStop }) => [fromStop, toStop])).toEqual([
      [1, 11],
    ]);
    const url = new URL(maps[0].src);
    expect(url.pathname).toBe("/maps/embed/v1/directions");
    expect(url.searchParams.get("origin")).toBe(`${stops[0].lat},${stops[0].lng}`);
    expect(url.searchParams.get("destination")).toBe(`${stops[10].lat},${stops[10].lng}`);
    expect(url.searchParams.get("waypoints")?.split("|")).toHaveLength(9);

    const many = buildFieldTourEmbedMaps(
      Array.from({ length: 45 }, (_, index) => ({ lat: 19 + index / 100, lng: 72 + index / 100 })),
      "workspace-browser-key",
    );
    expect(many.map(({ fromStop, toStop }) => [fromStop, toStop])).toEqual([
      [1, 22],
      [22, 43],
      [43, 45],
    ]);
  });
});
