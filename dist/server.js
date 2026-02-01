"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const serialport_1 = require("serialport");
const app = (0, express_1.default)();
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use(express_1.default.json());
// === 1. 포트 스캔 API ===
app.get('/api/ports', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ports = yield serialport_1.SerialPort.list();
        const portPaths = ports.map(p => p.path);
        res.json(portPaths);
    }
    catch (err) {
        res.status(500).json({ error: '스캔 실패' });
    }
}));
// === 2. SSE 설정 ===
let clients = [];
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clients.push(res);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
});
// === 3. 연결 및 데이터 처리 (강제 재연결 로직 적용) ===
let arduinoPort = null;
let parser = null;
let dataBuffer = [];
app.post('/api/connect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { port } = req.body;
    // TEST 모드 처리
    if (port.includes('TEST')) {
        res.json({ message: 'TEST 모드 연결됨' });
        return;
    }
    // [핵심 로직] 기존 연결이 있다면 강제로, 확실하게 끊기
    if (arduinoPort) {
        if (arduinoPort.isOpen) {
            console.log('기존 포트가 열려있어 닫습니다...');
            // close()는 비동기 함수라 await으로 끝날 때까지 기다려야 함
            yield new Promise((resolve) => {
                arduinoPort === null || arduinoPort === void 0 ? void 0 : arduinoPort.close((err) => {
                    if (err)
                        console.error('포트 닫기 에러:', err);
                    resolve();
                });
            });
        }
        arduinoPort = null; // 변수 초기화
        // [중요] OS가 포트 자원을 해제할 시간을 조금 줍니다 (0.5초)
        yield new Promise((resolve) => setTimeout(resolve, 500));
    }
    // 버퍼 초기화
    dataBuffer = [];
    try {
        // 새 연결 시도
        arduinoPort = new serialport_1.SerialPort({
            path: port,
            baudRate: 115200,
            autoOpen: false
        });
        parser = arduinoPort.pipe(new serialport_1.ReadlineParser({ delimiter: '\r\n' }));
        // 포트 열기 시도
        arduinoPort.open((err) => {
            if (err) {
                console.error('Connection Failed:', err.message);
                // 실패 시 클라이언트에게 에러 내용 전송
                return res.status(500).json({ message: '연결 실패 (포트 점유됨): ' + err.message });
            }
            console.log(`Connected to ${port} (Force Reconnect Success)`);
            res.json({ message: `${port} 연결 성공! (기존 연결 정리됨)` });
        });
        // 데이터 파싱 로직
        parser.on('data', (line) => {
            const regex = /Pulse Width:\s*(\d+)/;
            const match = line.match(regex);
            if (match) {
                const value = parseInt(match[1], 10);
                if (!isNaN(value)) {
                    dataBuffer.push(value);
                    if (dataBuffer.length >= 10) {
                        const csvString = dataBuffer.join(',');
                        clients.forEach(client => client.write(`data: ${csvString}\n\n`));
                        dataBuffer = [];
                    }
                }
            }
        });
        // 에러 핸들링 (연결 도중 선이 뽑혔을 때 등)
        arduinoPort.on('error', (err) => {
            console.error('Serial Port Error:', err.message);
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
