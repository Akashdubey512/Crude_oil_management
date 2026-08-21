# Modeling Assumptions

This document lists the core domain assumptions, conversion factors, and modeling choices applied in the Energy Supply Chain Resilience platform.

## 1. Energy Conversions and Equivalents

- **Crude Oil Weight-to-Volume**: Standard conversions are applied when bridging Indian national statistics (TMT) and global benchmarks (FRED Brent crude prices in barrels):
  - 1 Metric Tonne of Crude Oil $\approx$ 7.33 Barrels (bbl).
  - 1 Thousand Metric Tonnes (TMT) $\approx$ 7,330 Barrels.
  - Daily throughput equivalent: $\text{Barrels per Day (bpd)} = \frac{\text{TMT} \times 7,330}{\text{Days in Month}}$.
  - *Note*: Actual conversion depends on specific crude grade API gravity and density. A standard factor of 7.33 is assumed unless refinery-grade data is available.

## 2. Geopolitical and Shipping Lane Risk Assumptions

- **Geopolitical Risk Index (GPR)**: We assume that the Caldara-Iacoviello index acts as a leading indicator for supply chain shocks. An index surge (>2 standard deviations above historical 12-month mean) is modeled as a precursor to premium rate hikes and shipping interruptions.
- **Corridor Transit Times**: Transit times through major supply lanes are modeled as static averages:
  - Persian Gulf (Strait of Hormuz) to India West Coast (e.g., Jamnagar, Mumbai): 3–4 days.
  - Red Sea (Bab-el-Mandeb) to India West Coast: 7–9 days.
  - West Africa to India West Coast: 20–25 days.
- **Sourcing Redirection**: When choke points are disrupted (e.g., Bab-el-Mandeb blocked), rerouting crude around the Cape of Good Hope is assumed to add 15–20 days of transit time, increasing shipping cost and requiring additional working capital.

## 3. Refinery and Domestic Consumption Characteristics

- **Refinery Throughput Flexibility**: Refineries are assumed to have a maximum operational capacity of 110% of nameplate capacity and a minimum throughput limit of 65% (below which technical shutdown triggers occur).
- **Consumption Seasonality**: Consumption of petroleum products in India exhibits strong seasonal variations:
  - Diesel (HSD) consumption drops by 10-15% during the monsoon season (June–September) due to reduced agricultural pump usage and transit disruptions.
  - Gasoline (MS) and LPG show peaks during festive quarters (October–December).
  - Aviation Turbine Fuel (ATF) correlates with holiday and travel seasons.
- **Provisional Status Alignment**: Data marked "Provisional" (P) in PPAC documents is assumed to be accurate enough for model validation until finalized records are published.

## 4. Currency and Pricing

- **Exchange Rates**: Price shocks are evaluated in both USD and INR. When historical exchange rates are unavailable in the source data, the average monthly USD-INR rate published by the Reserve Bank of India (RBI) is utilized.
- **Brent as Benchmark**: Brent crude oil is assumed to be the pricing proxy for all Indian imports, adjusted by a grade-specific discount/premium (e.g., Urals discount, Middle East OSP).
