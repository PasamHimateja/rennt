from django.core.files.storage import default_storage
from django.conf import settings
from HAC.serializers import HostelSerializer, ApartmentSerializer, CommercialSerializer
from HAC.models import StayHostelDetails, ApartmentStayDetails, CommericialDetails, HostelFloorRoom, ApartmentFloorUnit, CommercialFloor
from .common_service import CommonService

class PropertyService:

    @staticmethod
    def upload_gallery(request):
        files = request.FILES.getlist("gallery_images")
        paths = []
        for file in files:
            path = default_storage.save(f"property_gallery/{file.name}", file)
            paths.append(path)
        return paths

    @staticmethod
    def create_property(request, owner, stay_type, facilities, gallery):
        property_data = request.data.dict()
        property_data.pop("facilities", None)
        property_data.pop("gallery_images", None)
        property_data.pop("building_layout", None)

        property_data["owner"] = owner.pk
        property_data["facilities"] = facilities
        property_data["gallery_images"] = gallery

        cover_image = request.FILES.get("cover_image")
        if cover_image:
            property_data["cover_image"] = cover_image

        serializer_map = {
            "hostel": HostelSerializer,
            "apartment": ApartmentSerializer,
            "commercial": CommercialSerializer
        }
        serializer = serializer_map[stay_type](data=property_data)
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    @staticmethod
    def get_all_property_basic_details():
        property_list = []
        
        property_list.extend([
            {
                "phone": hostel.owner.phone if hostel.owner else "N/A",
                "property_type": "hostel",
                "name": hostel.hostelName or "Unnamed Hostel",
                "location": hostel.location,
                "owner_name": hostel.owner.name if hostel.owner else "Unknown",
                "owner_status": hostel.owner.status if hostel.owner else "pending",
            }
            for hostel in StayHostelDetails.objects.select_related("owner")
        ])

        property_list.extend([
            {
                "phone": apartment.owner.phone if apartment.owner else "N/A",
                "property_type": "apartment",
                "name": apartment.apartmentName or "Unnamed Apartment",
                "location": apartment.location,
                "owner_name": apartment.owner.name if apartment.owner else "Unknown",
                "owner_status": apartment.owner.status if apartment.owner else "pending",
            }
            for apartment in ApartmentStayDetails.objects.select_related("owner")
        ])

        property_list.extend([
            {
                "phone": commercial.owner.phone if commercial.owner else "N/A",
                "property_type": "commercial",
                "name": commercial.commercialName or "Unnamed Commercial",
                "location": commercial.location,
                "owner_name": commercial.owner.name if commercial.owner else "Unknown",
                "owner_status": commercial.owner.status if commercial.owner else "pending",
            }
            for commercial in CommericialDetails.objects.select_related("owner")
        ])

        return property_list

    @staticmethod
    def get_payment_details(phone):
        from HAC.models import TenantBeds, ApartmentTenantBeds, CommercialTenantBeds, BankDetails, Owners, StayHostelDetails, ApartmentStayDetails, CommericialDetails, Payment
        tenant_bed = None
        prop_type = None
        for table, p_type in [(TenantBeds, 'hostel'), (ApartmentTenantBeds, 'apartment'), (CommercialTenantBeds, 'commercial')]:
            tenant_bed = table.objects.filter(phone=phone).order_by('-id').first()
            if tenant_bed:
                prop_type = p_type
                break
                
        if not tenant_bed:
            return None
            
        owner = CommonService.get_owner(tenant_bed.owner_phone)
        bank = BankDetails.objects.filter(owner=owner).first() if owner else None
        
        prop_name = ""
        if owner:
            if prop_type == 'hostel':
                p = StayHostelDetails.objects.filter(owner=owner).first()
                if p: prop_name = p.hostelName
            elif prop_type == 'apartment':
                p = ApartmentStayDetails.objects.filter(owner=owner).first()
                if p: prop_name = p.apartmentName
            elif prop_type == 'commercial':
                p = CommericialDetails.objects.filter(owner=owner).first()
                if p: prop_name = p.commercialName
                
        last_payment = Payment.objects.filter(tenant_phone__iexact=phone).order_by('-created_at').first()
        success_count = Payment.objects.filter(tenant_phone__iexact=phone, status='SUCCESS').count()
        
        check_in_str = None
        due_date_str = None
        if tenant_bed.checkIn:
            try:
                import datetime, calendar
                if isinstance(tenant_bed.checkIn, str):
                    c_date = datetime.datetime.strptime(tenant_bed.checkIn, '%Y-%m-%d').date()
                else:
                    c_date = tenant_bed.checkIn
                    
                month = c_date.month - 1 + success_count
                year = c_date.year + month // 12
                month = month % 12 + 1
                day = min(c_date.day, calendar.monthrange(year, month)[1])
                n_date = datetime.date(year, month, day)
                
                check_in_str = c_date.strftime('%Y-%m-%d')
                due_date_str = n_date.strftime('%Y-%m-%d')
            except Exception:
                check_in_str = str(tenant_bed.checkIn)
                due_date_str = check_in_str
            
        return {
            "tenantName": tenant_bed.name,
            "ownerPhone": owner.phone if owner else tenant_bed.owner_phone,
            "ownerName": owner.name if owner else "Owner",
            "propertyName": prop_name,
            "upiId": bank.upi_id if bank else "",
            "rent": tenant_bed.rent,
            "checkIn": check_in_str,
            "dueDate": due_date_str,
            "status": last_payment.status if last_payment else "Pending",
            "lastPaymentStatus": last_payment.status if last_payment else "Pending",
            "lastPaymentRef": last_payment.txn_ref if last_payment else "",
            "remaining_balance": 0
        }

    @staticmethod
    def get_hostel_step3(phone):
        owner = CommonService.get_owner(phone)
        if not owner:
            raise Exception("Owner not found")

        hostel = StayHostelDetails.objects.filter(owner=owner).first()
        apartment = ApartmentStayDetails.objects.filter(owner=owner).first()
        commercial = CommericialDetails.objects.filter(owner=owner).first()

        response_data = {}

        if hostel:
            floors = HostelFloorRoom.objects.filter(hostel=hostel)
            layout = {}
            for room in floors:
                floor_no = room.floor
                if floor_no not in layout:
                    layout[floor_no] = []
                layout[floor_no].append({"roomNo": room.roomNo, "beds": room.sharing})

            result = [{"floorNo": fn, "rooms": rooms} for fn, rooms in layout.items()]
            response_data = {
                "property_type": "hostel",
                "name": hostel.hostelName,
                "address": hostel.location,
                "building_layout": result
            }
        elif apartment:
            floors = ApartmentFloorUnit.objects.filter(apartment=apartment)
            layout = {}
            for flat in floors:
                floor_no = flat.floor
                if floor_no not in layout:
                    layout[floor_no] = []
                layout[floor_no].append({"flatNo": flat.flatNo, "bhk": flat.bhk})

            result = [{"floorNo": fn, "flats": flats} for fn, flats in layout.items()]
            response_data = {
                "property_type": "apartment",
                "name": apartment.apartmentName,
                "address": apartment.location,
                "building_layout": result
            }
        elif commercial:
            floors = CommercialFloor.objects.filter(commercial_property=commercial).order_by('floorNo', 'sectionNo')
            layout_dict = {}
            for floor in floors:
                floor_no = floor.floorNo
                if floor_no not in layout_dict:
                    layout_dict[floor_no] = []
                layout_dict[floor_no].append({"sectionNo": floor.sectionNo, "area_sqft": floor.area_sqft})

            result = [{"floorNo": fn, "sections": secs} for fn, secs in layout_dict.items()]
            response_data = {
                "property_type": "commercial",
                "name": commercial.commercialName,
                "address": commercial.location,
                "building_layout": result
            }
        else:
            raise ValueError("No property found for this owner")

        response_data["owner"] = {"id": owner.pk, "name": owner.name, "phone": owner.phone}
        return response_data

    @staticmethod
    def get_properties_listing(request):
        property_list = []
        def build_gallery_urls(gallery_list):
            if not gallery_list:
                return []
            return [request.build_absolute_uri(settings.MEDIA_URL + path) for path in gallery_list]

        hostels = StayHostelDetails.objects.select_related('owner').filter(owner__status='active')
        for hostel in hostels:
            property_list.append({
                "id": str(hostel.id),
                "type": "Hostel",
                "hostelType": hostel.hostelType.capitalize() if hostel.hostelType else None,
                "name": hostel.hostelName,
                "address": hostel.location,
                "contact": hostel.owner.phone if hostel.owner else None,
                "owner_phone": hostel.owner.phone if hostel.owner else None,
                "owner_id": hostel.owner.owner_id if hostel.owner else None,
                "owner_name": hostel.owner.name if hostel.owner else None,
                "latitude": float(hostel.latitude) if hostel.latitude else None,
                "longitude": float(hostel.longitude) if hostel.longitude else None,
                "gallery": build_gallery_urls(hostel.gallery_images),
                "image": hostel.cover_image.name if hostel.cover_image else None,
                "rent": str(hostel.rent_amount) if hostel.rent_amount else None,
                "isAvailable": True,
                "rating": None,
                "facilities": hostel.facilities if hostel.facilities else [],
            })
            
        apartments = ApartmentStayDetails.objects.select_related('owner').filter(owner__status='active')
        for apartment in apartments:
            allowed_tenants = None
            if apartment.tenantType == "family":
                allowed_tenants = "FamilyOnly"
            elif apartment.tenantType == "bachelors":
                allowed_tenants = "BachelorsOnly"

            property_list.append({
                "id": str(apartment.id),
                "type": "Apartment",
                "name": apartment.apartmentName,
                "address": apartment.location,
                "contact": apartment.owner.phone if apartment.owner else None,
                "owner_phone": apartment.owner.phone if apartment.owner else None,
                "owner_id": apartment.owner.owner_id if apartment.owner else None,
                "owner_name": apartment.owner.name if apartment.owner else None,
                "latitude": float(apartment.latitude) if apartment.latitude else None,
                "longitude": float(apartment.longitude) if apartment.longitude else None,
                "gallery": build_gallery_urls(apartment.gallery_images),
                "image": apartment.cover_image.name if apartment.cover_image else None,
                "rent": str(apartment.rent_amount) if apartment.rent_amount else None,
                "isAvailable": True,
                "rating": None,
                "facilities": apartment.facilities if apartment.facilities else [],
                "allowedTenants": allowed_tenants,
            })

        commercials = CommericialDetails.objects.select_related('owner').filter(owner__status='active')
        for commercial in commercials:
            property_list.append({
                "id": str(commercial.id),
                "type": "Commercial",
                "name": commercial.commercialName,
                "address": commercial.location,
                "contact": commercial.owner.phone if commercial.owner else None,
                "owner_phone": commercial.owner.phone if commercial.owner else None,
                "owner_id": commercial.owner.owner_id if commercial.owner else None,
                "owner_name": commercial.owner.name if commercial.owner else None,
                "latitude": float(commercial.latitude) if commercial.latitude else None,
                "longitude": float(commercial.longitude) if commercial.longitude else None,
                "gallery": build_gallery_urls(commercial.gallery_images),
                "image": commercial.cover_image.name if commercial.cover_image else None,
                "rent": str(commercial.rent_amount) if commercial.rent_amount else None,
                "isAvailable": True,
                "rating": None,
                "facilities": commercial.facilities if commercial.facilities else [],
            })

        return {
            "count": len(property_list),
            "data": property_list
        }