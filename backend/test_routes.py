"""Test script to verify route registration."""
import sys
sys.path.insert(0, '.')

print("Importing assets module...")
from app.api import assets

print(f"Assets router: {assets.router}")
print(f"Number of routes: {len(assets.router.routes)}")

print("\nAll registered routes:")
for route in assets.router.routes:
    print(f"  {route.methods} {route.path} -> {route.endpoint.__name__}")
