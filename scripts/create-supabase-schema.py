#!/usr/bin/env python3
"""
Create Database Schema in Supabase
Uses SQLAlchemy models to create tables directly
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Supabase connection
SUPABASE_DB_URL = os.getenv(
    "SUPABASE_DB_URL",
    "postgresql://postgres:postgres@localhost:54322/postgres"
)

def create_schema():
    """Create all tables from SQLAlchemy models"""
    print(f"Connecting to Supabase: {SUPABASE_DB_URL.split('@')[1] if '@' in SUPABASE_DB_URL else 'local'}")
    
    # Create engine
    engine = create_engine(SUPABASE_DB_URL, echo=False)
    
    try:
        # Import models to register them with Base
        from app.db.database import Base
        
        # Import all models (they register themselves with Base)
        import app.models.organization
        import app.models.user
        import app.models.team
        import app.models.project
        import app.models.cluster
        import app.models.pipeline
        import app.models.metrics
        import app.models.logs
        import app.models.alert
        import app.models.automation_run
        import app.models.infrastructure_change
        import app.models.role
        import app.models.audit_log
        
        # Try to import optional models
        try:
            import app.models.permission
        except ImportError:
            pass
        
        print("\nCreating tables...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("✓ Tables created successfully!")
        
        # Verify tables
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                ORDER BY tablename;
            """))
            tables = [row[0] for row in result]
            
            print(f"\nCreated {len(tables)} tables:")
            for table in tables:
                print(f"  - {table}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error creating schema: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = create_schema()
    sys.exit(0 if success else 1)

