# Cloud Run E2E Runner

This runner executes `tests/e2e` Playwright specs in a Cloud Run Job and uploads results to GCS.

## Build and push image

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/digibiz/e2e-runner:latest .
```

## Create/update job

```bash
gcloud run jobs replace cloud-run/e2e-runner/job.yaml --region REGION --project PROJECT_ID
```

or

```bash
gcloud run jobs deploy digibiz-e2e-runner \
  --image REGION-docker.pkg.dev/PROJECT_ID/digibiz/e2e-runner:latest \
  --region REGION \
  --project PROJECT_ID \
  --tasks 1 \
  --max-retries 0 \
  --task-timeout 3600 \
  --set-env-vars PLAYWRIGHT_BASE_URL=https://digibiz-sys.web.app,E2E_RESULTS_BUCKET=PROJECT_ID-e2e-results
```

## Required env vars

- `E2E_BDK_PASSWORD` (set at job level or secret)
- `E2E_RESULTS_BUCKET`
- Runtime overrides from callable function:
  - `RUN_ID`
  - `E2E_SELECTED_TESTS`
  - `E2E_TARGET_EMAIL`
  - `E2E_TARGET_BUSINESS_ID`

## Output objects

- `gs://<bucket>/e2e-results/<RUN_ID>.json`
- `gs://<bucket>/e2e-results/<RUN_ID>.log`
