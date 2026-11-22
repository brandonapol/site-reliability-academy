# Contributing

Thanks for wanting to help. Here's how it works.

## Before you start

Make sure your git config (`user.name` and `user.email`) matches your GitHub profile. **Sign your
commits** ([GitHub's guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)).
Then run `make setup`, which installs the dependencies, the e2e browser and the git hooks.

## The workflow

1. Branch off `main` (`feat/<issue>-short-description`, `fix/<issue>-short-description`)
2. Open a PR with a conventional title (`feat: add the week 5 disk lesson`) and fill out the
   template
3. A maintainer will review it

We keep a linear history. One focused commit per PR is the norm. A change too big for one review
goes in as a stack of PRs, each based on the one below.

## Commit messages

Clear and concise. Under 80 characters for the subject line. If you need more context, add a body.
Commits are yours: no AI co-author trailers or "Generated with" footers. The commit-msg hook
rejects them.

## Code style

Run `make check` before you push. If the linter is unhappy, fix it first. `make fix` handles most of
it.

## Writing lessons

[`docs/authoring.md`](docs/authoring.md) covers adding a lesson or a game chapter, why IDs never
change, and what outside material may be reused.

## Found a bug or have an idea?

[Open an issue](https://github.com/brandonapol/site-reliability-academy/issues/new/choose). We read
them.
