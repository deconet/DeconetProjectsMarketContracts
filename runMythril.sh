#!/bin/bash

# Please follow instructions available in this guide on how to install Mythril with Docker.
# https://github.com/ConsenSys/mythril/wiki/With-Docker
echo "May take a while depending on 'max-depth' flag value. Please give Mythril some time, it is going to dig very deep in contracts code."
docker run -v $(pwd):/tmp -w "/tmp/" mythril/myth --truffle --max-depth 10 -o markdown >> mythril_report.md
