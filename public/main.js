$(() => {
  const FADE_TIME = 150;
  const TYPING_TIMER_LENGTH = 500;
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7',
  ];

  const $window = $(window);

  const $loginPage = $('.login.page');
  const $chatPage = $('.new.page');

  const $uneInput = $('.usernameInput');
  const $pwdInput = $('.passwordInput');
  const $loginBtn = $('.loginButton');
  const $registerBtn = $('.registerButton');
  const $logoutBtn = $('.logoutButton');

  const $mesInput = $('.inputMessage');
  const $messages = $('.messages');

  const $all = $('.all');
  const $memList = $('.uList');
  const $member = $('.member');

  const userCred = {
    username: '',
    password: '',
    room: '',
  };
  const newMesList = [];
  let typing = false;
  let connected = false;
  let lastTypingTime;
  let lastUser;
  let curInput = $uneInput.focus();

  const socket = io();

  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

  function dateTime() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
      'November', 'December',
    ];
    const d = date.getDate();
    const day = date.getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let h = date.getHours();
    let m = date.getMinutes();
    let s = date.getSeconds();
    if (h < 10) {
      h = `0${h}`;
    }
    if (m < 10) {
      m = `0${m}`;
    }
    if (s < 10) {
      s = `0${s}`;
    }
    const result = `${days[day]} ${months[month]} ${d} ${year} ${h}:${m}:${s}`;
    return result;
  }

  function addSpinningIcon(ev) {
    if (ev === 'login') {
      $loginBtn.html('<img src="img/loading.gif" class="spin" />');
    } else {
      $registerBtn.html('<img src="img/loading.gif" class="spin" />');
    }
  }

  function getTypingMessages(data) {
    return $('.typing.message').filter(function filter() {
      return $(this).data('username') === data.username;
    });
  }

  function getUsernameColor(username) {
    // Compute hash code
    let hash = 7;
    for (let i = 0; i < username.length; i += 1) {
      hash = (username.charCodeAt(i) + (hash << 5)) - hash;
    }
    // Calculate color
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  function addMessageElement(el, options) {
    const $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;

    $('.tooltip').tooltipster({
      animation: 'grow',
      delay: 150,
      distance: 4,
      theme: 'tooltipster-borderless',
    });
  }

  function login(une, pwd) {
    userCred.username = une;
    userCred.password = pwd;
    if (userCred.username && userCred.password) {
      addSpinningIcon('login');
      socket.emit('login', userCred);
    }
  }

  function register(une, pwd) {
    userCred.username = une;
    userCred.password = pwd;
    if (userCred.username && userCred.password) {
      addSpinningIcon('register');
      socket.emit('register', userCred);
    }
  }

  function loadChatPage() {
    connected = true;
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    curInput = $mesInput.focus();
    document.cookie = `loggedIn=${1};path=/`;
    document.cookie = `userName=${userCred.username};path=/`;
    document.cookie = `userPass=${userCred.password};path=/`;
    socket.emit('download message', userCred.room);
  }

  function log(message, options) {
    const $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  function addChatMessage(data, options) {
    // Don't fade the message in if there is an 'X was typing'
    const $typingMessages = getTypingMessages(data);

    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    const typingClass = data.typing ? 'typing' : '';
    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message)
      .addClass('tooltip')
      .prop('title', data.time);
    let $messageDiv;
    if (data.username !== userCred.username && (lastUser !== data.username || data.typing)) {
      const $usernameDiv = $('<span class="username"/>')
        .text(data.username)
        .css('color', getUsernameColor(data.username));

      $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);
    } else if (data.username !== userCred.username) {
      const $usernameDiv = $('<span class="username"/>')
        .text(data.username)
        .css('color', '#f7f7f7');

      $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);
    } else {
      $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .addClass('right')
        .append($messageBodyDiv);
    }
    if (!data.typing) lastUser = data.username;
    addMessageElement($messageDiv, options);
  }

  function sendMessage() {
    const msg = cleanInput($mesInput.val());
    const tmp = {
      username: userCred.username,
      message: msg,
      time: dateTime(),
      room: userCred.room,
    };
    if (msg && connected) {
      $mesInput.val('');
      addChatMessage(tmp);
      socket.emit('send chat message', tmp);
    }
  }

  function updateUserList(u) {
    $memList[0].innerHTML = '';

    for (let i = 0; i < u.length - 1; i += 1) {
      for (let j = i + 1; j < u.length; j += 1) {
        if (u[i] === u[j]) {
          u[j] = '';
        }
      }
    } // handle users with same name (written very badly)

    for (let i = 0; i < u.length; i += 1) {
      const item = document.createElement('li');
      if (u[i] === userCred.username) {
        item.innerHTML = `<span class="member"><b>${u[i]}</b> <i>(You)</i></span>`;
        $memList[0].appendChild(item);
      } else if (u[i] !== '') {
        if (newMesList.find(el => el === u[i])) item.innerHTML = `<span class="member">💡 ${u[i]}</span>`;
        else item.innerHTML = `<span class="member">${u[i]}</span>`;
        $memList[0].appendChild(item);
      }
    }
  }

  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing', userCred.room);
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        const typingTimer = (new Date()).getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('not typing', userCred.room);
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(() => {
      $(this).remove();
    });
  }

  function getCookie(cname) {
    const name = `${cname}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i += 1) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return '';
  }

  function logout() {
    console.log('logout button clicked');
    document.cookie = 'loggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    location.reload();
  }

  $loginBtn.click(() => {
    login(cleanInput($uneInput.val().trim()), cleanInput($pwdInput.val().trim()));
  });

  $registerBtn.click(() => {
    register(cleanInput($uneInput.val().trim()), cleanInput($pwdInput.val().trim()));
  });

  $window.keydown((ev) => {
    // Auto-focus the current input when a key is typed
    if (userCred.username && !(ev.ctrlKey || ev.metaKey || ev.altKey)) {
      curInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (ev.which === 13) {
      if (userCred.username) {
        sendMessage();
        socket.emit('not typing', userCred.room);
        typing = false;
      }
    }
  });

  $mesInput.on('input', () => {
    updateTyping();
  });

  $mesInput.click(() => {
    $mesInput.focus(() => {
      if (newMesList.find(el => el === userCred.room)) {
        const tmp = newMesList.indexOf(userCred.room);
        if (tmp > -1) newMesList.splice(tmp, 1);
        socket.emit('update userlist');
      }
    });
  });

  $logoutBtn.click(() => {
    logout();
  });

  $all.click(() => {
    if (userCred.room) {
      userCred.room = '';
      $messages.empty();
      socket.emit('download message', userCred.room);
    }
  });

  $memList.on('click', $member, (mem) => {
    const val = mem.target.textContent;
    if (val.search('💡') > -1) {
      userCred.room = val.substr(val.search('💡') + 3);
      const tmp = newMesList.indexOf(userCred.room);
      if (tmp > -1) newMesList.splice(tmp, 1);
      socket.emit('update userlist');
      $messages.empty();
      socket.emit('download message', userCred.room);
    } else if (val !== userCred.username && val !== '(You)') {
      userCred.room = val;
      $messages.empty();
      socket.emit('download message', userCred.room);
    }
  });

  const loggedIn = getCookie('loggedIn');
  // When page is reloaded, check cookie if logged in before
  if (loggedIn) {
    connected = true;
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    curInput = $mesInput.focus();
    login(getCookie('userName'), getCookie('userPass'));
    console.log(`Logged in before, user is: ${getCookie('userName')}`);
  } else {
    $loginPage.show();
    curInput = $uneInput.focus();
  }

  // TODO: user is already logged on
  socket.on('login entry', (suc) => {
    if (suc) {
      loadChatPage();
    } else {
      alert('Incorrect username or password!');
      userCred.username = '';
      userCred.password = '';
      location.reload();
    }
  });

  socket.on('register entry', (suc) => {
    if (suc) {
      loadChatPage();
    } else {
      alert('Username is taken!');
      userCred.username = '';
      userCred.password = '';
      location.reload();
    }
  });

  socket.on('welcome', (rm) => {
    if (rm) log(`Private message with ${rm}`);
    else log('Welcome to All');
  });

  socket.on('chat message', (data) => {
    if ((!data.room && !userCred.room) ||
        (data.room === userCred.username &&
        userCred.room === data.username) ||
        (data.username === userCred.username &&
        userCred.room === data.room)) addChatMessage(data);
  });

  socket.on('user joined', (data) => {
    if ((!data.room && !userCred.room) ||
        (data.room === userCred.username &&
        userCred.room === data.username))log(`${data.username} joined`);
  });

  socket.on('user left', (data) => {
    if ((!data.room && !userCred.room) ||
        (data.room === userCred.username &&
        userCred.room === data.username)) log(`${data.username} left`);
    removeChatTyping(data);
  });

  socket.on('update userlist', (data) => {
    if (data.username) newMesList.push(data.username);
    updateUserList(data.list);
  });

  socket.on('typing', (data) => {
    if ((!data.room && !userCred.room) ||
        (data.room === userCred.username &&
        userCred.room === data.username)) addChatTyping(data);
  });

  socket.on('stop typing', (data) => {
    if ((!data.room && !userCred.room) ||
        (data.room === userCred.username &&
        userCred.room === data.username)) removeChatTyping(data);
  });
});
