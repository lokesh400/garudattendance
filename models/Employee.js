const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const EmployeeSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  employee_id: {
    type: String,
    required: true,
    unique: true
  },
  face_descriptor: {
    type: Array,
    required: true
  },
  rollNumber: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
