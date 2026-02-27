const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./passport-config');
const { connectDB, mongoose } = require('./database');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const { isAuthenticated, isAdmin, isVerifier } = require('./middleware/auth');
const { generateToken, verifyToken } = require('./middleware/mobileAuth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/faceattendance',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Make user available in all templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

// Create necessary directories
const fs = require('fs');
const dirs = ['public', 'public/images', 'public/uploads', 'views'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login page
app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

// Login POST
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// Logout
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/login');
  });
});

// ============================================
// PROTECTED ROUTES
// ============================================

// Home page - requires authentication
app.get('/', isAuthenticated, (req, res) => {
  res.render('index', { user: req.user });
});

// Register user page - admin only
app.get('/register', isAuthenticated, isAdmin, (req, res) => {
  res.render('register', { user: req.user });
});

// Mark attendance page - admin and verifier
app.get('/mark-attendance', isAuthenticated, isVerifier, (req, res) => {
  res.render('mark-attendance', { user: req.user });
});

// View attendance - admin only
app.get('/view-attendance', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('user_id', 'name employee_id')
      .populate('marked_by', 'username')
      .sort({ date: -1, check_in_time: -1 });
    
    res.render('view-attendance', { 
      attendance: records,
      user: req.user 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

// View users - admin only
app.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ name: 1 });
    res.render('users', { users: employees, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

// ============================================
// API ROUTES
// ============================================

// Register employee - admin only
app.post('/api/register', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, employeeId, faceDescriptors } = req.body;
    
    if (!name || !employeeId || !faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length === 0) {
      return res.status(400).json({ error: 'All fields are required and at least one face capture needed' });
    }
    
    // Check if employee ID already exists
    const existing = await Employee.findOne({ employee_id: employeeId });
    if (existing) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    
    // Create new employee
    const employee = new Employee({
      name: name,
      employee_id: employeeId,
      face_descriptor: faceDescriptors
    });
    
    await employee.save();
    
    res.json({ 
      success: true, 
      userId: employee._id.toString(), 
      message: 'Employee registered successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register employee' });
  }
});

// Get employees for face matching - admin and verifier
app.post('/api/mark-attendance', isAuthenticated, isVerifier, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    
    if (!faceDescriptor) {
      return res.status(400).json({ error: 'Face descriptor required' });
    }

    const employees = await Employee.find();

    if (employees.length === 0) {
      return res.status(404).json({ error: 'No registered employees found' });
    }

    res.json({ 
      users: employees.map(emp => ({
        id: emp._id.toString(),
        name: emp.name,
        employeeId: emp.employee_id,
        faceDescriptor: emp.face_descriptor
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Confirm attendance - admin and verifier
app.post('/api/confirm-attendance', isAuthenticated, isVerifier, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already marked attendance today
    const existing = await Attendance.findOne({
      user_id: userId,
      date: today
    });

    if (existing) {
      return res.status(400).json({ error: 'Attendance already marked today' });
    }

    // Mark attendance
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });

    const attendance = new Attendance({
      user_id: userId,
      date: today,
      check_in_time: time,
      marked_by: req.user._id
    });

    await attendance.save();

    // Get employee info
    const employee = await Employee.findById(userId);
    
    res.json({ 
      success: true, 
      message: 'Attendance marked successfully',
      user: { name: employee.name, employeeId: employee.employee_id },
      time: time
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Get employee descriptors - admin and verifier
app.get('/api/users-descriptors', isAuthenticated, isVerifier, async (req, res) => {
  try {
    const employees = await Employee.find().select('_id name employee_id face_descriptor');
    
    const usersData = employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      employeeId: emp.employee_id,
      descriptor: emp.face_descriptor
    }));
    
    res.json({ users: usersData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete employee - admin only
app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const employeeId = req.params.id;
    await Employee.findByIdAndDelete(employeeId);
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ============================================
// MOBILE API ROUTES (JWT-based auth)
// ============================================

// Mobile login - returns JWT token
app.post('/api/mobile/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { user: authenticatedUser, error } = await user.authenticate(password);
    if (error || !authenticatedUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(authenticatedUser);
    res.json({
      success: true,
      token,
      user: {
        id: authenticatedUser._id,
        username: authenticatedUser.username,
        role: authenticatedUser.role
      }
    });
  } catch (err) {
    console.error('Mobile login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Mobile - Get all employees with face descriptors
app.get('/api/mobile/employees', verifyToken, async (req, res) => {
  try {
    const employees = await Employee.find().select('_id name employee_id face_descriptor');
    res.json({
      success: true,
      employees: employees.map(emp => ({
        id: emp._id.toString(),
        name: emp.name,
        employeeId: emp.employee_id,
        descriptors: emp.face_descriptor
      }))
    });
  } catch (err) {
    console.error('Mobile employees error:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Mobile - Confirm attendance
app.post('/api/mobile/confirm-attendance', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const existing = await Attendance.findOne({ user_id: userId, date: today });
    if (existing) {
      return res.status(400).json({ error: 'Attendance already marked today' });
    }

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });

    const attendance = new Attendance({
      user_id: userId,
      date: today,
      check_in_time: time,
      marked_by: req.mobileUser._id
    });

    await attendance.save();

    const employee = await Employee.findById(userId);
    res.json({
      success: true,
      message: 'Attendance marked successfully',
      user: { name: employee.name, employeeId: employee.employee_id },
      time,
      date: today
    });
  } catch (err) {
    console.error('Mobile confirm attendance error:', err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// ============================================
// INITIALIZE DEFAULT USERS
// ============================================
async function initializeDefaultUsers() {
  try {
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('Creating default users...');
      
      // Create admin user
      const admin = new User({
        username: 'admin',
        role: 'admin'
      });
      await User.register(admin, 'admin123');
      console.log('✓ Admin user created (username: admin, password: admin123)');
      
      // Create verifier user
      const verifier = new User({
        username: 'verifier',
        role: 'verifier'
      });
      await User.register(verifier, 'verifier123');
      console.log('✓ Verifier user created (username: verifier, password: verifier123)');
    }
  } catch (err) {
    console.error('Error creating default users:', err);
  }
}

// ============================================
// START SERVER
// ============================================
async function startServer() {
  try {
    await connectDB();
    await initializeDefaultUsers();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
      console.log('✓ Face Attendance System is ready!');
      console.log('✓ Authentication enabled');
      console.log('\n📝 Default Login Credentials:');
      console.log('   Admin    - username: admin, password: admin123');
      console.log('   Verifier - username: verifier, password: verifier123\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
