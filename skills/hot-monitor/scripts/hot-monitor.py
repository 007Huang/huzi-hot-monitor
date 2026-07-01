"""
Hot Monitor CLI - Self-contained trend monitoring tool

Usage:
    python hot-monitor.py discover <scope> [options]
    python hot-monitor.py monitor <keywords> [options]
    python hot-monitor.py summarize <file> [options]
    python hot-monitor.py report <scope> [options]
    python hot-monitor.py health [options]

Examples:
    python hot-monitor.py discover "AI programming" --limit 10
    python hot-monitor.py monitor "GPT-5,Claude 4" --sources twitter,weibo
    python hot-monitor.py report "AI" --output report.md --ai
    python hot-monitor.py health --verbose
"""

import sys
import os
import json
import argparse
from datetime import datetime
from typing import List, Dict, Optional

# Fix Windows terminal encoding for emoji output
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))

from sources.web_search import search_bing, search_ddg
from sources.weibo import fetch_weibo_hot
from sources.zhihu import fetch_zhihu_hot
from sources.twitter import search_twitter
from sources.tech_news import fetch_tech_news
from sources.bilibili_user import fetch_bilibili_user_by_name
from sources.zhihu_user import fetch_zhihu_user_content
from sources.blogger_search import search_blogger_content
from matcher import match_keywords as local_match_keywords, detect_fake_local
from formatter import format_trends_markdown, format_health_report, format_blogger_results
from report import generate_report
from ai_host import summarize_trends, detect_fake, match_keywords as ai_match_keywords

# ===== CLI Entry Point =====

def main():
    parser = argparse.ArgumentParser(
        description='Hot Monitor - Self-contained trend monitoring',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s discover "AI programming" --limit 10
  %(prog)s monitor "GPT-5,Claude 4" --sources twitter,weibo
  %(prog)s report "AI" --output report.md
  %(prog)s health
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # discover command
    discover_parser = subparsers.add_parser('discover', help='Discover trends by scope')
    discover_parser.add_argument('scope', help='Search scope (e.g., "AI programming")')
    discover_parser.add_argument('--limit', type=int, default=20, help='Max results (default: 20)')
    discover_parser.add_argument('--sources', default='all', help='Comma-separated sources or "all"')
    discover_parser.add_argument('--output', '-o', help='Output file (default: stdout)')
    discover_parser.add_argument('--ai', action='store_true', help='Enable AI enhancement if API key available')

    # monitor command
    monitor_parser = subparsers.add_parser('monitor', help='Monitor keywords for new content')
    monitor_parser.add_argument('keywords', help='Comma-separated keywords to monitor')
    monitor_parser.add_argument('--sources', default='all', help='Comma-separated sources or "all"')
    monitor_parser.add_argument('--check-fake', action='store_true', default=True, help='Detect fake content')
    monitor_parser.add_argument('--exclude-ids', help='Comma-separated IDs to exclude')
    monitor_parser.add_argument('--output', '-o', help='Output file')
    monitor_parser.add_argument('--ai', action='store_true', help='Use AI matching instead of substring')

    # summarize command
    summarize_parser = subparsers.add_parser('summarize', help='Generate summary from trends JSON')
    summarize_parser.add_argument('file', help='JSON file with trends array')
    summarize_parser.add_argument('--language', default='zh', choices=['zh', 'en'], help='Summary language')
    summarize_parser.add_argument('--output', '-o', help='Output file')

    # report command
    report_parser = subparsers.add_parser('report', help='Generate full markdown report')
    report_parser.add_argument('scope', help='Report scope')
    report_parser.add_argument('--limit', type=int, default=30, help='Max trends to include')
    report_parser.add_argument('--sources', default='all', help='Comma-separated sources')
    report_parser.add_argument('--output', '-o', default='report.md', help='Output file (default: report.md)')
    report_parser.add_argument('--ai', action='store_true', help='Enable AI enhancement')
    report_parser.add_argument('--time-range', default='24h', choices=['1h', '6h', '24h', '7d'], help='Time range filter')

    # health command
    health_parser = subparsers.add_parser('health', help='Check data source health')
    health_parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')

    # blogger command
    blogger_parser = subparsers.add_parser('blogger', help='Monitor a specific blogger')
    blogger_parser.add_argument('author', help='Blogger name (e.g., "程序员鱼皮")')
    blogger_parser.add_argument('--keywords', '-k', default='AI,人工智能,GPT,大模型', help='Comma-separated keywords to filter content')
    blogger_parser.add_argument('--sources', default='all', help='Comma-separated sources or "all"')
    blogger_parser.add_argument('--limit', type=int, default=20, help='Max results per source (default: 20)')
    blogger_parser.add_argument('--days', type=int, default=30, help='Only content from last N days (default: 30)')
    blogger_parser.add_argument('--output', '-o', help='Output file')
    blogger_parser.add_argument('--ai', action='store_true', help='Enable AI enhancement')
    blogger_parser.add_argument('--check-fake', action='store_true', default=True, help='Detect fake content')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Route to command handler
    handlers = {
        'discover': cmd_discover,
        'monitor': cmd_monitor,
        'summarize': cmd_summarize,
        'report': cmd_report,
        'health': cmd_health,
        'blogger': cmd_blogger,
    }

    handler = handlers.get(args.command)
    if handler:
        handler(args)
    else:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        sys.exit(1)

# ===== Command Handlers =====

def cmd_discover(args):
    """Discover trends by scope."""
    print(f"🔍 Discovering trends for: {args.scope}")

    # Parse sources
    sources = parse_sources(args.sources)

    # Fetch from all sources
    all_trends = []

    if 'web-search' in sources or 'all' in sources:
        print("  📡 Searching Bing...")
        all_trends.extend(search_bing(args.scope, args.limit // 2))
        print("  📡 Searching DuckDuckGo...")
        all_trends.extend(search_ddg(args.scope, args.limit // 2))

    if 'twitter' in sources or 'all' in sources:
        print("  📡 Searching Twitter...")
        all_trends.extend(search_twitter(args.scope, args.limit // 2))

    if 'weibo' in sources or 'all' in sources:
        print("  📡 Fetching Weibo hot...")
        all_trends.extend(fetch_weibo_hot(args.limit // 2))

    if 'zhihu' in sources or 'all' in sources:
        print("  📡 Fetching Zhihu hot...")
        all_trends.extend(fetch_zhihu_hot(args.limit // 2))

    if 'tech-news' in sources or 'all' in sources:
        print("  📡 Fetching tech news...")
        all_trends.extend(fetch_tech_news(args.limit // 2))

    # Deduplicate and sort
    all_trends = deduplicate_trends(all_trends)
    all_trends.sort(key=lambda x: x.get('score', 0), reverse=True)
    all_trends = all_trends[:args.limit]

    # AI enhancement (optional)
    if args.ai and has_ai_key():
        print("  🤖 Running AI enhancement...")
        all_trends = enhance_with_ai(all_trends)

    # Generate output
    output = format_trends_markdown(all_trends, args.scope)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"\n✅ Written to {args.output}")
    else:
        print("\n" + output)

    print(f"\n📊 Found {len(all_trends)} trends from {len(sources)} sources")

def cmd_monitor(args):
    """Monitor keywords for matching content."""
    keywords = [k.strip() for k in args.keywords.split(',')]
    print(f"🔍 Monitoring keywords: {', '.join(keywords)}")

    sources = parse_sources(args.sources)
    exclude_ids = set()
    if args.exclude_ids:
        exclude_ids = set(args.exclude_ids.split(','))

    # Fetch trends
    all_trends = fetch_all_trends(sources, keywords, limit=50)

    # Filter excluded
    all_trends = [t for t in all_trends if t.get('id') not in exclude_ids]

    # Match keywords
    matched = []
    for trend in all_trends:
        if args.ai and has_ai_key():
            result = ai_match_keywords(trend, keywords)
        else:
            result = local_match_keywords(trend, keywords)

        if result['matched']:
            trend['matched_keywords'] = result.get('matched_keywords', [])
            trend['match_reason'] = result.get('reason', '')
            trend['match_type'] = result.get('relation_type', 'explicit')

            # Fake detection
            if args.check_fake:
                if has_ai_key():
                    fake_result = detect_fake(trend)
                else:
                    fake_result = detect_fake_local(trend)
                trend['is_fake'] = fake_result['is_fake']
                trend['fake_reason'] = fake_result.get('reason', '')

            matched.append(trend)

    # Output
    fake_count = sum(1 for t in matched if t.get('is_fake'))
    real_count = len(matched) - fake_count

    output = format_monitor_results(matched, keywords, real_count, fake_count)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"\n✅ Written to {args.output}")
    else:
        print("\n" + output)

    print(f"\n📊 Checked {len(all_trends)} trends, matched {len(matched)} ({fake_count} fake)")

def cmd_summarize(args):
    """Generate summary from trends JSON file."""
    with open(args.file, 'r', encoding='utf-8') as f:
        trends = json.load(f)

    print(f"📝 Summarizing {len(trends)} trends...")

    if has_ai_key():
        summary = summarize_trends(trends, args.language)
    else:
        summary = local_summarize(trends, args.language)

    output = f"""# Trend Summary

Generated: {datetime.now().isoformat()}

## Overview
{summary['summary']}

## Top Topics
{chr(10).join(f'- {topic}' for topic in summary['top_topics'])}
"""

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"✅ Written to {args.output}")
    else:
        print(output)

def cmd_report(args):
    """Generate full markdown report."""
    print(f"📊 Generating report for: {args.scope}")

    sources = parse_sources(args.sources)

    # Fetch trends
    all_trends = fetch_all_trends(sources, [args.scope], limit=args.limit)
    all_trends = deduplicate_trends(all_trends)
    all_trends.sort(key=lambda x: x.get('score', 0), reverse=True)
    all_trends = all_trends[:args.limit]

    # AI enhancement (optional)
    if args.ai and has_ai_key():
        print("  🤖 Running AI enhancement...")
        all_trends = enhance_with_ai(all_trends)

    # Generate report
    report = generate_report(all_trends, args.scope, args.time_range)

    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\n✅ Report written to {args.output}")
    print(f"📊 Total trends: {len(all_trends)}")
    print(f"📄 File size: {os.path.getsize(args.output)} bytes")

def cmd_health(args):
    """Check data source health."""
    print("🏥 Checking data source health...\n")

    sources = [
        ('Bing Search', lambda: search_bing('test', 1)),
        ('DuckDuckGo', lambda: search_ddg('test', 1)),
        ('Weibo Hot', lambda: fetch_weibo_hot(1)),
        ('Zhihu Hot', lambda: fetch_zhihu_hot(1)),
        ('Twitter', lambda: search_twitter('test', 1)),
        ('Tech News', lambda: fetch_tech_news(1)),
        ('Bilibili User', lambda: fetch_bilibili_user_by_name('test', 1)),
        ('Zhihu User', lambda: fetch_zhihu_user_content('test', 1)),
        ('Blogger Search', lambda: search_blogger_content('test', ['AI'], 1)),
    ]

    results = []
    for name, fetcher in sources:
        try:
            data = fetcher()
            status = '✅ OK'
            detail = f"{len(data)} items"
        except Exception as e:
            status = '❌ FAIL'
            detail = str(e)[:50]

        results.append({'name': name, 'status': status, 'detail': detail})
        if args.verbose:
            print(f"  {status} {name}: {detail}")
        else:
            print(f"  {status} {name}")

    # AI status
    ai_tool = detect_ai_tool()
    if ai_tool:
        print(f"  ✅ AI Enhancement: Available ({ai_tool})")
    elif has_host_ai():
        print(f"  ✅ AI Enhancement: Available (ACEDATA_API_KEY)")
    else:
        print(f"  ⚠️  AI Enhancement: Unavailable (no AI tool detected)")

    print(f"\n📊 {sum(1 for r in results if 'OK' in r['status'])}/{len(results)} sources healthy")

def cmd_blogger(args):
    """Monitor a specific blogger for keyword-matching content."""
    author = args.author
    keywords = [k.strip() for k in args.keywords.split(',')]
    print(f"🔍 Monitoring blogger: {author}")
    print(f"   Keywords: {', '.join(keywords)}")

    sources = parse_sources(args.sources)

    # Fetch content from blogger sources
    all_trends = []

    if 'bilibili' in sources or 'all' in sources:
        print("  📡 Fetching Bilibili videos...")
        bilibili_trends = fetch_bilibili_user_by_name(author, args.limit)
        print(f"     Found {len(bilibili_trends)} videos")
        all_trends.extend(bilibili_trends)

    if 'zhihu' in sources or 'all' in sources:
        print("  📡 Fetching Zhihu content...")
        zhihu_trends = fetch_zhihu_user_content(author, args.limit)
        print(f"     Found {len(zhihu_trends)} items")
        all_trends.extend(zhihu_trends)

    if 'search' in sources or 'all' in sources:
        print("  📡 Searching web...")
        search_trends = search_blogger_content(author, keywords, args.limit)
        print(f"     Found {len(search_trends)} results")
        all_trends.extend(search_trends)

    # Match keywords
    matched = []
    for trend in all_trends:
        if args.ai and has_ai_key():
            result = ai_match_keywords(trend, keywords)
        else:
            result = local_match_keywords(trend, keywords)

        if result['matched']:
            trend['matched_keywords'] = result.get('matched_keywords', [])
            trend['match_reason'] = result.get('reason', '')
            trend['match_type'] = result.get('relation_type', 'explicit')

            # Fake detection
            if args.check_fake:
                if has_ai_key():
                    fake_result = detect_fake(trend)
                else:
                    fake_result = detect_fake_local(trend)
                trend['is_fake'] = fake_result['is_fake']
                trend['fake_reason'] = fake_result.get('reason', '')

            matched.append(trend)

    # Output
    fake_count = sum(1 for t in matched if t.get('is_fake'))
    real_count = len(matched) - fake_count

    output = format_blogger_results(matched, author, keywords, real_count, fake_count)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"\n✅ Written to {args.output}")
    else:
        print("\n" + output)

    print(f"\n📊 Checked {len(all_trends)} items, matched {len(matched)} ({fake_count} fake)")

# ===== Helper Functions =====

def parse_sources(sources_str: str) -> List[str]:
    """Parse sources string into list."""
    if sources_str == 'all':
        return ['web-search', 'twitter', 'weibo', 'zhihu', 'tech-news', 'bilibili', 'search']
    return [s.strip() for s in sources_str.split(',')]

def deduplicate_trends(trends: List[Dict]) -> List[Dict]:
    """Deduplicate trends by title prefix."""
    seen = set()
    result = []
    for trend in trends:
        key = trend.get('title', '')[:30].lower()
        if key and key not in seen:
            seen.add(key)
            result.append(trend)
    return result

from ai_host import detect_ai_tool

# ===== AI Status Check =====

def has_ai_key() -> bool:
    """Check if AI enhancement is available (host AI or API key)."""
    # Check for host AI tool
    if detect_ai_tool() is not None:
        return True
    # Check for legacy API key
    return bool(os.environ.get('ACEDATA_API_KEY'))

def has_host_ai() -> bool:
    """Check if host AI tool is available."""
    return detect_ai_tool() is not None

def fetch_all_trends(sources: List[str], keywords: List[str], limit: int = 50) -> List[Dict]:
    """Fetch trends from all specified sources."""
    all_trends = []

    if 'web-search' in sources or 'all' in sources:
        for kw in keywords:
            all_trends.extend(search_bing(kw, limit // len(keywords)))
            all_trends.extend(search_ddg(kw, limit // len(keywords)))

    if 'twitter' in sources or 'all' in sources:
        for kw in keywords:
            all_trends.extend(search_twitter(kw, limit // len(keywords)))

    if 'weibo' in sources or 'all' in sources:
        all_trends.extend(fetch_weibo_hot(limit))

    if 'zhihu' in sources or 'all' in sources:
        all_trends.extend(fetch_zhihu_hot(limit))

    if 'tech-news' in sources or 'all' in sources:
        all_trends.extend(fetch_tech_news(limit))

    return all_trends

def enhance_with_ai(trends: List[Dict]) -> List[Dict]:
    """Enhance trends with AI analysis."""
    for trend in trends:
        try:
            # Extract tags
            tags = summarize_trends([trend], 'zh').get('top_topics', [])
            trend['tags'] = tags[:5]

            # Detect fake
            fake_result = detect_fake_ai(trend)
            trend['is_fake'] = fake_result['is_fake']
            trend['fake_reason'] = fake_result.get('reason', '')

            # Generate summary
            summary = summarize_trends([trend], 'zh')
            trend['ai_summary'] = summary.get('summary', '')

        except Exception as e:
            print(f"  ⚠️ AI enhancement failed for {trend.get('id')}: {e}")

    return trends

def format_monitor_results(matched: List[Dict], keywords: List[str], real_count: int, fake_count: int) -> str:
    """Format monitor results as markdown."""
    lines = [
        f"# Keyword Monitor Report",
        f"",
        f"**Keywords**: {', '.join(keywords)}",
        f"**Generated**: {datetime.now().isoformat()}",
        f"**Matched**: {len(matched)} ({real_count} real, {fake_count} fake)",
        f"",
    ]

    # Real items
    if real_count > 0:
        lines.append("## ✅ New Matches")
        lines.append("")
        for trend in matched:
            if not trend.get('is_fake'):
                lines.append(f"### {trend['title']}")
                lines.append(f"- **Score**: {trend.get('score', 0)}")
                lines.append(f"- **Source**: {trend.get('source_label', trend.get('source', 'unknown'))}")
                lines.append(f"- **URL**: {trend.get('url', 'N/A')}")
                lines.append(f"- **Matched**: {', '.join(trend.get('matched_keywords', []))}")
                lines.append(f"- **Reason**: {trend.get('match_reason', '')}")
                lines.append("")

    # Fake items
    if fake_count > 0:
        lines.append("## ⚠️ Fake Content Detected")
        lines.append("")
        for trend in matched:
            if trend.get('is_fake'):
                lines.append(f"### ~~{trend['title']}~~")
                lines.append(f"- **Source**: {trend.get('source_label', 'unknown')}")
                lines.append(f"- **Reason**: {trend.get('fake_reason', '')}")
                lines.append("")

    return '\n'.join(lines)

def local_summarize(trends: List[Dict], language: str = 'zh') -> Dict:
    """Generate simple summary without AI."""
    top_topics = []
    for trend in trends[:5]:
        title = trend.get('title', '')
        # Extract key terms (simple heuristic)
        words = title.split()
        top_topics.extend(words[:3])

    top_topics = list(set(top_topics))[:5]

    summary_lines = []
    for i, trend in enumerate(trends[:10], 1):
        summary_lines.append(f"{i}. {trend['title']}")

    return {
        'summary': '\n'.join(summary_lines),
        'top_topics': top_topics,
    }

if __name__ == '__main__':
    main()
