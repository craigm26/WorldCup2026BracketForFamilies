#!/usr/bin/env python3
"""Unit tests for worldcup/update_scores.py's penalty-shootout handling.

Run: python3 update_scores_test.py

No repo-wide Python test runner exists yet (the sibling suite is all node:test
JS files run individually) — this mirrors that convention for the one Python
module that needs coverage: a knockout draw's shoot-out winner must survive
both build() and the run-to-run merge, and must never be silently dropped by
a same-rank tie against a poorer-quality fallback record (TheSportsDB has no
shoot-out data at all)."""
import sys, unittest, importlib.util, pathlib

HERE = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("update_scores", HERE / "worldcup" / "update_scores.py")
us = importlib.util.module_from_spec(spec)
spec.loader.exec_module(us)


class BuildPreservesPen(unittest.TestCase):
    def test_pen_and_shootout_score_survive_build(self):
        rows = [{"home": "SUI", "away": "COL", "hg": 0, "ag": 0, "status": "FT",
                  "pen": "home", "hp": 4, "ap": 3}]
        out = us.build(rows)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["pen"], "home")
        self.assertEqual((out[0]["hp"], out[0]["ap"]), (4, 3))

    def test_ordinary_draw_never_fabricates_a_pen_field(self):
        # A real group-stage draw (no shoot-out) must NOT gain a pen key.
        rows = [{"home": "BRA", "away": "MAR", "hg": 1, "ag": 1, "status": "FT"}]
        out = us.build(rows)
        self.assertNotIn("pen", out[0])


class MergeNeverDropsAResolvedPen(unittest.TestCase):
    def test_tie_rank_keeps_pen_from_either_side(self):
        # existing = an earlier ESPN run that already resolved the shoot-out.
        existing = {"home": "SUI", "away": "COL", "hg": 0, "ag": 0, "status": "FT", "pen": "home", "hp": 4, "ap": 3}
        # fresh = a same-rank (FT) TheSportsDB fallback row with NO shoot-out data —
        # this is the exact shape a provider fallback produces.
        fresh = {"home": "SUI", "away": "COL", "hg": 0, "ag": 0, "status": "FT"}
        merged = us._merge_pair(existing, fresh)
        self.assertEqual(merged["pen"], "home", "a fallback tie must not erase an already-resolved shoot-out winner")
        self.assertEqual((merged["hp"], merged["ap"]), (4, 3))

    def test_pen_flows_forward_onto_a_newly_richer_record(self):
        existing = {"home": "SUI", "away": "COL", "hg": 0, "ag": 0, "status": "FT"}
        fresh = {"home": "SUI", "away": "COL", "hg": 0, "ag": 0, "status": "FT", "pen": "home", "hp": 4, "ap": 3}
        merged = us._merge_pair(existing, fresh)
        self.assertEqual(merged["pen"], "home")


if __name__ == "__main__":
    unittest.main(verbosity=2)
