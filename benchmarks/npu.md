# HIKARU NPU inference benchmark

**Status: blocked — no measurements collected.**

The repository does not contain the HIKARU model, an inference benchmark runner, or an edge-camera integration. This environment has no identifiable NPU or camera device available for testing. Publishing numeric results without running the model on the target hardware would be misleading.

## Results

| Device | Precision | Throughput (FPS) | Latency p50 (ms) | Latency p95 (ms) | Power draw (W) |
| --- | --- | ---: | ---: | ---: | ---: |
| CPU baseline | INT8 | Not measured | Not measured | Not measured | Not measured |
| CPU baseline | FP16 | Not measured | Not measured | Not measured | Not measured |
| Edge NPU camera | INT8 | Not measured | Not measured | Not measured | Not measured |
| Edge NPU camera | FP16 | Not measured | Not measured | Not measured | Not measured |

## Recommendation

There is not enough evidence to recommend a default device or precision. Keep the current deployment configuration unchanged until the benchmark is run on the target camera against the CPU baseline. Choose a default only after comparing the measured throughput, p50/p95 latency, and power draw for each supported device and precision.

## Measurement record required

When the target hardware and model are available, record the model version or artifact hash, camera and CPU details, inference runtime, input dimensions, warm-up and sample counts, and power measurement method alongside the results. Use the same model and input stream for each supported configuration, and identify any unsupported device/precision combinations rather than estimating their values.
