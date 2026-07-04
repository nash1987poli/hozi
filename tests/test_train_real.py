"""Unit tests for the OLS trainer used on real IPC x CHIRPS data."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import train_real


class TestOLS(unittest.TestCase):
    def test_recovers_known_coefficients(self):
        # y = 10 + 2*a - 1*b + 0*c + 0*d  (FEATS has 4 features)
        rows = []
        for a in range(6):
            for b in range(6):
                rows.append({"x": [a, b, 1.0, 2.0], "y": 10 + 2 * a - b})
        w = train_real.ols(rows)
        self.assertAlmostEqual(w[1], 2.0, places=6)
        self.assertAlmostEqual(w[2], -1.0, places=6)

    def test_predict_matches_manual(self):
        w = [1.0, 2.0, 3.0, 0.0, 0.0]
        self.assertAlmostEqual(train_real.predict(w, [10, 1, 0, 0]), 24.0)


if __name__ == "__main__":
    unittest.main()
