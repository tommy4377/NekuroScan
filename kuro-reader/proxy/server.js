import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 10001;

app.use(cors({
  origin: [
    'https://kuroreader.onrender.com',
    'http://localhost:5173'
  ]
}));
app.use(express.json());

// Proxy per evitare CORS
app.post('/api/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {} } = req.body;
    const response = await axios({
      method,
      url,
      headers: { 'User-Agent': 'Mozilla/5.0', ...headers },
      timeout: 15000
    });
    res.json({ success: true, data: response.data, headers: response.headers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parse HTML
app.post('/api/parse', async (req, res) => {
  try {
    const { html, selector } = req.body;
    const $ = cheerio.load(html);
    const results = [];
    $(selector).each((i, elem) => results.push($(elem).html()));
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});


