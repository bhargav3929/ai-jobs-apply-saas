# Run this from backend/ directory:
# source venv/bin/activate
# python tests/test_smtp_timeout.py

import sys
import os
import asyncio
import time
import socket

async def mock_blocking_smtp():
    print("⏳ Starting Blocking SMTP Call (Simulation)...")
    # Simulate a slow network call that blocks
    time.sleep(5) 
    print("✅ Blocking Call Finished")

async def main():
    print("🚀 Testing Event Loop Blocking...")
    
    # Schedule a "heartbeat" task to see if loop is blocked
    async def heartbeat():
        for i in range(10):
            print(f"   💓 Heartbeat {i}")
            await asyncio.sleep(0.5)
            
    task = asyncio.create_task(heartbeat())
    
    # Run the blocking call
    await mock_blocking_smtp()
    
    # If heartbeats stopped printing during the 5s sleep, it confirmed blocking.
    await task

if __name__ == "__main__":
    asyncio.run(main())
