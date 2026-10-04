import { describe, expect, it } from "vitest";
import { parseBox, parseScoreboard } from "./espn-parse";

const scoreboard = {
  events: [
    {
      id: "1",
      status: { type: { state: "in", completed: false, shortDetail: "7:58 - 3rd" } },
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
      score: { completed: false, homeScore: 13, awayScore: 17, clock: "7:58 - 3rd" },
    });
  });

  it("hides the 0-0 placeholder before kickoff", () => {
    expect(games[1].started).toBe(false);
    expect(games[1].score).toMatchObject({ homeScore: null, awayScore: null, completed: false });
  });

  it("marks finals complete and drops the clock", () => {
    expect(games[2].score).toEqual({ completed: true, homeScore: 27, awayScore: 24, clock: undefined });
  });

  it("returns nothing, not a crash, when the shape changes", () => {
    expect(parseScoreboard(null)).toEqual([]);
    expect(parseScoreboard({ events: [{ id: 1 }, "x", null] })).toEqual([]);
    expect(parseScoreboard({ nope: true })).toEqual([]);
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
