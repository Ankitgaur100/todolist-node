const express = require("express");
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/Users");

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

const secretKey = "your-secret-key"; // Replace with your actual secret key

const User = require("./Models/Users");
const ToDo = require("./Models/todo");

// Middleware for JWT verification
function verifyToken(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded.user;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
}

// Common error handler
function handleErrors(res, error) {
  console.error("Error:", error);
  res.status(500).json({ message: "Internal server error" });
}

// Signup API endpoint
app.post(
  "/signup",
  [check("email").isEmail(), check("password").isLength({ min: 8 })],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();

      const payload = {
        user: {
          id: newUser._id,
        },
      };

      jwt.sign(payload, secretKey, { expiresIn: "1d" }, async (err, token) => {
        if (err) throw err;

        newUser.tokens.push({ token });
        await newUser.save();

        return res.status(200).json({ token, email, password: hashedPassword });
      });
    } catch (error) {
      handleErrors(res, error);
    }
  }
);

// Login API endpoint
app.post(
  "/login",
  [check("email").isEmail(), check("password").isLength({ min: 8 })],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" });
      }

      const payload = {
        user: {
          id: user._id,
        },
      };

      jwt.sign(payload, secretKey, { expiresIn: "1d" }, (err, token) => {
        if (err) throw err;
        return res.status(200).json({ token, email });
      });
    } catch (error) {
      handleErrors(res, error);
    }
  }
);

// API endpoint for adding a to-do item
app.post("/addTodo", verifyToken, async (req, res) => {
  const { task, taskDescription } = req.body;

  try {
    const newTodo = new ToDo({
      task,
      taskDescription,
      user: req.user.id,
    });

    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (error) {
    handleErrors(res, error);
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
