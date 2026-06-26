from django.db.models import Q
from HAC.models import Owners, Tenent

class CommonService:
    @staticmethod
    def get_owner(phone):
        if not phone:
            return None
        return Owners.objects.filter(
            Q(owner_id=phone) | Q(phone=phone)
        ).order_by('-created_at').first()
        
    @staticmethod
    def get_tenant(phone):
        if not phone:
            return None
        return Tenent.objects.filter(phone=phone).first()
