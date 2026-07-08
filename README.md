<div align="center">
  <br/>
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%236366f1'/%3E%3Ctext x='40' y='54' font-size='44' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'%3EP%3C/text%3E%3C/svg%3E" alt="PassGuard Logo" width="80"/>
  <br/>
  <h1>🔐 PassGuard</h1>
  <p><strong>مدير كلمات مرور مفتوح المصدر • مشفر بالكامل محلياً</strong></p>
  <p>Open-Source Password Manager • Fully Encrypted Client-Side</p>
  <br/>
  <p>
    <a href="#features">✨ الميزات</a> •
    <a href="#getting-started">🚀 البداية</a> •
    <a href="#security">🔒 الأمان</a> •
    <a href="#import">📥 استيراد</a>
  </p>
  <br/>
</div>

---

## ✨ Features

| الميزة | الوصف |
|--------|-------|
| **🔑 Password Generator** | Password, passphrase & PIN generator with strength meter |
| **🔐 Encrypted Vault** | AES-256-GCM + PBKDF2, zero-knowledge architecture |
| **📊 Security Dashboard** | Password health, breach simulation, reuse detection |
| **🔑 TOTP Authenticator** | Generate 2FA codes directly in the app |
| **📝 Multiple Entry Types** | Passwords, notes, identities, payment cards |
| **📂 Organization** | Folders, favorites, tags, search, sort & filter |
| **💳 Payment Cards** | Store card details securely |
| **🪪 Identities** | Store personal identity information |
| **📥 Import/Export** | JSON, CSV (Bitwarden/LastPass compatible) |
| **🌙 Dark/Light Theme** | System-aware theming with manual toggle |
| **📱 PWA Ready** | Install as app on desktop & mobile |
| **🔒 PIN Quick Unlock** | Quick access with PIN (session-based) |
| **⚡ Auto-lock** | Configurable inactivity lock |
| **🔄 Password History** | Track password changes per entry |
| **🎨 RTL Support** | Full Arabic interface |
| **🌍 Offline First** | Works without internet, service worker cached |

## 🚀 Getting Started

### Option 1: Direct (No Installation)
1. Download `passguard.html`, `manifest.json` & `sw.js`
2. Open `passguard.html` in Chrome, Firefox, or Edge
3. Set a **master password** on first use

### Option 2: PWA (Install as App)
1. Open `passguard.html` in Chrome/Edge
2. Click the install button in the address bar
3. Launch as a native app

### Option 3: Self-Host
```bash
git clone https://github.com/mouadkh7/PassGuard.git
cd passguard
# Serve with any HTTP server:
python3 -m http.server 8080
# or: npx serve .
```

## 🔒 Security

### Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 300,000 iterations + SHA-256
- **Randomness**: `crypto.getRandomValues()` (Cryptographically secure)
- **Architecture**: Zero-knowledge — your master password never leaves your browser

### Password Generation
| Type | Example | Entropy |
|------|---------|---------|
| Password (24 chars) | `aB3#kL9$xR2&mN7@vF5*pQ1!` | ~144 bits |
| Passphrase (4 words) | `بيت-قمر-نخلة-بحر` | ~52 bits |
| PIN (6 digits) | `483921` | ~20 bits |

## 📥 Importing from Other Managers

### Bitwarden
1. Export from Bitwarden as **JSON** (not encrypted)
2. In PassGuard → Settings → استيراد → Bitwarden JSON
3. Select the file

### LastPass
1. Export from LastPass as **CSV**
2. In PassGuard → Settings → استيراد → CSV
3. Select the file

### 1Password
1. Export from 1Password as **1PUX/CSV**
2. Convert to CSV if needed
3. Import as CSV in PassGuard

## 📂 Project Structure

```
passguard/
├── passguard.html     # Main application (single file)
├── manifest.json      # PWA manifest
├── sw.js              # Service worker
├── README.md          # This file
├── LICENSE            # MIT License
├── SECURITY.md        # Security policy
├── CONTRIBUTING.md    # Contributing guide
└── .gitignore         # Git ignore rules
```

## 🛠 Technology Stack

| Technology | Usage |
|-----------|-------|
| **Web Crypto API** | AES-256-GCM encryption/decryption |
| **PBKDF2** | Key derivation (300K iterations) |
| **crypto.getRandomValues()** | Cryptographically secure randomness |
| **LocalStorage** | Encrypted data persistence |
| **Tailwind CSS** (CDN) | Utility-first styling |
| **Cairo Font** (CDN) | Arabic-optimized typeface |
| **Service Worker** | Offline caching & PWA |

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

MIT — see [LICENSE](LICENSE)

## ⚠️ Disclaimer

This is a client-side only tool. **You are responsible for backing up your data and remembering your master password.** If you forget your master password, your data cannot be recovered — that's the point of end-to-end encryption.

---

<div align="center">
  <p>Built with ❤️ using the Web Crypto API</p>
  <p><strong>PassGuard</strong> — Your keys, your control, your privacy.</p>
</div>
