#!/bin/bash

echo "🧪 Iniciando tests locales contra contratos desplegados en Anvil..."

# Direcciones de los contratos desplegados
AGENT_REGISTRY="0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331"
MARKETPLACE="0xFd6F3e01c60870a8978665fF2EE872861590bEc3"

echo "AgentRegistry: $AGENT_REGISTRY"
echo "Marketplace: $MARKETPLACE"

# Verificar que los contratos existen
echo "Verificando AgentRegistry..."
cast code $AGENT_REGISTRY --rpc-url http://127.0.0.1:8545

echo "Verificando Marketplace..."
cast code $MARKETPLACE --rpc-url http://127.0.0.1:8545

echo "✅ Tests locales completados"
