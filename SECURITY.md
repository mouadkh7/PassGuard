# Security Policy

## Encryption
- PassGuard uses **AES-256-GCM** for data encryption
- **PBKDF2** with 300,000 iterations for key derivation
- All encryption/decryption happens **client-side** in the browser
- **No data is ever sent to any server**

## Password Generation
- Uses `crypto.getRandomValues()` for cryptographically secure randomness
- Supports password, passphrase, and PIN generation
- Entropy calculation for strength assessment

## Reporting a Vulnerability
If you discover a security vulnerability, please open an issue or contact us directly. We take all reports seriously.
