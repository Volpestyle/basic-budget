#!/bin/sh
# Lambda entrypoint script for running Go service

# Check if running in Lambda environment
if [ -z "${AWS_LAMBDA_RUNTIME_API}" ]; then
    # Local development mode
    exec /var/task/paystub-extractor
else
    # Lambda runtime mode
    # The Lambda runtime expects a specific handler format
    # We'll run our HTTP server and use AWS Lambda Runtime Interface
    exec /var/task/paystub-extractor
fi