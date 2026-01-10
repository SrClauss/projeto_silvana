import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from collections import defaultdict

async def remove_duplicate_tags():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db = client["projeto_silvana"]
    tags = await db.tags.find().to_list(None)
    seen = {}
    duplicates = []
    for tag in tags:
        key = tag.get('descricao_case_insensitive', '').lower()
        if key in seen:
            duplicates.append(tag['_id'])
        else:
            seen[key] = tag['_id']
    
    for dup_id in duplicates:
        await db.tags.delete_one({"_id": dup_id})
        print(f"Removido duplicata: {dup_id}")
    
    print("Duplicatas removidas")

if __name__ == "__main__":
    asyncio.run(remove_duplicate_tags())