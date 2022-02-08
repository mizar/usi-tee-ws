#!/usr/bin/env node
'use strict';
const { ArgumentParser, REMAINDER } = require("argparse");
const { version } = require("./package.json");
const { spawn } = require("child_process");
const { createInterface } = require("readline");
const { exit } = require("process");
const express = require("express");
const app = express();
const expressStaticGzip = require("express-static-gzip");
const expressWs = require("express-ws")(app);

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
let usi_go = null;
let usi_ponderhit = null;
let usie_info = [];

// http/ws server

let wsConnects = [];

const cors = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');

  // intercept OPTIONS method
  if ('OPTIONS' === req.method) {
    res.send(200)
  } else {
    next()
  }
}
app.use(cors)
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
  wsConnects.push(ws);
  console.log("ws connect detected");
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
      ws.send(JSON.stringify({ sender: "cache", d: usi_position }));
      if (usi_go) {
        ws.send(JSON.stringify({ sender: "cache", d: usi_go }));
        if (usi_ponderhit) {
          ws.send(JSON.stringify({ sender: "cache", d: usi_ponderhit }));
        }
      }
      for (let i = 0; i < usie_info.length; i++) {
        if (usie_info[i]) {
          ws.send(JSON.stringify({ sender: "cachee", d: usie_info[i] }));
        }
      }
    }
  } catch (e) {
    console.error(e);
    try {
      ws.close();
    } catch (e) {
      console.error(e);
    }
  }
});
const server = app.listen(args.port, () => {
  console.log(`http://localhost:${args.port}/`);
});

// spawn usi engine

const subproc = spawn(args.engine, args.engineargs, { cwd: args.cwd });

process.stdin.setEncoding("utf8");
process.stdout.setEncoding("utf8");
process.stderr.setEncoding("utf8");
subproc.stdin.setEncoding("utf8");
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
  if (line.startsWith("position")) { usi_position = line; usi_go = null; usi_ponderhit = null; }
  if (line.startsWith("go")) { usi_go = line; usi_ponderhit = null; }
  if (line.startsWith("ponderhit")) { usi_ponderhit = line; }
  if (line.startsWith("isready")) {
    usi_position = POS_HIRATE;
    usi_go = null;
    usi_ponderhit = null;
    usie_info = [];
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
      usie_info[parseInt(found.groups.multipv)] = line;
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
  if (line.startsWith("bestmove")) { usie_info = []; }
});

// When the pipe is closed, terminate the server, sub-process, and current process.

rl_main.on("close", () => {
  server.close();
  subproc.close();
  exit();
});
rl_subp.on("close", () => {
  server.close();
  exit();
});
