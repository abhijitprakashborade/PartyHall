from halls.models import PartyHall
from django.contrib.auth import get_user_model
import json

User = get_user_model()
data = {
    "users": [],
    "halls": []
}

for u in User.objects.all():
    data["users"].append({
        "id": str(u.id),
        "email": getattr(u, "email", "N/A"),
        "full_name": getattr(u, "full_name", "N/A"),
        "role": getattr(u, "role", "N/A")
    })

for h in PartyHall.objects.all():
    data["halls"].append({
        "id": str(h.id),
        "name": h.name,
        "partner_id": str(h.partner_id)
    })

print(json.dumps(data, indent=2))
