import { describe, expect, it } from "vitest";
import { forecastIcon } from "./forecast";

const outdoor = { city: "Green Bay", indoor: false };
const at = (code: number, label = "x", temperature: number | null = 55) => forecastIcon(outdoor, { code, label, temperature });

describe("forecastIcon", () => {
  it("shows a dome for an indoor stadium whatever the outside weather", () => {
    expect(forecastIcon({ city: "Atlanta", indoor: true }, { code: 18, label: "Rain", temperature: 60 })).toEqual({ kind: "dome", label: "Indoors" });
    expect(forecastIcon({ city: "Atlanta", indoor: true }, null)?.kind).toBe("dome");
  });

  it("picks an icon for each kind of weather", () => {
    expect(at(1)?.kind).toBe("sun");
    expect(at(33)?.kind).toBe("moon");
    expect(at(4)?.kind).toBe("partlySun");
    expect(at(35)?.kind).toBe("partlyMoon");
    expect(at(38)?.kind).toBe("cloud");
    expect(at(13)?.kind).toBe("rain");
    expect(at(18)?.kind).toBe("rain");
    expect(at(15)?.kind).toBe("storm");
    expect(at(22)?.kind).toBe("snow");
    expect(at(31)?.kind).toBe("cold");
    expect(at(32)?.kind).toBe("wind");
  });

  it("falls back to a cloud for a code it doesn't know", () => {
    expect(at(999)?.kind).toBe("cloud");
  });

  it("describes the forecast with its temperature when there is one", () => {
    expect(at(1, "Sunny", 59)?.label).toBe("Sunny, 59\u00b0");
    expect(at(1, "Sunny", null)?.label).toBe("Sunny");
  });

  it("shows nothing when there's no forecast and the stadium is outdoors", () => {
    expect(forecastIcon(outdoor, null)).toBeNull();
  });
});
