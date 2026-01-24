# SEO Validation Script

## Purpose
Automated validation script to prevent META tag regressions and ensure SEO 2026 compliance across all HTML pages.

## What it checks
For every HTML file in `public/`:
- Exactly 1 `<title>` tag in `<head>`
- Exactly 1 `<meta name="description">` in `<head>`
- Exactly 1 `<meta property="og:description">` in `<head>`

## Usage

### Local validation (before commit)
```bash
python scripts/validate_seo_tags.py
```

### CI/CD integration
Add to your GitHub Actions workflow or pre-deploy script:

```yaml
# .github/workflows/validate.yml
- name: Validate SEO Tags
  run: |
    pip install beautifulsoup4
    python scripts/validate_seo_tags.py
```

### Pre-commit hook
Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
python scripts/validate_seo_tags.py
if [ $? -ne 0 ]; then
  echo "❌ SEO validation failed. Fix META tags before committing."
  exit 1
fi
```

## Exit codes
- `0`: All pages compliant ✅
- `1`: One or more pages non-compliant ❌

## Output
- **Success**: Green summary with total pages validated
- **Failure**: Red list of non-compliant files with exact tag counts

## Dependencies
```bash
pip install beautifulsoup4
```

## Example output (failure)
```
❌ VALIDATION FAILED
Non-compliant pages: 3/127

FAILED FILES:

✗ public/fr/services/chantiers/index.html
    <meta property="og:description">: 2 (expected: 1)

✗ public/fr/services/luxe-boutiques/index.html
    <meta property="og:description">: 2 (expected: 1)
```

## Integration with Firebase deploy
Update `package.json`:

```json
{
  "scripts": {
    "predeploy": "python scripts/validate_seo_tags.py",
    "deploy": "firebase deploy --only hosting"
  }
}
```

This ensures validation runs automatically before every deployment.
