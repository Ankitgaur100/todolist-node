const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true,
  },
  taskDescription: {
    type: String,
    required: true, // Make this field optional
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
  },
});

module.exports = mongoose.model("ToDo", todoSchema);
