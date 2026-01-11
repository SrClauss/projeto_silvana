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

async def enviar_produto_condicional_cliente(condicional_id: str, produto_id: str, quantidade: int):
    """
    Envia um produto como condicional para cliente.
    Marca itens no produto com condicional_cliente_id.
    """
    condicional = await get_condicional_cliente_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    if not condicional.get("ativa"):
        return {"error": "Condicional não está ativa"}
    
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return {"error": "Produto não encontrado"}
    
    # Verifica se há estoque disponível (não em condicional)
    itens_disponiveis = [
        item for item in produto.get("itens", [])
        if not item.get("condicional_fornecedor_id") and not item.get("condicional_cliente_id")
    ]
    
    estoque_disponivel = sum(item.get("quantity", 0) for item in itens_disponiveis)
    
    if estoque_disponivel < quantidade:
        return {"error": f"Estoque insuficiente. Disponível: {estoque_disponivel}"}
    
    # Marca itens FIFO como condicional de cliente
    itens_ordenados = sorted(
        itens_disponiveis,
        key=lambda x: x.get("acquisition_date", datetime.utcnow())
    )
    
    quantidade_restante = quantidade
    itens_atualizados = list(produto.get("itens", []))
    
    for item in itens_ordenados:
        if quantidade_restante <= 0:
            break
        
        # Encontra o índice do item na lista original
        idx = next(
            (i for i, it in enumerate(itens_atualizados) 
             if it.get("acquisition_date") == item.get("acquisition_date") and
                it.get("quantity") == item.get("quantity") and
                not it.get("condicional_fornecedor_id") and
                not it.get("condicional_cliente_id")),
            None
        )
        
        if idx is None:
            continue
        
        item_quantity = itens_atualizados[idx].get("quantity", 0)
        
        if item_quantity <= quantidade_restante:
            # Marca o item completamente
            itens_atualizados[idx]["condicional_cliente_id"] = condicional_id
            quantidade_restante -= item_quantity
        else:
            # Divide o item
            itens_atualizados[idx]["quantity"] = item_quantity - quantidade_restante
            novo_item = {
                "quantity": quantidade_restante,
                "acquisition_date": itens_atualizados[idx]["acquisition_date"],
                "condicional_fornecedor_id": None,
                "condicional_cliente_id": condicional_id
            }
            itens_atualizados.append(novo_item)
            quantidade_restante = 0
    
    # Atualiza o produto
    await db.produtos.update_one(
        {"_id": produto_id},
        {
            "$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow()},
            "$inc": {"em_condicional": quantidade}
        }
    )
    
    # Atualiza a condicional com o produto se não existir
    produto_existente = next(
        (p for p in condicional.get("produtos", []) if p["produto_id"] == produto_id),
        None
    )
    
    if produto_existente:
        # Incrementa quantidade
        await db.condicional_clientes.update_one(
            {"_id": condicional_id, "produtos.produto_id": produto_id},
            {"$inc": {"produtos.$.quantidade": quantidade}}
        )
    else:
        # Adiciona novo produto
        await db.condicional_clientes.update_one(
            {"_id": condicional_id},
            {"$push": {"produtos": {"produto_id": produto_id, "quantidade": quantidade}}}
        )
    
    return {"success": True, "produto_id": produto_id, "quantidade": quantidade}

async def processar_retorno_condicional_cliente(condicional_id: str, produtos_devolvidos_codigos: list):
    """
    Processa o retorno de produtos de uma condicional de cliente.
    produtos_devolvidos_codigos: lista de códigos internos dos produtos devolvidos
    O que não foi devolvido é considerado vendido.
    """
    condicional = await get_condicional_cliente_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    if not condicional.get("ativa"):
        return {"error": "Condicional já foi processada"}
    
    vendas_criadas = []
    devolucoes_processadas = []
    
    # Conta ocorrências de códigos devolvidos para melhor performance
    from collections import Counter
    codigos_devolvidos_count = Counter(produtos_devolvidos_codigos)
    
    # Para cada produto na condicional
    for prod_qty in condicional.get("produtos", []):
        produto_id = prod_qty["produto_id"]
        quantidade_enviada = prod_qty["quantidade"]
        
        # Busca o produto
        produto = await db.produtos.find_one({"_id": produto_id})
        if not produto:
            continue
        
        codigo_interno = produto.get("codigo_interno")
        
        # Conta quantos deste produto foram devolvidos (usando Counter)
        quantidade_devolvida = codigos_devolvidos_count.get(codigo_interno, 0)
        quantidade_vendida = quantidade_enviada - quantidade_devolvida
        
        # Encontra itens deste condicional no produto
        itens_condicional = [
            (i, item) for i, item in enumerate(produto.get("itens", []))
            if item.get("condicional_cliente_id") == condicional_id
        ]
        
        # Processa devoluções - remove marca de condicional
        itens_atualizados = list(produto.get("itens", []))
        quantidade_devolucao_restante = quantidade_devolvida
        
        for idx, item in itens_condicional:
            if quantidade_devolucao_restante <= 0:
                break
            
            item_qty = item.get("quantity", 0)
            
            if item_qty <= quantidade_devolucao_restante:
                # Desmarca completamente
                itens_atualizados[idx]["condicional_cliente_id"] = None
                quantidade_devolucao_restante -= item_qty
            else:
                # Divide o item
                itens_atualizados[idx]["quantity"] = item_qty - quantidade_devolucao_restante
                novo_item = {
                    "quantity": quantidade_devolucao_restante,
                    "acquisition_date": item["acquisition_date"],
                    "condicional_fornecedor_id": item.get("condicional_fornecedor_id"),
                    "condicional_cliente_id": None
                }
                itens_atualizados.append(novo_item)
                quantidade_devolucao_restante = 0
        
        # Processa vendas - remove itens marcados que não foram devolvidos (FIFO)
        quantidade_venda_restante = quantidade_vendida
        
        # Re-encontra itens ainda marcados com este condicional
        itens_para_venda = [
            (i, item) for i, item in enumerate(itens_atualizados)
            if item.get("condicional_cliente_id") == condicional_id
        ]
        
        # Ordena por acquisition_date (FIFO)
        itens_para_venda.sort(key=lambda x: x[1].get("acquisition_date", datetime.utcnow()))
        
        for idx, item in itens_para_venda:
            if quantidade_venda_restante <= 0:
                break
            
            item_qty = item.get("quantity", 0)
            
            if item_qty <= quantidade_venda_restante:
                # Remove completamente
                itens_atualizados[idx] = None  # Marca para remoção
                quantidade_venda_restante -= item_qty
            else:
                # Reduz quantidade
                itens_atualizados[idx]["quantity"] = item_qty - quantidade_venda_restante
                quantidade_venda_restante = 0
        
        # Remove itens marcados como None
        itens_atualizados = [item for item in itens_atualizados if item is not None]
        
        # Atualiza o produto
        await db.produtos.update_one(
            {"_id": produto_id},
            {
                "$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow()},
                "$inc": {"em_condicional": -quantidade_enviada}
            }
        )
        
        # Cria saída de venda se houve venda
        if quantidade_vendida > 0:
            saida = Saida(
                produtos_id=produto_id,
                cliente_id=condicional.get("cliente_id"),
                quantidade=quantidade_vendida,
                tipo="venda",
                data_saida=datetime.utcnow(),
                observacoes=f"Venda por condicional {condicional_id}"
            )
            result = await db.saidas.insert_one(saida.dict(by_alias=True))
            vendas_criadas.append({
                "saida_id": str(result.inserted_id),
                "produto_id": produto_id,
                "quantidade": quantidade_vendida
            })
        
        if quantidade_devolvida > 0:
            devolucoes_processadas.append({
                "produto_id": produto_id,
                "quantidade": quantidade_devolvida
            })
    
    # Encerra a condicional
    await update_condicional_cliente(condicional_id, {
        "data_devolucao": datetime.utcnow(),
        "ativa": False
    })
    
    return {
        "success": True,
        "condicional_id": condicional_id,
        "vendas_criadas": vendas_criadas,
        "devolucoes_processadas": devolucoes_processadas
    }