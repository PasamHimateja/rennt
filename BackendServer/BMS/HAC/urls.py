from django.urls import path, include
from django.conf import settings
from . import views
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [

    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('owner/',views.register_owner),
    path('tenent/',views.register_tenent),
    path('login/',views.tenant_login),
    path('verify/',views.owner_login),
    path('details/<str:phone>/', views.get_hostel_step3),
    path('owner_props/', views.get_properties_listing),
    path('tenentbeds/', views.registerbeds),
    path('apartmentbeds/', views.registerapartmentbeds),
    path('commercialbeds/', views.registercommercialbeds),
    path('getbeds/<str:phone>/', views.get_tenantsbeds),
    path('getapartmentbeds/<str:phone>/', views.get_apartmentbeds),
    path('getcommercialbeds/<str:phone>/', views.get_commercialbeds),
    # path('deletehostel/<str:phone>/', views.delete_hostel_tenant),
    # path('deleteapartment/<str:phone>/', views.delete_apartment_tenant),
    # path('deletecommercial/<str:phone>/', views.delete_commercial_tenant),
    #  path('updatehostel/<str:phone>/', views.update_hostel_tenant),
    # path('updateapartment/<str:phone>/', views.update_apartment_tenant),
    # path('updatecommercial/<str:phone>/', views.update_commercial_tenant),
     path(
        'deletehostel/<int:id>/',
        views.delete_hostel_tenant,
        name='delete_hostel_tenant'
    ),
    path(
        'check_request_status/<str:tenant_phone>/<str:owner_phone>/<str:property_name>/',
        views.check_request_status,
        name='check_request_status'
    ),

    # =========================
    # DELETE APARTMENT TENANT
    # =========================
    path(
        'deleteapartment/<int:id>/',
        views.delete_apartment_tenant,
        name='delete_apartment_tenant'
    ),

    # =========================
    # DELETE COMMERCIAL TENANT
    # =========================
    path(
        'deletecommercial/<int:id>/',
        views.delete_commercial_tenant,
        name='delete_commercial_tenant'
    ),
    path(
        'updatehostel/<int:id>/',
        views.update_hostel_tenant,
        name='update_hostel_tenant'
    ),

    # =========================
    # APARTMENT UPDATE
    # =========================
    path(
        'updateapartment/<int:id>/',
        views.update_apartment_tenant,
        name='update_apartment_tenant'
    ),

    # =========================
    # COMMERCIAL UPDATE
    # =========================
    path(
        'updatecommercial/<int:id>/',
        views.update_commercial_tenant,
        name='update_commercial_tenant'
    ),
    path('all-owners-data/', views.get_all_steps_data, name='all_owners_data'),
    path('update_status/', views.update_status),
    path('update_building_layout/<str:phone>/', views.update_building_layout, name='update_building_layout'),
    path('tenantdetails/<str:phone>/', views.tenantdetails),
    # path('tenantdetails/<str:phone>/', views.tenant_by_phone),
    path('owner-admin/', views.owner_admin_list),
    path('owner_data/<str:phone>/', views.get_owner_full_details),
    path('owner_accounts/<str:phone>/', views.get_owner_accounts),
    path('owner-status/<str:phone>/', views.update_owner_status),
    path('check-owner-status/<str:phone>/', views.check_owner_status),


    path('tenantdetails/<str:phone>/', views.tenantdetails), 
    path('send_request/', views.send_join_request),
    path('owner_requests/<str:phone>/', views.owner_requests),
    path('update_request_status/', views.update_request_status),
    # path('tenant_notifications/<str:phone>/', views.tenant_notifications),



    path('create-issue/', views.create_issue),
    path('owner-issues/<str:phone>/', views.owner_issues),
    path('tenant-issues/<str:identifier>/', views.tenant_issues),
    path('update-issue-status/<int:issue_id>/', views.update_issue_status),
    path('update-issue-comment/<int:issue_id>/', views.update_issue_comment),
    path('test-create-issue/', views.test_create_issue),
    path('update-issue/<int:id>/', views.update_issue),
    path('delete-issue/<int:issue_id>/', views.delete_issue, name='delete_issue'),
    # path(
    # 'check_request_status/<str:tenant_phone>/<str:owner_email>/<str:property_name>/',
    # views.check_request_status),
    path('withdraw_request/', views.withdraw_request),
    path('tenant/join_booking/', views.tenant_join_booking, name='tenant_join_booking'),
    path('tenant/pending_allotment/<str:phone>/', views.get_pending_allotment, name='get_pending_allotment'),
    path('delete_tenent_request/<str:phone>/', views.delete_tenent_request),
    path('admin_home/', views.admin_home),
    path('get_all_property_basic_details/', views.get_all_property_basic_details),
    path('suspension_reason/', views.suspension_reason),
    path('get_suspension_reason/<str:phone>/', views.get_suspension_reason),
    path('payment-details/<str:phone>/', views.get_tenant_payment_details),
     path('create-payment/', views.create_payment),
    path('payment-status/<str:txn_ref>/', views.check_payment_status),
        path('update-payment/', views.update_payment_status),
    path('owner-payments/<str:phone>/', views.get_owner_payments),
    path(
    'upload-payment-screenshot/',
    views.upload_payment_screenshot,
    name='upload_payment_screenshot'
),
    path('cash-payment/', views.cash_payment),
    path('tenant-payment-history/<str:phone>/', views.get_tenant_payment_history),
    path('send-owner-notification/', views.send_owner_notification),
    path('send-tenant-notification/', views.send_tenant_notification),
    path('owner-expenses/<str:phone>/', views.get_owner_expenses),
    path('add-expense/', views.add_expense),
    path('owner-tenants/<str:phone>/', views.get_owner_tenants),
    path('owner_profile_update/<str:phone>/', views.owner_profile_update),
    path('tenant_profile_update/<str:phone>/',views.tenant_profile_update,name='tenant_profile_update'),
    path('notifications/<str:phone>/', views.get_notifications),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read),
    path('notifications/<str:phone>/mark-all-read/', views.mark_all_notifications_read),
    path('tenant_notifications/<str:identifier>/',
        views.tenant_notifications
    ),

    path(
    'check-user/<str:phone>/',
    views.check_user,
    name='check_user'
),
    path(
    'check-owner/<str:phone>/',
    views.check_owner,
    name='check_owner'
),
    path('admin-login/', views.admin_login, name='admin_login'),
    path('save-push-token/', views.save_push_token, name='save_push_token'),
    path('tenant/submit_verification/', views.tenant_submit_verification, name='tenant_verification'),
    path('tenant/co_residents/<str:phone>/', views.get_co_residents, name='get_co_residents'),
    path('block_tenant/', views.block_tenant, name='block_tenant'),
    path('unblock_tenant/', views.unblock_tenant, name='unblock_tenant'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


