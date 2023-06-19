import { getServerConfig, getRTCConfiguration } from "../../js/config.js";
import { VideoPlayer } from "../../js/videoplayer.js";
import { RenderStreaming } from "../../module/renderstreaming.js";
import { Signaling, WebSocketSignaling } from "../../module/signaling.js";

/** @type {RenderStreaming} */
let renderstreaming;
/** @type {boolean} */
let useWebSocket;

const codecPreferences = document.getElementById('codecPreferences');
const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
  'setCodecPreferences' in window.RTCRtpTransceiver.prototype;

const playerDiv = document.getElementById('player');
const lockMouseCheck = document.getElementById('lockMouseCheck');
const videoPlayer = new VideoPlayer();
let connected = false;

setup();

window.document.oncontextmenu = function () {
  return false;     // cancel default menu
};

window.addEventListener('resize', function () {
  videoPlayer.resizeVideo();
}, true);

window.addEventListener('beforeunload', async () => {
  if(!renderstreaming)
    return;
  await renderstreaming.stop();
}, true);

async function setup() {
  const res = await getServerConfig();
  useWebSocket = res.useWebSocket;
  showWarningIfNeeded(res.startupMode);
  setupRenderStreaming();
}

function showWarningIfNeeded(startupMode) {
  const warningDiv = document.getElementById("warning");
  if (startupMode == "private") {
    warningDiv.innerHTML = "<h4>Warning</h4> This sample is not working on Private Mode.";
    warningDiv.hidden = false;
  }
}

function uuid4() {
  var temp_url = URL.createObjectURL(new Blob());
  var uuid = temp_url.toString();
  URL.revokeObjectURL(temp_url);
  return uuid.split(/[:/]/g).pop().toLowerCase(); // remove prefixes
}

async function setupRenderStreaming() {
  const signaling = useWebSocket ? new WebSocketSignaling() : new Signaling();
  const config = getRTCConfiguration();
  renderstreaming = new RenderStreaming(signaling, config);
  renderstreaming.onConnect = onConnect;
  renderstreaming.onDisconnect = onDisconnect;
  renderstreaming.onTrackEvent = (data) => videoPlayer.addTrack(data.track);
  renderstreaming.onGotOffer = setCodecPreferences;
  let queryString = document.location.search;
  const urlParams = new URLSearchParams(queryString);
  const sender = urlParams.get('sender');
  const connectionId = `${sender || "default"}-${uuid4()}`;
  await renderstreaming.start();
  await renderstreaming.createConnection(connectionId);
}

function onConnect() {
  connected = true;
  videoPlayer.createPlayer(playerDiv, lockMouseCheck,false,true);
  const channel = renderstreaming.createDataChannel("input");
  videoPlayer.setupInput(channel);
  showStatsMessage();
}

async function onDisconnect() {
  connected = false;
  clearStatsMessage();
  videoPlayer.deletePlayer();
  await renderstreaming.stop();
  renderstreaming = null;
  if (supportsSetCodecPreferences && codecPreferences) {
    codecPreferences.disabled = false;
  }
  attemptReconnect();
}

function attemptReconnect() {
  setTimeout(() => {
    if(!connected) {
      setupRenderStreaming();
      attemptReconnect();
    }
  },5000);
}



function setCodecPreferences() {
  /** @type {RTCRtpCodecCapability[] | null} */
  let selectedCodecs = null;

  if (selectedCodecs == null) {
    return;
  }
  const transceivers = renderstreaming.getTransceivers().filter(t => t.receiver.track.kind == "video");
  if (transceivers && transceivers.length > 0) {
    transceivers.forEach(t => t.setCodecPreferences(selectedCodecs));
  }
}

/** @type {RTCStatsReport} */
/** @type {number} */
let intervalId;

function showStatsMessage() {
  intervalId = setInterval(async () => {
    if (renderstreaming == null) {
      return;
    }

    const stats = await renderstreaming.getStats();
    if (stats == null) {
      return;
    }
  }, 1000);
}

function clearStatsMessage() {
  if (intervalId) {
    clearInterval(intervalId);
  }
  intervalId = null;
}
