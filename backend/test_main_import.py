"""Test script that mimics main.py imports."""
import sys
sys.path.insert(0, '.')

print("=== TEST MAIN IMPORT ===")

# Do EXACTLY what main.py does
from app.api import auth, users, portfolios, sites, systems, assets, alerts, work_orders, dashboards, reports

print(f"\n!!! MAIN TEST - assets module: {assets}")
print(f"!!! MAIN TEST - assets.__file__: {assets.__file__}")
print(f"!!! MAIN TEST - assets.router: {assets.router}")
print(f"!!! MAIN TEST - assets.router has {len(assets.router.routes)} routes")

print("\nAll asset routes:")
for route in assets.router.routes:
    print(f"  {route.methods} {route.path} -> {route.endpoint.__name__}")
    # Check if the function has HTTPException(501) in its source
    import inspect
    try:
        source = inspect.getsource(route.endpoint)
        if "501" in source:
            print(f"    ^^^ Contains 501 NOT IMPLEMENTED!")
        else:
            print(f"    ^^^ Full implementation")
    except:
        print(f"    (could not inspect source)")
