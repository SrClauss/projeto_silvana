from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.condicional_fornecedor import CondicionalFornecedor
from ..models.saidas import Saida
from datetime import datetime
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para CondicionalFornecedor
async def create_condicional_fornecedor(condicional: CondicionalFornecedor):
    result = await db.condicional_fornecedores.insert_one(condicional.dict(by_alias=True))
    return result.inserted_id

async def get_condicional_fornecedores():
    return await db.condicional_fornecedores.find().to_list(None)

async def get_condicional_fornecedor_by_id(condicional_id: str):
    return await db.condicional_fornecedores.find_one({"_id": condicional_id})

async def update_condicional_fornecedor(condicional_id: str, update_data: dict):
    return await db.condicional_fornecedores.find_one_and_update(
        {"_id": condicional_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_condicional_fornecedor(condicional_id: str):
    return await db.condicional_fornecedores.delete_one({"_id": condicional_id})

# Agregação para CondicionalFornecedor completa
async def get_condicional_fornecedor_completa(condicional_id: str):
    pipeline = [
        {"$match": {"_id": condicional_id}},
        {"$lookup": {"from": "marcas_fornecedores", "localField": "fornecedor_id", "foreignField": "_id", "as": "fornecedor"}},
        {"$unwind": {"path": "$fornecedor", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "produtos", "localField": "produtos_id", "foreignField": "_id", "as": "produtos"}}
    ]
    return await db.condicional_fornecedores.aggregate(pipeline).to_list(None)

# Produtos em condicional fornecedor
async def get_produtos_em_condicional_fornecedor():
    pipeline = [
        {"$unwind": "$produtos_id"},
        {"$group": {"_id": "$produtos_id"}},
        {"$lookup": {"from": "produtos", "localField": "_id", "foreignField": "_id", "as": "produto"}},
        {"$unwind": "$produto"},
        {"$replaceRoot": {"newRoot": "$produto"}}
    ]
    return await db.condicional_fornecedores.aggregate(pipeline).to_list(None)

# Processar baixa de condicional fornecedor
async def processar_baixa_condicional_fornecedor(condicional_id: str, produtos_devolvidos: list):
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return None

    total_devolvidos = sum(p.get("quantidade", 0) for p in produtos_devolvidos)
    if total_devolvidos > condicional.get("quantidade_max_devolucao", 0):
        return {"error": "Quantidade de devolução excede o limite máximo"}

    # Aqui poderia processar entradas ou saídas, mas por simplicidade, apenas validar
    # Atualizar status ou algo similar
    await update_condicional_fornecedor(condicional_id, {"status": "baixado"})  # Assumindo campo status

    return {"status": "baixa processada"}

async def adicionar_produto_condicional_fornecedor(condicional_id: str, produto_id: str, quantidade: int):
    """
    Adiciona um produto como condicional de fornecedor.
    Cria items no produto marcados com condicional_fornecedor_id.
    """
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return {"error": "Produto não encontrado"}
    
    # Cria um novo item marcado como condicional de fornecedor
    novo_item = {
        "quantity": quantidade,
        "acquisition_date": datetime.utcnow(),
        "condicional_fornecedor_id": condicional_id,
        "condicional_cliente_id": None
    }
    
    # Adiciona o item ao produto
    await db.produtos.update_one(
        {"_id": produto_id},
        {
            "$push": {"itens": novo_item},
            "$inc": {"em_condicional": quantidade},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Atualiza a lista de produtos no condicional
    if produto_id not in condicional.get("produtos_id", []):
        await db.condicional_fornecedores.update_one(
            {"_id": condicional_id},
            {"$push": {"produtos_id": produto_id}}
        )
    
    return {"success": True, "produto_id": produto_id, "quantidade": quantidade}

async def devolver_itens_condicional_fornecedor(condicional_id: str, produto_id: str, quantidade: int):
    """
    Devolve itens de um condicional de fornecedor.
    Remove os itens do produto e cria uma saída de devolução.
    """
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return {"error": "Produto não encontrado"}
    
    # Encontra itens deste condicional
    itens_condicional = [
        item for item in produto.get("itens", [])
        if item.get("condicional_fornecedor_id") == condicional_id
    ]
    
    quantidade_disponivel = sum(item.get("quantity", 0) for item in itens_condicional)
    
    if quantidade_disponivel < quantidade:
        return {"error": f"Quantidade insuficiente para devolução. Disponível: {quantidade_disponivel}"}
    
    # Verifica limite de devolução
    quantidade_max = condicional.get("quantidade_max_devolucao", 0)
    # Calcula quantos já foram devolvidos
    saidas_devolucao = await db.saidas.find({
        "produtos_id": produto_id,
        "fornecedor_id": condicional.get("fornecedor_id"),
        "tipo": "devolucao"
    }).to_list(None)
    
    total_ja_devolvido = sum(s.get("quantidade", 0) for s in saidas_devolucao)
    
    if total_ja_devolvido + quantidade > quantidade_max:
        return {"error": f"Limite de devolução excedido. Máximo: {quantidade_max}, Já devolvido: {total_ja_devolvido}"}
    
    # Remove itens FIFO do condicional
    itens_ordenados = sorted(
        itens_condicional,
        key=lambda x: x.get("acquisition_date", datetime.utcnow())
    )
    
    quantidade_restante = quantidade
    itens_atualizados = list(produto.get("itens", []))
    
    for item in itens_ordenados:
        if quantidade_restante <= 0:
            break
        
        idx = next(
            (i for i, it in enumerate(itens_atualizados) 
             if it.get("acquisition_date") == item.get("acquisition_date") and
                it.get("condicional_fornecedor_id") == condicional_id),
            None
        )
        
        if idx is None:
            continue
        
        item_quantity = itens_atualizados[idx].get("quantity", 0)
        
        if item_quantity <= quantidade_restante:
            quantidade_restante -= item_quantity
            itens_atualizados.pop(idx)
        else:
            itens_atualizados[idx]["quantity"] = item_quantity - quantidade_restante
            quantidade_restante = 0
    
    # Atualiza o produto
    await db.produtos.update_one(
        {"_id": produto_id},
        {
            "$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow()},
            "$inc": {"em_condicional": -quantidade}
        }
    )
    
    # Cria saída de devolução
    saida = Saida(
        produtos_id=produto_id,
        fornecedor_id=condicional.get("fornecedor_id"),
        quantidade=quantidade,
        tipo="devolucao",
        data_saida=datetime.utcnow(),
        observacoes=f"Devolução de condicional {condicional_id}"
    )
    
    result = await db.saidas.insert_one(saida.dict(by_alias=True))
    
    return {
        "success": True,
        "saida_id": str(result.inserted_id),
        "quantidade_devolvida": quantidade,
        "pode_devolver_ainda": quantidade_max - total_ja_devolvido - quantidade
    }

async def get_status_devolucao_condicional_fornecedor(condicional_id: str, produto_id: str = None):
    """
    Retorna o status de devolução de um condicional fornecedor.
    Mostra quantos itens ainda podem ser devolvidos.
    """
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    quantidade_max = condicional.get("quantidade_max_devolucao", 0)
    
    # Calcula total já devolvido
    query = {
        "fornecedor_id": condicional.get("fornecedor_id"),
        "tipo": "devolucao"
    }
    
    if produto_id:
        query["produtos_id"] = produto_id
    
    saidas_devolucao = await db.saidas.find(query).to_list(None)
    total_devolvido = sum(s.get("quantidade", 0) for s in saidas_devolucao)
    
    # Calcula total em condicional
    total_em_condicional = 0
    for prod_id in condicional.get("produtos_id", []):
        if produto_id and prod_id != produto_id:
            continue
        
        produto = await db.produtos.find_one({"_id": prod_id})
        if produto:
            for item in produto.get("itens", []):
                if item.get("condicional_fornecedor_id") == condicional_id:
                    total_em_condicional += item.get("quantity", 0)
    
    return {
        "condicional_id": condicional_id,
        "quantidade_max_devolucao": quantidade_max,
        "quantidade_devolvida": total_devolvido,
        "quantidade_pode_devolver": quantidade_max - total_devolvido,
        "quantidade_em_condicional": total_em_condicional
    }