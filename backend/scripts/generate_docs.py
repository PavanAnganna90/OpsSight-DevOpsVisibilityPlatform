#!/usr/bin/env python3
"""
API Documentation Generation Script

Generates OpenAPI schema, exports documentation, and creates SDK files.
"""

import json
import os
import sys
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

# Add the parent directory to the path so we can import our app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.core.config import settings


async def export_openapi_schema(output_dir: Path) -> Dict[str, Any]:
    """Export OpenAPI schema to JSON file."""
    schema = app.openapi()
    
    # Update version and metadata
    schema["info"]["version"] = settings.VERSION
    schema["info"]["description"] = (
        "OpsSight DevOps Platform API - Comprehensive DevOps automation, "
        "monitoring, and team collaboration platform with real-time updates."
    )
    schema["info"]["contact"] = {
        "name": "OpsSight Support",
        "email": "support@opsight.dev"
    }
    schema["info"]["license"] = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
    
    # Add servers
    schema["servers"] = [
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.opsight.dev",
            "description": "Production server"
        }
    ]
    
    # Save schema
    schema_file = output_dir / "openapi.json"
    with open(schema_file, "w") as f:
        json.dump(schema, f, indent=2)
    
    print(f"✅ OpenAPI schema exported to: {schema_file}")
    return schema


def generate_postman_collection(schema: Dict[str, Any], output_dir: Path):
    """Generate Postman collection from OpenAPI schema."""
    try:
        import openapi_to_postman
        
        collection = {
            "info": {
                "name": "OpsSight API",
                "description": schema["info"]["description"],
                "version": schema["info"]["version"],
                "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            "item": []
        }
        
        # Basic collection structure (simplified)
        for path, methods in schema.get("paths", {}).items():
            for method, details in methods.items():
                if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    item = {
                        "name": details.get("summary", f"{method.upper()} {path}"),
                        "request": {
                            "method": method.upper(),
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                },
                                {
                                    "key": "Authorization",
                                    "value": "Bearer {{access_token}}"
                                }
                            ],
                            "url": {
                                "raw": "{{base_url}}" + path,
                                "host": ["{{base_url}}"],
                                "path": path.strip("/").split("/")
                            }
                        }
                    }
                    collection["item"].append(item)
        
        collection_file = output_dir / "postman_collection.json"
        with open(collection_file, "w") as f:
            json.dump(collection, f, indent=2)
        
        print(f"✅ Postman collection generated: {collection_file}")
        
    except ImportError:
        print("⚠️  Skipping Postman collection (openapi-to-postman not installed)")


def generate_changelog(output_dir: Path):
    """Generate API changelog from git commits."""
    try:
        # Get recent API-related commits
        result = subprocess.run([
            "git", "log", "--oneline", "--grep=api", "--grep=endpoint", 
            "--grep=swagger", "--grep=docs", "-i", "--since=30 days ago"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        if result.returncode == 0 and result.stdout.strip():
            changelog_file = output_dir / "CHANGELOG.md"
            with open(changelog_file, "w") as f:
                f.write("# API Changelog\n\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write("## Recent API Changes (Last 30 days)\n\n")
                
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        commit_hash, *message = line.split(' ', 1)
                        if message:
                            f.write(f"- `{commit_hash}` {message[0]}\n")
            
            print(f"✅ API changelog generated: {changelog_file}")
        else:
            print("ℹ️  No recent API changes found")
            
    except subprocess.CalledProcessError:
        print("⚠️  Could not generate changelog (git not available)")


def update_readme(output_dir: Path, schema: Dict[str, Any]):
    """Update or create API README with current information."""
    readme_file = output_dir / "README.md"
    
    with open(readme_file, "w") as f:
        f.write(f"""# OpsSight API Documentation

Version: {schema['info']['version']}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Overview

{schema['info']['description']}

## Quick Start

### Development Server
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/api/v1/openapi.json

### Authentication
All protected endpoints require a Bearer token:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/me
```

## Available Documentation

- `openapi.json` - Complete OpenAPI 3.0 specification
- `postman_collection.json` - Postman collection for testing
- `CHANGELOG.md` - Recent API changes

## Endpoints Summary

{len(schema.get('paths', {}))} endpoints across {len(schema.get('tags', []))} categories:

""")
        
        # Add tag summary
        for tag in schema.get('tags', []):
            f.write(f"- **{tag['name']}**: {tag.get('description', 'No description')}\n")
        
        f.write(f"""
## Response Formats

All responses follow a consistent JSON format:
```json
{{
  "status": "success|error",
  "data": {{}},
  "message": "Optional message",
  "timestamp": "2024-12-28T10:30:00Z"
}}
```

## Rate Limiting

- **Authenticated**: 1000 requests per hour
- **Unauthenticated**: 100 requests per hour

## Support

For API support, contact: {schema['info'].get('contact', {}).get('email', 'support@opsight.dev')}
""")
    
    print(f"✅ API README updated: {readme_file}")


async def main():
    """Main documentation generation function."""
    print("🚀 Starting API documentation generation...")
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "docs" / "api"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Export OpenAPI schema
    schema = await export_openapi_schema(output_dir)
    
    # Generate additional documentation
    generate_postman_collection(schema, output_dir)
    generate_changelog(output_dir)
    update_readme(output_dir, schema)
    
    print(f"\n✅ Documentation generation complete!")
    print(f"📁 Output directory: {output_dir}")
    print(f"🌐 View docs at: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())