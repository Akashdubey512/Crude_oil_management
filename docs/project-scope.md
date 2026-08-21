# Project Scope: India Energy Supply Chain Resilience Platform

This document defines the scope, functional objectives, and boundary constraints for the production-grade AI-driven Energy Supply Chain Resilience platform for India.

## Functional Objectives

The platform must eventually achieve the following 10 objectives:

1. **Monitor Geopolitical Risk**: Programmatically track and ingest geopolitical risk scores (such as the Caldara-Iacoviello index) to quantify regional and global tensions.
2. **Monitor Logistics/Shipping Risk**: Integrate shipping positions, choke point statuses, and global freight costs to assess logistics vulnerability.
3. **Quantify Supply Exposure**: Determine India's dependency levels on individual supplier nations, specific crude grades, and transit corridors.
4. **Detect Corridor Disruptions**: Flag real-time or near-real-time anomalies or blocks along critical supply lines (e.g., Bab-el-Mandeb, Strait of Hormuz, Malacca Strait).
5. **Simulate Disruption Scenarios**: Model hypothetical blocks, export bans, or corridor closures to understand downstream supply changes.
6. **Estimate Downstream Impact**: Calculate the impact of supply shocks on refining throughput and domestic product prices (ATF, HSD, MS, LPG, etc.).
7. **Alternative Procurement Recommendations**: Provide optimized alternative sourcing routes, supplier allocations, and crude grade substitutions when primary paths fail.
8. **Optimize Strategic-Reserve Actions**: Simulate and recommend release patterns or refill schedules for India's Strategic Petroleum Reserves (ISPRL) under shock conditions.
9. **Geospatial Digital Twin**: Build a geospatial representation of the Indian energy supply chain showing refineries, crude pipelines, major ports, and maritime transit paths.
10. **Ensure Complete Data/Model Provenance**: Maintain strict audit logs and manifests linking raw data, intermediate steps, features, and model predictions.

## Out of Scope (Phase 0)

To maintain a robust foundation, the following items are strictly out of scope for the current initial phase:
- **No Synthetic/Dummy Data**: Every prediction, dataset, and capacity figure must represent real historical or provisional values. No placeholders are permitted.
- **No Machine Learning Model Training**: Machine learning model design, training, and evaluations are deferred until a validated dataset ingestion and validation schema is built.
- **No Frontend/User Interface**: Building the geospatial dashboard or web interface is deferred.
- **No Production APIs**: FastAPI development and other serving services will be initiated only after the data validation layer is complete.
