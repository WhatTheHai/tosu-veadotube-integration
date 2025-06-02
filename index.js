// connecting to websocket
import WebSocketManager from './js/socket.js';
const socket = new WebSocketManager('127.0.0.1:24050');

// TODO: Allow configuring port later
const veadoSocket = new WebSocket(`ws://127.0.0.1:8085/?n=blemtuber`);

veadoSocket.onopen = () => {
  console.log('Connected to VeadoTube WebSocket');
}


// cache values here to prevent constant updating
const cache = {
  maxCombo: 0,
  combo: -1,
};


function bubanMoment(combo_percent) {
  if (combo_percent < 0.33) {
    return;
  }
  let bubanTime = 10**((3 * combo_percent - 1) / 2) * 1000;

  // Send buban payload
  const bubanPayload = {
    "event": "payload",
    "type": "stateEvents",
    "id": "mini",
    "payload": {
        "event": "set",
        "state": "BUBAN"
    }
  }
  veadoSocket.send("nodes: " + JSON.stringify(bubanPayload));

  // Restore BLEM state after bubanTime
  setTimeout(() => {
    restoreBlem();
  }, bubanTime);
  console.log(`BUBAN mode activated for ${bubanTime / 1000} seconds`);
}


function restoreBlem() {
  const blemPayload = {
    "event": "payload",
    "type": "stateEvents",
    "id": "mini",
    "payload": {
        "event": "set",
        "state": "BLEM"
    }
  }
  veadoSocket.send("nodes: " + JSON.stringify(blemPayload));
}

// receive message update from websocket
socket.api_v2(({ play, beatmap }) => {
  try {
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