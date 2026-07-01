"""
Web search crawlers - Bing and DuckDuckGo
No API keys required, uses public search pages
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from typing import List, Dict
import time

from http_client import safe_get

# ===== Bing Search =====

def search_bing(keyword: str, limit: int = 10) -> List[Dict]:
    """Search Bing for trends."""
    try:
        url = f"https://www.bing.com/search?q={quote_plus(keyword)}&count={limit}"
        response = safe_get(url, timeout=10)

        soup = BeautifulSoup(response.text, 'html.parser')
        results = []

        # Bing search results
        for item in soup.find_all('li', class_='b_algo')[:limit]:
            title_elem = item.find('h2')
            if not title_elem:
                continue

            title = title_elem.get_text(strip=True)
            link_elem = title_elem.find('a')
            url = link_elem.get('href', '') if link_elem else ''

            # Description
            desc_elem = item.find('p')
            description = desc_elem.get_text(strip=True) if desc_elem else ''

            # Score based on position
            score = max(50, 100 - len(results) * 5)

            results.append({
                'id': f"bing-{hash(title) % 100000:05d}",
                'title': title,
                'url': url,
                'description': description,
                'score': score,
                'source': 'web-search',
                'source_label': 'Bing Search',
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

        return results
    except Exception as e:
        print(f"  Bing search error: {e}")
        return []

# ===== DuckDuckGo Search =====

def search_ddg(keyword: str, limit: int = 10) -> List[Dict]:
    """Search DuckDuckGo for trends."""
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(keyword)}"
        response = safe_get(url, timeout=10)

        soup = BeautifulSoup(response.text, 'html.parser')
        results = []

        # DDG search results
        for item in soup.find_all('div', class_='result')[:limit]:
            title_elem = item.find('a', class_='result__a')
            if not title_elem:
                continue

            title = title_elem.get_text(strip=True)
            url = title_elem.get('href', '')

            # Description
            desc_elem = item.find('a', class_='result__snippet')
            description = desc_elem.get_text(strip=True) if desc_elem else ''

            # Score based on position
            score = max(45, 95 - len(results) * 5)

            results.append({
                'id': f"ddg-{hash(title) % 100000:05d}",
                'title': title,
                'url': url,
                'description': description,
                'score': score,
                'source': 'web-search',
                'source_label': 'DuckDuckGo',
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

        return results
    except Exception as e:
        print(f"  DuckDuckGo search error: {e}")
        return []


# ===== Blogger Search Helper =====

def search_blogger(author: str, keywords: List[str], limit: int = 20) -> List[Dict]:
    """
    Search for blogger content using site-specific queries.
    Reuses existing Bing/DDG search with site: filters.

    Args:
        author: Blogger name (e.g., "程序员鱼皮")
        keywords: List of keywords to filter content
        limit: Max results per source

    Returns:
        List of trend dicts with unified format
    """
    from .blogger_search import search_blogger_content
    return search_blogger_content(author, keywords, limit)
