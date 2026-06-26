from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from HAC.jwt_utils import jwt_required

from HAC.services.auth_service import AuthService
from HAC.services.dashboard_service import DashboardService
from HAC.services.owner_service import OwnerService, OwnerRegistrationService
from HAC.services.property_service import PropertyService
from HAC.services.layout_service import LayoutService
from HAC.services.tenant_service import TenantService
from HAC.services.bed_service import BedService
from HAC.services.request_service import RequestService
from HAC.services.payment_service import PaymentService
from HAC.services.issue_service import IssueService
from HAC.services.notification_service import NotificationService
from HAC.services.expense_service import ExpenseService

# =====================================================================
# DASHBOARD / HOME ENDPOINTS
# =====================================================================

@api_view(['GET'])
@jwt_required()
def admin_home(request):
    try:
        # Check if logged in user is owner
        role = request.jwt_payload.get('role')
        if role == 'owner':
            owner_obj = request.custom_user
            if owner_obj:
                data = DashboardService.get_owner_dashboard_summary(owner_obj)
                return Response({"data": data}, status=status.HTTP_200_OK)
        data = DashboardService.get_dashboard_summary()
        return Response({"data": data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_all_steps_data(request):
    try:
        result = DashboardService.get_all_steps_data()
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def owner_admin_list(request):
    try:
        data = DashboardService.get_owner_admin_list()
        return Response({"count": len(data), "data": data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_owner_accounts(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = DashboardService.get_owner_accounts(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# AUTHENTICATION / SIGNUP / LOGIN ENDPOINTS
# =====================================================================

@api_view(["POST"])
@transaction.atomic
def register_owner(request):
    try:
        result = OwnerRegistrationService.register(request)
        return Response(result, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Something went wrong", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def register_tenent(request):
    try:
        result = AuthService.register_tenant(request.data)
        return Response(result, status=status.HTTP_201_CREATED)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        return Response({"message": "Validation Error", "errors": errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"message": "Validation Error", "errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def save_push_token(request):
    try:
        result = AuthService.save_push_token(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        if "User not found" in str(e):
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def tenant_login(request):
    try:
        result = AuthService.tenant_login(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        if isinstance(errors, dict):
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        if "phone not registered" in str(e):
            return Response({"error": "phone not registered"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def owner_login(request):
    try:
        result = AuthService.owner_login(request.data)
        if "error" in result:
            status_code = result.get("status", 400)
            return Response({
                "error": result["error"],
                "status": result.get("owner_status"),
                "message": result.get("message")
            }, status=status_code)
        return Response({
            "message": result["message"],
            "token": result["token"]
        }, status=status.HTTP_200_OK)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        if isinstance(errors, dict):
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": errors}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        if "Owner not found" in str(e):
            return Response({"error": "Owner not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def admin_login(request):
    try:
        result = AuthService.admin_login(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def forgot_password(request):
    try:
        result = AuthService.forgot_password(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def reset_password(request, token):
    try:
        result = AuthService.reset_password(token, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def send_otp(request):
    try:
        result = AuthService.send_otp(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def verify_otp(request):
    try:
        result = AuthService.verify_otp(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def check_user(request, phone):
    try:
        result = AuthService.check_user(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def check_owner(request, phone):
    try:
        result = AuthService.check_owner(phone)
        if result.get("status") in ["pending", "suspend"]:
            return Response({"error": result.get("error"), "status": result.get("status")}, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# PROPERTY MANAGEMENT ENDPOINTS
# =====================================================================

@api_view(['GET'])
@jwt_required()
def get_all_property_basic_details(request):
    try:
        data = PropertyService.get_all_property_basic_details()
        return Response({"data": data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_payment_details(request, phone):
    try:
        data = PropertyService.get_payment_details(phone)
        if not data:
            return Response({"error": "No payment details found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_hostel_step3(request, phone):
    try:
        result = PropertyService.get_hostel_step3(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_properties_listing(request):
    try:
        result = PropertyService.get_properties_listing(request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@jwt_required()
def update_building_layout(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = LayoutService.update_building_layout(phone, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Owner not found" in str(e):
            return Response({"error": "Owner not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# OWNER ENDPOINTS
# =====================================================================

@api_view(['POST'])
@jwt_required()
def suspension_reason(request):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            phone = request.data.get("phone")
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = OwnerService.save_suspension_reason(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        if "Owner not found" in str(e) or "DoesNotExist" in type(e).__name__:
            return Response({"error": "Owner not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'DELETE'])
@jwt_required()
def get_suspension_reason(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "DELETE":
            result = OwnerService.clear_suspension_record(phone)
            return Response(result, status=status.HTTP_200_OK)
        result = OwnerService.get_suspension_reason(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Owner not found" in str(e) or "DoesNotExist" in type(e).__name__:
            return Response({"error": "Owner not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@jwt_required()
def owner_profile_update(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = OwnerService.owner_profile_update(phone, request.data, request.FILES, request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Owner not found" in str(e):
            return Response({"message": f"Owner with ID/Phone {phone} not found", "error": "Owner not found"}, status=status.HTTP_404_NOT_FOUND)
        if "Phone already exists" in str(e):
            return Response({"message": "This phone number is already registered with another account.", "error": "Phone already exists"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": f"Update failed: {str(e)}", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@jwt_required()
def get_owner_full_details(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = OwnerService.get_owner_full_details(phone, request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@jwt_required()
def update_owner_status(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = OwnerService.update_owner_status(phone, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Owner not found" in str(e):
            return Response({"error": "Owner not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@jwt_required()
def check_owner_status(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = OwnerService.check_owner_status(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": "Owner not found"}, status=status.HTTP_404_NOT_FOUND)


# =====================================================================
# BEDS / TENANT ASSIGNMENT ENDPOINTS
# =====================================================================

@api_view(['POST'])
@jwt_required()
def registerbeds(request):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            phone = request.data.get('owner_phone')
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.register_beds(request.data, request.FILES)
        return Response(result, status=status.HTTP_201_CREATED)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@jwt_required()
def registerapartmentbeds(request):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            phone = request.data.get('owner_phone')
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.register_apartment_beds(request.data, request.FILES)
        return Response(result, status=status.HTTP_201_CREATED)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@jwt_required()
def registercommercialbeds(request):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            phone = request.data.get('owner_phone')
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.register_commercial_beds(request.data, request.FILES)
        return Response(result, status=status.HTTP_201_CREATED)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@jwt_required()
def get_tenantsbeds(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        data = BedService.get_tenants_beds(phone, request)
        return Response({
            "message": "Tenants fetched successfully",
            "data": data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@jwt_required()
def get_apartmentbeds(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        data = BedService.get_apartment_beds(phone, request)
        return Response({
            "message": "Tenants fetched successfully",
            "data": data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@jwt_required()
def get_commercialbeds(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        data = BedService.get_commercial_beds(phone, request)
        return Response({
            "message": "Tenants fetched successfully",
            "data": data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@jwt_required()
def delete_hostel_tenant(request, id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import TenantBeds
            tenant_bed = TenantBeds.objects.filter(id=id).first()
            if tenant_bed:
                if not owner_obj or (tenant_bed.owner_phone != owner_obj.owner_id and tenant_bed.owner_phone != owner_obj.phone):
                    return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.delete_hostel_tenant(id)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@jwt_required()
def delete_apartment_tenant(request, id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import ApartmentTenantBeds
            tenant_bed = ApartmentTenantBeds.objects.filter(id=id).first()
            if tenant_bed:
                if not owner_obj or (tenant_bed.owner_phone != owner_obj.owner_id and tenant_bed.owner_phone != owner_obj.phone):
                    return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.delete_apartment_tenant(id)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@jwt_required()
def delete_commercial_tenant(request, id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import CommercialTenantBeds
            tenant_bed = CommercialTenantBeds.objects.filter(id=id).first()
            if tenant_bed:
                if not owner_obj or (tenant_bed.owner_phone != owner_obj.owner_id and tenant_bed.owner_phone != owner_obj.phone):
                    return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.delete_commercial_tenant(id)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@jwt_required()
def update_hostel_tenant(request, id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import TenantBeds
            tenant_bed = TenantBeds.objects.filter(id=id).first()
            if tenant_bed:
                if not owner_obj or (tenant_bed.owner_phone != owner_obj.owner_id and tenant_bed.owner_phone != owner_obj.phone):
                    return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.update_hostel_tenant(id, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@jwt_required()
def update_apartment_tenant(request, id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import ApartmentTenantBeds
            tenant_bed = ApartmentTenantBeds.objects.filter(id=id).first()
            if tenant_bed:
                if not owner_obj or (tenant_bed.owner_phone != owner_obj.owner_id and tenant_bed.owner_phone != owner_obj.phone):
                    return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.update_apartment_tenant(id, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@jwt_required()
def update_commercial_tenant(request, id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import CommercialTenantBeds
            tenant_bed = CommercialTenantBeds.objects.filter(id=id).first()
            if tenant_bed:
                if not owner_obj or (tenant_bed.owner_phone != owner_obj.owner_id and tenant_bed.owner_phone != owner_obj.phone):
                    return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = BedService.update_commercial_tenant(id, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        errors = e.args[0] if e.args else str(e)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =====================================================================
# TENANT MANAGEMENT ENDPOINTS
# =====================================================================

@api_view(['GET'])
@jwt_required()
def tenantdetails(request, phone):
    try:
        result = TenantService.get_tenant_details(phone, request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@jwt_required()
def tenant_profile_update(request, phone):
    try:
        result = TenantService.tenant_profile_update(phone, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Tenant not found" in str(e):
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@jwt_required()
def update_status(request):
    try:
        result = TenantService.update_status(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@jwt_required()
def tenant_by_phone(request, phone):
    try:
        result = TenantService.get_tenant_by_phone(phone, request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Tenant not found" in str(e):
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@jwt_required()
def get_owner_tenants(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        data = TenantService.get_owner_tenants(phone)
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_co_residents(request, phone):
    try:
        result = TenantService.get_co_residents(phone)
        return Response({"co_residents": result}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def tenant_submit_verification(request):
    try:
        result = TenantService.tenant_submit_verification(request.data, request.FILES)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def block_tenant(request):
    try:
        result = TenantService.block_tenant(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def unblock_tenant(request):
    try:
        result = TenantService.unblock_tenant(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# JOIN REQUESTS ENDPOINTS
# =====================================================================

@api_view(['POST'])
@jwt_required()
def send_join_request(request):
    try:
        result = RequestService.send_join_request(request.data)
        return Response(result, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def owner_requests(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = RequestService.owner_requests(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def update_request_status(request):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            request_id = request.data.get("id")
            from HAC.models import JoinRequest
            join_req = JoinRequest.objects.filter(id=request_id).first()
            if join_req and join_req.owner != owner_obj:
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = RequestService.update_request_status(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def tenant_notifications(request, identifier):
    try:
        result = RequestService.tenant_notifications(identifier)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def check_request_status(request, tenant_phone, owner_phone, property_name):
    try:
        result = RequestService.check_request_status(tenant_phone, owner_phone, property_name)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def withdraw_request(request):
    try:
        result = RequestService.withdraw_request(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def tenant_join_booking(request):
    """
    Called by the tenant to confirm their allotment.
    Transitions JoinRequest: pending_confirmation → joined
    Creates TenantBeds record and sets tenant.is_vacant = False.
    """
    try:
        result = BedService.tenant_join_booking(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_pending_allotment(request, phone):
    """
    Returns the pending allotment details for a tenant (status=pending_confirmation).
    Used by the tenant app to show room/bed/rent info before they click 'Join'.
    """
    try:
        from HAC.models import JoinRequest, Tenent
        tenant = Tenent.objects.filter(phone=phone).first()
        if not tenant:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)

        join_req = JoinRequest.objects.filter(
            tenant=tenant,
            status='pending_confirmation'
        ).order_by('-created_at').first()

        if not join_req:
            return Response({"pending_allotment": None}, status=status.HTTP_200_OK)

        return Response({
            "pending_allotment": {
                "request_id": join_req.id,
                "property_name": join_req.property_name,
                "property_type": join_req.property_type,
                "owner_name": join_req.owner.name if join_req.owner else None,
                "owner_phone": join_req.owner.phone if join_req.owner else None,
                "bed": join_req.allotted_bed,
                "floor": join_req.allotted_floor,
                "room_no": join_req.allotted_roomno,
                "flat_no": join_req.allotted_flatno,
                "section_no": join_req.allotted_sectionno,
                "rent": str(join_req.allotted_rent) if join_req.allotted_rent else None,
                "check_in": str(join_req.allotted_check_in) if join_req.allotted_check_in else None,
                "check_out": str(join_req.allotted_check_out) if join_req.allotted_check_out else None,
                "status": join_req.status,
                "created_at": join_req.created_at,
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@jwt_required()
def delete_tenent_request(request, phone):
    try:
        result = RequestService.delete_tenent_request(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# PAYMENT ENDPOINTS
# =====================================================================

@api_view(['GET'])
@jwt_required()
def get_tenant_payment_details(request, phone):
    try:
        result = PropertyService.get_payment_details(phone)
        if not result:
            return Response({"error": "No payment details found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"Server Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def create_payment(request):
    try:
        result = PaymentService.create_payment(request.data)
        return Response(result, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def check_payment_status(request, txn_ref):
    try:
        result = PaymentService.check_payment_status(txn_ref)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@jwt_required()
def update_payment_status(request):
    try:
        result = PaymentService.update_payment_status(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_owner_payments(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = PaymentService.get_owner_payments(phone, request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def upload_payment_screenshot(request):
    try:
        result = PaymentService.upload_payment_screenshot(request.data, request.FILES, request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def cash_payment(request):
    try:
        result = PaymentService.cash_payment(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        return Response({"error": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_tenant_payment_history(request, phone):
    try:
        result = PaymentService.get_tenant_payment_history(phone, request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# NOTIFICATION ENDPOINTS
# =====================================================================

@api_view(['POST'])
@jwt_required()
def send_owner_notification(request):
    try:
        result = NotificationService.send_owner_notification(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def send_tenant_notification(request):
    try:
        result = NotificationService.send_tenant_notification(request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def get_notifications(request, phone):
    try:
        result = NotificationService.get_notifications(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()  # Note: The route in urls.py is path('notifications/<int:notification_id>/read/', views.mark_notification_read)
def mark_notification_read(request, notification_id):
    try:
        result = NotificationService.mark_notification_read(notification_id)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def mark_all_notifications_read(request, phone):
    try:
        result = NotificationService.mark_all_notifications_read(phone)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# EXPENSE MANAGEMENT ENDPOINTS
# =====================================================================

@api_view(['GET'])
@jwt_required()
def get_owner_expenses(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = ExpenseService.get_expenses(phone)
        return Response({"expenses": result}, status=status.HTTP_200_OK)
    except Exception as e:
        if "Owner not found" in str(e):
            return Response({"error": "Owner not found"}, status=404)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@jwt_required()
def add_expense(request):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            phone = request.data.get('owner_phone') or request.data.get('owner_email')
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        phone = request.data.get('owner_phone') or request.data.get('owner_email')
        result = ExpenseService.create_expense(phone, request.data, request.FILES)
        return Response(result, status=status.HTTP_201_CREATED)
    except Exception as e:
        if "Owner not found" in str(e):
            return Response({"error": f"Owner not found for phone/id: {request.data.get('owner_phone')}"}, status=404)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# ISSUE / COMPLAINTS ENDPOINTS
# =====================================================================

@api_view(['POST'])
@jwt_required()
def create_issue(request):
    try:
        result = IssueService.create_issue(request.data, request.FILES)
        return Response(result, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        if "Tenant not found" in str(e) or "Owner not found" in str(e):
            return Response({"error": str(e)}, status=404)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def tenant_issues(request, identifier):
    try:
        result = IssueService.tenant_issues(identifier)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@jwt_required()
def owner_issues(request, phone):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            if not owner_obj or (owner_obj.phone != phone and owner_obj.owner_id != phone):
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        search_query = request.GET.get('search')
        result = IssueService.owner_issues(phone, search_query=search_query, request=request)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@jwt_required()
def update_issue_status(request, issue_id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import Issue
            issue = Issue.objects.filter(id=issue_id).first()
            if issue and issue.owner != owner_obj:
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = IssueService.update_issue_status(issue_id, request.data.get('status'))
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@jwt_required()
def update_issue_comment(request, issue_id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import Issue
            issue = Issue.objects.filter(id=issue_id).first()
            if issue and issue.owner != owner_obj:
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        comment = request.data.get('owner_comment') or request.data.get('comment')
        result = IssueService.update_issue_comment(issue_id, comment)
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def test_create_issue(request):
    try:
        result = IssueService.test_create_issue(request.data)
        return Response(result, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@jwt_required()
def delete_issue(request, issue_id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import Issue
            issue = Issue.objects.filter(id=issue_id).first()
            if issue and issue.owner != owner_obj:
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = IssueService.delete_issue(issue_id)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Issue not found" in str(e):
            return Response({"error": "Issue not found"}, status=404)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@jwt_required()
def update_issue(request, id):
    try:
        # Enforce owner isolation
        if request.jwt_payload.get('role') == 'owner':
            owner_obj = request.custom_user
            from HAC.models import Issue
            issue = Issue.objects.filter(id=id).first()
            if issue and issue.owner != owner_obj:
                return Response({"error": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        result = IssueService.update_issue(id, request.data)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        if "Issue not found" in str(e):
            return Response({"error": "Issue not found"}, status=404)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
