from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.modalidade_pagamento import ModalidadePagamento
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para ModalidadePagamento
async def create_modalidade_pagamento(modalidade: ModalidadePagamento):
    result = await db.modalidade_pagamento.insert_one(modalidade.dict(by_alias=True))
    return result.inserted_id

async def get_modalidade_pagamentos():
    return await db.modalidade_pagamento.find().to_list(None)

async def get_modalidade_pagamento_by_id(modalidade_id: str):
    return await db.modalidade_pagamento.find_one({"_id": modalidade_id})

async def update_modalidade_pagamento(modalidade_id: str, update_data: dict):
    return await db.modalidade_pagamento.find_one_and_update(
        {"_id": modalidade_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_modalidade_pagamento(modalidade_id: str):
    return await db.modalidade_pagamento.delete_one({"_id": modalidade_id})