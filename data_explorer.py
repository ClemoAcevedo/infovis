#!/usr/bin/env python3
"""
Data Explorer Script for COVID-19 Chile Vaccination Analysis
Investigates the vaccination percentage starting point issue
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os

def analyze_preprocessed_data():
    """Analyze the preprocessed data.csv file"""
    print("=== ANALYZING PREPROCESSED DATA (assets/data.csv) ===")

    try:
        # Load preprocessed data
        df = pd.read_csv('assets/data.csv')
        df['date'] = pd.to_datetime(df['date'])

        print(f"Total records: {len(df)}")
        print(f"Date range: {df['date'].min()} to {df['date'].max()}")

        # Find first non-zero vaccination percentage
        first_vac = df[df['vaccinated_pct'] > 0]
        if not first_vac.empty:
            first_date = first_vac.iloc[0]['date']
            first_pct = first_vac.iloc[0]['vaccinated_pct']
            print(f"First vaccination entry: {first_date.strftime('%Y-%m-%d')} with {first_pct}%")

        # Check for any values around 15%
        around_15 = df[(df['vaccinated_pct'] >= 14.5) & (df['vaccinated_pct'] <= 15.5)]
        if not around_15.empty:
            print(f"\nEntries around 15%:")
            for _, row in around_15.head(5).iterrows():
                print(f"  {row['date'].strftime('%Y-%m-%d')}: {row['vaccinated_pct']}%")
        else:
            print("\nNo entries found around 15%")

        # Show first 10 vaccination entries
        print(f"\nFirst 10 vaccination entries:")
        first_10_vac = first_vac.head(10)
        for _, row in first_10_vac.iterrows():
            print(f"  {row['date'].strftime('%Y-%m-%d')}: {row['vaccinated_pct']}%")

    except Exception as e:
        print(f"Error analyzing preprocessed data: {e}")

def analyze_vaccination_raw_data():
    """Analyze raw vaccination data from producto77"""
    print("\n=== ANALYZING RAW VACCINATION DATA (producto77) ===")

    try:
        # Load raw vaccination data
        vac_file = 'producto77/total_vacunados_region_edad.csv'
        if os.path.exists(vac_file):
            df = pd.read_csv(vac_file)
            print(f"Raw vaccination data shape: {df.shape}")
            print(f"Columns: {list(df.columns)}")

            # Show first few rows
            print("\nFirst few rows:")
            print(df.head())

            # If there's a date column, analyze by date
            date_cols = [col for col in df.columns if 'fecha' in col.lower() or 'date' in col.lower()]
            if date_cols:
                print(f"Date columns found: {date_cols}")

            # Look for total/percentage columns
            pct_cols = [col for col in df.columns if 'pct' in col.lower() or 'porcentaje' in col.lower()]
            total_cols = [col for col in df.columns if 'total' in col.lower()]

            print(f"Percentage columns: {pct_cols}")
            print(f"Total columns: {total_cols}")

        else:
            print(f"File {vac_file} not found")

    except Exception as e:
        print(f"Error analyzing raw vaccination data: {e}")

def analyze_deaths_data():
    """Analyze deaths data from producto37"""
    print("\n=== ANALYZING DEATHS DATA (producto37) ===")

    try:
        # Check the smaller file first
        deaths_file = 'producto37/Defunciones.csv'
        if os.path.exists(deaths_file):
            df = pd.read_csv(deaths_file)
            print(f"Deaths data shape: {df.shape}")
            print(f"Columns: {list(df.columns)}")
            print("\nFirst few rows:")
            print(df.head())
        else:
            print(f"File {deaths_file} not found")

    except Exception as e:
        print(f"Error analyzing deaths data: {e}")

def check_chart_scale_configuration():
    """Check if the chart scale is configured correctly"""
    print("\n=== CHECKING CHART CONFIGURATION ===")

    # Read the chart.js file to check scale configuration
    try:
        with open('assets/js/chart.js', 'r') as f:
            content = f.read()

        # Look for yRightScale domain configuration
        if 'yRightScale' in content and '.domain([0, 100])' in content:
            print("Chart right Y-axis is configured for 0-100% range ✓")

        # Check if there's any hardcoded offset
        if '.domain([15, 100])' in content:
            print("WARNING: Chart has hardcoded 15% starting point!")
        elif '.domain([0, 100])' in content:
            print("Chart domain starts at 0% as expected ✓")

    except Exception as e:
        print(f"Error checking chart configuration: {e}")

def main():
    """Main analysis function"""
    print("COVID-19 Chile Data Explorer")
    print("=" * 50)

    analyze_preprocessed_data()
    analyze_vaccination_raw_data()
    analyze_deaths_data()
    check_chart_scale_configuration()

    print("\n=== CONCLUSION ===")
    print("Based on the analysis above, we can determine if the 15% starting point is:")
    print("1. A data issue - vaccination campaign actually started at 15%")
    print("2. A chart configuration issue - scale or rendering problem")
    print("3. A visual perception issue - axis scaling making it appear to start at 15%")

if __name__ == "__main__":
    main()