from enum import Enum
from datetime import date, datetime, UTC
from typing import Optional

from pydantic import BaseModel, Field
from backend.models.base import PyObjectId


class DealType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class ProductType(str, Enum):
    GAS = "GAS"
    ELECTRICITY = "ELECTRICITY"
    OIL = "OIL"
    CO2 = "CO2"


class DealBase(BaseModel):
    model_config = {"extra": "allow"}

    deal_type: DealType
    product: ProductType
    delivery_date: date
    amount: float
    volume: float


class DealCreate(DealBase):
    pass


class DealInDB(DealBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {
        "extra": "allow",
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {PyObjectId: str}
    }


class DealPublic(DealBase):
    id: str
    created_at: Optional[datetime] = None
