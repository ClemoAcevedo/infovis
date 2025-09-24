#!/usr/bin/env python3
"""
Vaccination Continuity Analysis and Fixer
Investigates and potentially fixes the discontinuous jump in vaccination data
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

def analyze_vaccination_discontinuity():
    """Analyze the vaccination data discontinuity"""
    print("=== VACCINATION CONTINUITY ANALYSIS ===")

    # Load the preprocessed data
    df = pd.read_csv('assets/data.csv')
    df['date'] = pd.to_datetime(df['date'])

    # Find the transition period
    transition_period = df[(df['date'] >= '2020-12-15') & (df['date'] <= '2021-01-15')].copy()

    print("Transition period around vaccination start:")
    for _, row in transition_period.iterrows():
        print(f"  {row['date'].strftime('%Y-%m-%d')}: {row['vaccinated_pct']}%")

    # Calculate the jump
    last_zero = df[df['vaccinated_pct'] == 0.0].iloc[-1]
    first_nonzero = df[df['vaccinated_pct'] > 0.0].iloc[0]

    print(f"\nDiscontinuity details:")
    print(f"Last 0%: {last_zero['date'].strftime('%Y-%m-%d')} = {last_zero['vaccinated_pct']}%")
    print(f"First >0%: {first_nonzero['date'].strftime('%Y-%m-%d')} = {first_nonzero['vaccinated_pct']}%")
    print(f"Jump size: {first_nonzero['vaccinated_pct']} percentage points")
    print(f"Days between: {(first_nonzero['date'] - last_zero['date']).days}")

    return df, last_zero, first_nonzero

def propose_continuity_fix(df, last_zero, first_nonzero):
    """Propose different methods to fix the continuity"""
    print(f"\n=== PROPOSED CONTINUITY FIXES ===")

    # Option 1: Gradual ramp-up in December
    print("Option 1: Add gradual ramp-up in late December 2020")
    ramp_start = last_zero['date'] - timedelta(days=7)  # Start ramp 7 days before
    print(f"  Add gradual increase from {ramp_start.strftime('%Y-%m-%d')} to {last_zero['date'].strftime('%Y-%m-%d')}")
    print(f"  From 0% to {first_nonzero['vaccinated_pct']}% over 8 days")

    # Generate the ramp data
    ramp_dates = pd.date_range(start=ramp_start, end=first_nonzero['date'], freq='D')[1:-1]  # Exclude start and end
    ramp_values = np.linspace(0, first_nonzero['vaccinated_pct'], len(ramp_dates) + 2)[1:-1]  # Exclude 0 and final value

    print("  Proposed values:")
    for date, val in zip(ramp_dates, ramp_values):
        print(f"    {date.strftime('%Y-%m-%d')}: {val:.2f}%")

    # Option 2: Smooth transition
    print(f"\nOption 2: Interpolate between existing points")
    print(f"  Use curve fitting between {last_zero['date'].strftime('%Y-%m-%d')} and {first_nonzero['date'].strftime('%Y-%m-%d')}")

    # Option 3: Keep as is but add annotation
    print(f"\nOption 3: Keep discontinuity but add explanation")
    print(f"  Add annotation explaining Chile's vaccination campaign launch date")

    return ramp_dates, ramp_values

def create_fixed_dataset(df, ramp_dates, ramp_values):
    """Create a version of the dataset with the continuity fix applied"""
    print(f"\n=== CREATING FIXED DATASET ===")

    # Create new rows for the ramp period
    base_row = df[df['date'] == pd.to_datetime('2020-12-31')].iloc[0].copy()

    new_rows = []
    for date, vac_pct in zip(ramp_dates, ramp_values):
        new_row = base_row.copy()
        new_row['date'] = date
        new_row['vaccinated_pct'] = vac_pct
        new_rows.append(new_row)

    # Create new dataframe with interpolated values
    if new_rows:
        new_rows_df = pd.DataFrame(new_rows)
        df_fixed = pd.concat([df, new_rows_df], ignore_index=True)
        df_fixed = df_fixed.sort_values('date').reset_index(drop=True)

        print(f"Added {len(new_rows)} interpolated data points")

        # Show the fixed transition
        transition_fixed = df_fixed[(df_fixed['date'] >= '2020-12-25') & (df_fixed['date'] <= '2021-01-05')].copy()
        print("Fixed transition period:")
        for _, row in transition_fixed.iterrows():
            print(f"  {row['date'].strftime('%Y-%m-%d')}: {row['vaccinated_pct']:.2f}%")

        return df_fixed
    else:
        print("No interpolation needed")
        return df

def save_fixed_data(df_fixed):
    """Save the fixed dataset"""
    output_path = 'assets/data_fixed.csv'
    df_fixed.to_csv(output_path, index=False)
    print(f"\nFixed dataset saved to: {output_path}")
    return output_path

def visualize_fix(df_original, df_fixed):
    """Create a visualization comparing original vs fixed data"""
    print(f"\n=== CREATING COMPARISON VISUALIZATION ===")

    # Focus on the transition period
    start_date = '2020-12-15'
    end_date = '2021-01-15'

    orig_subset = df_original[(df_original['date'] >= start_date) & (df_original['date'] <= end_date)]
    fixed_subset = df_fixed[(df_fixed['date'] >= start_date) & (df_fixed['date'] <= end_date)]

    plt.figure(figsize=(12, 6))
    plt.plot(orig_subset['date'], orig_subset['vaccinated_pct'], 'r-o', label='Original Data', linewidth=2, markersize=4)
    plt.plot(fixed_subset['date'], fixed_subset['vaccinated_pct'], 'b-o', label='Fixed Data', linewidth=2, markersize=4)

    plt.xlabel('Date')
    plt.ylabel('Vaccination Percentage (%)')
    plt.title('Vaccination Data: Original vs Fixed Continuity')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()

    plot_path = 'vaccination_continuity_fix.png'
    plt.savefig(plot_path, dpi=150, bbox_inches='tight')
    print(f"Comparison plot saved to: {plot_path}")

    return plot_path

def main():
    """Main function"""
    print("Vaccination Continuity Analysis and Fixer")
    print("=" * 50)

    # Analyze the discontinuity
    df, last_zero, first_nonzero = analyze_vaccination_discontinuity()

    # Propose fixes
    ramp_dates, ramp_values = propose_continuity_fix(df, last_zero, first_nonzero)

    # Create fixed dataset
    df_fixed = create_fixed_dataset(df, ramp_dates, ramp_values)

    # Save fixed data
    fixed_file = save_fixed_data(df_fixed)

    # Create visualization
    plot_file = visualize_fix(df, df_fixed)

    print(f"\n=== SUMMARY ===")
    print(f"✓ Identified vaccination discontinuity from 0% to {first_nonzero['vaccinated_pct']}%")
    print(f"✓ Created gradual ramp-up over {len(ramp_dates)} days")
    print(f"✓ Fixed dataset saved as: {fixed_file}")
    print(f"✓ Comparison plot saved as: {plot_file}")
    print(f"\nTo use the fixed data, update chart.js to load 'assets/data_fixed.csv' instead of 'assets/data.csv'")

if __name__ == "__main__":
    main()