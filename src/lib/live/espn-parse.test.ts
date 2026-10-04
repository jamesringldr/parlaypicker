import { describe, expect, it } from "vitest";
import { elapsedShare, gameClock, parseBox, parseLastScoringPlay, parseScoreboard } from "./espn-parse";

const scoreboard = {
  events: [
    {
      id: "1",
      status: { period: 3, displayClock: "7:58", type: { state: "in", completed: false, shortDetail: "7:58 - 3rd" } },
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "13", team: { displayName: "Washington Commanders" } },
            { homeAway: "away", score: "17", team: { displayName: "Indianapolis Colts" } },
          ],
        },
      ],
    },
    {
      id: "2",
      status: { type: { state: "pre", completed: false, shortDetail: "Sun 12:00" } },
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "0", team: { displayName: "Buffalo Bills" } },
            { homeAway: "away", score: "0", team: { displayName: "New England Patriots" } },
          ],
        },
      ],
    },
    {
      id: "3",
      status: { type: { state: "post", completed: true, shortDetail: "Final" } },
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "27", team: { displayName: "Cleveland Browns" } },
            { homeAway: "away", score: "24", team: { displayName: "Pittsburgh Steelers" } },
          ],
        },
      ],
    },
  ],
};

describe("parseScoreboard", () => {
  const games = parseScoreboard(scoreboard);

  it("reads live scores and the clock", () => {
    expect(games[0]).toMatchObject({
      id: "1",
      homeTeam: "Washington Commanders",
      awayTeam: "Indianapolis Colts",
      started: true,
      score: { completed: false, homeScore: 13, awayScore: 17, clock: "Q3 · 7:58", elapsed: (2 * 900 + 422) / 3600 },
    });
  });

  it("hides the 0-0 placeholder before kickoff", () => {
    expect(games[1].started).toBe(false);
    expect(games[1].score).toMatchObject({ homeScore: null, awayScore: null, completed: false, elapsed: undefined });
  });

  it("marks finals complete and drops the clock", () => {
    expect(games[2].score).toEqual({ completed: true, homeScore: 27, awayScore: 24, clock: undefined, elapsed: 1 });
  });

  it("returns nothing, not a crash, when the shape changes", () => {
    expect(parseScoreboard(null)).toEqual([]);
    expect(parseScoreboard({ events: [{ id: 1 }, "x", null] })).toEqual([]);
    expect(parseScoreboard({ nope: true })).toEqual([]);
  });
});

describe("elapsedShare", () => {
  it("measures how much of regulation is gone", () => {
    expect(elapsedShare(1, "15:00")).toBe(0);
    expect(elapsedShare(1, "7:30")).toBeCloseTo(0.125);
    expect(elapsedShare(2, "0:00")).toBe(0.5); // halftime
    expect(elapsedShare(3, "3:25")).toBeCloseTo((1800 + 695) / 3600);
    expect(elapsedShare(4, "0:00")).toBe(1);
  });
  it("counts overtime as the whole game and shrugs off bad input", () => {
    expect(elapsedShare(5, "10:00")).toBe(1);
    expect(elapsedShare(null, "7:58")).toBeUndefined();
    expect(elapsedShare(3, undefined)).toBeUndefined();
    expect(elapsedShare(3, "soon")).toBeUndefined();
  });
});

const summary = {
  boxscore: {
    players: [
      {
        statistics: [
          {
            name: "rushing",
            labels: ["CAR", "YDS", "AVG", "TD", "LONG"],
            athletes: [{ athlete: { displayName: "Jonathan Taylor" }, stats: ["13", "54", "4.2", "2", "10"] }],
          },
          {
            name: "receiving",
            labels: ["REC", "YDS", "AVG", "TD", "LONG", "TGTS"],
            athletes: [{ athlete: { displayName: "Tyler Warren" }, stats: ["3", "34", "11.3", "0", "13", "3"] }],
          },
          {
            name: "passing",
            labels: ["C/ATT", "YDS", "AVG", "TD", "INT", "SACKS", "RTG"],
            athletes: [{ athlete: { displayName: "Daniel Jones" }, stats: ["14/26", "110", "4.2", "0", "1", "2-14", "48.6"] }],
          },
          { name: "fumbles", labels: ["FUM"], athletes: [] },
        ],
      },
    ],
  },
  scoringPlays: [
    { type: { text: "Field Goal Good" }, text: "Drew Stevens 31 Yd Field Goal" },
    { type: { text: "Rushing Touchdown" }, text: "Jonathan Taylor 5 Yd Rush (Spencer Shrader Kick)" },
    { type: { text: "Passing Touchdown" }, text: "Kenneth Walker III 12 Yd pass from Patrick Mahomes (Harrison Butker Kick)" },
  ],
};

describe("parseBox", () => {
  const box = parseBox(summary)!;

  it("reads yardage by group, keyed by normalized name", () => {
    expect(box.rush.get("jonathan taylor")).toBe(54);
    expect(box.rec.get("tyler warren")).toBe(34);
    expect(box.pass.get("daniel jones")).toBe(110);
  });

  it("keeps only touchdown plays, not field goals", () => {
    expect(box.tdPlays).toHaveLength(2);
    expect(box.tdPlays[0]).toMatch(/^jonathan taylor 5 yd rush/);
  });

  it("is null before the game has player stats", () => {
    expect(parseBox({ boxscore: { players: [] } })).toBeNull();
    expect(parseBox({})).toBeNull();
    expect(parseBox(null)).toBeNull();
  });
});

describe("gameClock", () => {
  it("is quarter and time remaining", () => {
    expect(gameClock(2, "4:06", "STATUS_IN_PROGRESS", "4:06 - 2nd")).toBe("Q2 · 4:06");
    expect(gameClock(4, "0:42", "STATUS_IN_PROGRESS", "0:42 - 4th")).toBe("Q4 · 0:42");
  });
  it("says OT in overtime, and uses ESPN's wording at halftime and between quarters", () => {
    expect(gameClock(5, "7:00", "STATUS_IN_PROGRESS", "7:00 - OT")).toBe("OT · 7:00");
    expect(gameClock(2, "0:00", "STATUS_HALFTIME", "Halftime")).toBe("Halftime");
    expect(gameClock(1, "0:00", "STATUS_END_PERIOD", "End of 1st")).toBe("End of 1st");
  });
  it("is undefined without a period or clock", () => {
    expect(gameClock(null, "4:06", "STATUS_IN_PROGRESS", "")).toBeUndefined();
    expect(gameClock(2, undefined, "STATUS_IN_PROGRESS", "")).toBeUndefined();
  });
});

describe("parseLastScoringPlay", () => {
  it("is the latest play, with the scoring team", () => {
    expect(
      parseLastScoringPlay({
        scoringPlays: [
          { text: "Drew Stevens 31 Yd Field Goal", team: { abbreviation: "IND" } },
          { text: "Rhamondre Stevenson 1 Yd Rush (Andy Borregales Kick)", team: { abbreviation: "NE" } },
        ],
      }),
    ).toBe("NE: Rhamondre Stevenson 1 Yd Rush (Andy Borregales Kick)");
  });
  it("still works without a team, and is null when nobody has scored or the shape changes", () => {
    expect(parseLastScoringPlay({ scoringPlays: [{ text: "Safety" }] })).toBe("Safety");
    expect(parseLastScoringPlay({ scoringPlays: [] })).toBeNull();
    expect(parseLastScoringPlay({})).toBeNull();
    expect(parseLastScoringPlay(null)).toBeNull();
  });
});
