import argparse
import random
from datetime import datetime, timedelta, UTC

from pymongo import MongoClient
from bson import ObjectId

import os
from dotenv import load_dotenv
load_dotenv()

class settings:
    MONGO_URI     = os.getenv("MONGO_URI")
    DATABASE_NAME = os.getenv("DATABASE_NAME")

client = MongoClient(settings.MONGO_URI)
db     = client[settings.DATABASE_NAME]


PRODUCTS = {
    "GAS": {
        "portfolios":           ["Gas_BE", "Gas_FR", "Gas_NL"],
        "desks":                ["Gas Trading"],
        "delivery_points":      ["TTF", "PEG", "ZTP", "NCG", "GPL"],
        "transport_corridors":  ["BE-FR", "FR-BE", "NL-BE", "BE-NL", "DE-FR", "EU-MARKET"],
        "quantity_units":       ["MWh"],
        "price_range":          (30, 80),
    },
    "ELECTRICITY": {
        "portfolios":           ["Elec_BE", "Elec_FR", "Elec_NL"],
        "desks":                ["Power Trading"],
        "delivery_points":      ["Elia", "RTE", "TenneT", "EPEX", "Belpex"],
        "transport_corridors":  ["BE-FR", "FR-BE", "NL-BE", "BE-NL", "DE-FR", "EU-MARKET"],
        "quantity_units":       ["MWh"],
        "price_range":          (60, 120),
    },
    "OIL": {
        "portfolios":           ["Oil_BE", "Oil_FR"],
        "desks":                ["Oil Trading"],
        "delivery_points":      ["Rotterdam", "Antwerp", "Le Havre", "Dunkirk"],
        "transport_corridors":  ["BE-FR", "NL-BE", "BE-NL", "EU-MARKET", "DE-FR"],
        "quantity_units":       ["MWh", "bbl"],
        "price_range":          (60, 100),
    },
    "CO2": {
        "portfolios":           ["CO2_BE", "CO2_EU"],
        "desks":                ["Carbon Trading"],
        "delivery_points":      ["EUA Registry", "Brussels", "Luxembourg"],
        "transport_corridors":  ["EU-MARKET", "BE-FR", "NL-BE"],
        "quantity_units":       ["tCO2", "MWh"],
        "price_range":          (40, 90),
    },
}

DEAL_TYPES        = ["BUY", "SELL"]
DIRECTIONS        = ["Long", "Short"]
ENTITIES          = ["ENGIE BE", "ENGIE FR", "ENGIE NL", "ENGIE Global Markets"]
TRADERS           = ["TR001", "TR002", "TR003", "TR004", "TR005", "TR006", "TR007", "TR008"]
COUNTERPARTIES    = ["Shell", "EDF", "RWE", "BP", "Naturgy", "Uniper",
                     "Vattenfall", "Engie Global Markets", "TotalEnergies",
                     "Equinor", "OMV", "E.ON"]
BUSINESS_UNITS    = ["Trading", "Risk", "Operations"]
DELIVERY_TYPES    = ["Physical", "Financial"]
BOOKING_STATUSES  = ["BOOKED", "CONFIRMED", "PENDING"]

# ─── Générateur ──────────────────────────────────────────────────────────────

def generate_deals(count: int) -> list[dict]:
    today   = datetime.now(UTC).replace(tzinfo=None)
    deals   = []
    counter = 100000

    for _ in range(count):
        product_name = random.choice(list(PRODUCTS.keys()))
        cfg          = PRODUCTS[product_name]

        # Dates relatives à today
        trade_offset    = random.randint(-365, 365)   # -12 mois → +12 mois
        trade_date      = today + timedelta(days=trade_offset)
        delivery_date   = trade_date + timedelta(days=random.randint(7, 45))

        price           = round(random.uniform(*cfg["price_range"]), 2)
        volume          = random.randint(500, 3000)
        amount          = round(price * volume, 2)
        margin_cost     = round(random.uniform(100, 800), 2)

        deal = {
            "_id":                ObjectId(),
            "deal_id":            f"DL-{counter}",
            "deal_type":          random.choice(DEAL_TYPES),
            "product":            product_name,
            "portfolio":          random.choice(cfg["portfolios"]),
            "desk":               cfg["desks"][0],
            "trader_code":        random.choice(TRADERS),
            "counterparty_name":  random.choice(COUNTERPARTIES),
            "business_unit":      random.choice(BUSINESS_UNITS),
            "direction":          random.choice(DIRECTIONS),
            "entity":             random.choice(ENTITIES),
            "trade_date":         trade_date.strftime("%Y-%m-%dT00:00:00Z"),
            "delivery_date":      delivery_date.strftime("%Y-%m-%dT00:00:00Z"),
            "volume":             volume,
            "quantity_unit":      random.choice(cfg["quantity_units"]),
            "price":              price,
            "amount":             amount,
            "open_quantity":      random.randint(0, volume),
            "cash":               amount,
            "margin_cost":        margin_cost,
            "total_margin_cost":  round(random.uniform(margin_cost, 1200), 2),
            "delivery_point":     random.choice(cfg["delivery_points"]),
            "delivery_type":      random.choice(DELIVERY_TYPES),
            "transport_corridor": random.choice(cfg["transport_corridors"]),
            "booking_status":     random.choice(BOOKING_STATUSES),
            "currency":           "EUR",
            "created_at":         datetime.now(UTC).replace(tzinfo=None),
        }

        deals.append(deal)
        counter += 1

    return deals



def main():
    parser = argparse.ArgumentParser(description="Seed deals into MongoDB")
    parser.add_argument("--count",  type=int, default=600,  help="Nombre de deals à générer (défaut: 600)")
    parser.add_argument("--append", action="store_true",    help="Ajouter sans supprimer les deals existants")
    args = parser.parse_args()

    if not args.append:
        deleted = db.deals.delete_many({})
        print(f"  {deleted.deleted_count} anciens deals supprimés")

    print(f"  Génération de {args.count} deals (dates : today ± 12 mois)...")
    deals = generate_deals(args.count)

    result = db.deals.insert_many(deals)
    print(f"  {len(result.inserted_ids)} deals insérés dans '{settings.DATABASE_NAME}.deals'")

    today_str = datetime.now(UTC).strftime("%Y-%m-%dT00:00:00Z")
    print("\n Répartition par produit :")
    for product in PRODUCTS:
        count = sum(1 for d in deals if d["product"] == product)
        print(f"   {product:15s} : {count} deals")

    past   = sum(1 for d in deals if d["trade_date"] <  today_str)
    future = sum(1 for d in deals if d["trade_date"] >= today_str)
    print(f"\n trade_date passé  : {past}")
    print(f" trade_date futur  : {future}")
    print(f"\n  Généré le : {datetime.now(UTC).strftime('%d/%m/%Y %H:%M:%S')} UTC")


if __name__ == "__main__":
    main()