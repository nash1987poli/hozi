"""Unit tests for the Hozi risk engine (pure stdlib)."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import engine


def row(rain=100.0, ndvi=0.70, pest=0.0, irr=0.0, inp=0.0):
    return {"rainfall_mm": rain, "ndvi": ndvi, "pest": pest,
            "irrigation": irr, "inputs": inp}


class TestClamp(unittest.TestCase):
    def test_within_bounds(self): self.assertEqual(engine.clamp(0.5), 0.5)
    def test_below(self): self.assertEqual(engine.clamp(-1), 0.0)
    def test_above(self): self.assertEqual(engine.clamp(2), 1.0)


class TestModelRisk(unittest.TestCase):
    def test_healthy_district_low_risk(self):
        # full rain, healthy ndvi, no pests -> only bias term remains
        self.assertLess(engine.model_risk(row()), 10)

    def test_drought_district_high_risk(self):
        r = engine.model_risk(row(rain=0.0, ndvi=0.0, pest=25.0))
        self.assertGreater(r, 80)

    def test_irrigation_mitigates(self):
        dry = engine.model_risk(row(rain=20.0))
        dry_irrigated = engine.model_risk(row(rain=20.0, irr=100.0))
        self.assertLess(dry_irrigated, dry)

    def test_bounded_0_100(self):
        for r in (row(rain=-500), row(rain=500, ndvi=2, irr=100, inp=100)):
            v = engine.model_risk(r)
            self.assertGreaterEqual(v, 0.0); self.assertLessEqual(v, 100.0)


class TestPearson(unittest.TestCase):
    def test_perfect_positive(self):
        self.assertAlmostEqual(engine.pearson([1, 2, 3], [2, 4, 6]), 1.0)

    def test_perfect_negative(self):
        self.assertAlmostEqual(engine.pearson([1, 2, 3], [6, 4, 2]), -1.0)

    def test_constant_series_returns_zero(self):
        self.assertEqual(engine.pearson([1, 1, 1], [2, 4, 6]), 0.0)


class TestLinfitAndBand(unittest.TestCase):
    def test_linfit_recovers_line(self):
        slope, intercept = engine.linfit([3, 5, 7, 9])  # y = 2x + 3
        self.assertAlmostEqual(slope, 2.0); self.assertAlmostEqual(intercept, 3.0)

    def test_band_thresholds(self):
        self.assertEqual(engine.band(70), "High")
        self.assertEqual(engine.band(50), "Medium")
        self.assertEqual(engine.band(10), "Low")


if __name__ == "__main__":
    unittest.main()
