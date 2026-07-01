# Hot Monitor Agent Skill

A self-contained trend monitoring skill with built-in web crawlers. No backend service required. No API keys required for basic functionality.

## When to Use

- Discover current hot trends in a specific domain (e.g., "AI programming", "GPT-5")
- Monitor keywords across multiple platforms and get notified of new matches
- Detect fake or misleading content automatically
- Generate markdown reports of trending topics
- Check the health of all data sources

## Prerequisites

- Python 3.8+
- `requests` and `beautifulsoup4` packages (auto-installed on first run)
- Optional: AI programming tool (Claude Code, GitHub Copilot CLI, Aider) for AI-enhanced analysis
- Optional: `ACEDATA_API_KEY` environment variable as fallback for AI-enhanced analysis

## Installation

```bash
# The skill is self-contained. Just ensure Python 3.8+ is available.
# Dependencies are auto-installed on first run.

# Optional: Install Claude Code for AI enhancement
npm install -g @anthropic-ai/claude-code

# Optional: Or set API key for AI enhancement
export ACEDATA_API_KEY="your-key-here"
```

## Quick Start

```bash
# Discover trends in AI programming
python skills/hot-monitor/scripts/hot-monitor.py discover "AI programming"

# Monitor keywords for new content
python skills/hot-monitor/scripts/hot-monitor.py monitor "GPT-5,Claude 4"

# Monitor a specific blogger for AI content
python skills/hot-monitor/scripts/hot-monitor.py blogger "程序员鱼皮" --keywords "AI,人工智能,GPT"

# Generate a markdown report
python skills/hot-monitor/scripts/hot-monitor.py report "AI" --output report.md

# Check data source health
python skills/hot-monitor/scripts/hot-monitor.py health
```

## Available Commands

| Command | Description | Requires AI |
|---------|-------------|-------------|
| `discover` | Discover trends by scope | No |
| `monitor` | Monitor keywords for matches | No |
| `summarize` | Generate summary from trends | Optional |
| `report` | Generate full markdown report | Optional |
| `health` | Check all source health | No |
| `blogger` | Monitor a specific blogger | No |

## Data Sources

| Source | Type | Auth Required |
|--------|------|---------------|
| Bing Search | Search | No |
| DuckDuckGo | Search | No |
| Weibo Hot | Browse | No |
| Zhihu Hot | Browse | No |
| Twitter | Search | No (via Nitter mirror) |
| Tech News | Browse | No |
| Bilibili User | Search | No |
| Zhihu User | Search | No |
| Blogger Search | Search | No |

## AI Enhancement (Optional)

The skill can leverage your existing AI programming tool for enhanced analysis. No additional API keys or costs.

### Supported AI Tools

| Tool | Detection | Features |
|------|-----------|----------|
| Claude Code | `claude` command | Semantic matching, fake detection, summaries |
| GitHub Copilot | `gh copilot` | Semantic matching, fake detection, summaries |
| Aider | `aider` command | Semantic matching, fake detection, summaries |

### How It Works

When you run the skill with `--ai` flag:
1. Skill detects available AI tool in your environment
2. Sends analysis prompts to your AI tool via CLI
3. Your AI tool processes the content using its built-in model
4. Results are parsed and integrated into the output

**Benefits**:
- No additional API keys needed
- No extra costs (uses your existing AI tool)
- Analysis quality depends on your AI model (Claude, GPT-4, etc.)
- Works offline if your AI tool supports local models

### Without AI Tool

If no AI tool is detected, the skill uses local rules:
- Substring keyword matching
- Rule-based fake detection (title patterns, suspicious domains)
- Simple statistical summaries

### Legacy API Support

You can also set `ACEDATA_API_KEY` to use Acedata.cloud API as fallback.

## Output Format

All commands output Markdown by default. See [examples](references/examples.md) for sample output.

## Blogger Monitoring

Monitor a specific blogger/UP主 across platforms for keyword-matching content.

```bash
# Monitor 程序员鱼皮 for AI-related content
python skills/hot-monitor/scripts/hot-monitor.py blogger "程序员鱼皮" --keywords "AI,人工智能,GPT,Claude"

# Options
python skills/hot-monitor/scripts/hot-monitor.py blogger <author> \
  --keywords "AI,人工智能" \        # Comma-separated keywords
  --sources bilibili,zhihu,search \ # Platforms to check (default: all)
  --limit 20 \                      # Max results per source
  --days 7 \                        # Only content from last N days
  --output blogger.md \             # Output file
  --ai                              # Enable AI enhancement
```

### Supported Platforms

| Platform | Method | Notes |
|----------|--------|-------|
| Bilibili | Search API | No auth required, finds videos by username |
| Zhihu | Search (Bing) | No auth required |
| Web Search | Bing/DDG | Searches across all platforms |

### Example Output

The blogger command generates a markdown report with:
- Platform breakdown (how many items from each source)
- Matched content with scores, URLs, and descriptions
- Interaction metrics (views, likes, comments)
- Fake content detection

## References

- [API Reference](references/api.md) - Detailed command documentation
- [Examples](references/examples.md) - Usage examples and integrations
