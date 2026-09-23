#!/bin/bash
echo "⛽ Generating Foundry Gas Report..."
cd contracts
forge test --gas-report --match-contract GasSnapshotTest
cd ..
echo "✅ Gas report generation complete."
