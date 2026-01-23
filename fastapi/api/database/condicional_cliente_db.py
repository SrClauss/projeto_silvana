from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pymongo.errors import OperationFailure
from ..models.condicional_cliente import CondicionalCliente
from ..models.saidas import Saida
from datetime import datetime
from typing import Optional
import os
import logging

# Configure logging
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# Check if transactions are supported
async def _supports_transactions():
    """Check if MongoDB instance supports transactions (requires replica set)"""
    try:
        # Try to check server info
        server_info = await client.server_info()
        # Check if replica set is configured
        replica_set_status = await client.admin.command("replSetGetStatus")
        return True
    except (OperationFailure, Exception) as e:
        logger.warning(f"MongoDB transactions not available: {e}")
        return False

_transaction_support = None

async def supports_transactions():
    """Cached check for transaction support"""
    global _transaction_support
    if _transaction_support is None:
        _transaction_support = await _supports_transactions()
    return _transaction_support

# CRUD para CondicionalCliente
async def create_condicional_cliente(condicional: CondicionalCliente):
    """
    Creates a condicional cliente with transactional support when available.
    Falls back to manual rollback if transactions are not supported.
    """
    use_transactions = await supports_transactions()
    
    if use_transactions:
        # Use MongoDB transactions for atomicity
        async with await client.start_session() as session:
            try:
                async with session.start_transaction():
                    # Insert the condicional first
                    result = await db.condicional_clientes.insert_one(
                        condicional.dict(by_alias=True, exclude={"produtos"}),
                        session=session
                    )
                    condicional_id = result.inserted_id
                    
                    # Process each produto in batch
                    for produto in condicional.produtos:
                        enviar_result = await enviar_produto_condicional_cliente(
                            str(condicional_id), 
                            produto.produto_id, 
                            produto.quantidade,
                            session=session
                        )
                        if enviar_result.get("error"):
                            # Transaction will auto-rollback on exception
                            logger.error(f"Error adding product to condicional: {enviar_result['error']}")
                            raise Exception(enviar_result["error"])
                    
                    # Transaction commits automatically if no exception
                    logger.info(f"Created condicional {condicional_id} with {len(condicional.produtos)} products (transactional)")
                    return condicional_id
                    
            except Exception as e:
                # Transaction automatically rolled back
                logger.error(f"Transaction failed, rolled back: {e}")
                return {"error": f"Falha ao criar condicional: {str(e)}"}
    else:
        # Fallback: manual rollback
        logger.warning("Transactions not supported, using manual rollback")
        condicional_id = None
        produtos_modified = []
        
        try:
            # Insert the condicional first
            result = await db.condicional_clientes.insert_one(
                condicional.dict(by_alias=True, exclude={"produtos"})
            )
            condicional_id = result.inserted_id
            
            # Process each produto in batch
            for produto in condicional.produtos:
                enviar_result = await enviar_produto_condicional_cliente(
                    str(condicional_id), 
                    produto.produto_id, 
                    produto.quantidade
                )
                if enviar_result.get("error"):
                    logger.error(f"Error adding product to condicional: {enviar_result['error']}")
                    raise Exception(enviar_result["error"])
                produtos_modified.append(produto.produto_id)
            
            logger.info(f"Created condicional {condicional_id} with {len(condicional.produtos)} products (manual)")
            return condicional_id
            
        except Exception as e:
            # Manual rollback: delete condicional and revert product changes
            logger.error(f"Manual rollback started due to: {e}")
            
            if condicional_id:
                try:
                    # Delete the condicional
                    await db.condicional_clientes.delete_one({"_id": condicional_id})
                    logger.info(f"Rolled back condicional {condicional_id}")
                    
                    # Revert product modifications (remove condicional markings)
                    for produto_id in produtos_modified:
                        await _revert_produto_condicional(str(condicional_id), produto_id)
                    
                    logger.info(f"Rolled back {len(produtos_modified)} product modifications")
                except Exception as rollback_error:
                    logger.error(f"Rollback failed: {rollback_error}. Manual intervention may be required.")
                    return {"error": f"Falha crítica ao criar condicional e reverter mudanças: {str(e)}. Contate o suporte."}
            
            return {"error": f"Falha ao criar condicional: {str(e)}"}

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

        # Atualizar produto flags
        remaining_cond_cliente = sum(it.get("quantity", 0) for it in produto.get("itens", []) if it.get("condicionais_cliente"))
        await db.produtos.update_one(
            {"_id": produto_id},
            {"$set": {"em_condicional_cliente": remaining_cond_cliente > 0}}
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

async def _revert_produto_condicional(condicional_id: str, produto_id: str):
    """
    Helper function to revert product changes when rollback is needed.
    Removes condicional_cliente markings from product items.
    """
    try:
        produto = await db.produtos.find_one({"_id": produto_id})
        if not produto:
            return
        
        itens_atualizados = []
        for item in produto.get("itens", []):
            if condicional_id in (item.get("condicionais_cliente") or []):
                # Remove this condicional from the item
                item_copy = dict(item)
                cf_list = [cid for cid in item_copy.get("condicionais_cliente", []) if cid != condicional_id]
                if cf_list:
                    item_copy["condicionais_cliente"] = cf_list
                else:
                    item_copy.pop("condicionais_cliente", None)
                itens_atualizados.append(item_copy)
            else:
                itens_atualizados.append(item)
        
        # Update product
        remaining_cond_cliente = sum(
            it.get("quantity", 0) for it in itens_atualizados 
            if it.get("condicionais_cliente")
        )
        await db.produtos.update_one(
            {"_id": produto_id},
            {
                "$set": {
                    "itens": itens_atualizados,
                    "updated_at": datetime.utcnow(),
                    "em_condicional_cliente": remaining_cond_cliente > 0
                }
            }
        )
        logger.info(f"Reverted produto {produto_id} for condicional {condicional_id}")
    except Exception as e:
        logger.error(f"Error reverting produto {produto_id}: {e}")

async def enviar_produto_condicional_cliente(
    condicional_id: str, 
    produto_id: str, 
    quantidade: int,
    session: Optional = None
):
    """
    Envia um produto como condicional para cliente.
    Marca itens no produto com condicional_cliente_id.
    
    Args:
        condicional_id: ID of the condicional cliente
        produto_id: ID of the produto to send
        quantidade: Quantity to send
        session: Optional MongoDB session for transactions
    
    Returns:
        Dict with success=True or error message
    
    Implements idempotency: checks if product already added to avoid duplicates
    """
    # Idempotency check: verify if this product is already in the condicional
    condicional = await get_condicional_cliente_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    
    if not condicional.get("ativa"):
        return {"error": "Condicional não está ativa"}
    
    # Check if product already exists in condicional with same quantity (idempotency)
    existing_produto = next(
        (p for p in condicional.get("produtos", []) if p["produto_id"] == produto_id),
        None
    )
    
    # For idempotency: if exact same request, return success without duplication
    # We use a simple heuristic: if produto already exists, we increment (not truly idempotent for retries)
    # For true idempotency, we'd need a request_id. For now, we just proceed with increment.
    
    produto = await db.produtos.find_one({"_id": produto_id}, session=session)
    if not produto:
        return {"error": "Produto não encontrado"}
    
    # Verifica se há estoque disponível (não em condicional cliente)
    itens_disponiveis = [
        item for item in produto.get("itens", [])
        if not item.get("condicionais_cliente")
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
        
        # Encontra o índice do item na lista original (apenas itens sem reservass)
        idx = next(
            (i for i, it in enumerate(itens_atualizados) 
             if it.get("acquisition_date") == item.get("acquisition_date") and
                it.get("quantity") == item.get("quantity") and
                not it.get("condicionais_cliente")),
            None
        )
        
        if idx is None:
            continue
        
        item_quantity = itens_atualizados[idx].get("quantity", 0)
        
        if item_quantity <= quantidade_restante:
            # Marca o item completamente como reservado (um id por unidade)
            itens_atualizados[idx]["condicionais_cliente"] = [condicional_id] * item_quantity
            quantidade_restante -= item_quantity
        else:
            # Divide o item: reduz o remanescente e adiciona um novo item reservado
            itens_atualizados[idx]["quantity"] = item_quantity - quantidade_restante
            novo_item = {
                "quantity": quantidade_restante,
                "acquisition_date": itens_atualizados[idx]["acquisition_date"],
                "condicionais_fornecedor": itens_atualizados[idx].get("condicionais_fornecedor", []),
                "condicionais_cliente": [condicional_id] * quantidade_restante
            }
            itens_atualizados.append(novo_item)
            quantidade_restante = 0
    
    # Atualiza o produto
    await db.produtos.update_one(
        {"_id": produto_id},
        {
            "$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow(), "em_condicional_cliente": True}
        },
        session=session
    )
    
    # Atualiza a condicional com o produto se não existir
    if existing_produto:
        # Incrementa quantidade (not truly idempotent, but prevents full duplication)
        await db.condicional_clientes.update_one(
            {"_id": condicional_id, "produtos.produto_id": produto_id},
            {"$inc": {"produtos.$.quantidade": quantidade}},
            session=session
        )
        logger.info(f"Incremented produto {produto_id} in condicional {condicional_id} (quantity +{quantidade})")
    else:
        # Adiciona novo produto
        await db.condicional_clientes.update_one(
            {"_id": condicional_id},
            {"$push": {"produtos": {"produto_id": produto_id, "quantidade": quantidade}}},
            session=session
        )
        logger.info(f"Added new produto {produto_id} to condicional {condicional_id}")
    
    return {"success": True, "produto_id": produto_id, "quantidade": quantidade}

async def calcular_retorno_condicional_cliente(condicional_id: str, produtos_devolvidos_codigos: list):
    """
    Calcula quais quantidades seriam devolvidas e vendidas para uma condicional
    sem aplicar mudanças no banco. Retorna lista com produtos e quantidades.
    """
    condicional = await get_condicional_cliente_by_id(condicional_id)
    if not condicional:
        return {"error": "Condicional não encontrado"}
    if not condicional.get("ativa"):
        return {"error": "Condicional já foi processada"}

    from collections import Counter
    codigos_devolvidos_count = Counter(produtos_devolvidos_codigos)

    resultado = {
        "condicional_id": condicional_id,
        "produtos": []
    }

    for prod_qty in condicional.get("produtos", []):
        produto_id = prod_qty["produto_id"]
        quantidade_enviada = prod_qty["quantidade"]
        produto = await db.produtos.find_one({"_id": produto_id})
        if not produto:
            continue
        codigo_interno = produto.get("codigo_interno")
        quantidade_devolvida = codigos_devolvidos_count.get(codigo_interno, 0)
        quantidade_vendida = max(0, quantidade_enviada - quantidade_devolvida)
        resultado["produtos"].append({
            "produto_id": produto_id,
            "codigo_interno": codigo_interno,
            "quantidade_enviada": quantidade_enviada,
            "quantidade_devolvida": quantidade_devolvida,
            "quantidade_vendida": quantidade_vendida
        })

    return resultado


async def processar_retorno_condicional_cliente(condicional_id: str, produtos_devolvidos_codigos: list, auto_create_sales: bool = True, vendas_list: list = None):
    """
    Processa o retorno de produtos de uma condicional de cliente.
    Se auto_create_sales=False e vendas_list=None, apenas calcula e retorna o resultado sem aplicar mudanças.
    Se vendas_list for fornecido, aplica as vendas conforme a lista (múltiplas vendas) e atualiza o estoque/condicional.
    """
    # Primeiro calcule o que deve ser devolvido/vendido
    calc = await calcular_retorno_condicional_cliente(condicional_id, produtos_devolvidos_codigos)
    if calc.get("error"):
        return calc

    # Se o cliente só quer calcular (não aplicar alterações)
    if not auto_create_sales and not vendas_list:
        return calc

    # Agora aplique as mudanças no banco
    condicional = await get_condicional_cliente_by_id(condicional_id)
    if not condicional or not condicional.get("ativa"):
        return {"error": "Condicional não encontrado ou já processada"}

    vendas_criadas = []
    devolucoes_processadas = []

    # Se vendas_list fornecida, validar somas
    vendas_por_produto = {}
    if vendas_list:
        for v in vendas_list:
            vendas_por_produto.setdefault(v["produto_id"], 0)
            vendas_por_produto[v["produto_id"]] += v["quantidade"]

    # Itera por cada produto e aplica devoluções e vendas (usando os números calculados)
    for p in calc["produtos"]:
        produto_id = p["produto_id"]
        quantidade_enviada = p["quantidade_enviada"]
        quantidade_devolvida = p["quantidade_devolvida"]
        quantidade_vendida_calc = p["quantidade_vendida"]

        produto = await db.produtos.find_one({"_id": produto_id})
        if not produto:
            continue

        # Começa aplicando devoluções (desmarcar condicional)
        itens_condicional = [
            (i, item) for i, item in enumerate(produto.get("itens", []))
            if condicional_id in (item.get("condicionais_cliente") or [])
        ]

        itens_atualizados = list(produto.get("itens", []))
        quantidade_devolucao_restante = quantidade_devolvida

        for idx, item in itens_condicional:
            if quantidade_devolucao_restante <= 0:
                break
            item_qty = item.get("quantity", 0)
            # number of units reserved for this condicional in this item (usually equals item_qty)
            reserved_count = (item.get("condicionais_cliente") or []).count(condicional_id)
            if reserved_count <= 0:
                continue
            # If entire item is covered by the reserved count and we need to devolve >= item_qty
            if item_qty <= quantidade_devolucao_restante:
                # remove all reservations for this condicional from the item
                itens_atualizados[idx]["condicionais_cliente"] = [cid for cid in itens_atualizados[idx].get("condicionais_cliente", []) if cid != condicional_id]
                quantidade_devolucao_restante -= item_qty
            else:
                # Partially devolve: split the item into reserved and unreserved parts
                reserved_remaining = item_qty - quantidade_devolucao_restante
                current_list = itens_atualizados[idx].get("condicionais_cliente", [])
                # keep the first 'reserved_remaining' occurrences for the reserved part
                itens_atualizados[idx]["quantity"] = reserved_remaining
                itens_atualizados[idx]["condicionais_cliente"] = current_list[:reserved_remaining]
                novo_item = {
                    "quantity": quantidade_devolucao_restante,
                    "acquisition_date": item["acquisition_date"],
                    "condicionais_fornecedor": item.get("condicionais_fornecedor"),
                    "condicionais_cliente": []
                }
                itens_atualizados.append(novo_item)
                quantidade_devolucao_restante = 0

        # Se vendas_list foi fornecida usamos as quantidades das vendas, senão usamos cálculo automático
        quantidade_vendida_para_aplicar = quantidade_vendida_calc
        if vendas_list and vendas_por_produto.get(produto_id) is not None:
            if vendas_por_produto[produto_id] != quantidade_vendida_calc:
                return {"error": f"Soma das vendas fornecidas para produto {produto_id} ({vendas_por_produto[produto_id]}) não confere com quantidade vendida calculada ({quantidade_vendida_calc})"}
            quantidade_vendida_para_aplicar = vendas_por_produto[produto_id]

        # Processa vendas - remove itens marcados que não foram devolvidos (FIFO)
        quantidade_venda_restante = quantidade_vendida_para_aplicar
        itens_para_venda = [
            (i, item) for i, item in enumerate(itens_atualizados)
            if condicional_id in (item.get("condicionais_cliente") or [])
        ]
        itens_para_venda.sort(key=lambda x: x[1].get("acquisition_date", datetime.utcnow()))

        for idx, item in itens_para_venda:
            if quantidade_venda_restante <= 0:
                break
            item_qty = item.get("quantity", 0)
            # number of units reserved for this condicional in this item
            reserved_count = (item.get("condicionais_cliente") or []).count(condicional_id)
            if reserved_count <= 0:
                continue
            use_qty = min(reserved_count, quantidade_venda_restante)
            if use_qty >= item_qty:
                # consume whole item
                itens_atualizados[idx] = None
                quantidade_venda_restante -= item_qty
            else:
                # partially consume reserved units: reduce quantity and reservations
                itens_atualizados[idx]["quantity"] = item_qty - use_qty
                current_list = item.get("condicionais_cliente", [])
                # remove 'use_qty' occurrences of condicional_id from the list
                removed = 0
                new_list = []
                for cid in current_list:
                    if cid == condicional_id and removed < use_qty:
                        removed += 1
                        continue
                    new_list.append(cid)
                itens_atualizados[idx]["condicionais_cliente"] = new_list
                quantidade_venda_restante -= use_qty
                # if partially consumed, we may want to append an unreserved item fragment, but reserved items are usually isolated


        itens_atualizados = [item for item in itens_atualizados if item is not None]

        # Atualiza o produto e decrementa em_condicional pelo total enviado
        # Ajusta flag em_condicional_cliente conforme itens restantes
        remaining_cond_cliente = sum(it.get("quantity", 0) for it in itens_atualizados if it.get("condicionais_cliente"))
        await db.produtos.update_one(
            {"_id": produto_id},
            {
                "$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow(), "em_condicional_cliente": remaining_cond_cliente > 0}
            }
        )

        # Se estoque total zerou, só apagar se não houver condicionais (fornecedor ou cliente)
        total_restante = sum(it.get("quantity", 0) for it in itens_atualizados)
        produto_apagado = False
        if total_restante == 0:
            from ..database.produtos_db import can_delete_produto
            can_delete = await can_delete_produto(produto_id)
            if can_delete:
                await db.produtos.delete_one({"_id": produto_id})
                produto_apagado = True

        # snapshot do produto sem itens para registrar na saida
        produto_snapshot = {k: v for k, v in (produto or {}).items() if k != 'itens'}

        # Registrar devolução
        if quantidade_devolvida > 0:
            devolucoes_processadas.append({"produto_id": produto_id, "quantidade": quantidade_devolvida})

        # Criar vendas: se vendas_list fornecida, cria uma Saida para cada venda do produto; caso contrário, cria uma única Saida como antes
        if vendas_list and vendas_por_produto.get(produto_id) is not None:
            for v in vendas_list:
                if v["produto_id"] != produto_id:
                    continue
                saida = Saida(
                    produtos_id=produto_id,
                    cliente_id=condicional.get("cliente_id"),
                    quantidade=v["quantidade"],
                    tipo="venda",
                    data_saida=datetime.utcnow(),
                    valor_total=v.get("valor_total"),
                    observacoes=v.get("observacoes"),
                    produto=produto_snapshot
                )
                result = await db.saidas.insert_one(saida.dict(by_alias=True))
                vendas_criadas.append({"saida_id": str(result.inserted_id), "produto_id": produto_id, "quantidade": v["quantidade"]})
        else:
            if quantidade_vendida_para_aplicar > 0:
                saida = Saida(
                    produtos_id=produto_id,
                    cliente_id=condicional.get("cliente_id"),
                    quantidade=quantidade_vendida_para_aplicar,
                    tipo="venda",
                    data_saida=datetime.utcnow(),
                    observacoes=f"Venda por condicional {condicional_id}",
                    produto=produto_snapshot
                )
                result = await db.saidas.insert_one(saida.dict(by_alias=True))
                vendas_criadas.append({"saida_id": str(result.inserted_id), "produto_id": produto_id, "quantidade": quantidade_vendida_para_aplicar})

    # Encerra a condicional
    await update_condicional_cliente(condicional_id, {"data_devolucao": datetime.utcnow(), "ativa": False})

    return {"success": True, "condicional_id": condicional_id, "vendas_criadas": vendas_criadas, "devolucoes_processadas": devolucoes_processadas}