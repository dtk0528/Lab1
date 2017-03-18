const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ip = require('ip');

const clients = [];
let incr = 1;

function getUsersList() {
  const usersList = [];
  for (let i = 0; i < clients.length; i += 1) {
    usersList[i] = clients[i].n;
  }
  return usersList;
}

function setUserTyping(index) {
  const usersList = [];
  for (let i = 0; i < clients.length; i += 1) {
    usersList[i] = clients[i].n;
  }
  usersList[index] = `💬 ${clients[index].n}`;
  return usersList;
}

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

io.on('connection', (socket) => {
  clients.push(socket);

  socket.on('start', () => {
    socket.emit('nick', `guest${incr}`);
    clients[clients.indexOf(socket)].n = `guest${incr}`;
    incr += 1;
    io.emit('users list', getUsersList());
  });

  socket.on('send chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('set nick', (nick) => {
    io.emit('info', `New user: ${nick}`); // console.log(nick);
    clients[clients.indexOf(socket)].n = nick; // console.log(clients[clients.indexOf(socket)].n);
    io.emit('users list', getUsersList()); // console.log(getUsersList());
  });

  socket.on('typing', () => {
    io.emit('typing signal', setUserTyping(clients.indexOf(socket))); // console.log(setUserTyping(clients.indexOf(socket)));
  });

  socket.on('not typing', () => {
    io.emit('typing signal', getUsersList()); // console.log(getUsersList());
  });

  socket.on('disconnect', () => {
    if (clients[clients.indexOf(socket)].n == null) {
      // console.log('Guest disconnect!');
    } else {
      // console.log(clients[clients.indexOf(socket)].n +' disconnect!');
      io.emit('info', `User ${clients[clients.indexOf(socket)].n} disconnected.`);
    }
    clients.splice(clients.indexOf(socket), 1); // clientIndex, 1);
    io.emit('users list', getUsersList());
  });
});

http.listen(8080, () => {
  console.log(`listening on localhost:8080 and ${ip.address()}:8080`);
});

// add sudo comment
