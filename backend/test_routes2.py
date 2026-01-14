"""Test script to verify route registration - with path debugging."""
import sys
print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")

sys.path.insert(0, '.')
print(f"\nSys.path: {sys.path}")

print("\nImporting assets module...")
from app.api import assets

print(f"\nAssets module file: {assets.__file__}")
print(f"Assets router: {assets.router}")
print(f"Number of routes: {len(assets.router.routes)}")

print("\nAll registered routes:")
for route in assets.router.routes:
    print(f"  {route.methods} {route.path} -> {route.endpoint.__name__}")

# Check the function source
import inspect
print(f"\nlist_assets source file: {inspect.getfile(assets.list_assets)}")
print(f"\nFirst 10 lines of list_assets source:")
source_lines = inspect.getsourcelines(assets.list_assets)[0][:10]
for i, line in enumerate(source_lines, 1):
    print(f"  {i}: {line.rstrip()}")
