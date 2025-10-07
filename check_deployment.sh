#!/bin/bash

echo "Checking deployment status..."

# Get the latest log stream
STREAM_NAME=$(aws logs describe-log-streams --log-group-name /ecs/watchparty-bot-prod --order-by LastEventTime --descending --max-items 1 --query 'logStreams[0].logStreamName' --output text 2>/dev/null)

if [ "$STREAM_NAME" != "None" ] && [ -n "$STREAM_NAME" ]; then
    echo "Latest log stream: $STREAM_NAME"
    
    # Get recent logs
    echo "Recent logs:"
    aws logs get-log-events --log-group-name /ecs/watchparty-bot-prod --log-stream-name "$STREAM_NAME" --start-time $(($(date +%s) - 300))000 --query 'events[*].message' --output text 2>/dev/null | tail -20
else
    echo "Could not get log stream name"
fi
