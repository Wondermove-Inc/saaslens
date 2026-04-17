# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |

## Reporting a Vulnerability

**Do not open public issues for security vulnerabilities.**

Please report via GitHub Security Advisories:

1. Go to the [Security tab](../../security) of this repository.
2. Click "Report a vulnerability" (private).

### What to include

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Your contact info for follow-up

### Response

We aim to respond within 48 hours with an initial assessment and provide a timeline for the fix. Critical issues will be patched and disclosed following coordinated disclosure.

## Scope

In scope:

- Authentication/session handling
- Authorization / multi-tenant isolation
- Data exposure in API endpoints
- XSS, CSRF, SQLi, SSRF
- Dependency vulnerabilities (high/critical)

Out of scope:

- Social engineering
- Physical attacks
- Denial of service (unless trivial)
- Self-XSS
