"""Test script for portfolios routes."""
import sys
sys.path.insert(0, '.')

print("=== TEST PORTFOLIOS IMPORT ===")

from app.api import portfolios

print(f"\n!!! TEST - portfolios module: {portfolios}")
print(f"!!! TEST - portfolios.__file__: {portfolios.__file__}")
print(f"!!! TEST - portfolios.router: {portfolios.router}")
print(f"!!! TEST - portfolios.router has {len(portfolios.router.routes)} routes")

print("\nAll portfolios routes:")
for route in portfolios.router.routes:
    print(f"  {route.methods} {route.path} -> {route.endpoint.__name__}")
    import inspect
    try:
        source = inspect.getsource(route.endpoint)
        if "501" in source:
            print(f"    ^^^ Contains 501 NOT IMPLEMENTED!")
        elif "Not implemented" in source:
            print(f"    ^^^ Contains 'Not implemented'!")
        else:
            print(f"    ^^^ Full implementation")
    except:
        print(f"    (could not inspect source)")
