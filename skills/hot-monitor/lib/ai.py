"""
AI enhancement module (optional)
Requires ACEDATA_API_KEY environment variable
Falls back to local rules if key is not available
"""

import os
import requests
import json
from typing import List, Dict, Optional

ACEDATA_BASE_URL = 'https://api.acedata.cloud/aichat2/conversations'
ACEDATA_API_KEY = os.environ.get('ACEDATA_API_KEY', '')

# Model fallback list
MODEL_FALLBACKS = ['gpt-5.4-mini', 'deepseek-v4-flash']

def call_ai(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    """Call Acedata AI with model fallback."""
    if not ACEDATA_API_KEY:
        raise ValueError("ACEDATA_API_KEY not set")

    question = f"{system_prompt}\n\n{user_prompt}"

    for model in MODEL_FALLBACKS:
        try:
            response = requests.post(
                ACEDATA_BASE_URL,
                headers={
                    'accept': 'application/json',
                    'Authorization': f'Bearer {ACEDATA_API_KEY}',
                    'Content-Type': 'application/json',
                },
                json={'model': model, 'question': question},
                timeout=30
            )
            response.raise_for_status()

            data = response.json()
            content = data.get('answer', '')
            if content:
                return content

        except Exception as e:
            print(f"  Model {model} failed: {e}")
            continue

    raise RuntimeError("All AI models failed")

def summarize_trends(trends: List[Dict], language: str = 'zh') -> Dict:
    """Generate AI summary from trends."""
    if not ACEDATA_API_KEY:
        raise ValueError("ACEDATA_API_KEY not set")

    trend_list = '\n'.join([
        f"{i+1}. [{t.get('source_label', 'unknown')}] {t.get('title', '')}"
        for i, t in enumerate(trends[:15])
    ])

    system_prompt = f"""You are a tech news summary expert. Generate a concise summary in {language}.

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
        result = call_ai(system_prompt, trend_list, 800)
        # Clean markdown code blocks
        result = result.replace('```json\n', '').replace('```\n', '').replace('```', '').strip()
        parsed = json.loads(result)
        return {
            'summary': parsed.get('summary', ''),
            'top_topics': parsed.get('top_topics', []),
        }
    except Exception as e:
        print(f"AI summarize error: {e}")
        raise

def detect_fake_ai(trend: Dict) -> Dict:
    """Detect fake content using AI."""
    if not ACEDATA_API_KEY:
        raise ValueError("ACEDATA_API_KEY not set")

    system_prompt = """You are a content authenticity expert. Determine if the given content is fake or misleading.

Focus on:
1. Clickbait: exaggerated titles unsupported by content
2. Fake rumors: product releases without official sources
3. Translation errors: misinterpretation of foreign news
4. Outdated info: old news repackaged as new
5. Unverified claims: explosive news without reliable sources

Return JSON format:
{
  "is_fake": boolean,
  "confidence": number (0-1),
  "reason": "string (brief explanation)"
}

Note: When uncertain, lean towards not marking as fake.
Return JSON only, no other content."""

    user_prompt = f"""Title: {trend.get('title', '')}
Description: {trend.get('description', '')}
URL: {trend.get('url', 'unknown')}"""

    try:
        result = call_ai(system_prompt, user_prompt, 200)
        result = result.replace('```json\n', '').replace('```\n', '').replace('```', '').strip()
        parsed = json.loads(result)
        return {
            'is_fake': parsed.get('is_fake', False),
            'confidence': parsed.get('confidence', 0),
            'reason': parsed.get('reason', ''),
        }
    except Exception as e:
        print(f"AI detect fake error: {e}")
        raise

def match_keywords_ai(trend: Dict, keywords: List[str]) -> Dict:
    """Match keywords using AI semantic understanding."""
    if not ACEDATA_API_KEY:
        raise ValueError("ACEDATA_API_KEY not set")

    system_prompt = """You are a content relevance expert. Determine if the given content matches the keywords.

Rules:
1. Explicit match: content directly discusses the keyword subject
2. Semantic match: content discusses strongly related concepts (clear semantic bridge)
3. No match: partial string overlap but different meaning, vague association, incidental mention

Return JSON format:
{
  "matched": boolean,
  "confidence": number (0-1),
  "reason": "string",
  "matched_keywords": ["string"],
  "relation_type": "explicit" | "semantic" | "unrelated"
}

Return JSON only, no other content."""

    user_prompt = f"""Title: {trend.get('title', '')}
Description: {trend.get('description', '')}
Keywords: {', '.join(keywords)}"""

    try:
        result = call_ai(system_prompt, user_prompt, 300)
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
        print(f"AI match error: {e}")
        raise
