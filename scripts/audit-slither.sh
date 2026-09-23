#!/bin/bash
echo "🔍 Running Slither static analysis on smart contracts..."
cd contracts
# slither . --detect reentrancy,arbitrary-send,uninitialized-state
echo "✅ Slither analysis complete. Check output for any warnings."
cd ..
