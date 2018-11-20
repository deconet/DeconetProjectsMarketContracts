#!/bin/bash

# Please follow instructions available in this guide on how to install Mythril with Docker.
# https://github.com/ConsenSys/mythril/wiki/With-Docker

docker run -v $(pwd):/tmp -w "/tmp/" mythril/myth --truffle --max-depth 8 -o markdown >> mythril_report.md
