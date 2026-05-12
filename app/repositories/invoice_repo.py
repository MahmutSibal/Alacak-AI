from ..database import get_db
from bson import ObjectId

class FaturaRepo:
    def __init__(self):
        self.collection = get_db().invoices

    async def create(self, doc: dict):
        res = await self.collection.insert_one(doc)
        doc['_id'] = res.inserted_id
        return doc

    async def list_by_customer(self, customer_id: str):
        cursor = self.collection.find({"musteri_id": customer_id})
        return await cursor.to_list(length=100)
