"""
Tech news crawler
Aggregates from public tech news RSS feeds
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from bs4 import BeautifulSoup
from typing import List, Dict
import time
import xml.etree.ElementTree as ET

from http_client import safe_get

def fetch_tech_news(limit: int = 20) -> List[Dict]:
    """Fetch tech news from public RSS feeds."""
    try:
        # TechCrunch RSS
        rss_urls = [
            'https://techcrunch.com/feed/',
            'https://www.theverge.com/rss/index.xml',
        ]

        results = []
        for rss_url in rss_urls:
            try:
                response = safe_get(rss_url, timeout=10)

                # Parse RSS
                root = ET.fromstring(response.content)

                # Handle RSS 2.0 and Atom formats
                items = root.findall('.//item') or root.findall('.//{http://www.w3.org/2005/Atom}entry')

                for i, item in enumerate(items[:limit]):
                    # Title
                    title_elem = item.find('title') or item.find('.//{http://www.w3.org/2005/Atom}title')
                    title = title_elem.text if title_elem is not None else ''

                    # Link
                    link_elem = item.find('link') or item.find('.//{http://www.w3.org/2005/Atom}link')
                    url = ''
                    if link_elem is not None:
                        url = link_elem.text or link_elem.get('href', '')

                    # Description
                    desc_elem = item.find('description') or item.find('.//{http://www.w3.org/2005/Atom}summary')
                    description = ''
                    if desc_elem is not None:
                        description = desc_elem.text or ''
                        # Strip HTML tags
                        soup = BeautifulSoup(description, 'html.parser')
                        description = soup.get_text(strip=True)[:200]

                    if not title:
                        continue

                    # Score based on position
                    score = max(40, 90 - len(results) * 3)

                    results.append({
                        'id': f"tech-{hash(title) % 100000:05d}",
                        'title': title,
                        'url': url,
                        'description': description,
                        'score': score,
                        'source': 'tech-news',
                        'source_label': 'Tech News',
                        'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    })

            except Exception:
                continue

        return results
    except Exception as e:
        print(f"  Tech news fetch error: {e}")
        return []
