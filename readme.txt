removes pit-in and pit-out laps (those laps include the pit lane and are 20–30s slower; we don’t want them when modeling normal lap pace or tire degradation).
["Driver","Team","LapNumber","Stint","Compound","tire_age","lap_time_s",
        "TrackTemp","AirTemp","Humidity","WindSpeed","Pressure"]

Each training sample is:

X: a tensor of shape (seq_len, F) — the last seq_len laps of that stint, with F=FEATURES per lap.

y: the very next lap’s normalized lap time (scalar).

Using TFT
🧱 TFT architecture (simplified)

Here’s what happens inside:

Embeddings Layer

Converts categorical variables (Driver, Team, Compound) into numeric vectors.

These embeddings let the model learn, for example, “SOFT tires degrade faster” or “Mercedes has slower warm-up laps.”

LSTM Encoder–Decoder

Takes the past N laps (8 by default) as context (encoder) and predicts the next 1 lap (decoder).

Learns sequential dependencies: how lap time changes with tire age and track evolution.

Variable Selection Network

Automatically decides which features are most important per timestep (e.g., maybe tire_age matters more early in stint, temperature later).

Multi-Head Attention

Lets the model “focus” on key past laps that influence the current prediction (like an attention mechanism in Transformers).

Quantile Output Layer

Predicts multiple quantiles (e.g., 10th, 50th, 90th percentiles) instead of a single value.

That gives confidence bounds:

P50 → most likely lap time

P10 / P90 → best- and worst-case lap times