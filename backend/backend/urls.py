from django.contrib import admin
from django.urls import path
from trips.views import plan_trip

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/plan-trip/', plan_trip, name='plan_trip'),
]