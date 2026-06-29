import uuid
import requests
from django.conf import settings
from django.core.mail import send_mail
from HAC.models import Tenent, Owners
from HAC.serializers import TenentSerializer, TenantLoginSerializer, OwnerLoginSerializer
from HAC.jwt_utils import generate_jwt_token
from .common_service import CommonService

class AuthService:

    @staticmethod
    def register_tenant(data):
        data_copy = data.copy()
        phone = data_copy.get("phone") or data_copy.get("phone_number")
        if phone and len(phone) < 10:
            data_copy["phone"] = phone[-10:]
            
        serializer = TenentSerializer(data=data_copy)
        if not serializer.is_valid():
            raise ValueError(serializer.errors)
            
        tenant = serializer.save()
        
        push_token = data.get("push_token")
        if push_token:
            tenant.push_token = push_token
            tenant.save()
            
        token = generate_jwt_token(tenant.id, 'tenant')
        return {
            "message": "Tenent registered successfully",
            "token": token,
            "data": serializer.data
        }

    @staticmethod
    def save_push_token(data):
        phone = data.get("phone")
        role = data.get("role")
        token = data.get("push_token")

        if not phone or not token or not role:
            raise ValueError("Missing parameters")

        user = None
        if role == "owner":
            user = CommonService.get_owner(phone)
        elif role == "tenant":
            user = CommonService.get_tenant(phone)

        if not user:
            raise Exception("User not found")

        user.push_token = token
        user.save()
        return {"message": "Push token saved successfully"}

    @staticmethod
    def tenant_login(data):
        serializer = TenantLoginSerializer(data=data)
        if not serializer.is_valid():
            raise ValueError(serializer.errors)

        phone = serializer.validated_data['phone']
        password = serializer.validated_data['password']

        tenant = CommonService.get_tenant(phone)
        if not tenant:
            raise Exception("phone not registered")

        if tenant.password != password:
            raise ValueError("Invalid Password")

        token = generate_jwt_token(user_id=tenant.id, role='tenant', phone=tenant.phone)
        return {
            "message": "Login Successful",
            "tenant_id": tenant.id,
            "name": tenant.name,
            "phone": tenant.phone,
            "token": token
        }

    @staticmethod
    def owner_login(data):
        serializer = OwnerLoginSerializer(data=data)
        if not serializer.is_valid():
            raise ValueError(serializer.errors)

        phone = serializer.validated_data['phone']
        password = serializer.validated_data['password']

        owners = Owners.objects.filter(phone=phone)
        if not owners.exists():
            raise Exception("Owner not found")

        owner = None
        for o in owners:
            if o.password == password:
                owner = o
                break

        if not owner:
            raise ValueError("Invalid Password")

        if owner.status == "pending":
            return {"status": 401, "error": "Your account is pending approval", "owner_status": owner.status, "message": "Please wait for the admin to approval"}
            
        if owner.status == "suspend":
            return {"status": 403, "error": "Your account is Suspeded", "owner_status": owner.status, "message": "Please contact admin"}

        if owner.status == "active" and owner.password == password:
            token = generate_jwt_token(user_id=owner.pk, role='owner', phone=owner.phone)
            return {"status": 200, "message": "Login Successful", "token": token}

        raise ValueError("Invalid Password")

    @staticmethod
    def admin_login(data):
        phone = data.get('phone')
        password = data.get('password')
        if phone == "admin@stayefy.com" and password == "admin123":
            token = generate_jwt_token(user_id=1, role='admin', phone=phone)
            return {"message": "Login Successful", "token": token}
        raise ValueError("Invalid phone or password")


   

    @staticmethod
    def check_user(phone):
        if phone and len(phone) == 10:
            phone = phone[-10:]
            
        user = CommonService.get_tenant(phone)
        if user:
            token = generate_jwt_token(user_id=user.id, role='tenant', phone=user.phone)
            return {
                "exists": True,
                "token": token,
                "user": {"id": user.id, "name": user.name, "phone": user.phone}
            }
        return {"exists": False, "user": None}

    @staticmethod
    def check_owner(phone):
        if phone and len(phone) == 10:
            phone = phone[-10:]
            
        user = CommonService.get_owner(phone)
        if user:
            token = generate_jwt_token(user_id=user.pk, role='owner', phone=user.phone)
            user_data = {"id": user.pk, "name": user.name, "phone": user.phone}
            
            if user.status == 'pending':
                return {"exists": True, "status": "pending", "error": "Your account is pending approval by admin.", "token": token, "user": user_data}
            elif user.status == 'suspend':
                return {"exists": True, "status": "suspend", "error": "Your account has been suspended by admin.", "token": token, "user": user_data}

            return {"exists": True, "status": user.status, "token": token, "user": user_data}
        return {"exists": False, "user": None}
