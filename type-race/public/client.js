const socket = io();

const state = {
  room: null,
  currentRoomCode: ''
};

const screens = {
  lobby: document.getElementById('lobbyScreen'),
  room: document.getElementById('roomScreen'),
  countdown: document.getElementById('countdownScreen'),
  game: document.getElementById('gameScreen'),
  results: document.getElementById('resultsScreen'),
  final: document.getElementById('finalScreen')
};

const refs = {
  playerNameInput: document.getElementById('playerNameInput'),
  roomCodeInput: document.getElementById('roomCodeInput'),
  createRoomBtn: document.getElementById('createRoomBtn'),
  joinRoomBtn: document.getElementById('joinRoomBtn'),
  startGameBtn: document.getElementById('startGameBtn'),
  nextRoundBtn: document.getElementById('nextRoundBtn'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  statusMessage: document.getElementById('statusMessage'),
  connectionStatus: document.getElementById('connectionStatus'),
  roomCodeDisplay: document.getElementById('roomCodeDisplay'),
  playersList: document.getElementById('playersList'),
  roundNumber: document.getElementById('roundNumber'),
  currentScore: document.getElementById('currentScore'),
  currentCombo: document.getElementById('currentCombo'),
  difficultyLabel: document.getElementById('difficultyLabel'),
  challengeText: document.getElementById('challengeText'),
  typingInput: document.getElementById('typingInput'),
  progressText: document.getElementById('progressText'),
  progressBarFill: document.getElementById('progressBarFill'),
  standingsList: document.getElementById('standingsList'),
  countdownRoundLabel: document.getElementById('countdownRoundLabel'),
  countdownValue: document.getElementById('countdownValue'),
  countdownDifficulty: document.getElementById('countdownDifficulty'),
  resultsList: document.getElementById('resultsList'),
  resultsStatus: document.getElementById('resultsStatus'),
  finalLeaderboard: document.getElementById('finalLeaderboard'),
  finalMessage: document.getElementById('finalMessage')
};

function setStatus(message, tone = 'info') {
  refs.statusMessage.textContent = message || '';
  refs.statusMessage.classList.remove('error', 'success');
  if (tone === 'error') {
    refs.statusMessage.classList.add('error');
  }
  if (tone === 'success') {
    refs.statusMessage.classList.add('success');
  }
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.classList.toggle('active', key === name);
  });
}

function getCurrentPlayer(room) {
  if (!room) return null;
  return room.players.find((player) => player.id === socket.id) || null;
}

function setConnectionStatus(isConnected) {
  refs.connectionStatus.textContent = isConnected ? 'Connected' : 'Disconnected';
  refs.connectionStatus.classList.toggle('disconnected', !isConnected);
}

function renderLobbyPlayers(room) {
  refs.playersList.innerHTML = '';

  room.players.forEach((player) => {
    const item = document.createElement('li');
    item.className = 'player-row';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'player-name-wrap';

    const name = document.createElement('span');
    name.textContent = player.name;
    nameWrap.appendChild(name);

    if (player.id === room.hostId) {
      const badge = document.createElement('span');
      badge.className = 'host-badge';
      badge.textContent = 'Host';
      nameWrap.appendChild(badge);
    }

    item.appendChild(nameWrap);
    refs.playersList.appendChild(item);
  });
}

function renderRoomScreen(room) {
  refs.roomCodeDisplay.textContent = room.roomCode;
  renderLobbyPlayers(room);

  const isHost = room.hostId === socket.id;
  refs.startGameBtn.disabled = !isHost || room.players.length < 2;
  refs.startGameBtn.classList.toggle('hidden', !isHost);
}

function renderRaceScreen(room) {
  const player = getCurrentPlayer(room);
  const roundLabel = `Round ${room.currentRound}/${room.maxRounds}`;
  refs.roundNumber.textContent = roundLabel;
  refs.currentScore.textContent = String(player ? player.score : 0);
  refs.currentCombo.textContent = `${player && player.combo ? player.combo : 1}x`;
  refs.difficultyLabel.textContent = room.difficulty || 'Medium';
  refs.challengeText.textContent = room.challenge || '';
  refs.progressText.textContent = `${Math.round(player ? player.progress : 0)}%`;
  refs.progressBarFill.style.width = `${Math.min(100, Math.max(0, player ? player.progress : 0))}%`;

  const myFinished = !!(player && player.finished);
  refs.typingInput.disabled = !room.roundActive || myFinished;
  if (room.roundActive) {
    refs.typingInput.placeholder = myFinished ? 'Finished' : 'Type here...';
  } else {
    refs.typingInput.placeholder = 'Waiting for the round to start...';
  }

  refs.standingsList.innerHTML = '';
  const orderedPlayers = [...room.players].sort((a, b) => (b.progress || 0) - (a.progress || 0));

  orderedPlayers.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'standing-row';

    const info = document.createElement('div');
    info.className = 'standing-meta';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'player-name-wrap';
    const name = document.createElement('span');
    name.textContent = entry.name;
    nameWrap.appendChild(name);

    if (entry.id === room.hostId) {
      const badge = document.createElement('span');
      badge.className = 'host-badge';
      badge.textContent = 'Host';
      nameWrap.appendChild(badge);
    }

    const progressBadge = document.createElement('span');
    progressBadge.className = 'progress-pill';
    progressBadge.textContent = `${Math.round(entry.progress || 0)}%`;

    const scoreText = document.createElement('div');
    scoreText.textContent = `${entry.score || 0} pts`;

    const comboText = document.createElement('div');
    comboText.textContent = `${entry.combo || 1}x`;

    info.appendChild(nameWrap);
    info.appendChild(scoreText);
    info.appendChild(comboText);

    const status = document.createElement('div');
    status.className = `status-chip ${entry.finished ? '' : 'pending'}`;
    status.textContent = entry.finished ? 'Finished' : `${Math.round(entry.progress || 0)}%`;

    item.appendChild(info);
    item.appendChild(progressBadge);
    item.appendChild(status);
    refs.standingsList.appendChild(item);
  });
}

function renderResultsScreen(room) {
  refs.resultsList.innerHTML = '';
  const results = room.roundResults || [];

  results.forEach((result) => {
    const item = document.createElement('li');
    item.className = 'result-row';

    const info = document.createElement('div');
    info.innerHTML = `<strong>${result.place}. ${result.name}</strong>`;
    const meta = document.createElement('div');
    meta.textContent = `${result.score} pts`;

    item.appendChild(info);
    item.appendChild(meta);
    refs.resultsList.appendChild(item);
  });

  const isHost = room.hostId === socket.id;
  refs.nextRoundBtn.classList.toggle('hidden', !isHost || room.currentRound >= room.maxRounds || room.phase !== 'results');
  refs.resultsStatus.textContent = isHost ? 'Ready for the next round.' : 'Waiting for the host...';
}

function renderFinalScreen(room) {
  refs.finalLeaderboard.innerHTML = '';
  const finalResults = room.finalResults || [];

  finalResults.forEach((result) => {
    const item = document.createElement('li');
    item.className = 'result-row';

    const info = document.createElement('div');
    info.innerHTML = `<strong>${result.rank}. ${result.name}</strong>`;
    const meta = document.createElement('div');
    meta.textContent = `${result.totalScore} pts`;

    item.appendChild(info);
    item.appendChild(meta);
    refs.finalLeaderboard.appendChild(item);
  });

  refs.finalMessage.textContent = 'Highest total score wins the match.';
}

function renderCurrentState() {
  const room = state.room;

  if (!room) {
    showScreen('lobby');
    return;
  }

  if (room.phase === 'lobby') {
    showScreen('room');
    renderRoomScreen(room);
    return;
  }

  if (room.phase === 'countdown') {
    refs.countdownRoundLabel.textContent = `Round ${room.currentRound}`;
    refs.countdownValue.textContent = String(room.countdown > 0 ? room.countdown : 'GO!');
    refs.countdownDifficulty.textContent = `Difficulty: ${room.difficulty}`;
    showScreen('countdown');
    return;
  }

  if (room.phase === 'race') {
    showScreen('game');
    renderRaceScreen(room);
    return;
  }

  if (room.phase === 'results') {
    showScreen('results');
    renderResultsScreen(room);
    return;
  }

  if (room.phase === 'final') {
    showScreen('final');
    renderFinalScreen(room);
    return;
  }

  showScreen('room');
  renderRoomScreen(room);
}

function handleRoomUpdate(room) {
  state.room = room;
  renderCurrentState();
}

function createRoom() {
  const playerName = refs.playerNameInput.value.trim();
  if (!playerName) {
    setStatus('Please enter your name.', 'error');
    return;
  }

  socket.emit('createRoom', { playerName });
  setStatus('Creating room...', 'success');
}

function joinRoom() {
  const playerName = refs.playerNameInput.value.trim();
  const roomCode = refs.roomCodeInput.value.trim();

  if (!playerName) {
    setStatus('Please enter your name.', 'error');
    return;
  }

  if (!roomCode) {
    setStatus('Please enter a room code.', 'error');
    return;
  }

  socket.emit('joinRoom', { roomCode, playerName });
  setStatus('Joining room...', 'success');
}

function startGame() {
  if (!state.room) return;
  socket.emit('startGame', { roomCode: state.room.roomCode });
}

function nextRound() {
  if (!state.room) return;
  socket.emit('nextRound', { roomCode: state.room.roomCode });
}

function resetToLobby() {
  state.room = null;
  state.currentRoomCode = '';
  refs.roomCodeInput.value = '';
  refs.typingInput.value = '';
  refs.playersList.innerHTML = '';
  refs.resultsList.innerHTML = '';
  refs.finalLeaderboard.innerHTML = '';
  setStatus('');
  showScreen('lobby');
}

socket.on('connect', () => {
  setConnectionStatus(true);
});

socket.on('disconnect', () => {
  setConnectionStatus(false);
  setStatus('Connection lost. Reconnecting...', 'error');
});

socket.on('errorMessage', ({ message }) => {
  setStatus(message, 'error');
});

socket.on('roomCreated', ({ roomCode }) => {
  state.currentRoomCode = roomCode;
  refs.roomCodeInput.value = roomCode;
  setStatus(`Room ${roomCode} created. Share it with friends.`, 'success');
});

socket.on('joinedRoom', ({ roomCode }) => {
  state.currentRoomCode = roomCode;
  refs.roomCodeInput.value = roomCode;
  setStatus(`Joined room ${roomCode}.`, 'success');
});

socket.on('newHost', ({ hostId }) => {
  if (state.room) {
    state.room.hostId = hostId;
    renderCurrentState();
  }
});

socket.on('roomUpdate', (room) => {
  handleRoomUpdate(room);
});

socket.on('countdown', ({ countdown, difficulty, round }) => {
  if (!state.room) return;
  refs.countdownRoundLabel.textContent = `Round ${round}`;
  refs.countdownValue.textContent = String(countdown > 0 ? countdown : 'GO!');
  refs.countdownDifficulty.textContent = `Difficulty: ${difficulty}`;
  if (countdown === 0) {
    refs.typingInput.value = '';
  }
});

socket.on('raceStart', ({ round, challenge, difficulty }) => {
  refs.typingInput.value = '';
  refs.typingInput.disabled = false;
  refs.typingInput.focus();
  refs.roundNumber.textContent = `Round ${round}/${state.room ? state.room.maxRounds : 3}`;
  refs.challengeText.textContent = challenge;
  refs.difficultyLabel.textContent = difficulty;
  refs.countdownValue.textContent = 'GO!';
});

socket.on('playerProgress', (payload) => {
  if (!state.room) return;
  const myPlayer = state.room.players.find((player) => player.id === socket.id);
  if (myPlayer) {
    refs.currentScore.textContent = String(myPlayer.score || 0);
    refs.currentCombo.textContent = `${myPlayer.combo || 1}x`;
    refs.progressText.textContent = `${Math.round(myPlayer.progress || 0)}%`;
    refs.progressBarFill.style.width = `${Math.min(100, Math.max(0, myPlayer.progress || 0))}%`;
  }
});

socket.on('roundResults', ({ round, results }) => {
  if (!state.room) return;
  state.room.roundResults = results;
  state.room.phase = 'results';
  state.room.currentRound = round;
  renderCurrentState();
});

socket.on('gameComplete', ({ results, message }) => {
  if (!state.room) return;
  state.room.finalResults = results;
  state.room.phase = 'final';
  refs.finalMessage.textContent = message;
  renderCurrentState();
});

refs.createRoomBtn.addEventListener('click', createRoom);
refs.joinRoomBtn.addEventListener('click', joinRoom);
refs.startGameBtn.addEventListener('click', startGame);
refs.nextRoundBtn.addEventListener('click', nextRound);
refs.playAgainBtn.addEventListener('click', () => {
  window.location.reload();
});

refs.typingInput.addEventListener('input', (event) => {
  if (!state.room || state.room.phase !== 'race') return;

  const currentPlayer = getCurrentPlayer(state.room);
  if (!currentPlayer || currentPlayer.finished) return;

  socket.emit('typing', {
    roomCode: state.room.roomCode,
    text: event.target.value
  });
});

window.addEventListener('load', () => {
  setConnectionStatus(socket.connected);
  showScreen('lobby');
  refs.typingInput.value = '';
  refs.typingInput.disabled = true;
});
