import express from 'express';
import { Worker } from 'worker_threads';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const suppliersPath = path.join(__dirname, 'data', 'suppliers.json');
const ordersPath = path.join(__dirname, 'data', 'orders.json');
const workerPath = path.join(__dirname, 'supplierWorker.js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let worker = null;
let modelTrained = false;
let trainMessageListener = null;

// Create the worker once and keep it alive. Native addons like @tensorflow/tfjs-node
// cannot be unloaded and re-registered in a new worker within the same process —
// doing so causes "Module did not self-register". Reusing the worker avoids this.
function getWorker() {
  if (!worker) {
    worker = new Worker(workerPath);
    worker.on('error', (err) => {
      console.error('Worker crashed:', err);
      worker = null;
      modelTrained = false;
    });
  }
  return worker;
}

app.get('/api/train', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Remove any lingering listener from a previous training run before reusing worker
  if (worker && trainMessageListener) {
    worker.off('message', trainMessageListener);
  }
  modelTrained = false;
  trainMessageListener = null;

  const w = getWorker();
  const suppliers = JSON.parse(readFileSync(suppliersPath, 'utf8'));
  const orders = JSON.parse(readFileSync(ordersPath, 'utf8'));

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const cleanup = () => {
    if (trainMessageListener && worker) {
      worker.off('message', trainMessageListener);
    }
    trainMessageListener = null;
  };

  req.on('close', cleanup);

  trainMessageListener = (msg) => {
    if (msg.type === 'epoch') {
      sendEvent('epoch', { epoch: msg.epoch, loss: msg.loss, accuracy: msg.accuracy });
    } else if (msg.type === 'trained') {
      modelTrained = true;
      sendEvent('trained', { accuracy: msg.accuracy, loss: msg.loss, epochs: msg.epochs });
      cleanup();
      res.end();
    } else if (msg.type === 'error') {
      sendEvent('error', { message: msg.message });
      cleanup();
      res.end();
    }
  };

  w.on('message', trainMessageListener);
  w.postMessage({ type: 'train', suppliers, orders });
});

app.post('/api/recommend', (req, res) => {
  if (!worker || !modelTrained) {
    return res.status(400).json({ error: 'Model not trained yet' });
  }

  const onMessage = (msg) => {
    if (msg.type === 'recommendations') {
      worker.off('message', onMessage);
      res.json(msg);
    } else if (msg.type === 'error') {
      worker.off('message', onMessage);
      res.status(500).json({ error: msg.message });
    }
  };

  worker.on('message', onMessage);
  worker.postMessage({ type: 'recommend', order: req.body });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
