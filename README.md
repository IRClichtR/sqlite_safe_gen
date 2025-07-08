# sqlite_safe_gen

A zero-knowledge, client-side encrypted document storage built with Vue.js and Axum backend. I used in memory SQLite for testing.

## Overview

This is an educational prototype that shows: 
- **Client-side encryption** using Web Crypto APIs
- **Zero-knowledge architecture** where the server stores only encrypted blobs
- **Secure URL generation** that embeds cryptographic keys
- **SQLite-based document storage** in the browser (the document management in not fully implemented)
- **Rust backend** with Axum for encrypted blob storage

## Architecture decisions

### Frontend Vue + TypeScript
- **Crypto Layer**: AES-GCM encryption with PBKDF2 key derivation
- **Database Layer**: sql.js for in-memory SQLite document management
- **API Layer**: Communication with Rust backend
- **UI Layer**: Simple interface for safe creation and document management

### Backend Rust + Axum 
- **Encrypted blob storage** with unique identifiers
- **CORS-enabled REST API** for safe upload/download
- **In-memory storage** (easily replaceable with persistent storage)
- **No knowledge of encryption keys or document contents**

### Security Model
- **URL**: http://domain/safe/uuid/seed Server ID  Client Key
- **Server ID**: UUID for locating encrypted data on server
- **Client Key**: Base64URL-encoded seed for cryptographic key derivation
- **Key Derivation**: PBKDF2(seed, SHA256(uuid), 100k iterations) → AES-256 key
- **Encryption**: AES-GCM with random nonce per operation

## Get started
### Prerequisits
- Node.js 18+
- Rust 1.70+
- Modern browser with Crypto API support

Start backend and Frontend in separate terminals
```bash
cd backend
cargo run
```

```bash
cd frontend
npm run dev
```

## Features
- **Safe Creation**
- **Safe Opening**
- **Client-side encryption**
- **Zero knowledge server**

## Limitation and known issues

### Security
- **URL = password**
- **No key recovery implemented**
- **No auth**
- **Browser-only**  key exists during session in the browser

### Technical limitations
- **sql.js** slow for large db
- **Uses RAM**: the project was just educational so I didn't setup a proper db
- **No offline mode**

## Development pain points

- **sql.js integration**: complex WASM loading and CSP issues
- **test environment**: difficult to mock sql.js for unit testing
- **build complexity**: WASM files require special handling

## Educational value
This project demonstrates:

- Client-side cryptography implementation patterns
- Zero-knowledge system architecture
- Secure key derivation techniques
- Cross-origin communication between frontend and backend
- Modern web development with TypeScript and Rust

🚫 Production Readiness
**DO NOT USE IN PRODUCTION** without:

- Security audit by cryptography experts
- Comprehensive test coverage
- Performance optimization for large datasets
- User authentication and access controls
- Key recovery mechanisms
- Proper error handling and logging
- Document management

## Acknowledgments

While I tend to specialize into backend development, pure frontend component creation remains difficult for me. I largly used claude sonnet 4 for debugging and component coding.