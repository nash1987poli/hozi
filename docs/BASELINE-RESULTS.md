# Baseline comparison (leave-one-district-out, real IPC x CHIRPS panel)

Panel: 232 observations, 58 districts.

| Method | r | MAE (pp) |
|---|---|---|
| global-mean | -0.557 | 10.2 |
| persistence | 0.129 | 11.0 |
| rainfall-rule | -0.557 | 10.2 |
| OLS model | 0.484 | 8.5 |

Note on persistence: it uses the district's own OTHER-season outcomes, information unavailable for a district never assessed - the model needs only rainfall. All fitting (rule threshold, OLS weights) done on the train fold only.
