#!/bin/bash

# Check if URL is provided
if [ -z "$1" ]; then
  echo "Usage: ./run-load-test.sh <application-url> [concurrent-requests] [report-interval-seconds]"
  echo "Example: ./run-load-test.sh http://a1234567890abcdef.us-west-2.elb.amazonaws.com 50 60"
  exit 1
fi

# Set variables with provided arguments or default values
URL=$1
CONCURRENT_REQUESTS=${2:-50}
REPORT_INTERVAL=${3:-60}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Node.js is required but not installed. Please install Node.js first."
  exit 1
fi

# Check if axios is installed, if not install it
if ! npm list axios &> /dev/null; then
  echo "Installing axios package..."
  npm install axios
fi

# Export variables for the Node.js script
export URL=$URL
export CONCURRENT_REQUESTS=$CONCURRENT_REQUESTS
export REPORT_INTERVAL=$REPORT_INTERVAL

# Run the traffic generator
echo "Starting continuous traffic generator with the following settings:"
echo "URL: $URL"
echo "Concurrent Requests: $CONCURRENT_REQUESTS"
echo "Report Interval (seconds): $REPORT_INTERVAL"
echo ""
echo "Press Ctrl+C to stop the traffic generator"
echo ""

node load-test.js
