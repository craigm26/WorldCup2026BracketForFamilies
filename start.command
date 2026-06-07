#!/usr/bin/env bash
# Double-click on macOS to launch the Hub. Delegates to start.sh.
cd "$(dirname "$0")"
exec bash ./start.sh
