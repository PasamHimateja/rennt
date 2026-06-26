from django.db import transaction
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from HAC.models import JoinRequest, Tenent, Owners, BlockedTenant, TenantBeds, ApartmentTenantBeds, CommercialTenantBeds
from .common_service import CommonService
from .notification_service import NotificationService

class RequestService:

    @staticmethod
    def update_request_status(data):
        request_id = data.get("id")
        status_value = data.get("status")

        try:
            req = JoinRequest.objects.get(id=request_id)
            req.status = status_value
            req.save()

            if status_value in ['accepted', 'rejected', 'allotted', 'pending_confirmation']:
                sanitized_phone = req.tenant.phone.replace("+", "").replace("@", "_").replace(".", "_")
                message = f"Your request for {req.property_name} has been {status_value}."

                tenant = req.tenant
                if tenant.push_token:
                    if status_value == "accepted":
                        NotificationService.send_push_notification(tenant.push_token, "Request Accepted ✅", f"Your request for {req.property_name} was accepted")
                    elif status_value == "allotted":
                        NotificationService.send_push_notification(tenant.push_token, "Room Allotted 🎉", f"Your room has been allotted in {req.property_name}")
                    elif status_value == "pending_confirmation":
                        NotificationService.send_push_notification(tenant.push_token, "Room Allotted – Action Required 🏠", f"Your room/bed has been allotted in {req.property_name}. Please open the app and confirm to activate your stay.")
                    elif status_value == "rejected":
                        NotificationService.send_push_notification(tenant.push_token, "Request Rejected ❌", f"Your request for {req.property_name} was rejected")

                try:
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f"user_notifications_{sanitized_phone}",
                        {
                            "type": "send_notification",
                            "content": {
                                "type": "status_update",
                                "message": message,
                                "status": status_value
                            }
                        }
                    )
                except Exception:
                    pass

            return {"message": "Status updated"}
        except JoinRequest.DoesNotExist:
            raise Exception("Request not found")

    @staticmethod
    def send_join_request(data):
        tenant_phone = data.get("tenant_phone", "").strip()
        owner_id = data.get("owner_id", "").strip()
        owner_phone = data.get("owner_phone", "").strip()
        property_name = data.get("property_name", "").strip()
        
        lookup_id = owner_id if owner_id else owner_phone
        property_type = data.get("property_type")
        check_in = data.get("check_in")
        sharing = data.get("sharing")
        flat = data.get("flat")
        section = data.get("section")

        if not tenant_phone or not lookup_id:
            raise ValueError("Missing phone fields")

        tenant = CommonService.get_tenant(tenant_phone)
        if not tenant:
            raise Exception("Tenant not found")

        is_blocked = BlockedTenant.objects.filter(tenant=tenant, is_active=True).exists()
        if is_blocked:
            raise ValueError("You are blocked by an owner and cannot book new properties until unblocked.")

        # A tenant is truly active only after they've clicked Join (is_vacant=False
        # AND have a joined/completed request). A pending_confirmation tenant has not
        # yet joined so they are NOT considered active.
        if not tenant.is_vacant:
            has_active_join = JoinRequest.objects.filter(
                tenant=tenant,
                status__in=['joined', 'completed']
            ).exists()
            if has_active_join:
                raise ValueError("You already have an active stay. You must vacate your current property before booking another one.")

        owner = CommonService.get_owner(lookup_id)
        if not owner:
            raise Exception("Owner not found")

        existing = JoinRequest.objects.filter(
            tenant=tenant,
            property_name__iexact=property_name,
            status__in=['pending', 'accepted', 'allotted', 'pending_confirmation']
        ).first()

        if existing:
            return {"message": "You already have an active request for this property", "existing": True}

        JoinRequest.objects.create(
            tenant=tenant,
            owner=owner,
            property_name=property_name,
            property_type=property_type,
            check_in=check_in,
            sharing=sharing,
            flat=flat,
            section=section,
            status="pending"
        )

        tenant.owner = owner
        tenant.save()

        if owner.push_token:
            NotificationService.send_push_notification(owner.push_token, "New Join Request 📩", f"{tenant.name} requested to join your property")

        try:
            channel_layer = get_channel_layer()
            sanitized_phone = owner.owner_id if owner.owner_id else (owner.phone.replace("+", "") if owner else "")
            for group in [f"owner_status_{sanitized_phone}", f"user_notifications_{sanitized_phone}"]:
                async_to_sync(channel_layer.group_send)(
                    group,
                    {
                        "type": "status_update" if "owner_status" in group else "send_notification",
                        "content": {
                            "type": "incoming_request",
                            "message": f"New join request from {tenant.name}",
                            "id": tenant.id,
                            "status": "pending"
                        }
                    }
                )
        except Exception:
            pass

        return {"message": "Request sent successfully", "existing": False}

    @staticmethod
    def owner_requests(phone):
        owner = CommonService.get_owner(phone)
        if not owner:
            raise Exception("Owner not found")

        requests = JoinRequest.objects.filter(owner=owner).order_by('-created_at')
        data = []
        for r in requests:
            data.append({
                "id": r.id,
                "name": r.tenant.name,
                "phone": r.tenant.phone,
                "status": r.status,
                "propertyName": r.property_name,
                "propertyType": r.property_type,
                "checkIn": r.check_in,
                "sharing": r.sharing,
                "flat": r.flat,
                "section": r.section,
                "created_at": r.created_at,
            })
        return data

    @staticmethod
    def tenant_notifications(identifier):
        tenant = Tenent.objects.filter(Q(phone__iexact=identifier.strip()) | Q(name__iexact=identifier.strip())).first()
        if not tenant:
            raise Exception("Tenant not found")

        requests = JoinRequest.objects.filter(tenant=tenant).order_by('-created_at')
        data = []
        for r in requests:
            status_val = r.status
            if tenant.owner and tenant.owner != r.owner:
                if status_val in ['completed', 'accepted', 'allotted', 'joined', 'active']:
                    status_val = 'withdrawn'
            elif tenant.is_vacant:
                if status_val in ['completed', 'joined', 'active']:
                    status_val = 'withdrawn'
            
            data.append({
                "id": f"req_{r.id}",
                "type": "JOIN_REQUEST",
                "propertyName": r.property_name,
                "status": status_val,
                "owner_phone": r.owner.phone if r.owner else None,
                "owner_id": r.owner.owner_id if r.owner and r.owner.owner_id else None,
                "created_at": r.created_at,
            })

        data.sort(key=lambda x: x['created_at'], reverse=True)
        return data

    @staticmethod
    def check_request_status(tenant_phone, owner_phone, property_name):
        tenant = CommonService.get_tenant(tenant_phone.strip())
        if not tenant:
            return {"status": "none", "error": "Tenant not found"}

        owner = CommonService.get_owner(owner_phone.strip())
        if not owner:
            return {"status": "none", "error": "Owner not found"}

        stripped_name = property_name.strip()
        join_req = JoinRequest.objects.filter(
            tenant=tenant,
            owner=owner
        ).filter(
            Q(property_name__iexact=stripped_name) | Q(property_name__icontains=stripped_name)
        ).order_by('-created_at').first()

        if join_req:
            status_val = join_req.status
            if tenant.owner and tenant.owner != owner:
                if status_val in ['completed', 'accepted', 'allotted', 'joined', 'active']:
                    status_val = 'none'
            elif tenant.is_vacant:
                if status_val in ['completed', 'joined', 'active']:
                    status_val = 'none'
            return {"status": status_val}

        return {"status": "none"}

    @staticmethod
    @transaction.atomic
    def withdraw_request(data):
        tenant_phone = (data.get("tenant_phone") or data.get("tenantPhone") or "").strip()
        owner_id = (data.get("owner_id") or "").strip()
        owner_phone = (data.get("owner_phone") or data.get("ownerPhone") or "").strip()
        property_name = (data.get("property_name") or data.get("propertyName") or "").strip()

        lookup_id = owner_id if owner_id else owner_phone

        tenant = CommonService.get_tenant(tenant_phone)
        if not tenant:
            raise Exception("Tenant not found")

        owner = CommonService.get_owner(lookup_id)
        if not owner:
            raise Exception("Owner not found")

        query = JoinRequest.objects.filter(
            tenant=tenant,
            owner=owner,
            status__in=['pending', 'accepted', 'allotted', 'pending_confirmation', 'completed']
        )

        if property_name:
            stripped_name = property_name.strip()
            query = query.filter(
                Q(property_name__iexact=stripped_name) |
                Q(property_name__icontains=stripped_name)
            )

        updated_count = query.update(status='withdrawn')

        deleted_allotments = 0
        deleted_allotments += TenantBeds.objects.filter(phone=tenant_phone, owner_phone=owner_phone).delete()[0]
        deleted_allotments += ApartmentTenantBeds.objects.filter(phone=tenant_phone, owner_phone=owner_phone).delete()[0]
        deleted_allotments += CommercialTenantBeds.objects.filter(phone=tenant_phone, owner_phone=owner_phone).delete()[0]

        has_active = JoinRequest.objects.filter(
            tenant=tenant,
            status__in=['pending', 'accepted', 'allotted', 'pending_confirmation', 'completed']
        ).exists()

        if not has_active:
            tenant.owner = None
            tenant.is_vacant = True
            tenant.save()

        if updated_count > 0:
            try:
                channel_layer = get_channel_layer()
                sanitized_phone = owner_phone.replace("@", "_").replace(".", "_")
                for group in [f"owner_status_{sanitized_phone}", f"user_notifications_{sanitized_phone}"]:
                    async_to_sync(channel_layer.group_send)(
                        group,
                        {
                            "type": "status_update" if "owner_status" in group else "send_notification",
                            "content": {
                                "type": "request_withdrawn",
                                "message": f"{tenant.name} has withdrawn their request",
                                "tenant_phone": tenant_phone,
                                "id": None,
                                "status": "withdrawn"
                            }
                        }
                    )
            except Exception:
                pass
            return {"message": "Request withdrawn successfully", "updated_count": updated_count}
        
        return {"message": "No active request found to withdraw", "updated_count": 0}

    @staticmethod
    @transaction.atomic
    def delete_tenent_request(phone):
        tenantsreq = JoinRequest.objects.filter(tenant__phone=phone)
        tenantsbed = TenantBeds.objects.filter(phone=phone)
        
        if not tenantsreq.exists() and not tenantsbed.exists():
            raise Exception("Tenant not found")
            
        deleted_req_count = tenantsreq.count()
        deleted_bed_count = tenantsbed.count()

        tenantsreq.update(status='withdrawn')
        tenantsbed.delete()

        return {
            "message": "Tenant request(s) withdrawn/deleted successfully",
            "join_requests_withdrawn": deleted_req_count,
            "beds_deleted": deleted_bed_count
        }
