from datetime import datetime
from backend.database import db


def create_audit(
    action: str,
    target_type: str,
    current_user: str,
    group_id: str,
    target_id: str,
    target_label: str = None,
    old_values: dict = None,
    new_values: dict = None
):
    db.audits.insert_one({
        "action": action,
        "timestamp": datetime.utcnow(),
        "target_type": target_type,
        "target_id": target_id,
        "target_label": target_label,
        "user_id": current_user,
        "group_id": group_id,
        "old_values": old_values,
        "new_values": new_values
    })