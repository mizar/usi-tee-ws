#!/usr/bin/env ts-node
import { ArgumentParser, REMAINDER } from "argparse";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { exit } from "process";
import express from "express";
import expressStaticGzip from "express-static-gzip";
import expressWs from "express-ws";
import * as ws from 'ws';
const { version } = require("./package.json");
const { app, getWss, applyTo } = expressWs(express());

// argument parse

const argparser = new ArgumentParser({
  description: "Argparse example",
});

argparser.add_argument('-v', '--version', { action: 'version', version });
argparser.add_argument('-p', '--port', { help: 'usi-tee-ws server port (default: 8080)', default: 8080 });
argparser.add_argument('-c', '--cwd', { help: 'engine execute temporary path (default: .)', default: '.' });
argparser.add_argument('engine', { help: 'usi engine' });
argparser.add_argument('engineargs', { help: 'usi engine arguments', nargs: REMAINDER });

const args = argparser.parse_args();
console.dir(args);

// usi_position cache

const POS_HIRATE = "position startpos";
let usi_position = POS_HIRATE;
let usi_go: string | null = null;
let usi_ponderhit: string | null = null;
let usi_stop: string | null = null;
let usie_info: string[] = [];
let usie_bestmove: string | null = null;

// http/ws server

interface WsIsAlive {
  isAlive: boolean;
}
let wsConnects: (ws & WsIsAlive)[] = [];

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');

  // intercept OPTIONS method
  if ('OPTIONS' === req.method) {
    res.send(200)
  } else {
    next()
  }
});
app.use("/", expressStaticGzip("./public/", {
  enableBrotli: true,
  orderPreference: ['br']
}));
app.use("/yaneuraou.halfkp/", expressStaticGzip("./node_modules/@mizarjp/yaneuraou.halfkp/lib/", {
  enableBrotli: true,
  orderPreference: ['br']
}));
app.use("/yaneuraou.k-p/", expressStaticGzip("./node_modules/@mizarjp/yaneuraou.k-p/lib/", {
  enableBrotli: true,
  orderPreference: ['br']
}));
app.use("/mithril.min.js", express.static(__dirname + "/node_modules/mithril/mithril.min.js"));
app.ws("/usi.ws", (ws, _req) => {
  wsConnects.push(ws as unknown as ws & WsIsAlive);
  console.log("ws connect detected");
  (ws as unknown as ws & WsIsAlive).isAlive = true;
  ws.on("pong", function() {
    (this as unknown as ws & WsIsAlive).isAlive = true;
  });
  ws.on("message", (message) => {
    switch (message.toString()) {
      case "hello":
        // ws.send("hello from server!");
        break;
    }
  });
  ws.on("close", () => {
    console.log("ws close detected");
    wsConnects = wsConnects.filter(conn => (conn !== ws));
  });
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ sender: "cache_ui", d: usi_position }));
      if (usi_go) {
        ws.send(JSON.stringify({ sender: "cache_ui", d: usi_go }));
      }
      if (usi_ponderhit) {
        ws.send(JSON.stringify({ sender: "cache_ui", d: usi_ponderhit }));
      }
      if (usi_stop) {
        ws.send(JSON.stringify({ sender: "cache_ui", d: usi_stop }));
      }
      for (let i = 0; i < usie_info.length; i++) {
        if (usie_info[i]) {
          ws.send(JSON.stringify({ sender: "cache_engine", d: usie_info[i] }));
        }
      }
      if (usie_bestmove) {
        ws.send(JSON.stringify({ sender: "cache_engine", d: usie_bestmove }));
      }
    }
  } catch (e) {
    console.error(e);
    try {
      ws.terminate();
    } catch (e) {
      console.error(e);
    }
  }
});
const server = app.listen(args.port, () => {
  console.log(`http://localhost:${args.port}/`);
});

// client alive check

const interval = setInterval(function ping() {
  wsConnects.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// spawn usi engine

const subproc = spawn(args.engine, args.engineargs, { cwd: args.cwd });

process.stdin.setEncoding("utf8");
process.stdout.setEncoding("utf8");
process.stderr.setEncoding("utf8");
subproc.stdin.setDefaultEncoding("utf8");
subproc.stdout.setEncoding("utf8");
subproc.stderr.setEncoding("utf8");

const rl_main = createInterface({ input: process.stdin });
const rl_subp = createInterface({ input: subproc.stdout });

// Processing pipe messages

rl_main.on("line", (line) => {
  subproc.stdin.write(line + "\n");
  for (const ws of wsConnects) {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ sender: "ui", d: line }));
      }
    } catch (e) {
      console.error(e);
      try {
        ws.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
  if (line.startsWith("position")) {
    usi_position = line;
    usi_go = null;
    usi_ponderhit = null;
    usi_stop = null;
    usie_info = [];
    usie_bestmove = null;
  }
  if (line.startsWith("go")) {
    usi_go = line;
    usi_ponderhit = null;
    usi_stop = null;
    usie_info = [];
    usie_bestmove = null;
  }
  if (line.startsWith("ponderhit")) {
    usi_ponderhit = line;
  }
  if (line.startsWith("stop")) {
    usi_stop = line;
  }
  if (line.startsWith("gameover")) {
    usi_stop = line;
  }
  if (line.startsWith("isready")) {
    usi_position = POS_HIRATE;
    usi_go = null;
    usi_ponderhit = null;
    usi_stop = null;
    usie_info = [];
    usie_bestmove = null;
  }
  if (line.startsWith("quit")) {
    clearInterval(interval);
    setTimeout(() => {
      server.close();
      subproc.kill();
      exit();
    }, 1000);
  }
});
rl_subp.on("line", (line) => {
  process.stdout.write(line + "\n");
  for (const ws of wsConnects) {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ sender: "engine", d: line }));
      }
    } catch (e) {
      console.error(e);
      try {
        ws.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
  if (line.startsWith("info")) {
    const found = line.match(/multipv (?<multipv>[0-9]+) /);
    if (found) {
      usie_info[parseInt((found.groups ?? {}).multipv)] = line;
    } else {
      let trline = line;
      const istring = line.indexOf("string");
      if (istring >= 0) {
        trline = line.substring(0, istring);
      }
      if (trline.includes("score") || trline.includes("pv")) {
        usie_info[0] = line;
      }
    }
  }
  if (line.startsWith("bestmove") || line.startsWith("checkmate")) {
    usie_bestmove = line;
  }
});

// When the pipe is closed, terminate the server, sub-process, and current process.

rl_main.on("close", () => {
  clearInterval(interval);
  server.close();
  subproc.kill();
  exit();
});
rl_subp.on("close", () => {
  clearInterval(interval);
  server.close();
  exit();
});

