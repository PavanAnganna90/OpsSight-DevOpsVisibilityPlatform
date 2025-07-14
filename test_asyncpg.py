import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect(user="postgres", password="postgres", database="opsight", host="localhost")
    print("Connected!")
    await conn.close()

asyncio.run(test())
