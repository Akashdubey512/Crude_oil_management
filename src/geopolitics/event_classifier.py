import re

# Keyword matching sets for rule-based event taxonomy classification
TAXONOMY_PATTERNS = {
    "tanker attack": [
        r"\btanker attack\b", r"\battacked tanker\b", r"\bseized tanker\b", 
        r"\bmissile.*tanker\b", r"\bdrone.*tanker\b", r"\bhijack.*tanker\b",
        r"\btanker.*hit\b"
    ],
    "maritime security incident": [
        r"\bpiracy\b", r"\bhijack\b", r"\bseized vessel\b", r"\bvessel seizure\b", 
        r"\bship seizure\b", r"\bboarding\b", r"\bharass.*ship\b", r"\bmaritime.*incident\b",
        r"\bnaval dispute\b"
    ],
    "pipeline disruption": [
        r"\bpipeline blast\b", r"\bpipeline leak\b", r"\bpipeline explosion\b", 
        r"\bsabotage.*pipeline\b", r"\bpipeline rupture\b", r"\bpipeline shutdown\b"
    ],
    "refinery disruption": [
        r"\brefinery fire\b", r"\brefinery blast\b", r"\brefinery explosion\b", 
        r"\brefinery shut\b", r"\brefinery outage\b", r"\brefinery strike\b"
    ],
    "infrastructure attack": [
        r"\bdrone attack.*oil\b", r"\binfrastructure strike\b", r"\bsabotage.*facility\b",
        r"\bbombing.*facility\b", r"\bmissile strike.*depot\b"
    ],
    "armed conflict": [
        r"\barmed conflict\b", r"\bairstrike\b", r"\bcombat\b", r"\bclashes\b", 
        r"\bwarfare\b", r"\bbombardment\b", r"\bmilitary strike\b"
    ],
    "military escalation": [
        r"\bmilitary escalation\b", r"\bmilitary deployment\b", r"\btroop movement\b", 
        r"\bnaval drill\b", r"\bnaval exercise\b", r"\bmobilization\b"
    ],
    "sanctions": [
        r"\bsanctions\b", r"\bembargo\b", r"\bblacklist\b", r"\bfrozen asset\b", 
        r"\bsdn list\b", r"\bofac\b", r"\bpenalize\b"
    ],
    "diplomatic escalation": [
        r"\bexpel.*ambassador\b", r"\bsever.*relation\b", r"\bdiplomatic protest\b", 
        r"\bdiplomatic tension\b", r"\bdiplomatic dispute\b"
    ],
    "export restriction": [
        r"\bexport ban\b", r"\bexport restriction\b", r"\bexport quota\b", 
        r"\bban oil export\b", r"\brestrict oil\b"
    ],
    "port disruption": [
        r"\bport closure\b", r"\bport block\b", r"\bport strike\b", 
        r"\bport disruption\b"
    ],
    "shipping disruption": [
        r"\breroute\b", r"\bshipping delay\b", r"\btransit halt\b", 
        r"\bshipping disruption\b", r"\bavoid red sea\b"
    ],
    "supply disruption": [
        r"\bsupply drop\b", r"\bsupply cut\b", r"\bproduction cut\b", 
        r"\bshortage\b", r"\bforce majeure\b"
    ],
    "ceasefire/de-escalation": [
        r"\bceasefire\b", r"\bpeace talk\b", r"\btruce\b", r"\bde-escalation\b", 
        r"\bpeace agreement\b", r"\barmistice\b"
    ]
}

def classify_event(title, text_reference=""):
    """
    Classifies an event based on title and metadata text.
    Returns the first matching category, or 'UNKNOWN'.
    """
    combined_text = f"{title} {text_reference}".lower()
    
    for category, patterns in TAXONOMY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, combined_text):
                return category
                
    return "UNKNOWN"
