const express = require('express');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

// Se conectează la Redis folosind variabila de mediu
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

redis.on('connect', () => console.log('✅ Conectat cu succes la Redis!'));
redis.on('error', (err) => console.error('❌ Eroare Redis:', err));

// 1. ENDPOINT: Raportează un radar nou
app.post('/raporteaza', async (req, res) => {
    const { lat, lng, tip, strada } = req.body;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Coordonate GPS lipsă!' });
    }

    const idRadar = `radar:${lat.toFixed(3)}:${lng.toFixed(3)}`;

    const dateRadar = {
        lat,
        lng,
        tip: tip || 'radar pistol',
        strada: strada || 'Drum necunoscut',
        timestamp: Date.now()
    };

    try {
        // Salvează în Redis și setează expirarea automată la 600 secunde (10 minute)
        await redis.set(idRadar, JSON.stringify(dateRadar), 'EX', 600);
        
        console.log(`Radar adăugat/resetat: ${idRadar} pe strada ${strada}`);
        return res.json({ success: true, message: 'Radar înregistrat pentru 10 minute!' });
    } catch (err) {
        return res.status(500).json({ error: 'Eroare la salvarea în server.' });
    }
});

// 2. ENDPOINT: Dă-mi toate radarele active
app.get('/radare', async (req, res) => {
    try {
        const chei = await redis.keys('radar:*');
        if (chei.length === 0) {
            return res.json([]);
        }

        const radareSirove = await redis.mget(chei);
        const radare = radareSirove.map(r => JSON.parse(r));

        return res.json(radare);
    } catch (err) {
        return res.status(500).json({ error: 'Eroare la citirea radarelor.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serverul de radare rulează pe portul ${PORT}`);
});
