from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from HAC.models import Payment, Tenent, Owners, JoinRequest, TenantBeds, ApartmentTenantBeds, CommercialTenantBeds, Notification, StayHostelDetails, ApartmentStayDetails, CommericialDetails
from HAC.serializers import PaymentSerializer
from .common_service import CommonService
from .notification_service import NotificationService

class PaymentService:

    @staticmethod
    def get_tenant_payment_details(phone):
        # We try to get from any of the bed tables
        for table in [TenantBeds, ApartmentTenantBeds, CommercialTenantBeds]:
            record = table.objects.filter(phone__iexact=phone).first()
            if record:
                return {
                    "owner_phone": record.owner_phone,
                    "rent": record.rent
                }
        return {"error": "No payment details found"}

    @staticmethod
    def create_payment(data):
        tenant_phone = data.get('tenant_phone', '').strip().lower()
        tenant_name = data.get('tenant_name')
        
        if not tenant_name:
            tenant_obj = CommonService.get_tenant(tenant_phone)
            tenant_name = tenant_obj.name if tenant_obj else (tenant_phone.split('@')[0] if tenant_phone else "Unknown")

        owner_identifier = data.get('owner_phone', '').strip()
        owner = CommonService.get_owner(owner_identifier)
        actual_owner_id = owner.owner_id if owner else owner_identifier

        property_id = None
        property_type = None
        for table, p_type, model in [
            (TenantBeds, 'hostel', StayHostelDetails), 
            (ApartmentTenantBeds, 'apartment', ApartmentStayDetails), 
            (CommercialTenantBeds, 'commercial', CommericialDetails)
        ]:
            tenant_bed = table.objects.filter(phone=tenant_phone).order_by('-id').first()
            if tenant_bed:
                p = model.objects.filter(owner=owner).first()
                if p:
                    property_id = p.id
                    property_type = p_type
                break

        payment = Payment.objects.create(
            tenant_phone=tenant_phone,
            tenant_name=tenant_name,
            owner_phone=actual_owner_id,
            owner=owner,
            owner_name=data.get('owner_name'),
            property_name=data.get('property_name'),
            upi_id=data.get('upi_id'),
            amount=data.get('amount'),
            txn_ref=data.get('txn_ref'),
            status='PENDING',
            property_id=property_id,
            property_type=property_type
        )

        return {"message": "Payment recorded successfully", "txnRef": payment.txn_ref}

    @staticmethod
    def check_payment_status(txn_ref):
        try:
            payment = Payment.objects.get(txn_ref=txn_ref)
            return {"status": payment.status, "amount": payment.amount}
        except Payment.DoesNotExist:
            raise Exception("Payment not found")

    @staticmethod
    @transaction.atomic
    def update_payment_status(data):
        txn_ref = data.get('txn_ref')
        status_value = data.get('status')

        try:
            payment = Payment.objects.get(txn_ref=txn_ref)
            payment.status = status_value
            payment.save()
        except Payment.DoesNotExist:
            if txn_ref and txn_ref.startswith("PEND-"):
                try:
                    req_id = txn_ref.split("-")[1]
                    req = JoinRequest.objects.get(id=req_id)
                    
                    tenant_phone = (req.tenant.phone or "").strip()
                    owner_phone = req.owner.phone
                    rent_amount = 0
                    
                    for table in [TenantBeds, ApartmentTenantBeds, CommercialTenantBeds]:
                        record = table.objects.filter(
                            phone__iexact=tenant_phone,
                            owner_phone__iexact=owner_phone
                        ).order_by('-id').first()
                        if record and record.rent:
                            rent_amount = record.rent
                            break
                    
                    owner = req.owner
                    property_id = None
                    property_type = None
                    for table, p_type, model in [
                        (TenantBeds, 'hostel', StayHostelDetails), 
                        (ApartmentTenantBeds, 'apartment', ApartmentStayDetails), 
                        (CommercialTenantBeds, 'commercial', CommericialDetails)
                    ]:
                        record = table.objects.filter(
                            phone__iexact=tenant_phone,
                            owner_phone__iexact=owner_phone
                        ).order_by('-id').first()
                        if record:
                            p = model.objects.filter(owner=owner).first()
                            if p:
                                property_id = p.id
                                property_type = p_type
                            break

                    payment = Payment.objects.create(
                        tenant_phone=tenant_phone,
                        tenant_name=req.tenant.name or tenant_phone.split('@')[0],
                        owner_phone=owner_phone,
                        owner=owner,
                        owner_name=req.owner.name,
                        property_name=req.property_name,
                        upi_id="",
                        amount=rent_amount,
                        txn_ref=txn_ref,
                        status=status_value,
                        property_id=property_id,
                        property_type=property_type
                    )
                except Exception as ex:
                    raise Exception(f"Could not create payment from virtual record: {str(ex)}")
            else:
                raise Exception("Payment not found")

        if status_value == 'SUCCESS':
            notification = Notification.objects.create(
                recipient_phone=payment.owner_phone,
                title="Rent Payment Received",
                message=f"{payment.tenant_name} has paid rent ₹{payment.amount} successfully.",
                type="PAYMENT",
                related_id=payment.id
            )

            try:
                channel_layer = get_channel_layer()
                sanitized_phone = payment.owner_phone.replace("@", "_").replace(".", "_")
                for group in [f"owner_status_{sanitized_phone}", f"user_notifications_{sanitized_phone}"]:
                    async_to_sync(channel_layer.group_send)(
                        group,
                        {
                            "type": "status_update" if "owner_status" in group else "send_notification",
                            "content": {
                                "id": notification.id,
                                "type": "PAYMENT",
                                "title": notification.title,
                                "message": notification.message,
                                "is_read": notification.is_read,
                                "created_at": notification.created_at.isoformat(),
                                "related_id": payment.id,
                                "amount": payment.amount,
                                "tenant_name": payment.tenant_name
                            }
                        }
                    )
            except Exception:
                pass
                
        if status_value in ['SUCCESS', 'FAILED']:
            try:
                channel_layer = get_channel_layer()
                sanitized_tenant = payment.tenant_phone.replace("+", "").replace("@", "_").replace(".", "_")
                msg_text = f"Your payment for {payment.property_name} has been verified." if status_value == 'SUCCESS' else f"Your payment for {payment.property_name} was declined."
                
                async_to_sync(channel_layer.group_send)(
                    f"user_notifications_{sanitized_tenant}",
                    {
                        "type": "send_notification",
                        "content": {
                            "type": "PAYMENT_VERIFIED",
                            "message": msg_text,
                            "status": status_value
                        }
                    }
                )
            except Exception:
                pass

        return {"message": "Payment status updated"}

    @staticmethod
    def get_owner_payments(phone, request):
        owner = CommonService.get_owner(phone)
        if owner:
            q_filter = Q()
            if owner.owner_id:
                q_filter |= Q(owner_phone__iexact=owner.owner_id)
            if owner.phone:
                q_filter |= Q(owner_phone__iexact=owner.phone)
            if q_filter:
                payments = list(Payment.objects.filter(q_filter).order_by('-created_at'))
            else:
                payments = []
        else:
            payments = list(Payment.objects.filter(owner_phone__iexact=phone).order_by('-created_at'))
        
        # Removed virtual payment generation as requested
        
        for pay in payments:
            if not hasattr(pay, 'floor_number'):
                tenant_phone = getattr(pay, 'tenant_phone', None)
                if tenant_phone:
                    tenant_phone_lc = tenant_phone.lower()
                    record = None
                    for table in [TenantBeds, ApartmentTenantBeds, CommercialTenantBeds]:
                        record = table.objects.filter(phone__iexact=tenant_phone_lc).order_by('-id').first()
                        if record:
                            break
                    if record:
                        if isinstance(record, TenantBeds):
                            pay.floor_number = record.floor
                            pay.room_number = record.roomno
                            pay.bed_number = record.bed
                        elif isinstance(record, ApartmentTenantBeds):
                            pay.floor_number = record.floor
                            pay.room_number = record.flatno
                            pay.bed_number = None
                        elif isinstance(record, CommercialTenantBeds):
                            pay.floor_number = record.floor
                            pay.room_number = record.sectionNo
                            pay.bed_number = None
                
                if not hasattr(pay, 'floor_number'): pay.floor_number = None
                if not hasattr(pay, 'room_number'): pay.room_number = None
                if not hasattr(pay, 'bed_number'): pay.bed_number = None

        serializer = PaymentSerializer(payments, many=True)
        response_data = [dict(item) for item in serializer.data]
        
        for i, p_data in enumerate(response_data):
            p_data['floor_number'] = getattr(payments[i], 'floor_number', None)
            p_data['room_number'] = getattr(payments[i], 'room_number', None)
            p_data['bed_number'] = getattr(payments[i], 'bed_number', None)
        
        for p_data in response_data:
            payment_obj = Payment.objects.filter(txn_ref=p_data.get('txn_ref')).first()
            if payment_obj and payment_obj.payment_screenshot:
                try:
                    p_data['payment_screenshot'] = request.build_absolute_uri(payment_obj.payment_screenshot.url)
                    continue
                except Exception:
                    p_data['payment_screenshot'] = None

            if p_data.get('txn_ref') and (p_data.get('txn_ref').startswith('CASH-') or p_data.get('txn_ref').startswith('PEND-')):
                p_data['payment_screenshot'] = None
                continue

            tenant_phone = p_data.get('tenant_phone')
            if not tenant_phone:
                continue
                
            screenshot_url = None
            for table in [TenantBeds, ApartmentTenantBeds, CommercialTenantBeds]:
                owner_val = owner.owner_id if owner else phone
                owner_phone_val = owner.phone if owner else phone
                
                q_owner = Q()
                if owner_val:
                    q_owner |= Q(owner_phone__iexact=owner_val)
                if owner_phone_val:
                    q_owner |= Q(owner_phone__iexact=owner_phone_val)
                    
                record = table.objects.filter(phone__iexact=tenant_phone).filter(q_owner).order_by('-id').first()
                if record and record.payment_screenshot:
                    try:
                        screenshot_url = request.build_absolute_uri(record.payment_screenshot.url)
                        break
                    except Exception:
                        pass
            
            p_data['payment_screenshot'] = screenshot_url

        return response_data

    @staticmethod
    @transaction.atomic
    def upload_payment_screenshot(data, files, request):
        phone = data.get('phone', '').strip().lower()
        screenshot = files.get('payment_screenshot')
        txn_ref = data.get('txn_ref')

        if not phone:
            raise ValueError("phone is required")
        if not screenshot:
            raise ValueError("Screenshot is required")

        payment = None
        if txn_ref:
            payment = Payment.objects.filter(txn_ref=txn_ref).first()
        
        if not payment:
            payment = Payment.objects.filter(tenant_phone__iexact=phone, status='PENDING').order_by('-created_at').first()

        if not payment:
            tenant_obj = CommonService.get_tenant(phone)
            if tenant_obj:
                # Only create payment for active (joined) tenants
                latest_req = JoinRequest.objects.filter(
                    tenant=tenant_obj,
                    status__in=['joined', 'completed']
                ).order_by('-created_at').first()
                if latest_req:
                    payment = Payment.objects.create(
                        tenant_phone=phone,
                        tenant_name=tenant_obj.name,
                        owner_phone=latest_req.owner.owner_id,
                        owner_name=latest_req.owner.name,
                        property_name=latest_req.property_name,
                        amount=data.get('amount', 0),
                        txn_ref=txn_ref or f"PROOF-{int(timezone.now().timestamp())}",
                        status='PENDING'
                    )
                else:
                    allotment = None
                    prop_type = None
                    allotment = TenantBeds.objects.filter(phone__iexact=phone).first()
                    if allotment: prop_type = "hostel"
                    else:
                        allotment = ApartmentTenantBeds.objects.filter(phone__iexact=phone).first()
                        if allotment: prop_type = "apartment"
                        else:
                            allotment = CommercialTenantBeds.objects.filter(phone__iexact=phone).first()
                            if allotment: prop_type = "commercial"
                    if allotment:
                        owner_val = allotment.owner_phone
                        owner = CommonService.get_owner(owner_val)
                        if owner:
                            property_name = "Property"
                            if prop_type == "hostel":
                                h = StayHostelDetails.objects.filter(owner=owner).first()
                                if h: property_name = h.hostelName
                            elif prop_type == "apartment":
                                a = ApartmentStayDetails.objects.filter(owner=owner).first()
                                if a: property_name = a.apartmentName
                            elif prop_type == "commercial":
                                c = CommericialDetails.objects.filter(owner=owner).first()
                                if c: property_name = c.commercialName
                            payment = Payment.objects.create(
                                tenant_phone=phone,
                                tenant_name=tenant_obj.name,
                                owner_phone=owner.owner_id,
                                owner_name=owner.name,
                                property_name=property_name,
                                amount=data.get('amount', allotment.rent),
                                txn_ref=txn_ref or f"PROOF-{int(timezone.now().timestamp())}",
                                status='PENDING'
                            )

        if payment:
            payment.payment_screenshot = screenshot
            if data.get('amount'):
                payment.amount = data.get('amount')
            payment.save()
            
            for table in [TenantBeds, ApartmentTenantBeds, CommercialTenantBeds]:
                table.objects.filter(phone__iexact=phone).update(payment_screenshot=screenshot)

            owner_phone = payment.owner_phone
            notification = Notification.objects.create(
                recipient_phone=owner_phone,
                title="Payment Screenshot Uploaded",
                message=f"{payment.tenant_name} has uploaded a payment screenshot for ₹{payment.amount}.",
                type="PAYMENT",
                related_id=payment.id
            )

            owner = CommonService.get_owner(owner_phone)
            tenant = CommonService.get_tenant(phone)

            if owner and owner.push_token:
                NotificationService.send_push_notification(owner.push_token, "Payment Uploaded 💰", f"{tenant.name if tenant else 'Tenant'} uploaded payment proof of ₹{payment.amount}")

            try:
                channel_layer = get_channel_layer()
                sanitized_phone = owner.owner_id if owner and owner.owner_id else owner_phone.replace("@", "_").replace(".", "_")
                for group in [f"owner_status_{sanitized_phone}", f"user_notifications_{sanitized_phone}"]:
                    async_to_sync(channel_layer.group_send)(
                        group,
                        {
                            "type": "status_update" if "owner_status" in group else "send_notification",
                            "content": {
                                "id": notification.id,
                                "type": "PAYMENT",
                                "title": notification.title,
                                "message": notification.message,
                                "is_read": notification.is_read,
                                "created_at": notification.created_at.isoformat(),
                                "related_id": payment.id
                            }
                        }
                    )
            except Exception:
                pass

            return {
                "message": "Screenshot uploaded and payment record updated",
                "image_url": request.build_absolute_uri(payment.payment_screenshot.url),
                "txn_ref": payment.txn_ref
            }
        
        raise ValueError("No active request found to attach payment to.")

    @staticmethod
    @transaction.atomic
    def cash_payment(data):
        phone = data.get('phone', '').strip().lower()
        amount = data.get('amount')
        property_name = data.get('propertyName')
        description = data.get('description', '')

        if not phone:
            raise ValueError("phone is required")

        current_month = timezone.now().month
        current_year = timezone.now().year
        
        existing_payment = Payment.objects.filter(
            tenant_phone__iexact=phone,
            status='SUCCESS',
            created_at__year=current_year,
            created_at__month=current_month
        ).exists()

        if existing_payment:
            raise ValueError("A payment for this month is already completed.")

        payment = Payment.objects.filter(tenant_phone__iexact=phone, status='PENDING').order_by('-created_at').first()

        if not payment:
            tenant_obj = CommonService.get_tenant(phone)
            if not tenant_obj:
                raise Exception("Tenant not found")

            # Only allow cash payment for active (joined) tenants
            latest_req = JoinRequest.objects.filter(
                tenant__phone__iexact=phone,
                status__in=['joined', 'completed']
            ).order_by('-id').first()
            if not latest_req:
                raise Exception("No active property found for this tenant. Please complete the joining process first.")

            payment = Payment.objects.create(
                tenant_phone=phone,
                tenant_name=tenant_obj.name or phone.split('@')[0],
                owner_phone=latest_req.owner.owner_id,
                owner_name=latest_req.owner.name,
                property_name=latest_req.property_name,
                amount=amount or 0,
                txn_ref=f"CASH-{int(timezone.now().timestamp())}",
                status='PENDING'
            )
        
        for table in [TenantBeds, ApartmentTenantBeds, CommercialTenantBeds]:
            table.objects.filter(phone__iexact=phone).update(payment_screenshot=None)

        if payment:
            payment.payment_screenshot = None
            if amount:
                payment.amount = amount
            if not payment.txn_ref.startswith('CASH-'):
                payment.txn_ref = f"CASH-{int(timezone.now().timestamp())}"
            payment.save()

            owner_phone = payment.owner_phone
            notification = Notification.objects.create(
                recipient_phone=owner_phone,
                title="Cash Payment Requested",
                message=f"{payment.tenant_name} has requested to pay ₹{payment.amount} in cash.",
                type="PAYMENT",
                related_id=payment.id
            )

            owner = CommonService.get_owner(owner_phone)
            tenant = CommonService.get_tenant(phone)

            if owner and owner.push_token:
                NotificationService.send_push_notification(owner.push_token, "Cash Payment Reported 💵", f"{tenant.name if tenant else 'Tenant'} reported cash payment of ₹{payment.amount}")

            try:
                channel_layer = get_channel_layer()
                sanitized_phone = owner.owner_id if owner and owner.owner_id else owner_phone.replace("@", "_").replace(".", "_")
                for group in [f"owner_status_{sanitized_phone}", f"user_notifications_{sanitized_phone}"]:
                    async_to_sync(channel_layer.group_send)(
                        group,
                        {
                            "type": "status_update" if "owner_status" in group else "send_notification",
                            "content": {
                                "id": notification.id,
                                "type": "PAYMENT",
                                "title": notification.title,
                                "message": notification.message,
                                "is_read": notification.is_read,
                                "created_at": notification.created_at.isoformat(),
                                "related_id": payment.id
                            }
                        }
                    )
            except Exception:
                pass

        return {"message": "Cash payment confirmation sent"}

    @staticmethod
    def get_tenant_payment_history(phone, request):
        payments = Payment.objects.filter(tenant_phone__iexact=phone).order_by('-created_at')
        serializer = PaymentSerializer(payments, many=True)
        response_data = serializer.data

        for p_data in response_data:
            payment_obj = Payment.objects.filter(txn_ref=p_data.get('txn_ref')).first()
            if payment_obj and payment_obj.payment_screenshot:
                try:
                    p_data['payment_screenshot'] = request.build_absolute_uri(payment_obj.payment_screenshot.url)
                except Exception:
                    p_data['payment_screenshot'] = None
            else:
                p_data['payment_screenshot'] = None

        return response_data
