import express from "express";
import socketio from "socket.io";
import path from "path";

interface UserData {
  username: string;
  email: string;
}

abstract class User {
  // інформація про користувача
  public info: UserData;

  // список повідомлень
  private messages: Message[] = [];

  constructor(username: string, email: string) {
    this.info = { username, email };
  }

  // надіслати повідомлення
  public sendMessage(msg: Message) {
    this.messages.push(msg);
    msg.send();
  }

  // абстрактний метод по додаванню друга
  abstract addFirend(friend: User): void;
}

// наслідуємо клас студента від класу користувача
class Student extends User {
  // оголошуємо параметри
  public group: string;
  public friends: Student[] = [];

  // ініціалізуємо параметри класу
  constructor(username: string, email: string, group: string) {
    super(username, email);
    this.group = group;
  }

  // додаємо друзів студенту
  public addFirend(friend: Student): void {
    this.friends.push(friend);
  }

  // отримуємо список всіх друзів студента
  public getFriends(): Student[] {
    return this.friends;
  }
}

// клас повідомлень
class Message {
  // оголошуємо параметри
  private text: string = "";
  private author: string;
  private room: string;

  // параметр що вміщує кімнату чату
  protected socket: any;

  // ініціалізація параметрів
  constructor(socket: any, text: string, author: string, room: string) {
    this.socket = socket;
    this.text = text;
    this.author = author;
    this.room = room;
  }

  // вносимо текст
  public setText(text: string): void {
    this.text = text;
  }

  // надсилаємо повідомлення в чат
  public send() {
    this.socket.broadcast.emit("message", { message: this.text, user: this.author });
  }

  // змінити кімнату чату
  public changeRoom(room: string) {
    this.room = room;
  }
}

const students: Student[] = [];

const app = express();
app.set("port", process.env.PORT || 3000);

let http = require("http").Server(app);

let io = require("socket.io")(http);

app.get("/", (req: any, res: any) => {
  res.sendFile(path.resolve(__dirname + "\/index.html"));
});

io.on("connection", (socket: any) => {
  const student = new Student(`User-${Date.now()}`, `User-${Date.now()}@mail.com`, "KN-313");
  students.push(student);

  console.log(students)

  socket.emit("user", { user: student });
  socket.emit("users", { users: students });
  socket.broadcast.emit("users", { users: students });

  socket.on("disconnect", () => {
    students.splice(students.findIndex(user => user.info.username === student.info.username), 1);
    socket.broadcast.emit("users", { users: students });
  });

  socket.on("message", (message: string) => {
    student.sendMessage(new Message(socket, message, student.info.username, message));
  });

  socket.on("friend request", (friendName: string) => {
    let newFriend: Student | undefined = students.find(student => student.info.username === friendName);

    if (newFriend && typeof newFriend === typeof Student) {
      student.addFirend(newFriend);
      socket.emit("friends list", { friends: student.getFriends() });
    }
  });
});

const server = http.listen(3000 || process.env.PORT, () => {
  console.log("listening on *:3000");
});
