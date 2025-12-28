# Contributing

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) - Required for `act`
- [act](https://github.com/nektos/act) - Run GitHub Actions locally

## Install act

```bash
# macOS
brew install act

# Linux
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (with Chocolatey)
choco install act-cli
```

## Setup

1. Copy the example config:
   ```bash
   cp teaaams.yaml.example teaaams.yaml
   ```

2. Edit `teaaams.yaml` with your project ID:
   ```yaml
   project_id: "your-project-uuid"
   ```

3. Get your API key from [Teaaams Dashboard](https://teaaams.com)

## Running Tests Locally

**Important:** Use `--bind` flag to mount your local directory (including `teaaams.yaml`):

```bash
# Test pull action
act -W .github/workflows/test-pull.yml --bind -s TEAAAMS_API_KEY=your_api_key

# Test push action
act -W .github/workflows/test-push.yml --bind -s TEAAAMS_API_KEY=your_api_key

# Test preview action
act -W .github/workflows/test-preview.yml --bind -s TEAAAMS_API_KEY=your_api_key -s GITHUB_TOKEN=your_github_token

# Test pull-request action
act -W .github/workflows/test-pull-request.yml --bind -s TEAAAMS_API_KEY=your_api_key -s GITHUB_TOKEN=your_github_token
```

### Using a Secrets File

Create `.secrets` file (already in `.gitignore`):

```bash
TEAAAMS_API_KEY=your_api_key
GITHUB_TOKEN=your_github_token
```

Then run:

```bash
act -W .github/workflows/test-pull.yml --bind --secret-file .secrets
```

### Common Issues

**PR creation hangs/fails locally**
- The `pull-request` action tries to create a real GitHub PR
- This requires valid `GITHUB_TOKEN` and network access to GitHub
- For local testing, use `test-pull.yml` to verify change detection works
- PR creation can only be fully tested on GitHub Actions

**"No project ID found"**
- Make sure `teaaams.yaml` exists in the project root
- Use `--bind` flag to mount local files into the container

**"localhost" API not reachable**
- Use `host.docker.internal` instead of `localhost` in your `teaaams.yaml`
- Example: `api_url: "http://host.docker.internal:8080"`

**"Docker not running"**
- Start Docker Desktop or Docker daemon

**Slow first run**
- First run downloads Docker images (~500MB), subsequent runs are faster

## Testing Without act

You can also test the CLI commands directly:

```bash
# Install CLI
npm install -g @teaaams/cli

# Set API key
export TEAAAMS_API_KEY=your_api_key

# Test commands
teaaams download --dryrun
teaaams upload --dryrun --verbose
```
