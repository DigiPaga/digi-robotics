#!/bin/bash
echo "Generating TypeScript types from Solidity contracts..."
cd contracts && forge build
echo "Type generation complete!"
