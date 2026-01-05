from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.condicional_cliente import CondicionalCliente
from ..models.saidas import Saida
from datetime import datetime
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para CondicionalCliente
async def create_condicional_cliente(condicional: CondicionalCliente):
    result = await db.condicional_clientes.insert_one(condicional.dict(by_alias=True))
    return result.inserted_id

async def get_condicional_clientes():
    return await db.condicional_clientes.find().to_list(None)

async def get_condicional_cliente_by_id(condicional_id: str):
    return await db.condicional_clientes.find_one({"_id": condicional_id})

async def update_condicional_cliente(condicional_id: str, update_data: dict):
    return await db.condicional_clientes.find_one_and_update(
        {"_id": condicional_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_condicional_cliente(condicional_id: str):
    return await db.condicional_clientes.delete_one({"_id": condicional_id})

# Filtro para condicionais por cliente (ativas)
async def get_condicionais_by_cliente(cliente_id: str):
    return await db.condicional_clientes.find({"cliente_id": cliente_id, "ativa": True}).to_list(None)

# Filtro para condicionais por data (ativas)
async def get_condicionais_by_data(data_inicio: datetime, data_fim: datetime):
    return await db.condicional_clientes.find({
        "data_condicional": {"$gte": data_inicio, "$lte": data_fim},
        "ativa": True
    }).to_list(None)

# Condicionais ativas por range de data de devolução
async def get_condicionais_ativas_por_data_devolucao(data_inicio: datetime, data_fim: datetime):
    return await db.condicional_clientes.find({
        "data_devolucao": {"$gte": data_inicio, "$lte": data_fim},
        "ativa": True
    }).to_list(None)

# Todas as condicionais ativas
async def get_condicionais_ativas():
    return await db.condicional_clientes.find({"ativa": True}).to_list(None)

# Todos os produtos em condicionais ativas
async def get_produtos_em_condicionais_ativas():
    pipeline = [
        {"$match": {"ativa": True}},
        {"$unwind": "$produtos"},
        {"$group": {"_id": "$produtos.produto_id"}},
        {"$lookup": {"from": "produtos", "localField": "_id", "foreignField": "_id", "as": "produto"}},
        {"$unwind": "$produto"},
        {"$replaceRoot": {"newRoot": "$produto"}}
    ]
    return await db.condicional_clientes.aggregate(pipeline).to_list(None)

# Clientes com condicionais
async def get_clientes_com_condicionais():
    pipeline = [
        {"$match": {"ativa": True}},  # Apenas ativas
        {"$group": {"_id": "$cliente_id"}},
        {"$lookup": {"from": "clientes", "localField": "_id", "foreignField": "_id", "as": "cliente"}},
        {"$unwind": "$cliente"},
        {"$replaceRoot": {"newRoot": "$cliente"}}
    ]
    return await db.condicional_clientes.aggregate(pipeline).to_list(None)

# Agregação para CondicionalCliente completa
async def get_condicional_cliente_completa(condicional_id: str):
    pipeline = [
        {"$match": {"_id": condicional_id, "ativa": True}},
        {"$lookup": {"from": "clientes", "localField": "cliente_id", "foreignField": "_id", "as": "cliente"}},
        {"$unwind": {"path": "$cliente", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "produtos", "localField": "produtos.produto_id", "foreignField": "_id", "as": "produtos_completos"}},
        {"$addFields": {
            "produtos": {
                "$map": {
                    "input": "$produtos",
                    "as": "p",
                    "in": {
                        "$mergeObjects": [
                            "$$p",
                            {"produto": {"$arrayElemAt": ["$produtos_completos", {"$indexOfArray": ["$produtos_completos._id", "$$p.produto_id"]}]}}
                        ]
                    }
                }
            }
        }},
        {"$project": {"produtos_completos": 0}}
    ]
    return await db.condicional_clientes.aggregate(pipeline).to_list(None)

# Processar baixa de condicional
async def processar_baixa_condicional(condicional_id: str, produtos_devolvidos: list, modalidade_id: str, impostos_adicionais: list = None):
    condicional = await get_condicional_cliente_by_id(condicional_id)
    if not condicional or not condicional.get("ativa"):
        return None

    # Para cada produto na condicional
    for prod in condicional["produtos"]:
        produto_id = prod["produto_id"]
        quantidade_total = prod["quantidade"]
        devolvido = next((p for p in produtos_devolvidos if p["produto_id"] == produto_id), None)
        quantidade_devolvida = devolvido["quantidade"] if devolvido else 0
        quantidade_vendida = quantidade_total - quantidade_devolvida

        # Atualizar produto.em_condicional
        await db.produtos.update_one(
            {"_id": produto_id},
            {"$inc": {"em_condicional": -quantidade_total}}
        )

        # Se não devolvido totalmente, processar venda
        if quantidade_vendida > 0:
            # Criar saida
            saida = Saida(
                produtos_id=produto_id,
                quantidade=quantidade_vendida,
                tipo="venda"
            )
            saida_result = await db.saidas.insert_one(saida.dict(by_alias=True))
            saida_id = saida_result.inserted_id

            # Processar venda (importar função)
            from .saidas_db import processar_venda
            await processar_venda(str(saida_id), modalidade_id, impostos_adicionais, desconto=0)

    # Atualizar condicional
    await update_condicional_cliente(condicional_id, {
        "data_devolucao": datetime.utcnow(),
        "ativa": False
    })

    return {"status": "baixa processada"}