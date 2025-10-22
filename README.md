# Code Challenges Repository

This repository contains coding challenges managed by Code Challenge Hub VS Code Extension.

## Structure

```
challenges/
├── algorithms/      # Algorithm challenges
├── data-structures/ # Data structure challenges
├── arrays/          # Array manipulation challenges
├── strings/         # String processing challenges
└── ...
```

## Workflow

1. **Create Challenge** - Use VS Code Extension
2. **Submit to GitHub** - Creates Pull Request
3. **Automated Validation** - GitHub Actions validates challenge
4. **Admin Review** - Approve or reject
5. **Merge** - Challenge becomes available

## GitHub Actions

This repo uses automated validation via GitHub Actions:
- ✅ YAML Syntax Check
- ✅ Schema Validation
- ✅ Test Cases Execution
- ✅ Auto-comments on PRs

See `.github/workflows/validate-challenge.yml` for details.
