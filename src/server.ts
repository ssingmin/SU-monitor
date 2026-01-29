import express, { Request, Response } from 'express';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/api/connect', (req: Request, res: Response) => {
    const portName = req.body.port;
    console.log(`[Server] 포트 연결 요청 받음: ${portName}`);
    res.json({ 
        status: 'ok', 
        message: `${portName} 포트가 정상적으로 연결되었습니다. (가상)` 
    });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 대기 중: http://localhost:${PORT}`);
});