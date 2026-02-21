# Quick Start Guide - Face Attendance System

## ✅ Setup Complete!

Your Face Attendance System is now installed and running!

## 🌐 Access the Application

Open your browser (or mobile phone browser) and go to:
**http://localhost:3000**

Or access from your mobile phone on the same network:
**http://YOUR_COMPUTER_IP:3000**

To find your computer's IP address, run:
```
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

## 📱 How to Use

### 1️⃣ Register Users
- Click "Register New User"
- Enter name and employee ID
- Point camera at face
- Click "Capture Face"
- Click "Register User"

### 2️⃣ Mark Attendance
- Click "Mark Attendance"
- Point camera at face
- Click "Scan Face"
- Once recognized, click "Confirm Attendance"

### 3️⃣ View Records
- Click "View Attendance Records" to see all check-ins
- Click "View All Users" to manage registered users

## 📝 Important Notes

✓ **Camera Access** - You must grant camera permissions when prompted
✓ **Good Lighting** - Ensure proper lighting for better face detection
✓ **One Device** - You can use a single phone for all employees
✓ **Once Per Day** - Each employee can mark attendance once per day
✓ **Auto-Save** - All data is saved automatically in SQLite database

## 🔧 Server Commands

**Start Server:**
```
npm start
```

**Stop Server:**
Press `Ctrl + C` in the terminal

**Restart Server:**
Stop and start again

## 💡 Tips for Best Results

1. **Face Position** - Keep face centered in camera view
2. **Distance** - Stay about 1-2 feet from camera
3. **Lighting** - Use natural or bright lighting
4. **Registration** - Register with face straight-on
5. **Recognition** - Use same angle as registration

## 🛠️ Troubleshooting

**Camera not working?**
- Check browser permissions
- Try refreshing the page
- Ensure no other app is using camera

**Face not detected?**
- Improve lighting
- Remove glasses/mask if possible
- Move closer to camera
- Wait for models to load completely

**Server not starting?**
- Check if port 3000 is available
- Try different port in server.js
- Run `npm install` again

## 📂 Data Storage

All data is stored in:
- **Database**: `attendance.db` (SQLite)
- **Location**: Project root folder

## 🎯 Next Steps

1. Open http://localhost:3000
2. Register your first user
3. Test the attendance marking
4. Access from mobile phone for real use

---

Enjoy your Face Attendance System! 🎉
