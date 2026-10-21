import { describe, expect, it } from "vitest";
import { nonPickers, picksOf } from "./summary";

const players = [{ name: "Joe" }, { name: "Dane" }, { name: "Ja" }];
const legs = [
  { owner: "Joe", label: "Chiefs -3.5", price: -110 },
  { owner: " dane ", label: "Over 47.5", price: -105 },
];

describe("nonPickers", () => {
  it("is everyone without a leg, ignoring case and spacing", () => {
    expect(nonPickers(legs, players)).toEqual([{ name: "Ja" }]);
  });
  it("is empty when everyone picked", () => {
    const all = [...legs, { owner: "Ja", label: "x", price: -110 }];
    expect(nonPickers(all, players)).toEqual([]);
  });
  it("is everyone when the week has no legs", () => {
    expect(nonPickers([], players)).toHaveLength(3);
  });
});

describe("picksOf", () => {
  it("gives the label and odds of that player's legs", () => {
    expect(picksOf(legs, "Dane")).toEqual([{ label: "Over 47.5", price: -105 }]);
    expect(picksOf(legs, "Ja")).toEqual([]);
  });
  it("adds a prop's stat to its label", () => {
    const prop = [{ owner: "Joe", label: "Kenneth Walker III", market: "Any time TD scorer" }];
    expect(picksOf(prop, "Joe")).toEqual([{ label: "Kenneth Walker III · Any time TD scorer", price: undefined }]);
  });
});
