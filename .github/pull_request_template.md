# Check one:
- [ ] I am reporting a bug.
- [ ] I am requesting a feature.

### Steps to reproduce (if bug):
1.
2.

### Feature request:
Describe the feature you would like here.
Please attach screenshots here if helpful.
___

### Contributors checklist:
- [ ] types: ensure all are still correct
- [ ] `pnpm test`
- [ ] `pnpm lint`

### Maintainers checklist:
- [ ] `pnpm test` and `pnpm lint` on the new PR branch
- [ ] `squash and merge` PR to main
- [ ] switch to main, `git pull origin main` then `pnpm test`
- [ ] optional: test both /example-* dirs against packed local .tgz file
  - [ ] `pnpm pack`
  - [ ] `cd /example-typescript` then `pnpm install ../url-metadata-<version>.tgz`
  - [ ] build & start, ensure no errors
- [ ] update README (if applicable)
- [ ] update CHANGELOG (if applicable)
- [ ] package.json: ensure engines.node version(s) still correct
    - [ ] test against older engine versions
    - [ ] ensure any new deps work too: `$ npm view <new package> engines`
- [ ] package.json: bump version, push commit to main
- [ ] git tag new version of main
        `$ git pull origin main`
        `$ pnpm run test`
        `$ git tag 1.0`
        `$ git push origin 1.0`
- [ ] `npm publish ./`
