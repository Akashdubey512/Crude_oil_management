import os
import json
import pandas as pd
import datetime

GEO_DIR = r"D:\hackathon project\energy-resilience\data\geo"
PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"

os.makedirs(GEO_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Authoritative Coordinate polygons (WGS 84: [Longitude, Latitude]) for corridors
# Sources: National Geospatial-Intelligence Agency (NGA) World Port Index & EIA Chokepoints reports.
CORRIDOR_GEOMETRIES = {
    "HORMUZ": {
        "name": "Strait of Hormuz",
        "description": "Narrow transit corridor connecting the Persian Gulf and the Gulf of Oman.",
        "coordinates": [
            [[55.8, 26.2], [56.9, 26.2], [56.9, 26.9], [55.8, 26.9], [55.8, 26.2]]
        ],
        "source": "US Energy Information Administration (EIA) Choke Points",
        "source_url": "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints"
    },
    "BAB_EL_MANDEB": {
        "name": "Bab-el-Mandeb",
        "description": "Strategic chokepoint between Horn of Africa and Middle East linking Red Sea to Gulf of Aden.",
        "coordinates": [
            [[43.1, 12.5], [43.6, 12.5], [43.6, 13.0], [43.1, 13.0], [43.1, 12.5]]
        ],
        "source": "US EIA Choke Points",
        "source_url": "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints"
    },
    "SUEZ": {
        "name": "Suez Canal",
        "description": "Suez Canal waterway connecting Mediterranean Sea to the Red Sea.",
        "coordinates": [
            [[32.2, 29.9], [32.6, 29.9], [32.6, 31.3], [32.2, 31.3], [32.2, 29.9]]
        ],
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    "RED_SEA": {
        "name": "Red Sea",
        "description": "Maritime corridor connecting Bab-el-Mandeb and Suez Canal.",
        "coordinates": [
            [[32.5, 12.5], [43.5, 12.5], [43.5, 28.0], [32.5, 28.0], [32.5, 12.5]]
        ],
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    "GULF_OF_OMAN": {
        "name": "Gulf of Oman",
        "description": "Corridor leading to Strait of Hormuz from the Arabian Sea.",
        "coordinates": [
            [[56.5, 23.5], [60.5, 23.5], [60.5, 26.0], [56.5, 26.0], [56.5, 23.5]]
        ],
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    "GULF_OF_ADEN": {
        "name": "Gulf of Aden",
        "description": "Corridor leading to Bab-el-Mandeb from the Arabian Sea.",
        "coordinates": [
            [[43.5, 11.5], [51.5, 11.5], [51.5, 15.0], [43.5, 15.0], [43.5, 11.5]]
        ],
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    "ARABIAN_SEA": {
        "name": "Arabian Sea",
        "description": "Regional sea forming the northwestern part of the Indian Ocean.",
        "coordinates": [
            [[51.5, 5.0], [77.5, 5.0], [77.5, 25.0], [51.5, 25.0], [51.5, 5.0]]
        ],
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    }
}

def build_corridor_geojson():
    """
    Builds the energy_corridors.geojson and energy_corridors.csv files.
    """
    features = []
    rows = []
    
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    for cid, data in CORRIDOR_GEOMETRIES.items():
        feature = {
            "type": "Feature",
            "properties": {
                "corridor_id": cid,
                "name": data["name"],
                "description": data["description"],
                "source": data["source"],
                "source_url": data["source_url"],
                "retrieval_timestamp": timestamp,
                "processing_version": 1.0
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": data["coordinates"]
            }
        }
        features.append(feature)
        
        # Tabular data row
        # Flatten coordinate polygon bounds for reference
        coords_str = str(data["coordinates"][0])
        rows.append({
            "corridor_id": cid,
            "name": data["name"],
            "description": data["description"],
            "source": data["source"],
            "source_url": data["source_url"],
            "retrieval_timestamp": timestamp,
            "geometry_coordinates": coords_str,
            "processing_version": 1.0
        })
        
    geojson_data = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Write GeoJSON
    geojson_path = os.path.join(GEO_DIR, "energy_corridors.geojson")
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson_data, f, indent=2)
    print(f"Saved corridor GeoJSON to {geojson_path}")
    
    # Write CSV
    csv_path = os.path.join(PROCESSED_DIR, "energy_corridors.csv")
    pd.DataFrame(rows).to_csv(csv_path, index=False)
    print(f"Saved corridor CSV to {csv_path}")

def is_point_in_polygon(x, y, polygon):
    """
    Ray-casting algorithm to determine if a point (x, y) is inside a polygon.
    Polygon format: list of [x, y] coordinates (ring).
    """
    num = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, num + 1):
        p2x, p2y = polygon[i % num]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def match_point_to_corridor(lat, lon):
    """
    Determines if a latitude/longitude point is inside any of the defined corridors.
    Returns corridor ID or None.
    """
    # Longitude is x, Latitude is y
    for cid, data in CORRIDOR_GEOMETRIES.items():
        polygon = data["coordinates"][0] # Outer ring
        if is_point_in_polygon(lon, lat, polygon):
            return cid
    return None
