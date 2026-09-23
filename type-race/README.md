# Type Race

A real-time multiplayer typing game where players join the same room, race to finish the same sentence, and compete across three rounds for the highest total score.

## Features

- 2-8 player multiplayer rooms
- 4-character room codes
- Real-time synchronization with Socket.IO
- Server-authoritative scoring and rankings
- 3-round match flow
- Randomized challenge difficulty and funny typing prompts
- Word combo system with mistake resets
- Countdown before each round
- Host-controlled round progression
- Final leaderboard and play-again flow
- Responsive dark interface for desktop, tablet, and mobile

## Requirements

- Node.js
- npm

## Installation

```bash
npm install
```

## Run

```bash
npm start
```

## Local URL

[http://localhost:3000](http://localhost:3000/)

## Multiplayer Testing

To test the multiplayer experience locally:

- Open two browser tabs in the same browser, or use a normal window plus an incognito window.
- One player creates a room and shares the 4-character room code.
- The second player joins the same room.
- Repeat the process on another device connected to the same Wi-Fi for a more realistic test.

The app uses localhost on the machine running the server. If you want to test over your local network, find the computer's local IP address and open the matching URL:

- Windows: `ipconfig`
- Then access a URL like: [http://YOUR_LOCAL_IP:3000](http://YOUR_LOCAL_IP:3000/)

Replace `YOUR_LOCAL_IP` with the actual IP shown by your system.

## Game Rules

1. Join a room with 2 to 8 players.
2. Everyone receives the same sentence challenge.
3. Wait for the countdown to begin.
4. Type the sentence exactly as shown.
5. Every correctly completed word increases your combo.
6. A typing mistake resets your combo to 1x.
7. The first player to finish gets first place.
8. Other players have up to 30 seconds after the first finish to keep typing.
9. Players who do not finish are ranked by progress and score.
10. The match contains 3 rounds.
11. The player with the highest final score wins the match.

## Deployment

This app is built with Node.js and Express, so it can be deployed to any Node-compatible hosting service later. You can run it locally with npm start and later move it to a platform such as Render, Railway, Vercel, or a VPS.
