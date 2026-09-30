Spotter ELD Planner - Full-Stack Assessment
Made By: Kishan Singh
A full-stack web application designed to automatically calculate commercial driving routes and generate compliant Federal Motor Carrier Safety Administration (FMCSA) Electronic Logging Device (ELD) log sheets.

🚀 Live Links
Live Application: https://spotter-eld-planner-steel.vercel.app/
Backend API: [https://spotter-eld-planner-ghbp.onrender.com/api/plan-trip/](https://spotter-eld-planner-ghbp.onrender.com/api/plan-trip/)

✨ Features
Automated FMCSA HOS Engine: Algorithmically enforces the 11-hour driving limit, 14-hour duty window, 70-hour/8-day cycle limit, and 30-minute rest breaks.  
Operational Constraints: Automatically factors in 1-hour pickup and drop-off on-duty times, and schedules mandatory fuel stops every 1,000 miles. 
Canvas ELD Generator: Programmatically splits multi-day trips at midnight and draws continuous duty status segments onto standard 24-hour graph grids.   
Interactive Route Mapping: Integrates OpenStreetMap geocoding and OSRM routing to visualize the path geometry and duty stop markers. 

💻 Tech Stack
Frontend: React, Vite, Tailwind CSS v4, React-Leaflet, HTML5 Canvas.
Backend: Django, Python, Requests.
Deployment: Vercel (Frontend), Render (Backend).

🛠️ Local Setup Instructions
1. Backend (Django)
  Ensure you have Python installed, then run the following in your terminal:
  Bash
  cd backend
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  python manage.py runserver
2. Frontend (React/Vite)Open a second terminal window and run:Bashcd frontend
  npm install
  npm run dev
The application will be available at http://localhost:5173.
🧠 Architecture & Simulation Logic
The backend simulation chronologically processes the route distance against the driver's available hours. If a federal regulation threshold is reached (e.g., reaching 8 hours of consecutive driving), the engine injects an "OFF_DUTY" break event and pauses the transit time. If the 70-hour cycle is exhausted, it injects a 34-hour restart. These sequential events are passed to the frontend, which slices the continuous timeline strictly at midnight to generate the necessary multi-day calendar log sheets
