#!/usr/bin/env python
"""
Script to add certificate columns to donation_history table
"""
import sys
import os

# Add parent directory to sys.path to import app
PARENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, PARENT_DIR)

from app import create_app
from app.extensions import db

def add_certificate_columns():
    """Add certificate columns to donation_history table if they don't exist"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if columns already exist
            from sqlalchemy import text
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'donation_history'
                AND column_name IN ('certificate_number', 'certificate_url', 'certificate_generated_at')
            """))
            existing_columns = [row[0] for row in result]
            
            print(f"Existing certificate columns: {existing_columns}")
            
            # Add columns if they don't exist
            columns_to_add = []
            
            if 'certificate_number' not in existing_columns:
                columns_to_add.append("ALTER TABLE donation_history ADD COLUMN certificate_number VARCHAR(100) UNIQUE")
                
            if 'certificate_url' not in existing_columns:
                columns_to_add.append("ALTER TABLE donation_history ADD COLUMN certificate_url VARCHAR(500)")
                
            if 'certificate_generated_at' not in existing_columns:
                columns_to_add.append("ALTER TABLE donation_history ADD COLUMN certificate_generated_at TIMESTAMP")
            
            if not columns_to_add:
                print("✓ All certificate columns already exist!")
                return
            
            # Execute ALTER TABLE statements
            for sql in columns_to_add:
                print(f"Executing: {sql}")
                db.session.execute(text(sql))
            
            db.session.commit()
            print("✓ Certificate columns added successfully!")
            
        except Exception as e:
            print(f"Error adding certificate columns: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    add_certificate_columns()
