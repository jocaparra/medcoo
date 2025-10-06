// index.js
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração Supabase (fallback para modo mock local se variáveis ausentes)
let supabase = null;
let useMock = false;
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('WARN: SUPABASE_URL or SUPABASE_KEY not set. Falling back to mock in-memory DB.');
  useMock = true;
  // Simple in-memory store for products and mock auth
  const mockDb = {
    products: [],
    users: []
  };

  supabase = {
    from: (table) => ({
      select: async () => ({ data: mockDb[table] || [], error: null }),
      insert: async (rows) => {
        const inserted = rows.map((r, i) => ({ id: (mockDb[table].length || 0) + i + 1, ...r }));
        mockDb[table] = (mockDb[table] || []).concat(inserted);
        return { data: inserted, error: null };
      },
      update: (obj) => ({
        eq: async (field, value) => {
          const items = mockDb[table] || [];
          let updated = [];
          mockDb[table] = items.map(it => {
            if (String(it[field]) === String(value)) {
              const newIt = { ...it, ...obj };
              updated.push(newIt);
              return newIt;
            }
            return it;
          });
          return { data: updated, error: null };
        }
      }),
      delete: () => ({
        eq: async (field, value) => {
          const items = mockDb[table] || [];
          const removed = items.filter(it => String(it[field]) === String(value));
          mockDb[table] = items.filter(it => String(it[field]) !== String(value));
          return { data: removed, error: null };
        }
      })
    }),
    auth: {
      signUp: async ({ email, password }) => {
        if (mockDb.users.find(u => u.email === email)) {
          return { data: null, error: { message: 'User already exists' } };
        }
        const user = { id: mockDb.users.length + 1, email, password };
        mockDb.users.push(user);
        return { data: user, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        const user = mockDb.users.find(u => u.email === email && u.password === password);
        if (!user) return { data: null, error: { message: 'Invalid credentials' } };
        return { data: user, error: null };
      }
    }
  };
} else {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  console.log('Supabase client created');
}

// Rotas de autenticação
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ data });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ data });
});

// Exemplo de CRUD para um recurso "products"
app.get('/products', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
});

app.post('/products', async (req, res) => {
  const { name, price } = req.body;
  const { data, error } = await supabase.from('products').insert([{ name, price }]);
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  const { data, error } = await supabase.from('products').update({ name, price }).eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
});

app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
console.log('app.listen called');
