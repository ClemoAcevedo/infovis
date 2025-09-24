#!/usr/bin/env python3
"""
Analyze raw vaccination data to understand the timeline and find December 2020 data
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import calendar

def analyze_vaccination_columns():
    """Analyze the vaccination data columns to understand the timeline"""
    print("=== ANALYZING RAW VACCINATION DATA TIMELINE ===")

    # Load the raw vaccination data
    df = pd.read_csv('producto77/total_vacunados_region_edad.csv')

    # Get column names (exclude Region and Dosis)
    time_columns = [col for col in df.columns if col not in ['Region', 'Dosis']]

    print(f"Time columns: {time_columns}")
    print(f"Number of time periods: {len(time_columns)}")

    # Assuming these are weeks, let's figure out what they represent
    # Week 1 of 2021 would be around January 4, 2021
    # Week 52 of 2020 would be around December 21, 2020

    # Let's see if there's data in early columns (which might be late 2020)
    print(f"\nChecking for data in early columns (potential Dec 2020):")

    # Look at Total Primera (first dose) data
    total_primera = df[df['Region'] == 'Total'][df['Dosis'] == 'Primera'].iloc[0]

    # Check first few columns for non-null values
    for col in time_columns[:15]:
        value = total_primera[col]
        if pd.notna(value) and value > 0:
            print(f"  Column {col}: {value:,.0f} first doses")

    # Let's try to map columns to dates
    # If column 3 = week 3 of 2021, that would be around January 18, 2021
    # If columns represent epidemiological weeks...

    print(f"\nHypotheses for column meaning:")
    print(f"1. Columns 3-80 = epidemiological weeks 3-80 of 2021")
    print(f"2. Columns 3-80 = sequential weeks from early 2020")
    print(f"3. Columns represent other time periods")

    # Check when data first appears
    first_data_col = None
    for col in time_columns:
        value = total_primera[col]
        if pd.notna(value) and value > 0:
            first_data_col = col
            break

    if first_data_col:
        print(f"\nFirst data appears in column: {first_data_col}")
        print(f"Value: {total_primera[first_data_col]:,.0f} first doses")

        # If this is epidemiological week, calculate the date
        if first_data_col.isdigit():
            week_num = int(first_data_col)
            # Epidemiological week 1 of 2021 started on January 4, 2021
            week_1_2021 = datetime(2021, 1, 4)
            estimated_date = week_1_2021 + timedelta(weeks=week_num-1)
            print(f"If epidemiological week {week_num} of 2021: ~{estimated_date.strftime('%Y-%m-%d')}")

def check_preprocessed_vs_raw():
    """Compare the preprocessed data with raw data timeline"""
    print(f"\n=== COMPARING PREPROCESSED VS RAW DATA ===")

    # Load preprocessed data
    df_processed = pd.read_csv('assets/data.csv')
    df_processed['date'] = pd.to_datetime(df_processed['date'])

    # First vaccination in preprocessed data
    first_vac = df_processed[df_processed['vaccinated_pct'] > 0].iloc[0]
    print(f"Preprocessed data - First vaccination: {first_vac['date'].strftime('%Y-%m-%d')} = {first_vac['vaccinated_pct']}%")

    # Load raw data
    df_raw = pd.read_csv('producto77/total_vacunados_region_edad.csv')
    total_primera = df_raw[(df_raw['Region'] == 'Total') & (df_raw['Dosis'] == 'Primera')].iloc[0]

    # Find first non-zero value in raw data
    time_columns = [col for col in df_raw.columns if col not in ['Region', 'Dosis']]
    first_raw_col = None
    first_raw_value = None

    for col in time_columns:
        value = total_primera[col]
        if pd.notna(value) and value > 0:
            first_raw_col = col
            first_raw_value = value
            break

    if first_raw_col:
        print(f"Raw data - First vaccination: Column {first_raw_col} = {first_raw_value:,.0f} doses")

        # Try to estimate what percentage this represents
        # Chile's population is ~19.1 million
        chile_population = 19100000
        estimated_pct = (first_raw_value / chile_population) * 100
        print(f"Estimated percentage: {estimated_pct:.2f}%")

def main():
    """Main analysis function"""
    print("Raw Vaccination Data Analysis")
    print("=" * 50)

    analyze_vaccination_columns()
    check_preprocessed_vs_raw()

    print(f"\n=== CONCLUSION ===")
    print("To create a factual smooth transition, we need to:")
    print("1. Determine if raw data contains Dec 24, 2020 vaccination start")
    print("2. Map raw data columns to actual dates")
    print("3. Calculate progressive vaccination percentages from Dec 24, 2020")

if __name__ == "__main__":
    main()