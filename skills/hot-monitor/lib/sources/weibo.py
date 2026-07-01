"""
Weibo hot search crawler
No API keys required, uses public hot search page
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from typing import List, Dict
import time

from http_client import safe_get

def fetch_weibo_hot(limit: int = 20) -> List[Dict]:
    """Fetch Weibo hot search trends."""
    try:
        # Weibo hot search API (unofficial, public)
        url = "https://weibo.com/ajax/side/hotSearch"
        headers = {
            'Referer': 'https://weibo.com/'
        }
        response = safe_get(url, headers=headers, timeout=10)

        data = response.json()
        trends = []

        realtime_list = data.get('data', {}).get('realtime', [])

        for i, item in enumerate(realtime_list[:limit]):
            title = item.get('word', '')
            if not title:
                continue

            # Score based on hot rank (1-100)
            raw_rank = item.get('raw_hot', 0)
            score = min(100, int(raw_rank / 1000)) if raw_rank else max(90, 100 - i * 2)

            trends.append({
                'id': f"weibo-{item.get('rank', i):05d}",
                'title': title,
                'url': f"https://s.weibo.com/weibo?q={title}",
                'description': item.get('category', ''),
                'score': score,
                'source': 'weibo',
                'source_label': '微博',
                'interactions': {
                    'views': raw_rank,
                },
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

        return trends
    except Exception as e:
        print(f"  Weibo fetch error: {e}")
        return []
