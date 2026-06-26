from rest_framework import serializers
from .models import (
    Owners,
    StayHostelDetails,
    ApartmentStayDetails,
    CommericialDetails,
    BankDetails,
    HostelFloorRoom,
    ApartmentFloorUnit,
    CommercialFloor,
    Tenent,
    TenantBeds,ApartmentTenantBeds,CommercialTenantBeds,JoinRequest,Issue,Payment,
    Expense,
    BlockedTenant,
)

# ----------------------------
# 1️⃣ Owner Registration
# ----------------------------
class OwnerRegistrationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='owner_id', read_only=True)
    class Meta:
        model = Owners
        fields = [
            'id',
            'name',
            'phone',
            'password',
            'status',
            'id_proof_type',
            'id_proof_number'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }


# ----------------------------
# 2️⃣ Bank Serializer
# ----------------------------
class BankSerializer(serializers.ModelSerializer):
    # ✅ map frontend field → model field
    upiId = serializers.CharField(
        source='upi_id',
        required=False,
        allow_null=True,
        allow_blank=True
    )
 
    class Meta:
        model = BankDetails
        fields = [
            'id',
            'owner',
            'bankName',
            'ifsc',
            'accountNo',
            'upiId',
            'qr_code'   # 👈 keep frontend name
        ]

# ----------------------------
# 3️⃣ Hostel Serializer
class HostelSerializer(serializers.ModelSerializer):
    class Meta:
        model = StayHostelDetails
        fields = [
            'id',
            'owner',
            'stayType',
            'hostelName',
            'location',
            'hostelType',
            'facilities',
            'latitude',
            'longitude',
            'gallery_images',
            'rent_amount',
            'cover_image'
        ]


# ----------------------------
# 4️⃣ Hostel Floor/Room Serializer
# ----------------------------
class HostelRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelFloorRoom
        fields = [
            'id',
            'owner',
            'hostel',
            'floorNo',
            'roomNo',
            'beds'
        ]
        extra_kwargs = {
            'owner': {'write_only': True},
            'hostel': {'write_only': True}
        }


# ----------------------------
# 5️⃣ Apartment Serializer
# ----------------------------
class ApartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApartmentStayDetails
        fields = [
            'id',
            'owner',
            'stayType',
            'apartmentName',
            'location',
            # 'bhk',
            'tenantType',
            'facilities',
            'latitude',
            'longitude',
            'gallery_images',
            'furnishing_type',
            'rent_amount',
            'cover_image'
        ]
        extra_kwargs = {
            'owner': {'write_only': True}
        }


# ----------------------------
# 6️⃣ Apartment Floor/Unit Serializer
# ----------------------------
class ApartmentRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApartmentFloorUnit
        fields = [
            'id',
            'owner',
            'apartment',
            'floorNo',
            'roomNo',
            'bhkType'
        ]
        extra_kwargs = {
            'owner': {'write_only': True},
            'apartment': {'write_only': True}
        }


# ----------------------------
# 7️⃣ Commercial Serializer
# ----------------------------
class CommercialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommericialDetails
        fields = [
            'id',
            'owner',
            'stayType',
            'commercialName',    # ✅ Correct field name
            'location',
            'usage',
            'facilities',
            'latitude',
            'longitude',
            'gallery_images',
            'rent_amount',
            'cover_image'
        ]
        extra_kwargs = {'owner': {'write_only': True}}
# ----------------------------
# 8️⃣ Commercial Floor Serializer
# ----------------------------
class CommercialSqftSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommercialFloor
        fields = [
            'id',
            'owner',
            'commercial_property',
            'floorNo',
            'sectionNo',
            'area_sqft'
            # 'squareFeet'
        ]
        extra_kwargs = {
            'owner': {'write_only': True},
            'commercial_property': {'write_only': True}
        }

class TenentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenent
        fields = [
            'id',
            'name',
            'phone',
           
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
class TenantLoginSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField()

class OwnerLoginSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField()




class TenantBedSerializer(serializers.ModelSerializer):
    aadhar_id = serializers.SerializerMethodField()
    aadhar_image = serializers.SerializerMethodField()
    aadhar_back_image = serializers.SerializerMethodField()

    class Meta:
        model = TenantBeds
        fields = '__all__'

        extra_kwargs = {
            'phone': {
                'required': False,
                'allow_null': True,
                'allow_blank': True
            }
        }

    def get_aadhar_id(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        return t.aadhar_id if t else None

    def get_aadhar_image(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        request = self.context.get('request')
        if t and t.aadhar_image and request:
            return request.build_absolute_uri(t.aadhar_image.url)
        return None

    def get_aadhar_back_image(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        request = self.context.get('request')
        if t and t.aadhar_back_image and request:
            return request.build_absolute_uri(t.aadhar_back_image.url)
        return None


class ApartmentBedSerializer(serializers.ModelSerializer):
    aadhar_id = serializers.SerializerMethodField()
    aadhar_image = serializers.SerializerMethodField()
    aadhar_back_image = serializers.SerializerMethodField()

    class Meta:
        model = ApartmentTenantBeds
        fields = '__all__'

    def get_aadhar_id(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        return t.aadhar_id if t else None

    def get_aadhar_image(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        request = self.context.get('request')
        if t and t.aadhar_image and request:
            return request.build_absolute_uri(t.aadhar_image.url)
        return None

    def get_aadhar_back_image(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        request = self.context.get('request')
        if t and t.aadhar_back_image and request:
            return request.build_absolute_uri(t.aadhar_back_image.url)
        return None


class CommercialBedSerializer(serializers.ModelSerializer):
    aadhar_id = serializers.SerializerMethodField()
    aadhar_image = serializers.SerializerMethodField()
    aadhar_back_image = serializers.SerializerMethodField()

    class Meta:
        model = CommercialTenantBeds
        fields = '__all__'

    def get_aadhar_id(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        return t.aadhar_id if t else None

    def get_aadhar_image(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        request = self.context.get('request')
        if t and t.aadhar_image and request:
            return request.build_absolute_uri(t.aadhar_image.url)
        return None

    def get_aadhar_back_image(self, obj):
        t = Tenent.objects.filter(phone__iexact=obj.phone).first()
        request = self.context.get('request')
        if t and t.aadhar_back_image and request:
            return request.build_absolute_uri(t.aadhar_back_image.url)
        return None

class TenantRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = JoinRequest
        fields = '__all__'


class JoinRequestSerializer(serializers.ModelSerializer):
    name = serializers.ReadOnlyField(source='tenant.name')
    phone = serializers.ReadOnlyField(source='tenant.phone')
    phone = serializers.ReadOnlyField(source='tenant.phone')
    id_proof = serializers.ImageField(source='tenant.identityImage', read_only=True)
    
    class Meta:
        model = JoinRequest
        fields = '__all__'



class IssueSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    tenant_phone = serializers.CharField(source='tenant.phone', read_only=True)

    class Meta:
        model = Issue
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class BlockedTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedTenant
        fields = '__all__'

