const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/faceattendance';

// Connect to MongoDB using Mongoose
async function connectDB() {
  try {
    await mongoose.connect(uri);
    
    console.log('✓ Connected to MongoDB successfully');
    console.log('✓ Database:', mongoose.connection.name);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

module.exports = { connectDB, mongoose };
