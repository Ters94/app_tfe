from fastapi import APIRouter
from backend.services.audit_scheduler import send_monthly_audit_reports
 
router = APIRouter(prefix="/test", tags=["Test"])
 
 
@router.post("/send-audit-email")
def test_send_audit_email():
  
    try:
        send_monthly_audit_reports()
        return {"status": "success", "message": "Emails envoyés — vérifie ta boîte Mailtrap."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
