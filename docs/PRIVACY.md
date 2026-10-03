# Privacy Policy

Last updated: October 2026

## Overview

Document Localizer is a desktop application that processes documents entirely on your local machine. Your documents never leave your computer.

## What We Collect

### Landing Page (this website)

We use **Vercel Web Analytics** and **Vercel Speed Insights** to collect anonymized, aggregated data about how visitors use this website:

- Pages visited
- Time spent on pages
- General location (country/region level)
- Device type and browser information
- Core Web Vitals (loading, interactivity, and visual stability)
- A download click, which records only the platform (`macos`, `windows`, or `linux`) and the CPU architecture (`arm64` or `x64`)

This data is anonymized and cannot be used to identify individual users. Document contents are never included.

### Desktop Application

Document text stays on your computer. The desktop app sends that text only to the local AI server you configure. It does not run product analytics.

The desktop app makes two other network requests, and neither includes document text:

- Update checks contact GitHub Releases to see whether a newer version exists.
- A Commercial license check sends the license key to Polar at `https://api.polar.sh`. Polar sells that license and keeps the purchase record.

## Third-Party Services

### Local AI Processing

When you use Document Localizer, text from your documents is sent to a local AI server (Ollama, LM Studio, or llama.cpp) that you control. We have no access to this data.

### Polar

Polar handles Commercial checkout and license-key validation. Their privacy practices are governed by [Polar's Privacy Policy](https://polar.sh/legal/privacy).

### GitHub

We use GitHub for:
- Hosting source code
- Release downloads
- Issue tracking
- Update checks from the desktop app

Their privacy practices are governed by [GitHub's Privacy Policy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement).

## Cookies

We do not use cookies on this website.

## Data Retention

Vercel keeps the landing-page analytics described above. Polar keeps Commercial purchase and license records. The desktop app stores settings, documents, glossary, translation memory, the review record, and the license key only on your computer.

## Your Rights

Landing-page analytics are handled by Vercel. Commercial purchase records are handled by Polar, in the customer portal at https://polar.sh/purchases. Documents, glossary, translation memory, and the review record stay in the desktop app's local files; delete those files on your computer.

## Contact

For privacy concerns, please open an issue at:
https://github.com/zimablue-io/document-localizer
