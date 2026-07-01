"""
Twitter search crawler
Uses public search (limited, no API key required for basic search)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from typing import List, Dict
import time

from http_client import safe_get

def search_twitter(keyword: str, limit: int = 10) -> List[Dict]:
    """Search Twitter for trends (limited, uses Nitter mirror)."""
    try:
        # Use Nitter as Twitter mirror (no auth required)
        nitter_instances = [
            'https://nitter.net',
            'https://nitter.privacydev.net',
            'https://nitter.cz',
        ]

        results = []
        for instance in nitter_instances:
            try:
                url = f"{instance}/search?f=tweets&q={quote_plus(keyword)}"
                response = safe_get(url, timeout=10)

                soup = BeautifulSoup(response.text, 'html.parser')

                # Parse tweets
                for tweet in soup.find_all('div', class_='timeline-item')[:limit]:
                    content_elem = tweet.find('div', class_='tweet-content')
                    if not content_elem:
                        continue

                    # Author
                    author_elem = content_elem.find('a', class_='username')
                    author = author_elem.get_text(strip=True) if author_elem else ''

                    # Tweet text
                    text_elem = content_elem.find('div', class_='tweet-body')
                    text = text_elem.get_text(strip=True) if text_elem else ''

                    # Link
                    link_elem = tweet.find('a', class_='tweet-link')
                    tweet_url = ''
                    if link_elem:
                        href = link_elem.get('href', '')
                        tweet_url = f"https://twitter.com{href}" if href.startswith('/') else href

                    # Score based on engagement (if available)
                    score = max(50, 100 - len(results) * 5)

                    results.append({
                        'id': f"twitter-{hash(text) % 100000:05d}",
                        'title': text[:100] + ('...' if len(text) > 100 else ''),
                        'url': tweet_url,
                        'description': text,
                        'score': score,
                        'source': 'twitter',
                        'source_label': 'Twitter',
                        'author': author,
                        'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    })

                if results:
                    break  # Success, no need to try other instances

            except Exception:
                continue  # Try next Nitter instance

        return results
    except Exception as e:
        print(f"  Twitter search error: {e}")
        return []
