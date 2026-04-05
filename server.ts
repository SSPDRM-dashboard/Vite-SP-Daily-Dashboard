import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const PORT = 3000;

// In-memory Database
const db = {
  users: [
    { id: 1, username: 'admin', token: 'admin123', role: 'admin', district: '' },
    { id: 2, username: 'd1', token: 'd1123', role: 'user', district: 'd1' }
  ],
  passwords: {
    'carian_d1': '1234',
    'carian_d2': '1234',
    'carian_d3': '1234',
    'carian_d4': '1234'
  },
  logs: [] as any[],
  records: [] as any[]
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/warmup', (req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/login', (req, res) => {
    const { username, token } = req.query;
    const user = db.users.find(u => u.username === username && u.token === token);
    
    if (user) {
      // Log the login
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      db.logs.unshift({
        id: db.logs.length + 1,
        username: user.username,
        role: user.role,
        tab: 'today',
        loginDate: dateStr,
        loginTime: timeStr,
        logoutTime: '—'
      });
        
      res.json({ username: user.username, role: user.role, district: user.district });
    } else {
      res.json({ error: true });
    }
  });

  app.get('/api/getDistrictPasswords', (req, res) => {
    res.json({ passwords: db.passwords });
  });

  app.get('/api/getData', (req, res) => {
    // Return empty rows for now
    res.json({ rows: db.records });
  });

  app.get('/api/getMonthlyData', (req, res) => {
    res.json({ rows: [], profile: {} });
  });

  app.get('/api/getLogs', (req, res) => {
    res.json({ logs: db.logs });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
