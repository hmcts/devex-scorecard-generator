# DevEx Scorecard Generator
This repository is for a hackathon project to create a Developer Experience (DevEx) Scorecard Generator.

## Purpose
The project aims to help teams measure and improve their developer experience by generating scorecards based on key metrics and best practices.

## Features
- Automated scoring of repositories and projects
- Customizable metrics for DevEx evaluation
- Easy integration with CI/CD pipelines

## Getting Started
Clone the repository and follow the instructions to run the scorecard generator locally or in your CI/CD environment.

## Contributing
Contributions and ideas from all hackathon participants are welcome!

## Requirements & Metrics

A list of recommendations a repository should follow in order to achieve a high score. This list consists of various best practices and can serve as a checklist when creating a new repository or updating an old one.

### CI Checks

Check for the presence of certain functionality in the repository's defined `Jenkinsfile` or `azure-pipelines.yaml`. 

- [ ] Static analyzer/linter (e.g. `terraform validate`, `pylint`, `ESLint`)
- [ ] Dependency checker (Rennovate, `npm audit`, etc.)
- [ ] No out-of-date dependencies (> ~3 months)
- [ ] Security checks (`npm audit`, [CVE Check](https://app.opencve.io/cve/?product=terraform&vendor=hashicorp))
- [ ] Code formatter (`prettier.js`, `terraform fmt`, `PEP 8`)
- [ ] `.pre-commit-config.yaml` defined

### Repository Content

Files that should be present in the repository.

- [ ] Has a `.gitignore` defined
  - [ ] Sensible content in `.gitignore`
  - [ ] See [github/gitignore](https://github.com/github/gitignore) for samples
- [ ] Some CI pipeline present
  - [ ] Not mixing CI solutions
- [ ] No cache/temporary files hanging around (`.DS_Store`, etc.)
- [ ] `README.md` defined contains necessaty information:
  - [ ] What service/product does the repository relate to?
  - [ ] What does the CI pipeline do?
  - [ ] How to use/deploy the code.
  - [ ] Structure outline.

### Github Settings

Check github for certain settings (may require admin on the repo?). 

- [ ] Branch protections on master
- [ ] CI Checks before merge (azdo, jenkins, github actions)
- [ ] Review required before merge
- [ ] Repo grants access to platops
- [ ] Stale issues checker (> ~3 months)
- [ ] Require branch to be up-to-date before merging

### Languages to Consider

- Terraform
- Javascript/Node.js
- Python
- Java

### CI Solutions to Consider

- Jenkins
- Azure DevOps
- Github Actions
