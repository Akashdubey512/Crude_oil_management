import os
import pandas as pd
import hashlib
import datetime

STAGING_DIR = r"D:\hackathon project\energy-resilience\data\staging"
PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"

# Sourced pipeline/logistical connections between Indian crude ports and refineries
PORT_REFINERY_LINKS = [
    {"source": "Mundra Port", "target": "HMEL-GGSR, BATHINDA, PUNJAB", "type": "pipeline"},
    {"source": "Mundra Port", "target": "RIL,JAMNAGAR,GUJARAT", "type": "pipeline"},
    {"source": "Mundra Port", "target": "RIL-(SEZ), JAMNAGAR,GUJARAT", "type": "pipeline"},
    {"source": "Vadinar Port", "target": "NEL-VADINAR,GUJARAT", "type": "pipeline"},
    {"source": "Mumbai Port", "target": "HPCL-MUMBAI,MAHARASHTRA", "type": "pipeline"},
    {"source": "Mumbai Port", "target": "BPCL-TOTAL", "type": "pipeline"}, # BPCL Mumbai refinery total
    {"source": "Kochi Port", "target": "BPCL-KOCHI, KERALA", "type": "pipeline"},
    {"source": "Mangalore Port", "target": "MRPL-MANGALORE,KARNATAKA", "type": "pipeline"},
    {"source": "Visakhapatnam Port", "target": "HPCL-VISAKH, ANDHRA PRADESH", "type": "pipeline"},
    {"source": "Chennai Port", "target": "CPCL-MANALI, TAMILNADU", "type": "pipeline"},
    {"source": "Paradip Port", "target": "IOCL-PARADIP,ODISHA", "type": "pipeline"},
    {"source": "Paradip Port", "target": "IOCL-HALDIA, WEST BENGAL", "type": "pipeline"},
    {"source": "Paradip Port", "target": "IOCL-BARAUNI, BIHAR", "type": "pipeline"},
    {"source": "Haldia Port", "target": "IOCL-HALDIA, WEST BENGAL", "type": "pipeline"},
]

def build_supply_network():
    """
    Creates structural node and edge lists mapping imports, corridors, ports, and refineries.
    Saves outputs to D:\\hackathon project\\energy-resilience\\data\\processed.
    """
    print("Building supply network representations...")
    
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # 1. Load PPAC Staging Tables
    imports_path = os.path.join(STAGING_DIR, "crude_imports.csv")
    refinery_path = os.path.join(STAGING_DIR, "refinery_throughput.csv")
    consumption_path = os.path.join(STAGING_DIR, "petroleum_consumption.csv")
    
    if not all(os.path.exists(p) for p in [imports_path, refinery_path, consumption_path]):
        raise FileNotFoundError("Missing one or more required PPAC staging tables.")
        
    df_imp = pd.read_csv(imports_path)
    df_ref = pd.read_csv(refinery_path)
    df_con = pd.read_csv(consumption_path)
    
    # Clean refinery records to individual units only
    df_ref_ind = df_ref[df_ref["record_type"] == "individual"]
    
    # 2. Build Nodes List
    nodes = []
    
    # A. Add Corridors
    corridors = ["HORMUZ", "BAB_EL_MANDEB", "SUEZ", "RED_SEA", "GULF_OF_OMAN", "GULF_OF_ADEN", "ARABIAN_SEA"]
    for c in corridors:
        nodes.append({
            "node_id": c,
            "node_name": c,
            "node_type": "corridor",
            "capacity": None,
            "unit": None,
            "source": "EIA / NGA"
        })
        
    # B. Add Ports
    ports = ["Mundra Port", "Vadinar Port", "Mumbai Port", "Paradip Port", "Haldia Port", "Kochi Port", "Mangalore Port", "Visakhapatnam Port", "Chennai Port"]
    for p in ports:
        nodes.append({
            "node_id": p.upper().replace(" ", "_"),
            "node_name": p,
            "node_type": "port",
            "capacity": None,
            "unit": None,
            "source": "NGA World Port Index"
        })
        
    # C. Add Refineries (from actual staging data)
    refineries = df_ref_ind["oil_company"].unique()
    for r in refineries:
        nodes.append({
            "node_id": r.upper().replace(" ", "_").replace(",", "").replace("-", "_"),
            "node_name": r,
            "node_type": "refinery",
            "capacity": None, # Will remain None or resolved from static infrastructure
            "unit": "MMTPA",
            "source": "PPAC / Ministry"
        })
        
    # D. Add National Aggregates (representing flow pools)
    nodes.append({
        "node_id": "GLOBAL_IMPORT_SOURCE",
        "node_name": "Global Suppliers (Aggregate)",
        "node_type": "supplier_pool",
        "capacity": None,
        "unit": None,
        "source": "PPAC"
    })
    
    df_nodes = pd.DataFrame(nodes)
    df_nodes["retrieval_timestamp"] = timestamp
    df_nodes["processing_version"] = 1.0
    
    nodes_csv_path = os.path.join(PROCESSED_DIR, "supply_network_nodes.csv")
    df_nodes.to_csv(nodes_csv_path, index=False)
    print(f"  Saved supply network nodes to {nodes_csv_path}")
    
    # 3. Build Edges List (with actual historical flows where mapped)
    edges = []
    
    # A. Link Global Suppliers -> Corridors (Conceptual lanes)
    for c in ["HORMUZ", "BAB_EL_MANDEB", "RED_SEA"]:
        edges.append({
            "source_node": "GLOBAL_IMPORT_SOURCE",
            "target_node": c,
            "edge_type": "maritime_lane",
            "description": f"Maritime flow routing through {c}"
        })
        
    # B. Link Corridors -> Ports
    # Sourced routing approximations
    corridor_port_links = [
        ("HORMUZ", "MUNDRA_PORT"),
        ("HORMUZ", "VADINAR_PORT"),
        ("HORMUZ", "MUMBAI_PORT"),
        ("HORMUZ", "KOCHI_PORT"),
        ("HORMUZ", "MANGALORE_PORT"),
        ("BAB_EL_MANDEB", "KOCHI_PORT"),
        ("BAB_EL_MANDEB", "MANGALORE_PORT"),
        ("RED_SEA", "MUNDRA_PORT"),
        ("RED_SEA", "VADINAR_PORT"),
    ]
    for c, p in corridor_port_links:
        edges.append({
            "source_node": c,
            "target_node": p,
            "edge_type": "maritime_lane",
            "description": f"Shipping lane from {c} to {p}"
        })
        
    # C. Link Ports -> Refineries (Pipeline / Logistical mapping)
    for link in PORT_REFINERY_LINKS:
        port_node = link["source"].upper().replace(" ", "_")
        ref_node = link["target"].upper().replace(" ", "_").replace(",", "").replace("-", "_")
        edges.append({
            "source_node": port_node,
            "target_node": ref_node,
            "edge_type": link["type"],
            "description": f"Crude delivery from {link['source']} to {link['target']}"
        })
        
    df_edges = pd.DataFrame(edges)
    df_edges["retrieval_timestamp"] = timestamp
    df_edges["processing_version"] = 1.0
    
    edges_csv_path = os.path.join(PROCESSED_DIR, "supply_network_edges.csv")
    df_edges.to_csv(edges_csv_path, index=False)
    print(f"  Saved supply network edges to {edges_csv_path}")
