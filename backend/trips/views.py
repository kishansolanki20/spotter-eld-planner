"""
Spotter HOS Assessment - Backend Simulation Engine
Author: Kishan Singh

This module handles route geocoding via OpenStreetMap and mathematically 
simulates a driver's timeline to enforce FMCSA Hours of Service regulations 
(11-hour driving limit, 14-hour window, 70-hour/8-day cycle, and 30-min breaks).
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import requests
from datetime import datetime, timedelta

def get_coordinates(location_query):
    """Fetches latitude/longitude using free Nominatim API to avoid Google Maps billing."""
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "SpotterELDPlanner/1.0"}
    res = requests.get(url, params={"q": location_query, "format": "json", "limit": 1}, headers=headers).json()
    if not res:
        raise ValueError(f"Could not find location: {location_query}")
    return float(res[0]["lat"]), float(res[0]["lon"]), res[0]["display_name"]

def get_route(coords):
    """Fetches distance, duration, and path geometry using free OSRM routing."""
    coords_str = ";".join([f"{lon},{lat}" for lat, lon in coords])
    url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
    res = requests.get(url).json()
    route = res["routes"][0]
    distance_miles = route["distance"] * 0.000621371
    duration_hours = route["duration"] / 3600.0
    return distance_miles, duration_hours, route["geometry"]

@csrf_exempt
def plan_trip(request):
    if request.method != 'POST':
        return JsonResponse({"error": "POST required"}, status=405)
        
    try:
        data = json.loads(request.body)
        start_loc = data.get("current")
        pickup_loc = data.get("pickup")
        dropoff_loc = data.get("dropoff")
        cycle_used = float(data.get("cycle_used", 0))

        # 1. Geocode Locations
        curr_lat, curr_lon, curr_name = get_coordinates(start_loc)
        pick_lat, pick_lon, pick_name = get_coordinates(pickup_loc)
        drop_lat, drop_lon, drop_name = get_coordinates(dropoff_loc)

        # 2. Get Route Segment Data (assuming straight shot for simplicity)
        dist_miles, drive_hrs, geometry = get_route([(curr_lat, curr_lon), (pick_lat, pick_lon), (drop_lat, drop_lon)])
        
        # 3. Simulate FMCSA Hours of Service (HOS)
        events = []
        current_time = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0) # Start at 6 AM
        
        def log_event(status, hours, detail):
            nonlocal current_time
            start = current_time
            end = current_time + timedelta(hours=hours)
            events.append({
                "status": status,
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
                "duration": hours,
                "remark": detail
            })
            current_time = end

        # Tracking variables
        shift_drive = 0
        shift_duty = 0
        drive_since_break = 0
        total_cycle = cycle_used
        miles_since_fuel = 0
        avg_speed = dist_miles / drive_hrs if drive_hrs > 0 else 60

        def check_limits_and_rest(required_hours, is_driving=False):
            nonlocal shift_drive, shift_duty, drive_since_break, total_cycle
            
            # 70-hour / 8-day limit check
            if total_cycle + required_hours > 70:
                log_event("OFF_DUTY", 34.0, "34-Hour Cycle Restart")
                total_cycle = 0
                shift_drive = 0
                shift_duty = 0
                drive_since_break = 0
                
            # 14-hour window or 11-hour driving limit check
            if shift_duty + required_hours > 14 or (is_driving and shift_drive + required_hours > 11):
                log_event("SLEEPER_BERTH", 10.0, "10-Hour Mandatory Rest")
                shift_drive = 0
                shift_duty = 0
                drive_since_break = 0

            # 8-hour consecutive driving limit (30 min break required)
            if is_driving and drive_since_break + required_hours >= 8:
                log_event("OFF_DUTY", 0.5, "30-Min FMCSA Rest Break")
                shift_duty += 0.5
                total_cycle += 0.5
                drive_since_break = 0

        # Build Timeline
        # Pickup (1 hour ON_DUTY)
        check_limits_and_rest(1.0, is_driving=False)
        log_event("ON_DUTY", 1.0, f"Pickup at {pick_name}")
        shift_duty += 1.0
        total_cycle += 1.0

        # Driving chunks
        remaining_drive = drive_hrs
        while remaining_drive > 0:
            # Calculate how far we can drive before hitting a limit or needing fuel
            drive_chunk = min(remaining_drive, 11 - shift_drive, 14 - shift_duty, 8 - drive_since_break)
            miles_in_chunk = drive_chunk * avg_speed
            
            if miles_since_fuel + miles_in_chunk >= 1000:
                # Force a fuel stop
                fuel_chunk = (1000 - miles_since_fuel) / avg_speed
                check_limits_and_rest(fuel_chunk, is_driving=True)
                log_event("DRIVING", fuel_chunk, "Driving to Fuel")
                shift_drive += fuel_chunk
                shift_duty += fuel_chunk
                drive_since_break += fuel_chunk
                total_cycle += fuel_chunk
                remaining_drive -= fuel_chunk
                
                log_event("ON_DUTY", 0.5, "Fueling Stop")
                shift_duty += 0.5
                total_cycle += 0.5
                miles_since_fuel = 0
                continue
                
            if drive_chunk <= 0:
                check_limits_and_rest(0.1, is_driving=True) # Force rest logic
                continue

            # Standard Driving
            log_event("DRIVING", drive_chunk, "Driving")
            shift_drive += drive_chunk
            shift_duty += drive_chunk
            drive_since_break += drive_chunk
            total_cycle += drive_chunk
            miles_since_fuel += (drive_chunk * avg_speed)
            remaining_drive -= drive_chunk

        # Dropoff (1 hour ON_DUTY)
        check_limits_and_rest(1.0, is_driving=False)
        log_event("ON_DUTY", 1.0, f"Dropoff at {drop_name}")

        return JsonResponse({
            "status": "success",
            "distance_miles": dist_miles,
            "duration_hours": drive_hrs,
            "route_geometry": geometry,
            "events": events
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)