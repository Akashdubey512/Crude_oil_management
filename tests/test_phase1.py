"""
Phase 1 Test Suite — Data Ingestion & Staging Validation
Tests:
  - Loader outputs (shape, columns, types)
  - Fiscal year alignment
  - Refinery row classification
  - Duplicate detection
  - Staging schema integrity
  - Lineage manifest existence and structure
"""
import os
import sys
import json
import datetime
import pandas as pd
import numpy as np
import pytest

# Ensure project root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.ingestion.loaders import (
    load_brent_prices,
    load_daily_gpr,
    load_monthly_gpr,
    load_refinery_throughput,
    load_master_consumption,
    load_master_imports,
)
from src.preprocessing.normalizer import (
    get_fiscal_year,
    classify_refinery,
    STAGING_DIR,
    MANIFEST_DIR,
)
from src.validation.validators import validate_dataset, STAGING_SCHEMAS

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
RAW_DIR = r"D:\hackathon project\energy-resilience\data\raw"
BRENT_CSV = os.path.join(RAW_DIR, "DCOILBRENTEU.csv")
GPR_DAILY_XLS = os.path.join(RAW_DIR, "data_gpr_daily_recent.xls")
GPR_MONTHLY_XLS = os.path.join(RAW_DIR, "data_gpr_export.xls")
REFINERY_CSV = os.path.join(RAW_DIR, "8d3b6596-b09e-4077-aebf-425193185a5b.csv")
CONSUMPTION_XLS = os.path.join(RAW_DIR, "1777985064_PT_Consumption_English.xls")
IMPORTS_QTY_XLSX = os.path.join(RAW_DIR, "1751964574_PT_IMPORT_QTY_H.xlsx")
IMPORTS_INR_XLSX = os.path.join(RAW_DIR, "1751964598_PT_IMPORT_VAL_RS.CRS._H.xlsx")
IMPORTS_USD_XLSX = os.path.join(RAW_DIR, "1751964622_PT_IMPORT_VAL_US$_H.xlsx")


# ===========================================================================
# SECTION 1: Fiscal Year Utility
# ===========================================================================
class TestFiscalYear:
    def test_april_maps_to_fy_start(self):
        """April 2024 should be FY 2024-25."""
        dt = pd.Timestamp("2024-04-01")
        assert get_fiscal_year(dt) == "2024-25"

    def test_march_maps_to_previous_fy(self):
        """March 2025 should be FY 2024-25."""
        dt = pd.Timestamp("2025-03-31")
        assert get_fiscal_year(dt) == "2024-25"

    def test_january_maps_correctly(self):
        """January 2024 should be FY 2023-24."""
        dt = pd.Timestamp("2024-01-15")
        assert get_fiscal_year(dt) == "2023-24"

    def test_year_boundary_march_april(self):
        """31 March and 1 April should be in different financial years."""
        march = pd.Timestamp("2023-03-31")
        april = pd.Timestamp("2023-04-01")
        assert get_fiscal_year(march) == "2022-23"
        assert get_fiscal_year(april) == "2023-24"


# ===========================================================================
# SECTION 2: Refinery Classification
# ===========================================================================
class TestRefineryClassification:
    def test_individual_refinery(self):
        assert classify_refinery("BPCL-BINA") == "individual"

    def test_ril_total_is_subtotal(self):
        assert classify_refinery("RIL TOTAL") == "subtotal"

    def test_grand_total(self):
        assert classify_refinery("GRAND TOTAL") == "grand_total"

    def test_case_insensitive(self):
        assert classify_refinery("grand total") == "grand_total"

    def test_subtotal_detection(self):
        assert classify_refinery("IOCL TOTAL") == "subtotal"


# ===========================================================================
# SECTION 3: Loader Output Validation
# ===========================================================================
class TestBrentLoader:
    @pytest.fixture(scope="class")
    def df(self):
        return load_brent_prices(BRENT_CSV)

    def test_returns_dataframe(self, df):
        assert isinstance(df, pd.DataFrame)

    def test_has_required_columns(self, df):
        for col in ["observation_date", "DCOILBRENTEU", "source_file", "ingestion_timestamp"]:
            assert col in df.columns, f"Missing column: {col}"

    def test_no_duplicate_dates(self, df):
        assert df["observation_date"].duplicated().sum() == 0

    def test_no_negative_prices(self, df):
        valid = df["DCOILBRENTEU"].dropna()
        assert (valid >= 0).all(), "Negative Brent prices found"

    def test_dates_are_parseable(self, df):
        parsed = pd.to_datetime(df["observation_date"], errors="coerce")
        assert parsed.isna().sum() == 0


class TestDailyGPRLoader:
    @pytest.fixture(scope="class")
    def df(self):
        return load_daily_gpr(GPR_DAILY_XLS)

    def test_returns_dataframe(self, df):
        assert isinstance(df, pd.DataFrame)

    def test_has_metric_columns(self, df):
        for col in ["GPRD", "GPRD_ACT", "GPRD_THREAT"]:
            assert col in df.columns

    def test_has_source_row(self, df):
        assert "source_row" in df.columns

    def test_no_negatives(self, df):
        for col in ["GPRD", "GPRD_ACT", "GPRD_THREAT"]:
            valid = df[col].dropna()
            assert (valid >= 0).all(), f"Negative values found in {col}"


class TestMonthlyGPRLoader:
    @pytest.fixture(scope="class")
    def df(self):
        return load_monthly_gpr(GPR_MONTHLY_XLS)

    def test_returns_dataframe(self, df):
        assert isinstance(df, pd.DataFrame)

    def test_has_source_row(self, df):
        assert "source_row" in df.columns

    def test_month_column_parseable(self, df):
        assert pd.api.types.is_datetime64_any_dtype(df["month"])


class TestRefineryLoader:
    @pytest.fixture(scope="class")
    def df(self):
        return load_refinery_throughput(REFINERY_CSV)

    def test_returns_dataframe(self, df):
        assert isinstance(df, pd.DataFrame)

    def test_no_duplicate_rows(self, df):
        assert df.duplicated().sum() == 0

    def test_has_provenance(self, df):
        for col in ["source_file", "ingestion_timestamp", "transformation_version"]:
            assert col in df.columns


# ===========================================================================
# SECTION 4: Staging Table Integrity
# ===========================================================================
class TestStagingIntegrity:
    STAGING_FILES = list(STAGING_SCHEMAS.keys())

    @pytest.mark.parametrize("fname", STAGING_FILES)
    def test_staging_file_exists(self, fname):
        fpath = os.path.join(STAGING_DIR, fname)
        assert os.path.exists(fpath), f"Staging file missing: {fname}"

    @pytest.mark.parametrize("fname", STAGING_FILES)
    def test_staging_no_duplicates(self, fname):
        fpath = os.path.join(STAGING_DIR, fname)
        if not os.path.exists(fpath):
            pytest.skip(f"File not found: {fname}")
        df = pd.read_csv(fpath)
        assert df.duplicated().sum() == 0, f"Duplicate rows in {fname}"

    @pytest.mark.parametrize("fname", STAGING_FILES)
    def test_staging_date_parseable(self, fname):
        fpath = os.path.join(STAGING_DIR, fname)
        if not os.path.exists(fpath):
            pytest.skip(f"File not found: {fname}")
        df = pd.read_csv(fpath)
        if "date" in df.columns:
            parsed = pd.to_datetime(df["date"], errors="coerce")
            assert parsed.isna().sum() == 0, f"Unparseable dates in {fname}"

    @pytest.mark.parametrize("fname", STAGING_FILES)
    def test_staging_required_columns(self, fname):
        fpath = os.path.join(STAGING_DIR, fname)
        if not os.path.exists(fpath):
            pytest.skip(f"File not found: {fname}")
        df = pd.read_csv(fpath)
        schema = STAGING_SCHEMAS[fname]
        for col in schema["required_columns"]:
            assert col in df.columns, f"Missing required column '{col}' in {fname}"

    @pytest.mark.parametrize("fname", STAGING_FILES)
    def test_validator_passes(self, fname):
        """End-to-end validator must return PASS for all staging tables."""
        report = validate_dataset(fname)
        assert report["status"] == "PASS", (
            f"Validator returned {report['status']} for {fname}: "
            f"{report['validation_issues']}"
        )


# ===========================================================================
# SECTION 5: Crude Prices Specifics
# ===========================================================================
class TestCrudePricesStaging:
    @pytest.fixture(scope="class")
    def df(self):
        return pd.read_csv(os.path.join(STAGING_DIR, "crude_prices.csv"))

    def test_unit_column_values(self, df):
        assert (df["unit"] == "USD/bbl").all()

    def test_source_column_values(self, df):
        assert (df["source"] == "FRED").all()

    def test_financial_year_format(self, df):
        """financial_year must match YYYY-YY pattern."""
        import re
        pattern = re.compile(r"^\d{4}-\d{2}$")
        sample = df["financial_year"].dropna().head(200)
        for val in sample:
            assert pattern.match(str(val)), f"Bad financial_year format: {val}"

    def test_no_future_dates(self, df):
        today = pd.Timestamp.today()
        parsed = pd.to_datetime(df["date"])
        assert (parsed <= today).all(), "Future dates found in crude_prices.csv"


# ===========================================================================
# SECTION 6: Lineage Manifest
# ===========================================================================
class TestLineageManifest:
    @pytest.fixture(scope="class")
    def manifest(self):
        mpath = os.path.join(MANIFEST_DIR, "processed_manifest.json")
        assert os.path.exists(mpath), "processed_manifest.json not found"
        with open(mpath) as f:
            return json.load(f)

    def test_manifest_has_datasets(self, manifest):
        assert "datasets" in manifest
        assert len(manifest["datasets"]) == 6

    def test_all_datasets_have_row_count(self, manifest):
        for ds in manifest["datasets"]:
            assert "row_count" in ds
            assert ds["row_count"] > 0

    def test_all_datasets_have_date_range(self, manifest):
        for ds in manifest["datasets"]:
            assert "date_min" in ds
            assert "date_max" in ds
            assert ds["date_min"] != "UNKNOWN"
            assert ds["date_max"] != "UNKNOWN"

    def test_all_datasets_pass_quality(self, manifest):
        for ds in manifest["datasets"]:
            assert ds.get("quality_status") == "PASS", (
                f"Dataset {ds['dataset_id']} has quality_status={ds.get('quality_status')}"
            )


# ===========================================================================
# SECTION 7: Refinery Staging Specifics
# ===========================================================================
class TestRefineryStaging:
    @pytest.fixture(scope="class")
    def df(self):
        return pd.read_csv(os.path.join(STAGING_DIR, "refinery_throughput.csv"))

    def test_record_type_values(self, df):
        valid = {"individual", "subtotal", "grand_total"}
        actual = set(df["record_type"].unique())
        assert actual.issubset(valid), f"Unexpected record_type values: {actual - valid}"

    def test_no_negative_throughput(self, df):
        valid = df["quantity_tmt"].dropna()
        assert (valid >= 0).all()


# ===========================================================================
# SECTION 8: GPR Staging Specifics
# ===========================================================================
class TestGPRStaging:
    @pytest.fixture(scope="class")
    def df(self):
        return pd.read_csv(os.path.join(STAGING_DIR, "geopolitical_risk.csv"))

    def test_metric_values(self, df):
        valid_metrics = {"GPRD", "GPRD_ACT", "GPRD_THREAT", "GPR", "GPRT", "GPRA", "GPRC"}
        actual = set(df["metric"].unique())
        assert actual.issubset(valid_metrics), f"Unexpected metric values: {actual - valid_metrics}"

    def test_geography_values(self, df):
        valid_geos = {"GLOBAL", "INDIA", "CHINA", "USA", "RUSSIA", "SAUDI_ARABIA"}
        actual = set(df["geography"].unique())
        assert actual.issubset(valid_geos), f"Unexpected geography values: {actual - valid_geos}"

    def test_all_source_rows_populated(self, df):
        """source_row must be populated for all GPR records after loader fix."""
        assert df["source_row"].isna().sum() == 0


# ===========================================================================
# SECTION 9: Import Values Merge Integrity
# ===========================================================================
class TestImportValuesMerge:
    @pytest.fixture(scope="class")
    def df(self):
        return pd.read_csv(os.path.join(STAGING_DIR, "crude_import_values.csv"))

    def test_flow_type_values(self, df):
        """Only IMPORT and EXPORT are valid; CONSUMPTION rows are filtered out during normalization."""
        valid = {"IMPORT", "EXPORT"}
        actual = set(df["flow_type"].unique())
        assert actual.issubset(valid), f"Unexpected flow_type: {actual - valid}"

    def test_usd_values_not_all_null(self, df):
        assert df["value_usd_million"].isna().sum() < len(df)

    def test_no_negative_values(self, df):
        for col in ["value_inr_crores", "value_usd_million"]:
            valid = df[col].dropna()
            assert (valid >= 0).all(), f"Negative values in {col}"
