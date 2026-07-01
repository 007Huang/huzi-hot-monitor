"""
AI integration via host AI tool (Claude, Copilot, etc.)
No API keys required - uses the AI tool's built-in model
"""

import os
import json
import subprocess
import tempfile
from typing import List, Dict, Optional

# ===== Host AI Tool Detection =====

def detect_ai_tool() -> Optional[str]:
    """
    Detect available AI tool in the environment.
    Returns the tool name or None.
    """
    # Check for Claude Code CLI
    if _command_exists('claude'):
        return 'claude'

    # Check for GitHub Copilot CLI
    if _command_exists('gh') and _check_gh_copilot():
        return 'copilot'

    # Check for common AI CLI tools
    if _command_exists('aider'):
        return 'aider'

    if _command_exists('cursor'):
        return 'cursor'

    return None

def _command_exists(cmd: str) -> bool:
    """Check if a command exists in PATH."""
    try:
        subprocess.run(['which', cmd], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def _check_gh_copilot() -> bool:
    """Check if GitHub CLI has Copilot extension."""
    try:
        result = subprocess.run(
            ['gh', 'extension', 'list'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return 'copilot' in result.stdout.lower()
    except Exception:
        return False

# ===== AI Analysis via Host Tool =====

def analyze_with_host_ai(prompt: str, tool: Optional[str] = None) -> str:
    """
    Analyze content using the host AI tool.
    Falls back to local rules if no AI tool is available.
    """
    if not tool:
        tool = detect_ai_tool()

    if not tool:
        raise RuntimeError("No AI tool detected. Install Claude Code, GitHub Copilot CLI, or set ACEDATA_API_KEY.")

    if tool == 'claude':
        return _analyze_with_claude(prompt)
    elif tool == 'copilot':
        return _analyze_with_copilot(prompt)
    elif tool == 'aider':
        return _analyze_with_aider(prompt)
    else:
        raise RuntimeError(f"AI tool '{tool}' not supported yet.")

def _analyze_with_claude(prompt: str) -> str:
    """Use Claude Code CLI to analyze content."""
    # Write prompt to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write(prompt)
        temp_path = f.name

    try:
        # Use Claude Code to analyze the file
        # This requires the user to have `claude` command installed
        result = subprocess.run(
            ['claude', 'ask', '-f', temp_path],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            return result.stdout
        else:
            raise RuntimeError(f"Claude analysis failed: {result.stderr}")

    finally:
        os.unlink(temp_path)

def _analyze_with_copilot(prompt: str) -> str:
    """Use GitHub Copilot CLI to analyze content."""
    result = subprocess.run(
        ['gh', 'copilot', 'suggest', '-t', 'text', prompt],
        capture_output=True,
        text=True,
        timeout=60
    )

    if result.returncode == 0:
        return result.stdout
    else:
        raise RuntimeError(f"Copilot analysis failed: {result.stderr}")

def _analyze_with_aider(prompt: str) -> str:
    """Use Aider to analyze content."""
    result = subprocess.run(
        ['aider', '--message', prompt],
        capture_output=True,
        text=True,
        timeout=60
    )

    if result.returncode == 0:
        return result.stdout
    else:
        raise RuntimeError(f"Aider analysis failed: {result.stderr}")

# ===== AI-Powered Functions =====

def summarize_trends(trends: List[Dict], language: str = 'zh') -> Dict:
    """
    Generate summary from trends using host AI tool.
    Falls back to local rules if no AI tool is available.
    """
    trend_list = '\n'.join([
        f"{i+1}. [{t.get('source_label', 'unknown')}] {t.get('title', '')}"
        for i, t in enumerate(trends[:15])
    ])

    prompt = f"""You are a tech news summary expert. Generate a concise summary in {language}.

Trends:
{trend_list}

Requirements:
1. Sort by importance, hottest first
2. 1-2 sentences per trend
3. Merge similar topics
4. Numbered list
5. Finally list 3-5 top topic keywords

Return JSON format:
{{
  "summary": "string (numbered list)",
  "top_topics": ["string", "string"]
}}

Return JSON only, no other content."""

    try:
        tool = detect_ai_tool()
        if tool:
            result = analyze_with_host_ai(prompt, tool)
            # Clean markdown code blocks
            result = result.replace('```json\n', '').replace('```\n', '').replace('```', '').strip()
            parsed = json.loads(result)
            return {
                'summary': parsed.get('summary', ''),
                'top_topics': parsed.get('top_topics', []),
            }
    except Exception as e:
        print(f"  AI summary failed: {e}, falling back to local rules")

    # Fallback to local rules
    return _local_summarize(trends, language)

def detect_fake(trend: Dict) -> Dict:
    """
    Detect fake content using host AI tool.
    Falls back to local rules if no AI tool is available.
    """
    prompt = f"""You are a content authenticity expert. Determine if the given content is fake or misleading.

Title: {trend.get('title', '')}
Description: {trend.get('description', '')}
URL: {trend.get('url', 'unknown')}

Focus on:
1. Clickbait: exaggerated titles unsupported by content
2. Fake rumors: product releases without official source
3. Translation errors: misinterpretation of foreign news
4. Outdated info: old news repackaged as new
5. Unverified claims: explosive news without reliable sources

Return JSON format:
{{
  "is_fake": boolean,
  "confidence": number (0-1),
  "reason": "string (brief explanation)"
}}

Note: When uncertain, lean towards not marking as fake.
Return JSON only, no other content."""

    try:
        tool = detect_ai_tool()
        if tool:
            result = analyze_with_host_ai(prompt, tool)
            result = result.replace('```json\n', '').replace('```\n', '').replace('```', '').strip()
            parsed = json.loads(result)
            return {
                'is_fake': parsed.get('is_fake', False),
                'confidence': parsed.get('confidence', 0),
                'reason': parsed.get('reason', ''),
            }
    except Exception as e:
        print(f"  AI fake detection failed: {e}, falling back to local rules")

    # Fallback to local rules
    from matcher import detect_fake_local
    return detect_fake_local(trend)

def match_keywords(trend: Dict, keywords: List[str]) -> Dict:
    """
    Match keywords using host AI tool semantic understanding.
    Falls back to local rules if no AI tool is available.
    """
    prompt = f"""You are a content relevance expert. Determine if the given content matches the keywords.

Title: {trend.get('title', '')}
Description: {trend.get('description', '')}
Keywords: {', '.join(keywords)}

Rules:
1. Explicit match: content directly discusses the keyword subject
2. Semantic match: content discusses strongly related concepts (clear semantic bridge)
3. No match: partial string overlap but different meaning, vague association, incidental mention

Return JSON format:
{{
  "matched": boolean,
  "confidence": number (0-1),
  "reason": "string",
  "matched_keywords": ["string"],
  "relation_type": "explicit" | "semantic" | "unrelated"
}}

Return JSON only, no other content."""

    try:
        tool = detect_ai_tool()
        if tool:
            result = analyze_with_host_ai(prompt, tool)
            result = result.replace('```json\n', '').replace('```\n', '').replace('```', '').strip()
            parsed = json.loads(result)
            return {
                'matched': parsed.get('matched', False),
                'confidence': parsed.get('confidence', 0),
                'reason': parsed.get('reason', ''),
                'matched_keywords': parsed.get('matched_keywords', []),
                'relation_type': parsed.get('relation_type', 'unrelated'),
            }
    except Exception as e:
        print(f"  AI matching failed: {e}, falling back to local rules")

    # Fallback to local rules
    from matcher import match_keywords as local_match
    return local_match(trend, keywords)

def _local_summarize(trends: List[Dict], language: str = 'zh') -> Dict:
    """Generate simple summary without AI."""
    top_topics = []
    for trend in trends[:5]:
        title = trend.get('title', '')
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

# ===== Legacy API Support (for backward compatibility) =====

def summarize_trends_api(trends: List[Dict], language: str = 'zh') -> Dict:
    """Legacy API function that uses ACEDATA_API_KEY."""
    api_key = os.environ.get('ACEDATA_API_KEY', '')
    if api_key:
        # Use old API-based approach
        from ai import summarize_trends as old_summarize
        return old_summarize(trends, language)
    else:
        return summarize_trends(trends, language)

def detect_fake_api(trend: Dict) -> Dict:
    """Legacy API function that uses ACEDATA_API_KEY."""
    api_key = os.environ.get('ACEDATA_API_KEY', '')
    if api_key:
        from ai import detect_fake_ai as old_detect
        return old_detect(trend)
    else:
        return detect_fake(trend)

def match_keywords_api(trend: Dict, keywords: List[str]) -> Dict:
    """Legacy API function that uses ACEDATA_API_KEY."""
    api_key = os.environ.get('ACEDATA_API_KEY', '')
    if api_key:
        from ai import match_keywords_ai as old_match
        return old_match(trend, keywords)
    else:
        return match_keywords(trend, keywords)
