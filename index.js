import express from "express";
import cors from "cors";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

const port = process.env.PORT || 3000;
const app = express();

// Validate Clerk Publishable Key
const CLERK_PUBLISHABLE_KEY = "pk_test_ZHJpdmluZy1nYXJmaXNoLTg0LmNsZXJrLmFjY291bnRzLmRldiQ";
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    "CLERK_PUBLISHABLE_KEY is missing. Add it to your environment variables."
  );
}

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend URL
    credentials: true,
  })
);

// Middleware to parse JSON
app.use(express.json());

// MongoDB Connection
const connect = async () => {
  try {
    await mongoose.connect("mongodb+srv://arjun:123@arjunai.lq6e4.mongodb.net/?retryWrites=true&w=majority&appName=arjunai");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

// ImageKit Configuration
const imagekit = new ImageKit({
  urlEndpoint: "https://ik.imagekit.io/hkegnhewz",
  publicKey: "public_Fjo4WPu3lmGYB5Pe7eSHXdgXXyU=",
  privateKey: "private_Xpmp1xsIIYePDK8Fscxd2+n8cek=",
});

// Image Upload Route
app.post("/api/upload", (req, res) => {
  const authenticationParams = imagekit.getAuthenticationParameters();
  res.json(authenticationParams); // Send the signature, expire, and token to the frontend
});

// Chat Routes

// Create a new chat
app.post("/api/chats", async (req, res) => {
  const { text } = req.body;

  try {
    const newChat = new Chat({
      userId: "anonymous", // You can use a placeholder or handle it differently
      history: [{ role: "user", parts: [{ text }] }],
    });

    const savedChat = await newChat.save();

    const userChats = await UserChats.findOne({ userId: "anonymous" });

    if (!userChats) {
      const newUserChats = new UserChats({
        userId: "anonymous",
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });
      await newUserChats.save();
    } else {
      await UserChats.updateOne(
        { userId: "anonymous" },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }

    res.status(201).send(savedChat._id);
  } catch (err) {
    console.error("Error creating chat:", err);
    res.status(500).send("Error creating chat!");
  }
});

// Fetch UserChats
app.get("/api/userchats", async (req, res) => {
  try {
    const userChats = await UserChats.findOne({ userId: "anonymous" });

    if (!userChats) {
      return res.status(404).send("No chats found!");
    }

    res.status(200).send(userChats.chats);
  } catch (err) {
    console.error("Error fetching user chats:", err);
    res.status(500).send("Error fetching user chats!");
  }
});

// Fetch a Specific Chat
app.get("/api/chats/:id", async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id });

    if (!chat) {
      return res.status(404).send("Chat not found!");
    }

    res.status(200).send(chat);
  } catch (err) {
    console.error("Error fetching chat:", err);
    res.status(500).send("Error fetching chat!");
  }
});

// Update Chat with New Message
app.put("/api/chats/:id", async (req, res) => {
  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );

    if (!updatedChat.matchedCount) {
      return res.status(404).send("Chat not found!");
    }

    res.status(200).send("Chat updated successfully!");
  } catch (err) {
    console.error("Error updating chat:", err);
    res.status(500).send("Error updating chat!");
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).send(err.message || "Internal Server Error");
});

// Start the Server
app.listen(port, () => {
  connect();
  console.log(`Server running on http://localhost:${port}`);
});
