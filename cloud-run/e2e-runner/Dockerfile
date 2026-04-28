FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /workspace

# Install runner dependencies.
COPY cloud-run/e2e-runner/package.json /workspace/cloud-run/e2e-runner/package.json
RUN cd /workspace/cloud-run/e2e-runner && npm install --omit=dev

# Copy repository tests and runner code.
COPY tests /workspace/tests
COPY playwright.config.js /workspace/playwright.config.js
COPY cloud-run/e2e-runner/run-e2e-job.js /workspace/cloud-run/e2e-runner/run-e2e-job.js

# Default command for Cloud Run Job task.
CMD ["node", "cloud-run/e2e-runner/run-e2e-job.js"]
