import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { connectDB } from './db'; 
import chatRoutes from './routes/chat';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
  });
});
