# Security Documentation

## Smart Contract Security

### Audited Against
- [Offchain Labs Security Pitfalls](https://github.com/OffchainLabs/smart-contract-security-pitfalls)
- OpenZeppelin security standards
- SWC Registry

### Key Protections
1. **Reentrancy Guards**: All state changes before external calls
2. **Access Control**: Owner-only functions for critical operations
3. **Input Validation**: All external inputs sanitized
4. **Pausable**: Emergency stop mechanism
5. **Safe Transfers**: Using OpenZeppelin's safe transfer functions

## x402 Server Security

### Authentication
- EIP-712 signature verification
- Nonce management (prevent replay attacks)
- Deadline enforcement (time-bound signatures)

### Rate Limiting
- Per-IP rate limiting
- Per-agent rate limiting
- Configurable thresholds

### Data Protection
- CORS policies
- Input sanitization
- SQL injection prevention
- XSS protection

### API Keys
- Environment variables only
- Never committed to Git
- Rotation policy: Every 90 days

## Wallet Security

### Private Key Management
- Never expose private keys in logs
- Use environment variables or secrets manager
- Consider using AWS Secrets Manager or HashiCorp Vault

### Best Practices
1. Use separate wallets for development and production
2. Implement multi-sig for treasury wallets
3. Regular security audits
4. Bug bounty program

## Incident Response

### In Case of Breach
1. Pause contracts immediately
2. Rotate all API keys
3. Review logs for unauthorized access
4. Notify affected users
5. Conduct post-mortem analysis

### Contact
security@digipaga.com
