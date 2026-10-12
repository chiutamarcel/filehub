#!/bin/bash

# Wait-for-it script using curl to wait for a service to be available.

HOST="$1"
PORT="$2"
TIMEOUT="${3:-15}" # Default timeout is 15 seconds.

if [[ -z "$HOST" || -z "$PORT" ]]; then
    echo "Usage: $0 <host> <port> [timeout]"
    return 1
fi

START_TIME=$(date +%s)

if [[ $TIMEOUT -eq 0 ]]; then
    echo "Waiting for $HOST:$PORT to be available without timeout..."
else
    echo "Waiting for $HOST:$PORT to be available..."
fi

while true; do
    # Check if the host:port is reachable
    curl -s "http://$HOST:$PORT" >/dev/null
    if [[ $? -eq 0 ]]; then
        echo "$HOST:$PORT is available!"
        return 0
    fi

    if [[ $TIMEOUT -gt 0 ]]; then
        # Check if the timeout has been reached
        CURRENT_TIME=$(date +%s)
        ELAPSED_TIME=$((CURRENT_TIME - START_TIME))

        if [[ $ELAPSED_TIME -ge $TIMEOUT ]]; then
            echo "Timeout reached! $HOST:$PORT is still not available."
            return 1
        fi
    fi

    # Wait before retrying
    sleep 1
done