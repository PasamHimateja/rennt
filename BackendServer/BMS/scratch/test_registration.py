
import os
import django
import sys
import json

# Add the project directory to sys.path
sys.path.append(r'c:\Users\narus\OneDrive\Desktop\rennto\UpdatedIssuesRenntoJ\HMS\Backend\BMS')

# Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'BMS.settings')
django.setup()

from HAC.serializers import OwnerRegistrationSerializer, CommercialSerializer, BankSerializer
from HAC.models import Owners

def test_registration_validation():
    data = {
        'name': 'Rama',
        'email': 'rama_test_new@gmail.com', # Use a new email
        'phone': '9163053943',
        'password': 'Abc@1234',
        'stayType': 'commercial',
        'commercialName': 'Rama commercials',
        'usage': 'rent',
        'location': 'Rajiv Gandhi international airport ',
        'latitude': '17.2402827',
        'longitude': '78.429358',
        'facilities': '["parking","water","home"]',
        'bankName': 'Kotak Mahindra Bank',
        'upiId': '7672010079@ybl',
        'building_layout': '[{"floorNo":1,"sections":[{"sectionNo":1,"area":656},{"sectionNo":2,"area":656},{"sectionNo":3,"area":656}]}]'
    }

    # 1. Owner Serializer
    owner_serializer = OwnerRegistrationSerializer(data=data)
    if not owner_serializer.is_valid():
        print("OWNER ERRORS:", owner_serializer.errors)
    else:
        print("OWNER VALID")
        # Simulate saving (don't actually save to DB if we want to just test)
        # owner = owner_serializer.save() 
        
        # 2. Property Serializer
        # We need an owner id for this, let's use a dummy or create one if needed
        # property_data = data.copy()
        # property_data['owner'] = 1 # dummy
        # property_data['facilities'] = ["parking","water","home"]
        # serializer = CommercialSerializer(data=property_data)
        # if not serializer.is_valid():
        #     print("PROPERTY ERRORS:", serializer.errors)
        # else:
        #     print("PROPERTY VALID")

if __name__ == "__main__":
    test_registration_validation()
