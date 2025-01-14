const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const socketIO = require("socket.io");
const path = require("path");
const io = socketIO(server);

let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);

  socket.on("joinroom", () => {
    console.log("Request to join the room");
    if (waitingUsers.length > 0) {
      let partner = waitingUsers.shift();
      const roomName = `${socket.id}-${partner.id}`;
      socket.join(roomName);
      partner.join(roomName);
      io.to(roomName).emit("joined", roomName);
    } else {
      waitingUsers.push(socket);
    }
  });

  socket.on("message", (data) => {
    const { room, message } = data;
    console.log(`Message received in room ${room}: ${message}`);
    socket.to(room).emit("message", { message, sender: socket.id });
  });

  socket.on("signalingmessage", (data) => {
    socket.to(data.room).emit("signalingmessage", data.message);
  });

  socket.on("startvideocall", (data) => {
    if (data && data.room) {
      socket.broadcast.to(data.room).emit("startvideocall");
    }
  });

  socket.on("acceptcall", (room) => {
    socket.broadcast.to(room).emit("call-accepted");
  });

  socket.on("rejectcall", (room) => {
    socket.broadcast.to(room).emit("call-rejected");
  });

  socket.on("disconnect", () => {
    let index = waitingUsers.findIndex((user) => user.id === socket.id);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const indexRouter = require("./routes/index");
app.use("/", indexRouter);

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
