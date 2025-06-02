// Connecting to websocket
import WebSocketManager from './js/socket.js';
const socket = new WebSocketManager('127.0.0.1:24050');

// TODO: Allow configuring port later, default is 8085
const veadoSocket = new WebSocket(`ws://127.0.0.1:8085/?n=blemtuber`);

veadoSocket.onopen = () => {
  console.log('Connected to VeadoTube WebSocket');
}


// Cache values here to prevent constant updating
const cache = {
  maxCombo: 0,
  combo: -1,
  BubanMinimum: 1
};


function bubanMoment(combo_percent) {
  if (combo_percent < 0.33) {
    return;
  }
  let bubanTime = 10**((3 * combo_percent - 1) / 2) * 1000;

  // Send buban payload
  const bubanPayload = createSetPayLoad("BUBAN");
  veadoSocket.send("nodes: " + JSON.stringify(bubanPayload));

  // Restore BLEM state after bubanTime
  setTimeout(() => {
    restoreBlem();
  }, bubanTime);
  console.log(`BUBAN mode activated for ${bubanTime / 1000} seconds`);
}


function restoreBlem() {
  const blemPayload = createSetPayLoad("BLEM");
  veadoSocket.send("nodes: " + JSON.stringify(blemPayload));
}

// Payload blueprint for VeadoTube for changing state
function createSetPayLoad(state) {
  return {
    "event": "payload",
    "type": "stateEvents",
    "id": "mini",
    "payload": {
        "event": "set",
        "state": state
    }
  }
}

socket.sendCommand('getSettings', encodeURI(window.COUNTER_PATH));
socket.commands(async (data) => {
    try {
        const { command, message } = data;
        if (command != 'getSettings') return;
        if (message['BubanMinimum'] != null) {
            cache['BubanMinimum'] = message['BubanMinimum'];
        }
    } catch (error) {
        console.log(error);
    };
});

// receive message update from websocket
socket.api_v2(({ play, beatmap }) => {
  try {
    console.log(cache.BubanMinimum);
    if (cache.combo !== play.combo) {
      if (play.combo.current < cache.combo.current) {
        let brokenComboRatio = cache.combo.current / cache.maxCombo;
        console.log(`Broken combo percent: ${brokenComboRatio * 100}%`);
        bubanMoment(brokenComboRatio);
      }

      cache.combo = play.combo;
    }

    if (cache.maxCombo != beatmap.maxCombo) {
      cache.maxCombo = beatmap.stats.maxCombo;
    }
  } catch (error) {
    console.log(error);
  };
});