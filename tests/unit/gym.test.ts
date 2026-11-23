import { describe, expect, it } from "vitest";
import {
  approvalFields,
  newProblems,
  problemSendRates,
  rejectionFields,
  removalFields,
  toCsv,
} from "@/domain/gym";
import { parsePointMaster } from "@/domain/score";

const points = parsePointMaster([], "2027"); // points = problem number
const yes = (nos: number[]) => Object.fromEntries(nos.map((n) => [String(n), "Y"]));

describe("approvalFields", () => {
  it("approves every sent problem and totals them", () => {
    const f = approvalFields({ problems: yes([3, 10]), status: "Pending" }, points);
    expect(f.approvedProblems).toEqual({ "3": true, "10": true });
    expect(f.approvedTotalPoints).toBe(13);
    expect(f.status).toBe("Approved");
  });
});

describe("rejectionFields", () => {
  const resubmitted = {
    problems: yes([3, 10, 30]),
    approvedProblems: { "3": true, "10": true },
    status: "Pending",
  };
  it("keeps the earlier approved part when rejecting from the Pending list", () => {
    const f = rejectionFields(resubmitted, points, "写真なし", false);
    expect(f.approvedTotalPoints).toBe(13);
    expect(f.rejectReason).toBe("写真なし");
  });
  it("drops everything when sending the whole record back", () => {
    const f = rejectionFields(resubmitted, points, "再提出", true);
    expect(f.approvedProblems).toEqual({});
    expect(f.approvedTotalPoints).toBe(0);
  });
});

describe("removalFields", () => {
  it("removes one problem and recomputes the points", () => {
    const f = removalFields(
      { problems: yes([3, 10, 30]), approvedProblems: { "3": true, "10": true, "30": true } },
      10,
      points,
    );
    expect(f.problems["10"]).toBe("N");
    expect((f as Record<string, unknown>)["10"]).toBe("N");
    expect(f.totalPoints).toBe(33);
    expect(f.approvedTotalPoints).toBe(33);
  });
});

describe("newProblems", () => {
  it("lists sent problems that are not approved yet", () => {
    expect(newProblems({ problems: yes([3, 10, 30]), approvedProblems: { "3": true } })).toEqual([
      10, 30,
    ]);
  });
});

describe("problemSendRates", () => {
  it("leaves Rejected records out", () => {
    const { total, rates } = problemSendRates([
      { problems: yes([1, 2]), status: "Approved" },
      { problems: yes([1]), status: "Pending" },
      { problems: yes([1, 2, 3]), status: "Rejected" },
    ]);
    expect(total).toBe(2);
    expect(rates[0]).toEqual({ no: 1, sent: 2, rate: 1 });
    expect(rates[1]!.rate).toBe(0.5);
    expect(rates[2]!.sent).toBe(0);
  });
});

describe("toCsv", () => {
  it("adds a BOM, quotes commas and blocks formulas", () => {
    const csv = toCsv(["名前", "メモ"], [["山田, 太郎", "=1+1"]]);
    expect(csv.startsWith("﻿名前,メモ\r\n")).toBe(true);
    expect(csv).toContain(`"山田, 太郎",'=1+1`);
  });
});
