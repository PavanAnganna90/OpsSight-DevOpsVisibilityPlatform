#!/usr/bin/env python3
"""
Simple OpenAPI Schema Export Script

Exports OpenAPI schema when the app is running.
"""

import json
import requests
import sys
from pathlib import Path
from datetime import datetime


def export_openapi_schema(base_url: str = "http://localhost:8000"):
    """Export OpenAPI schema from running FastAPI instance."""
    try:
        # Get schema from running app
        response = requests.get(f"{base_url}/api/v1/openapi.json")
        response.raise_for_status()
        schema = response.json()
        
        # Create output directory
        output_dir = Path(__file__).parent.parent / "docs" / "api"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save schema
        schema_file = output_dir / "openapi.json"
        with open(schema_file, "w") as f:
            json.dump(schema, f, indent=2)
        
        # Generate basic README
        readme_file = output_dir / "README.md"
        with open(readme_file, "w") as f:
            f.write(f"""# OpsSight API Documentation

Version: {schema.get('info', {}).get('version', 'Unknown')}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Interactive Documentation
- **Swagger UI**: {base_url}/docs
- **ReDoc**: {base_url}/redoc
- **OpenAPI Schema**: {base_url}/api/v1/openapi.json

## Files
- `openapi.json` - Complete OpenAPI 3.0 specification

## Endpoints
Total endpoints: {len(schema.get('paths', {}))}
Tags: {len(schema.get('tags', []))}
""")
        
        print(f"✅ OpenAPI schema exported to: {schema_file}")
        print(f"📄 README generated: {readme_file}")
        print(f"🌐 View docs at: {base_url}/docs")
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {base_url}")
        print("💡 Make sure the FastAPI server is running:")
        print("   uvicorn app.main:app --reload")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Error exporting schema: {e}")
        sys.exit(1)


if __name__ == "__main__":
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    export_openapi_schema(base_url)