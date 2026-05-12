from ..database import get_db
from bson import ObjectId

class KullaniciRepo:
    def __init__(self):
        self.collection = get_db().users

    async def create(self, doc: dict):
        res = await self.collection.insert_one(doc)
        doc['_id'] = res.inserted_id
        return doc

    async def get_by_email(self, email: str):
        return await self.collection.find_one({"email": email})

    async def get(self, id: str):
        return await self.collection.find_one({"_id": ObjectId(id)})
