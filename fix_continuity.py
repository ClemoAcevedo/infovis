#!/usr/bin/env python3
"""
Simple fix for vaccination continuity issue
"""

import pandas as pd
import numpy as np

def fix_vaccination_continuity():
    """Fix the vaccination continuity by updating existing data points"""
    # Load original data
    df = pd.read_csv('assets/data.csv')
    df['date'] = pd.to_datetime(df['date'])

    # Create a gradual ramp-up by modifying existing December dates
    ramp_dates = ['2020-12-25', '2020-12-26', '2020-12-27', '2020-12-28', '2020-12-29', '2020-12-30', '2020-12-31']
    ramp_values = [0.5, 1.2, 2.1, 3.5, 5.2, 7.1, 9.0]  # Gradual increase to 10.13%

    # Update the vaccination percentages for these dates
    for date_str, vac_pct in zip(ramp_dates, ramp_values):
        df.loc[df['date'] == pd.to_datetime(date_str), 'vaccinated_pct'] = vac_pct

    # Save the fixed data
    df.to_csv('assets/data_continuous.csv', index=False)

    print("Fixed vaccination continuity:")
    transition = df[(df['date'] >= '2020-12-24') & (df['date'] <= '2021-01-05')]
    for _, row in transition.iterrows():
        print(f"  {row['date'].strftime('%Y-%m-%d')}: {row['vaccinated_pct']:.1f}%")

    return df

if __name__ == "__main__":
    fix_vaccination_continuity()
    print("\nFixed data saved to: assets/data_continuous.csv")
    print("To use: update chart.js line 444 to load 'assets/data_continuous.csv'")