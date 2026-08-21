import re

# Structured metadata for transit corridors (coordinates marked as pending as instructed)
CORRIDORS = {
    "HORMUZ": {
        "name": "Strait of Hormuz",
        "description": "Chokepoint between the Persian Gulf and the Gulf of Oman.",
        "latitude": None,  # PENDING_ACQUISITION
        "longitude": None, # PENDING_ACQUISITION
        "keywords": [
            r"\bhormuz\b", 
            r"\bstrait of hormuz\b", 
            r"\bpersian gulf\b", 
            r"\bgulf of oman\b",
            r"\bbandar abbas\b"
        ]
    },
    "RED_SEA": {
        "name": "Red Sea",
        "description": "Maritime corridor connecting the Bab-el-Mandeb and the Suez Canal.",
        "latitude": None,  # PENDING_ACQUISITION
        "longitude": None, # PENDING_ACQUISITION
        "keywords": [
            r"\bred sea\b", 
            r"\bhodeidah\b", 
            r"\bhouthi\b", 
            r"\bgulf of aden\b"
        ]
    },
    "BAB_EL_MANDEB": {
        "name": "Bab-el-Mandeb",
        "description": "Chokepoint between the Red Sea and the Gulf of Aden.",
        "latitude": None,  # PENDING_ACQUISITION
        "longitude": None, # PENDING_ACQUISITION
        "keywords": [
            r"\bbab-el-mandeb\b", 
            r"\bbab el mandeb\b", 
            r"\bbab el-mandeb\b", 
            r"\bmandeb strait\b"
        ]
    },
    "SUEZ": {
        "name": "Suez Canal",
        "description": "Artificial waterway in Egypt connecting the Mediterranean Sea to the Red Sea.",
        "latitude": None,  # PENDING_ACQUISITION
        "longitude": None, # PENDING_ACQUISITION
        "keywords": [
            r"\bsuez\b", 
            r"\bsuez canal\b", 
            r"\bport said\b", 
            r"\bport of suez\b"
        ]
    }
}

def map_text_to_corridor(text):
    """
    Scans a block of text (e.g., article title or remark) and maps it to a canonical corridor.
    Returns the corridor identifier (e.g., 'HORMUZ') or None if no match is found.
    """
    if not isinstance(text, str):
        return None
        
    text_lower = text.lower()
    
    # Check each corridor's regex pattern list
    for corridor_id, metadata in CORRIDORS.items():
        for pattern in metadata["keywords"]:
            if re.search(pattern, text_lower):
                return corridor_id
                
    return None
