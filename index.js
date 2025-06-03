// Connecting to websocket
import WebSocketManager from './js/socket.js';
let veadoSocket;
let veadoReconnectTimer;


// Cache values here to prevent constant updating
const cache = {
  maxCombo: 0,
  combo: -1,
  baseBuban: 1000,
  mapLength: -1,
  reverseChoked: 0,
  veadoPort: 8085,
  minimumComboPercent: 33
};

const socket = new WebSocketManager('127.0.0.1:24050');
socket.onopen = onSocketOpen();

function connectVeadoSocket() {
  // When changing the port, close the previous connection if it exists
  if (veadoSocket && veadoSocket.readyState === WebSocket.OPEN) {
    veadoSocket.close();
  }
  
  clearTimeout(veadoReconnectTimer);

  // Connect to VeadoTube WebSocket
  veadoSocket = new WebSocket(`ws://127.0.0.1:${cache.veadoPort}/?n=blemtuber`);

  veadoSocket.onopen = () => {
    setDisplayContainer('veadoStatusText', 'Connected to VeadoTube WebSocket on port ' + cache.veadoPort);
    console.log('Connected to VeadoTube WebSocket');
  }
  veadoSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  }
  veadoSocket.onclose = () => {
    setDisplayContainer('veadoStatusText', 'VeadoTube WebSocket connection closed, attempting to reconnect...');;
    console.log('VeadoTube WebSocket connection closed, attempting to reconnect...');
    // Attempt to reconnect after a three second delay.
    veadoReconnectTimer = setTimeout(connectVeadoSocket, 3000);
  }
}


// veadoSocket.onopen = () => {
//   console.log('Connected to VeadoTube WebSocket');
// }

function bubanMoment(combo_percent) {
  //TODO change percent threshold with a setting
  if (combo_percent < (cache.minimumComboPercent/100)) {
    return;
  }
  let bubanTime = 10**((3 * combo_percent - 1) / 2) * cache.baseBuban;
  
  //scale bubanMoment by map length
  //TODO add setting for preferred map length, currently 3 minutes
  bubanTime = bubanTime * cache.mapLength/180000;

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

//
function setDisplayContainer(containerId, message) {
    let displayContainer = document.getElementById(containerId);
    displayContainer.innerHTML = message;
}

function onSocketOpen() {
  // Initial connection to VaedoSocket
  connectVeadoSocket();
  socket.sendCommand('getSettings', encodeURI(window.COUNTER_PATH));
  socket.commands(async (data) => {
      try {
          const { command, message } = data;
          if (command != 'getSettings') return;
          if (message['baseBuban'] != null) {
              cache['baseBuban'] = message['baseBuban'];
          }
          if (message['veadoPort'] != null && message['veadoPort'] != cache['veadoPort']) {
              cache['veadoPort'] = message['veadoPort'];
              connectVeadoSocket();
          }
          if (message['minimumComboPercent'] != null) {
              cache['minimumComboPercent'] = message['minimumComboPercent'];
          }
      } catch (error) {
          console.log(error);
      };
  });
}

// receive message update from websocket
socket.api_v2(({ play, beatmap }) => {
  try {
    if (cache.combo !== play.combo) {
      if (play.combo.current < cache.combo.current) {
		console.log(`${play.hits[0]} && ${play.hits.sliderBreaks}`);
		if (play.hits[0] || play.hits.sliderBreaks) {
		  console.log(`inside choke statement`);
		  let brokenComboRatio = cache.combo.current / cache.maxCombo;
		  console.log(`Broken combo percent: ${brokenComboRatio * 100}%`);
		  bubanMoment(brokenComboRatio);
		}
	  }

      cache.combo = play.combo;
	  if (beatmap.time.live >= cache.mapLength) {
		let reverseChokeRatio = cache.combo.current / cache.maxCombo;
		if (reverseChokeRatio > 0.85 && !cache.reverseChoked) {
			if (play.hits[0] || play.hits.sliderBreaks) {
				console.log(`inside reverse choke statement`);
				bubanMoment(reverseChokeRatio)
				cache.reverseChoked = 1;
			}
		}
	  }
    }

    if (cache.maxCombo != beatmap.stats.maxCombo) {
      cache.maxCombo = beatmap.stats.maxCombo;
	  cache.mapLength = beatmap.time.lastObject - beatmap.time.firstObject;
	  cache.reverseChoked = 0;
    }
  } catch (error) {
    console.log(error);
  };
});