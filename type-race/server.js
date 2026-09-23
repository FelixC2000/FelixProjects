const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const MAX_ROUNDS = 3;
const FINISH_WINDOW_MS = 30000;

const CHALLENGES = {
  easy: [
    'A purple chicken stole my computer and demanded three tacos.',
    'My sleepy robot tried to bake cookies inside the washing machine.',
    'Seven dancing bananas escaped from the supermarket at midnight.',
    'The tiny dragon ordered pizza and accidentally called the police.',
    'A confused penguin wore sunglasses while riding a skateboard.',
    'My neighbor cat became famous after stealing a golden sandwich.',
    'The astronaut forgot his helmet because he was busy feeding squirrels.',
    'A giant potato challenged the king to a very serious dance battle.',
    'The monkey opened a restaurant and only served invisible soup.',
    'My computer sneezed loudly and scared everyone in the office.'
  ],
  medium: [
    'A dramatic llama started a jazz band inside the city library.',
    'The winter owl delivered sandwiches with surprising confidence and flair.',
    'A suspicious raccoon quietly traded umbrellas for moonlight cupcakes.',
    'The pirate professor accidentally taught the parrot advanced geometry.',
    'My toaster declared itself emperor and demanded a royal banana treaty.',
    'A cheerful octopus won the talent show with a trumpet solo and dramatic wobble.',
    'The bakery ghost was blamed for stealing every cinnamon roll before sunrise.',
    'A nervous magician turned the mailbox into a dragon and hid behind it.',
    'The garden gnome refused to leave until the fountain sang opera loudly.',
    'A rebellious skateboard rolled away carrying the mayor along with groceries.'
  ],
  hard: [
    'The overconfident fox attempted to negotiate peace with a marching band of alarmed pigeons.',
    'An eccentric philosopher disguised as a squirrel invented a new theory about planetary tacos.',
    'The moonlit circus hired a grumpy penguin to juggle thunder, umbrellas, and ancient keys.',
    'A pirate librarian ran a midnight workshop for invisible goats and suspiciously loud violinists.',
    'The sleepy astronomer accidentally launched a sandwich into orbit while arguing with a toaster.',
    'A dramatic cactus opened a bakery and insisted every pastry be served with thunderous applause.',
    'The invisible drummer accidentally summoned three tide pools, twelve umbrellas, and one offended goose.',
    'A reckless astronaut fed the moon a burrito, then spent two hours apologizing to the stars.',
    'The bicycle choir performed a thunderous symphony beside a haunted fountain and a nervous raccoon.',
    'A moonwalking potato convinced the city council that umbrellas were a crucial part of modern diplomacy.'
  ]
};

const rooms = {};

function sanitizeName(value) {
  const clean = String(value || '').replace(/[<>]/g, '').trim();
  return clean.slice(0, 20);
}

function sanitizeRoomCode(value) {
  const clean = String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.slice(0, 4);
}

function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

function getRoomBySocketId(socketId) {
  return Object.values(rooms).find((room) => room.players.some((player) => player.id === socketId));
}

function emitError(socket, message) {
  socket.emit('errorMessage', { message });
}

function serializeRoom(room) {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      totalScore: player.totalScore,
      combo: player.combo,
      progress: player.progress,
      finished: player.finished,
      finishTime: player.finishTime,
      place: player.place,
      correctWords: player.correctWords,
      connected: player.connected
    })),
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    challenge: room.challenge,
    difficulty: room.difficulty,
    phase: room.phase,
    gameStarted: room.gameStarted,
    roundActive: room.roundActive,
    countdown: room.countdown,
    roundResults: room.roundResults || [],
    finalResults: room.finalResults || []
  };
}

function getCompletedWordCount(prefixText) {
  const trimmed = prefixText.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function calculateProgress(inputText, challengeText) {
  let correctChars = 0;
  const maxLength = Math.min(inputText.length, challengeText.length);

  for (let i = 0; i < maxLength; i += 1) {
    if (inputText[i] === challengeText[i]) {
      correctChars += 1;
    } else {
      break;
    }
  }

  const progress = challengeText.length > 0 ? (correctChars / challengeText.length) * 100 : 0;
  const completedWords = getCompletedWordCount(challengeText.slice(0, correctChars));

  return {
    correctChars,
    progress: Math.min(progress, 100),
    completedWords
  };
}

function calculateRanking(room) {
  const finishers = room.players
    .filter((player) => player.finished)
    .sort((a, b) => a.finishTime - b.finishTime);

  const nonFinishers = room.players
    .filter((player) => !player.finished)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0) || (b.score || 0) - (a.score || 0));

  const ranked = [...finishers, ...nonFinishers];
  const results = ranked.map((player, index) => ({
    id: player.id,
    name: player.name,
    score: player.score,
    totalScore: player.totalScore,
    progress: player.progress,
    combo: player.combo,
    finished: player.finished,
    place: index + 1,
    finishTime: player.finishTime
  }));

  return results;
}

function createPlayer(id, name) {
  return {
    id,
    name,
    score: 0,
    totalScore: 0,
    combo: 1,
    progress: 0,
    finished: false,
    finishTime: null,
    place: null,
    correctWords: 0,
    connected: true,
    latestEntry: ''
  };
}

function clearRoundTimers(room) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }

  if (room.finishTimer) {
    clearTimeout(room.finishTimer);
    room.finishTimer = null;
  }
}

function pickRandomChallenge(room) {
  const difficultyPool = ['easy', 'medium', 'hard'];
  const difficulty = difficultyPool[Math.floor(Math.random() * difficultyPool.length)];
  const list = CHALLENGES[difficulty];
  let challenge = list[Math.floor(Math.random() * list.length)];

  if (room && room.previousChallenge && challenge === room.previousChallenge && list.length > 1) {
    challenge = list[(list.indexOf(challenge) + 1) % list.length];
  }

  room.previousChallenge = challenge;
  room.challenge = challenge;
  room.difficulty = difficulty;
  return challenge;
}

function resetPlayerForRound(player) {
  player.score = 0;
  player.combo = 1;
  player.progress = 0;
  player.finished = false;
  player.finishTime = null;
  player.place = null;
  player.correctWords = 0;
  player.latestEntry = '';
}

function startRound(room, roundNumber) {
  clearRoundTimers(room);

  room.currentRound = roundNumber;
  room.phase = 'countdown';
  room.gameStarted = true;
  room.roundActive = false;
  room.countdown = 3;
  room.roundResults = [];
  room.finishWindowStarted = false;
  room.finishWindowDeadline = null;
  room.roundStartTime = null;

  pickRandomChallenge(room);

  room.players.forEach((player) => {
    resetPlayerForRound(player);
  });

  emitRoomState(room);

  room.countdownTimer = setInterval(() => {
    if (!rooms[room.roomCode]) {
      clearInterval(room.countdownTimer);
      return;
    }

    room.countdown -= 1;
    io.to(room.roomCode).emit('countdown', {
      countdown: room.countdown,
      difficulty: room.difficulty,
      challenge: room.challenge,
      round: room.currentRound
    });
    emitRoomState(room);

    if (room.countdown <= 0) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
      room.phase = 'race';
      room.roundActive = true;
      room.roundStartTime = Date.now();
      room.roundResults = [];
      io.to(room.roomCode).emit('raceStart', {
        round: room.currentRound,
        challenge: room.challenge,
        difficulty: room.difficulty,
        startedAt: room.roundStartTime
      });
      emitRoomState(room);
    }
  }, 1000);
}

function endRound(room) {
  if (!room || !rooms[room.roomCode]) return;

  clearRoundTimers(room);
  room.roundActive = false;

  const results = calculateRanking(room);
  room.roundResults = results;

  room.players.forEach((player) => {
    player.totalScore = (player.totalScore || 0) + (player.score || 0);
    player.place = results.find((entry) => entry.id === player.id)?.place || player.place;
  });

  if (room.currentRound >= room.maxRounds) {
    room.phase = 'final';
    room.gameStarted = false;
    room.finalResults = [...room.players]
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0) || a.name.localeCompare(b.name))
      .map((player, index) => ({
        id: player.id,
        name: player.name,
        totalScore: player.totalScore,
        rank: index + 1
      }));

    io.to(room.roomCode).emit('gameComplete', {
      results: room.finalResults,
      message: 'Game Complete! Highest total score wins the match.'
    });
    emitRoomState(room);
    return;
  }

  room.phase = 'results';
  io.to(room.roomCode).emit('roundResults', {
    round: room.currentRound,
    results
  });
  emitRoomState(room);
}

function startFinishWindow(room) {
  if (!room || room.finishWindowStarted) return;
  room.finishWindowStarted = true;
  room.finishWindowDeadline = Date.now() + FINISH_WINDOW_MS;

  room.finishTimer = setTimeout(() => {
    endRound(room);
  }, FINISH_WINDOW_MS);
}

function maybeEndRound(room) {
  if (!room || !rooms[room.roomCode]) return;

  if (room.players.length > 0 && room.players.every((player) => player.finished)) {
    endRound(room);
    return;
  }

  const firstFinished = room.players.filter((player) => player.finished).length > 0;
  if (firstFinished && room.finishWindowStarted) {
    if (room.players.every((player) => player.finished || !player.eligibleToContinue)) {
      endRound(room);
    }
  }
}

function handleTyping(socket, payload) {
  if (!payload || typeof payload !== 'object') return;

  const roomCode = sanitizeRoomCode(payload.roomCode || '');
  const room = rooms[roomCode];

  if (!room || !room.roundActive) return;

  const player = room.players.find((entry) => entry.id === socket.id);
  if (!player || player.finished) return;

  const text = String(payload.text || '').slice(0, room.challenge.length);
  const comparison = calculateProgress(text, room.challenge);
  const mismatchDetected = text.length > 0 && comparison.correctChars < text.length;

  if (mismatchDetected) {
    player.combo = 1;
  }

  player.progress = comparison.progress;

  if (comparison.completedWords > player.correctWords) {
    const completedNewWords = comparison.completedWords - player.correctWords;
    for (let i = 0; i < completedNewWords; i += 1) {
      const pointsEarned = 10 * player.combo;
      player.score += pointsEarned;
      player.combo += 1;
    }
    player.correctWords = comparison.completedWords;
  }

  const isExactMatch = text === room.challenge;
  if (isExactMatch) {
    player.progress = 100;
    player.finished = true;
    player.finishTime = Date.now() - room.roundStartTime;
    player.combo = Math.max(1, player.combo);

    if (!room.finishWindowStarted) {
      startFinishWindow(room);
    }

    const finishedCount = room.players.filter((entry) => entry.finished).length;
    if (finishedCount === room.players.length || room.finishWindowStarted) {
      const allFinished = room.players.every((entry) => entry.finished);
      if (allFinished || finishedCount > 0) {
        const hasFirstFinish = room.players.some((entry) => entry.finished && entry.finishTime !== null);
        if (hasFirstFinish) {
          endRound(room);
          return;
        }
      }
    }
  }

  if (comparison.completedWords < player.correctWords) {
    player.correctWords = comparison.completedWords;
  }

  io.to(room.roomCode).emit('playerProgress', {
    players: room.players.map((entry) => ({
      id: entry.id,
      name: entry.name,
      score: entry.score,
      combo: entry.combo,
      progress: entry.progress,
      finished: entry.finished,
      totalScore: entry.totalScore
    }))
  });

  emitRoomState(room);

  const everyFinished = room.players.length > 0 && room.players.every((entry) => entry.finished);
  if (everyFinished) {
    endRound(room);
  }
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ playerName } = {}) => {
    const existingRoom = getRoomBySocketId(socket.id);
    if (existingRoom) {
      emitError(socket, 'You are already in a room.');
      return;
    }

    const safeName = sanitizeName(playerName);
    if (!safeName) {
      emitError(socket, 'Please enter your name.');
      return;
    }

    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    const room = {
      roomCode,
      hostId: socket.id,
      players: [],
      currentRound: 0,
      maxRounds: MAX_ROUNDS,
      challenge: '',
      difficulty: 'medium',
      gameStarted: false,
      phase: 'lobby',
      roundActive: false,
      countdown: 0,
      previousChallenge: null,
      roundStartTime: null,
      finishWindowStarted: false,
      finishWindowDeadline: null,
      countdownTimer: null,
      finishTimer: null,
      roundResults: [],
      finalResults: []
    };

    const player = createPlayer(socket.id, safeName);
    room.players.push(player);
    rooms[roomCode] = room;
    socket.join(roomCode);

    socket.emit('roomCreated', { roomCode });
    io.to(roomCode).emit('roomUpdate', serializeRoom(room));
  });

  socket.on('joinRoom', ({ roomCode, playerName } = {}) => {
    const existingRoom = getRoomBySocketId(socket.id);
    if (existingRoom) {
      emitError(socket, 'You are already in a room.');
      return;
    }

    const safeName = sanitizeName(playerName);
    if (!safeName) {
      emitError(socket, 'Please enter your name.');
      return;
    }

    const normalizedCode = sanitizeRoomCode(roomCode);
    if (!normalizedCode) {
      emitError(socket, 'Please enter a room code.');
      return;
    }

    const room = rooms[normalizedCode];
    if (!room) {
      emitError(socket, 'Room not found.');
      return;
    }

    if (room.gameStarted) {
      emitError(socket, 'This game has already started.');
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      emitError(socket, 'This room is full.');
      return;
    }

    const player = createPlayer(socket.id, safeName);
    room.players.push(player);
    socket.join(normalizedCode);

    socket.emit('joinedRoom', { roomCode: normalizedCode });
    io.to(normalizedCode).emit('roomUpdate', serializeRoom(room));
  });

  socket.on('startGame', ({ roomCode } = {}) => {
    const room = rooms[sanitizeRoomCode(roomCode)];
    if (!room) {
      emitError(socket, 'Room not found.');
      return;
    }

    if (room.hostId !== socket.id) {
      emitError(socket, 'Only the host can start the game.');
      return;
    }

    if (room.players.length < 2) {
      emitError(socket, 'At least 2 players are required.');
      return;
    }

    if (room.gameStarted) {
      return;
    }

    room.currentRound = 1;
    startRound(room, 1);
  });

  socket.on('nextRound', ({ roomCode } = {}) => {
    const room = rooms[sanitizeRoomCode(roomCode)];
    if (!room) {
      emitError(socket, 'Room not found.');
      return;
    }

    if (room.hostId !== socket.id) {
      emitError(socket, 'Only the host can start the next round.');
      return;
    }

    if (room.currentRound >= room.maxRounds) {
      return;
    }

    const nextRound = room.currentRound + 1;
    startRound(room, nextRound);
  });

  socket.on('typing', (payload) => {
    handleTyping(socket, payload);
  });

  socket.on('disconnect', () => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const playerIndex = room.players.findIndex((player) => player.id === socket.id);
    if (playerIndex >= 0) {
      room.players.splice(playerIndex, 1);
    }

    if (room.players.length === 0) {
      clearRoundTimers(room);
      delete rooms[room.roomCode];
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      io.to(room.roomCode).emit('newHost', { hostId: room.hostId });
    }

    io.to(room.roomCode).emit('roomUpdate', serializeRoom(room));
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Type Race server running on http://localhost:${PORT}`);
});
