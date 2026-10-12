const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'Angel Arena demo server' }));

// In-memory, single-room demo state. Node's event loop serializes these bid handlers
// within this one process. This is not a production investment platform.
const ROUND_MS = 180000;
let pitch = { phase: 'waiting', endAt: null, remaining: ROUND_MS, bids: [], balances: {}, offersTotal: 0 };
const investorSockets = new Map();
function snapshot() {
  return { phase: pitch.phase, endAt: pitch.endAt, remaining: pitch.phase === 'active' ? Math.max(0, pitch.endAt - Date.now()) : pitch.remaining,
    bids: pitch.bids, balances: pitch.balances, offersTotal: pitch.offersTotal, serverTime: Date.now() };
}
function broadcast() { io.emit('arena:state', snapshot()); }
function expireIfNeeded() {
  if (pitch.phase === 'active' && Date.now() >= pitch.endAt) {
    pitch.phase = 'ended'; pitch.remaining = 0; pitch.endAt = null; broadcast();
  }
}
setInterval(expireIfNeeded, 100);
function reply(cb, data) { if (typeof cb === 'function') cb(data); }
io.on('connection', socket => {
  socket.on('arena:join', (payload = {}) => {
    const role = payload.role === 'founder' ? 'founder' : 'investor';
    const investorId = String(payload.investorId || socket.id).slice(0, 80);
    const name = String(payload.name || (role === 'founder' ? 'Founder' : 'Investor')).trim().slice(0, 25) || 'Investor';
    socket.data.role = role; socket.data.investorId = investorId; socket.data.name = name;
    investorSockets.set(socket.id, investorId);
    if (pitch.balances[investorId] == null) pitch.balances[investorId] = 2000000;
    socket.emit('arena:state', snapshot());
  });
  socket.on('arena:start', (_payload = {}, cb) => {
    if (socket.data.role !== 'founder') return reply(cb, { ok: false, error: 'Only Founder role can start the pitch.' });
    if (pitch.phase === 'active') return reply(cb, { ok: false, error: 'Pitch is already running.' });
    if (pitch.phase === 'ended') return reply(cb, { ok: false, error: 'Reset the round before starting again.' });
    pitch.phase = 'active'; pitch.endAt = Date.now() + ROUND_MS; pitch.remaining = ROUND_MS;
    broadcast(); reply(cb, { ok: true });
  });
  socket.on('arena:reset', (_payload = {}, cb) => {
    if (socket.data.role !== 'founder') return reply(cb, { ok: false, error: 'Only Founder role can reset the room.' });
    pitch.phase = 'waiting'; pitch.endAt = null; pitch.remaining = ROUND_MS; pitch.bids = []; pitch.offersTotal = 0;
    // Reset balances for this demo room.
    Object.keys(pitch.balances).forEach(id => pitch.balances[id] = 2000000);
    broadcast(); reply(cb, { ok: true });
  });
  socket.on('arena:bid', (payload = {}, cb) => {
    // All validation and balance mutation happen synchronously in one event callback.
    // Concurrent messages are serialized by this single Node.js process.
    expireIfNeeded();
    if (socket.data.role !== 'investor') return reply(cb, { ok: false, error: 'Only investors can submit offers.' });
    if (pitch.phase !== 'active' || !pitch.endAt || Date.now() >= pitch.endAt) return reply(cb, { ok: false, error: 'The pitch window is closed. Your offer was rolled back.' });
    const investorId = socket.data.investorId;
    if (String(payload.investorId || '') !== investorId) return reply(cb, { ok: false, error: 'Investor session mismatch.' });
    const amount = Number(payload.amount), equity = Number(payload.equity);
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 2000000) return reply(cb, { ok: false, error: 'Offer must be a whole-dollar amount from $1,000 to $2,000,000.' });
    if (!Number.isFinite(equity) || equity < 0.1 || equity > 30) return reply(cb, { ok: false, error: 'Equity must be between 0.1% and 30%.' });
    if ((pitch.balances[investorId] ?? 2000000) < amount) return reply(cb, { ok: false, error: 'Insufficient mock balance. Offer was rolled back.' });
    pitch.balances[investorId] -= amount;
    const bid = { id: `${investorId}-${Date.now()}-${++pitch.offersTotal}`, investorId, name: socket.data.name || String(payload.name || 'Investor').slice(0,25), amount, equity: Math.round(equity * 10) / 10, time: Date.now() };
    pitch.bids.unshift(bid); pitch.bids = pitch.bids.slice(0, 100);
    broadcast(); reply(cb, { ok: true, bidId: bid.id });
  });
  socket.on('disconnect', () => investorSockets.delete(socket.id));
});
server.listen(PORT, '0.0.0.0', () => console.log(`E-Cell demos available at http://localhost:${PORT}`));
