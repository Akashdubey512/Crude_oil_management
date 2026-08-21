import os
import json
import pandas as pd
import hashlib
import datetime

GEO_DIR = r"D:\hackathon project\energy-resilience\data\geo"
PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"

os.makedirs(GEO_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Canonical Registry of Real Indian Crude Import Ports, Refineries, and SPRs
# Coordinates sourced from NGA World Port Index and official MoPNG/company publications.
FACILITIES = [
    # --- 1. Crude Import Ports ---
    {
        "name": "Mundra Port",
        "facility_type": "port",
        "operator": "Adani Ports & SEZ",
        "country": "India",
        "state": "Gujarat",
        "latitude": 22.73,
        "longitude": 69.70,
        "capacity": None, # Commercial port capacity is multi-commodity; crude capacity not isolated
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Vadinar Port",
        "facility_type": "port",
        "operator": "Deendayal Port Authority / Nayara Energy",
        "country": "India",
        "state": "Gujarat",
        "latitude": 22.44,
        "longitude": 69.72,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Mumbai Port",
        "facility_type": "port",
        "operator": "Mumbai Port Authority",
        "country": "India",
        "state": "Maharashtra",
        "latitude": 18.94,
        "longitude": 72.86,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Paradip Port",
        "facility_type": "port",
        "operator": "Paradip Port Authority",
        "country": "India",
        "state": "Odisha",
        "latitude": 20.26,
        "longitude": 86.67,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Haldia Port",
        "facility_type": "port",
        "operator": "Syama Prasad Mookerjee Port Authority",
        "country": "India",
        "state": "West Bengal",
        "latitude": 22.02,
        "longitude": 88.06,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Kochi Port",
        "facility_type": "port",
        "operator": "Cochin Port Authority",
        "country": "India",
        "state": "Kerala",
        "latitude": 9.96,
        "longitude": 76.26,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Mangalore Port",
        "facility_type": "port",
        "operator": "New Mangalore Port Authority",
        "country": "India",
        "state": "Karnataka",
        "latitude": 12.93,
        "longitude": 74.82,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Visakhapatnam Port",
        "facility_type": "port",
        "operator": "Visakhapatnam Port Authority",
        "country": "India",
        "state": "Andhra Pradesh",
        "latitude": 17.69,
        "longitude": 83.28,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    {
        "name": "Chennai Port",
        "facility_type": "port",
        "operator": "Chennai Port Authority",
        "country": "India",
        "state": "Tamil Nadu",
        "latitude": 13.09,
        "longitude": 80.29,
        "capacity": None,
        "unit": "MMTPA",
        "source": "NGA World Port Index",
        "source_url": "https://msi.nga.mil/Publications/WPI"
    },
    
    # --- 2. Strategic Petroleum Reserves (SPRs) ---
    {
        "name": "Visakhapatnam SPR",
        "facility_type": "spr",
        "operator": "ISPRL",
        "country": "India",
        "state": "Andhra Pradesh",
        "latitude": 17.70,
        "longitude": 83.25,
        "capacity": 1.33,
        "unit": "MMT",
        "source": "Indian Strategic Petroleum Reserves Limited",
        "source_url": "https://www.isprl.in/visakhapatnam.asp"
    },
    {
        "name": "Mangalore SPR",
        "facility_type": "spr",
        "operator": "ISPRL",
        "country": "India",
        "state": "Karnataka",
        "latitude": 12.92,
        "longitude": 74.85,
        "capacity": 1.50,
        "unit": "MMT",
        "source": "Indian Strategic Petroleum Reserves Limited",
        "source_url": "https://www.isprl.in/mangalore.asp"
    },
    {
        "name": "Padur SPR",
        "facility_type": "spr",
        "operator": "ISPRL",
        "country": "India",
        "state": "Karnataka",
        "latitude": 13.23,
        "longitude": 74.79,
        "capacity": 2.50,
        "unit": "MMT",
        "source": "Indian Strategic Petroleum Reserves Limited",
        "source_url": "https://www.isprl.in/padur.asp"
    },
    
    # --- 3. Major Refineries ---
    {
        "name": "RIL,JAMNAGAR,GUJARAT",
        "facility_type": "refinery",
        "operator": "Reliance Industries Limited",
        "country": "India",
        "state": "Gujarat",
        "latitude": 22.43,
        "longitude": 69.83,
        "capacity": 33.0,
        "unit": "MMTPA",
        "source": "Reliance Industries Annual Reports",
        "source_url": "https://www.ril.com/"
    },
    {
        "name": "RIL-(SEZ), JAMNAGAR,GUJARAT",
        "facility_type": "refinery",
        "operator": "Reliance Industries Limited",
        "country": "India",
        "state": "Gujarat",
        "latitude": 22.43,
        "longitude": 69.83,
        "capacity": 27.0,
        "unit": "MMTPA",
        "source": "Reliance Industries Annual Reports",
        "source_url": "https://www.ril.com/"
    },
    {
        "name": "NEL-VADINAR,GUJARAT",
        "facility_type": "refinery",
        "operator": "Nayara Energy Limited",
        "country": "India",
        "state": "Gujarat",
        "latitude": 22.42,
        "longitude": 69.74,
        "capacity": 20.0,
        "unit": "MMTPA",
        "source": "Nayara Energy Corporate Statement",
        "source_url": "https://www.nayaraenergy.com/"
    },
    {
        "name": "BPCL-KOCHI, KERALA",
        "facility_type": "refinery",
        "operator": "Bharat Petroleum Corporation Limited",
        "country": "India",
        "state": "Kerala",
        "latitude": 9.95,
        "longitude": 76.36,
        "capacity": 15.5,
        "unit": "MMTPA",
        "source": "BPCL Corporate Reports",
        "source_url": "https://www.bharatpetroleum.in/"
    },
    {
        "name": "HPCL-MUMBAI,MAHARASHTRA",
        "facility_type": "refinery",
        "operator": "Hindustan Petroleum Corporation Limited",
        "country": "India",
        "state": "Maharashtra",
        "latitude": 19.01,
        "longitude": 72.89,
        "capacity": 9.5,
        "unit": "MMTPA",
        "source": "HPCL Annual Statement",
        "source_url": "https://www.hindustanpetroleum.com/"
    },
    {
        "name": "IOCL-MATHURA, UTTAR PRADESH",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "Uttar Pradesh",
        "latitude": 27.41,
        "longitude": 77.70,
        "capacity": 8.0,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "IOCL-KOYALI, GUJARAT",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "Gujarat",
        "latitude": 22.36,
        "longitude": 73.13,
        "capacity": 13.7,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "IOCL-PARADIP,ODISHA",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "Odisha",
        "latitude": 20.27,
        "longitude": 86.69,
        "capacity": 15.0,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "HMEL-GGSR, BATHINDA, PUNJAB",
        "facility_type": "refinery",
        "operator": "HPCL-Mittal Energy Limited",
        "country": "India",
        "state": "Punjab",
        "latitude": 30.13,
        "longitude": 75.02,
        "capacity": 11.3,
        "unit": "MMTPA",
        "source": "HMEL Corporate Site",
        "source_url": "https://www.hmel.in/"
    },
    {
        "name": "NRL-NUMALIGARH, ASSAM",
        "facility_type": "refinery",
        "operator": "Numaligarh Refinery Limited",
        "country": "India",
        "state": "Assam",
        "latitude": 26.61,
        "longitude": 93.73,
        "capacity": 3.0,
        "unit": "MMTPA",
        "source": "NRL Corporate Reports",
        "source_url": "https://www.nrl.co.in/"
    },
    {
        "name": "BPCL-BINA, MADHYA PRADESH",
        "facility_type": "refinery",
        "operator": "Bharat Petroleum Corporation Limited",
        "country": "India",
        "state": "Madhya Pradesh",
        "latitude": 24.23,
        "longitude": 78.18,
        "capacity": 7.8,
        "unit": "MMTPA",
        "source": "BPCL Annual Statement",
        "source_url": "https://www.bharatpetroleum.in/"
    },
    {
        "name": "HPCL-VISAKH, ANDHRA PRADESH",
        "facility_type": "refinery",
        "operator": "Hindustan Petroleum Corporation Limited",
        "country": "India",
        "state": "Andhra Pradesh",
        "latitude": 17.69,
        "longitude": 83.23,
        "capacity": 8.3,
        "unit": "MMTPA",
        "source": "HPCL Annual Statement",
        "source_url": "https://www.hindustanpetroleum.com/"
    },
    {
        "name": "MRPL-MANGALORE,KARNATAKA",
        "facility_type": "refinery",
        "operator": "Mangalore Refinery & Petrochemicals Limited",
        "country": "India",
        "state": "Karnataka",
        "latitude": 12.95,
        "longitude": 74.85,
        "capacity": 15.0,
        "unit": "MMTPA",
        "source": "MRPL Corporate Statement",
        "source_url": "https://www.mrpl.co.in/"
    },
    {
        "name": "CPCL-MANALI, TAMILNADU",
        "facility_type": "refinery",
        "operator": "Chennai Petroleum Corporation Limited",
        "country": "India",
        "state": "Tamil Nadu",
        "latitude": 13.16,
        "longitude": 80.27,
        "capacity": 10.5,
        "unit": "MMTPA",
        "source": "CPCL Corporate Report",
        "source_url": "https://www.cpcl.co.in/"
    },
    {
        "name": "IOCL-HALDIA, WEST BENGAL",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "West Bengal",
        "latitude": 22.06,
        "longitude": 88.06,
        "capacity": 8.0,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "IOCL-BARAUNI, BIHAR",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "Bihar",
        "latitude": 25.39,
        "longitude": 86.02,
        "capacity": 6.0,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "IOCL-DIGBOI,ASSAM",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "Assam",
        "latitude": 27.38,
        "longitude": 95.63,
        "capacity": 0.65,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "IOCL-BONGAIGAON,ASSAM",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "Assam",
        "latitude": 26.50,
        "longitude": 90.53,
        "capacity": 2.35,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "IOCL-GUWAHATI, ASSAM",
        "facility_type": "refinery",
        "operator": "Indian Oil Corporation Limited",
        "country": "India",
        "state": "Assam",
        "latitude": 26.17,
        "longitude": 91.80,
        "capacity": 1.0,
        "unit": "MMTPA",
        "source": "IOCL Refinery Profile",
        "source_url": "https://iocl.com/"
    },
    {
        "name": "ONGC-TATIPAKA,ANDHRA PRADESH",
        "facility_type": "refinery",
        "operator": "Oil & Natural Gas Corporation Limited",
        "country": "India",
        "state": "Andhra Pradesh",
        "latitude": 16.53,
        "longitude": 81.93,
        "capacity": 0.08,
        "unit": "MMTPA",
        "source": "ONGC Asset Details",
        "source_url": "https://www.ongcindia.com/"
    }
]

def build_infrastructure_registry():
    """
    Builds the energy_infrastructure.geojson and energy_infrastructure.csv files.
    """
    features = []
    rows = []
    
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    for fac in FACILITIES:
        # Generate deterministic facility_id
        seed = f"{fac['name']}_{fac['facility_type']}_{fac['latitude']}_{fac['longitude']}"
        facility_id = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:16]
        
        # Calculate source hash for lineage
        source_hash = hashlib.sha256(f"{fac['source']}_{fac['source_url']}".encode("utf-8")).hexdigest()
        
        # GeoJSON Feature
        feature = {
            "type": "Feature",
            "properties": {
                "facility_id": facility_id,
                "name": fac["name"],
                "facility_type": fac["facility_type"],
                "operator": fac["operator"],
                "country": fac["country"],
                "state": fac["state"],
                "capacity": fac["capacity"],
                "unit": fac["unit"],
                "source": fac["source"],
                "source_url": fac["source_url"],
                "retrieval_timestamp": timestamp,
                "source_hash": source_hash,
                "processing_version": 1.0
            },
            "geometry": {
                "type": "Point",
                "coordinates": [fac["longitude"], fac["latitude"]] # GeoJSON coordinates order: [Lon, Lat]
            }
        }
        features.append(feature)
        
        # Tabular Row
        row = {
            "facility_id": facility_id,
            "name": fac["name"],
            "facility_type": fac["facility_type"],
            "operator": fac["operator"],
            "country": fac["country"],
            "state": fac["state"],
            "latitude": fac["latitude"],
            "longitude": fac["longitude"],
            "capacity": fac["capacity"],
            "unit": fac["unit"],
            "source": fac["source"],
            "source_url": fac["source_url"],
            "retrieval_timestamp": timestamp,
            "source_hash": source_hash,
            "processing_version": 1.0
        }
        rows.append(row)
        
    geojson_data = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Write GeoJSON
    geojson_path = os.path.join(GEO_DIR, "energy_infrastructure.geojson")
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson_data, f, indent=2)
    print(f"Saved infrastructure GeoJSON to {geojson_path}")
    
    # Write CSV
    csv_path = os.path.join(PROCESSED_DIR, "energy_infrastructure.csv")
    pd.DataFrame(rows).to_csv(csv_path, index=False)
    print(f"Saved infrastructure CSV to {csv_path}")
