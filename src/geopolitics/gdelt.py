import os
import json
import urllib.request
import urllib.parse
import pandas as pd
import datetime
import hashlib

GDELT_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
RAW_GDELT_DIR = r"D:\hackathon project\energy-resilience\data\raw\gdelt"

os.makedirs(RAW_GDELT_DIR, exist_ok=True)

# List of highly targeted queries to find energy security/geopolitical disruption news
GDELT_QUERIES = [
    # 1. Chokepoint & shipping incidents
    '(crude OR oil OR petroleum OR tanker) (Hormuz OR "Bab-el-Mandeb" OR Suez OR "Red Sea" OR chokepoint) (disruption OR attack OR seizure OR tension)',
    # 2. Infrastructure attacks/disruptions
    '(refinery OR pipeline OR "oil supply") (attack OR drone OR sabotage OR explosion OR disruption)',
    # 3. Sanctions-related trade flows
    '(oil OR energy OR crude) sanctions (Russia OR Iran OR Venezuela) (export OR import OR restriction)',
    # 4. Geopolitical conflicts impacting India
    '(geopolitical OR conflict OR war) (oil OR energy OR supply) India'
]

def fetch_gdelt_articles(query, max_rows=250):
    """
    Fetches articles from GDELT DOC API v2 for a given query with retry loop and protocol fallback.
    Returns the raw parsed JSON payload, or None if all attempts fail.
    """
    import time
    
    # Try HTTPS first, then fallback to HTTP if connection reset
    urls = [
        "https://api.gdeltproject.org/api/v2/doc/doc",
        "http://api.gdeltproject.org/api/v2/doc/doc"
    ]
    
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrows": max_rows,
        "timespan": "1m"
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # Simple retry loop with exponential backoff
    for attempt in range(3):
        backoff = 2 ** attempt
        for base_url in urls:
            url_parts = list(urllib.parse.urlparse(base_url))
            url_parts[4] = urllib.parse.urlencode(params)
            final_url = urllib.parse.urlunparse(url_parts)
            
            try:
                req = urllib.request.Request(final_url, headers=headers)
                with urllib.request.urlopen(req, timeout=15) as response:
                    content = response.read().decode('utf-8')
                    return json.loads(content)
            except Exception as e:
                # If we get 429 Too Many Requests, sleep and retry next attempt
                if "429" in str(e):
                    print(f"  Got HTTP 429 (Too Many Requests). Sleeping {backoff}s...")
                    time.sleep(backoff)
                    break # Break inner loop to trigger outer retry
                else:
                    # Connection resets or other errors, try the next URL protocol
                    continue
                    
    print(f"Network request failed for GDELT query after retries: '{query}'")
    return None

def ingest_gdelt_pipeline(force_live=True):
    """
    Executes the ingestion pipeline. 
    1. Downloads fresh data from GDELT DOC API if force_live=True.
    2. Caches raw JSON payloads.
    3. If download fails, loads from the latest local cache file.
    """
    all_articles = []
    
    for i, query in enumerate(GDELT_QUERIES):
        if i > 0 and force_live:
            import time
            print("Sleeping 5 seconds between GDELT queries to avoid rate limit...")
            time.sleep(5)
            
        query_hash = hashlib.md5(query.encode('utf-8')).hexdigest()[:8]
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        cache_filename = f"gdelt_{query_hash}_{timestamp}.json"
        cache_filepath = os.path.join(RAW_GDELT_DIR, cache_filename)
        
        raw_data = None
        if force_live:
            print(f"Querying GDELT Live for query {i+1}/{len(GDELT_QUERIES)}...")
            raw_data = fetch_gdelt_articles(query)
            
            if raw_data:
                # Save raw payload to cache directory (raw data immutability)
                with open(cache_filepath, 'w', encoding='utf-8') as f:
                    json.dump(raw_data, f, indent=2)
                print(f"  Saved raw response to {cache_filepath}")
        
        # Fallback to local cache if live fetch failed or wasn't requested
        if not raw_data:
            print(f"Searching for local cached data for query {i+1}...")
            cached_files = sorted(
                [f for f in os.listdir(RAW_GDELT_DIR) if f.startswith(f"gdelt_{query_hash}_")],
                reverse=True
            )
            if cached_files:
                latest_cache = os.path.join(RAW_GDELT_DIR, cached_files[0])
                print(f"  Loading local cache from {latest_cache}")
                with open(latest_cache, 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
            else:
                print(f"  No local cache files found for query {i+1}")
                
        if raw_data and "articles" in raw_data:
            query_articles = raw_data["articles"]
            # Add metadata about which query retrieved it
            for art in query_articles:
                art["retrieved_via_query"] = query
                art["retrieved_via_query_hash"] = query_hash
                if not force_live and cached_files:
                    art["source_cache_file"] = cached_files[0]
                else:
                    art["source_cache_file"] = cache_filename
            all_articles.extend(query_articles)
            
    print(f"Total raw GDELT records ingested: {len(all_articles)}")
    return all_articles
